import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Plus, Wallet, Download, Lock, Loader2, Upload, Trash2, AlertTriangle, Eye, X, FileText, Search } from "lucide-react";
import qrisImage from "@assets/generated_images/qr_code_placeholder.png";
import { compressImage, formatFileSize, blobToBase64 } from "@/lib/imageCompression";

const treasurySchema = z.object({
  date: z.string(),
  amount: z.number().min(1),
  category: z.enum(["iuran_wajib", "iuran_sukarela", "denda", "lainnya"]),
  notes: z.string().optional(),
  proof: z.string().optional(),
});

const expenseSchema = z.object({
  date: z.string(),
  amount: z.number().min(1),
  category: z.enum(["konsumsi", "souvenir", "hadiah", "operasional", "lainnya"]),
  notes: z.string(),
});

type TreasuryFormData = z.infer<typeof treasurySchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function TreasuryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For export functionality
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadProofPreview, setUploadProofPreview] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [uploadProofDialogOpen, setUploadProofDialogOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Segmented delete confirmation dialog
  const [segmentToDelete, setSegmentToDelete] = useState<'income' | 'expenses' | 'queue' | null>(null);
  const [showSegmentDeleteDialog, setShowSegmentDeleteDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadProofInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const form = useForm<TreasuryFormData>({
    resolver: zodResolver(treasurySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: "iuran_wajib",
      notes: "",
    },
  });

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: "operasional",
      notes: "",
    },
  });

  // Reset search term when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setMemberSearchTerm("");
    }
  }, [isDialogOpen]);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const { data: treasury = [], isLoading: isFetchingTreasury } = useQuery<any[]>({
    queryKey: ["/api/treasury"],
    staleTime: 30 * 1000,
    select: (data) => {
      if (user?.role === "anggota") {
        return data.filter((t: any) => String(t.userId) === String(user.id));
      }
      return data;
    }
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
    staleTime: 10 * 60 * 1000,
  });

  const { data: balanceData } = useQuery<any>({
    queryKey: ["/api/treasury/balance"],
    staleTime: 30 * 1000,
  });

  // Fetch anomaly detection settings for real-time feedback
  const { data: intelligenceSettings } = useQuery<any>({
    queryKey: ["/api/admin/intelligence/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/intelligence/settings");
      if (!res.ok) return { thresholdAmount: 1000000 };
      return res.json();
    },
    enabled: user?.role === "admin" || user?.role === "anggota",
  });

  const anomalyThreshold = intelligenceSettings?.thresholdAmount || 1000000;
  const currentAmount = form.watch("amount");
  const isHighAmount = useMemo(() => {
    return currentAmount && currentAmount > anomalyThreshold;
  }, [currentAmount, anomalyThreshold]);

  // ===== GLOBAL SYNC & MUTATIONS =====
  const GLOBAL_SYNC_KEYS = [
    "/api/treasury",
    "/api/treasury/balance",
    "/api/ai/analytics/stats",
    "/api/admin/intelligence",
    "/api/ai/dashboard"
  ];

  const performGlobalSync = async () => {
    // 1. NUCLEAR OPTION: Purge stale data from cache immediately
    GLOBAL_SYNC_KEYS.forEach(key => queryClient.removeQueries({ queryKey: [key] }));

    // 2. LATENCY SHIELD: Buffer for database propagation + Reftch all
    await Promise.all([
      ...GLOBAL_SYNC_KEYS.map(key => queryClient.invalidateQueries({ queryKey: [key] })),
      new Promise(resolve => setTimeout(resolve, 600)) // 600ms Buffer for ngrok/DB latency
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/treasury", values);
      return res.json();
    },
    onSuccess: async () => {
      await performGlobalSync();

      toast({
        title: "Berhasil!",
        description: user?.role === "admin" ? "Pembayaran dicatat & AI Dashboard disinkronkan." : "Pembayaran kas sudah disimpan dan menunggu verifikasi.",
      });

      form.reset();
      setProofPreview(null);
      setSelectedUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsDialogOpen(false);
      setIsExpenseDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Menyimpan",
        description: error.message || "Tidak bisa menyimpan pembayaran. Coba lagi.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/treasury/${id}`, updates);
      return res.json();
    },
    onSuccess: async () => {
      await performGlobalSync();
      toast({ title: "Update Berhasil", description: "Data diperbarui & sinkronisasi AI selesai." });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Update",
        description: error.message || "Tidak bisa memperbarui data kas.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/treasury/${id}`);
      return res.json();
    },
    onSuccess: async (data) => {
      await performGlobalSync();

      toast({
        title: "Penghapusan Berhasil!",
        description: `Saldo saat ini: Rp ${data.newBalance?.toLocaleString('id-ID') || '...'}. AI Dashboard Updated.`
      });
    },
    onError: (error: any) => {
      let errorMessage = "Data tidak ditemukan atau sudah terhapus.";
      if (error.message) {
        const match = error.message.match(/\d+:\s*(.+)/);
        errorMessage = match ? (JSON.parse(match[1]).message || match[1]) : error.message;
      }
      toast({ title: "Gagal Hapus", description: errorMessage, variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/treasury-all");
      return res.json();
    },
    onSuccess: async (data) => {
      await performGlobalSync();

      toast({
        title: "Global Reset Berhasil",
        description: `Semua data bersih. Saldo: Rp ${data.newBalance?.toLocaleString('id-ID') || 0}. AI Memory Wiped.`
      });
    },
    onError: (error: any) => {
      toast({ title: "Gagal Reset", description: error.message || "Gagal melakukan reset.", variant: "destructive" });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (target: 'income' | 'expenses' | 'queue') => {
      const res = await apiRequest("DELETE", `/api/treasury/bulk?target=${target}`);
      return res.json();
    },
    onSuccess: async (data, target) => {
      await performGlobalSync();

      const segmentName = target === 'income' ? 'Pemasukan' : target === 'expenses' ? 'Pengeluaran' : 'Antrean';
      toast({
        title: "Pembersihan Kategori Berhasil",
        description: `${segmentName}: ${data.deletedCount} data dihapus. Saldo: Rp ${data.newBalance?.toLocaleString('id-ID')}`
      });
    },
    onError: (error: any) => {
      toast({ title: "Gagal Hapus Kategori", description: error.message || "Gagal menghapus data.", variant: "destructive" });
    },
  });

  // Handler functions for segmented delete
  const handleSegmentDelete = (segment: 'income' | 'expenses' | 'queue') => {
    setSegmentToDelete(segment);
    setShowSegmentDeleteDialog(true);
  };

  const confirmSegmentDelete = () => {
    if (segmentToDelete) {
      bulkDeleteMutation.mutate(segmentToDelete);
      setShowSegmentDeleteDialog(false);
      setSegmentToDelete(null);
    }
  };

  const isUploadingProof = updateMutation.isPending;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format tidak didukung",
        description: "Hanya file gambar yang diizinkan.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Ukuran file terlalu besar",
        description: "Maksimal ukuran file adalah 5MB.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressedBlob = await compressImage(file);
      const compressedBase64 = await blobToBase64(compressedBlob);
      form.setValue("proof", compressedBase64);
      setProofPreview(compressedBase64);
    } catch (error) {
      console.error("Failed to compress image", error);
      toast({
        title: "Gagal memproses gambar",
        description: "Silakan coba gambar lain.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleUploadProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Format tidak didukung",
        description: "Hanya file gambar yang diizinkan.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Ukuran file terlalu besar",
        description: "Maksimal ukuran file adalah 5MB.",
        variant: "destructive",
      });
      if (uploadProofInputRef.current) uploadProofInputRef.current.value = "";
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressedBlob = await compressImage(file);
      const compressedBase64 = await blobToBase64(compressedBlob);
      setUploadProofPreview(compressedBase64);
    } catch (error) {
      console.error("Failed to compress image", error);
      toast({
        title: "Gagal memproses gambar",
        description: "Silakan coba gambar lain.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const submitUploadProof = async () => {
    if (!selectedTransaction || !uploadProofPreview) return;

    updateMutation.mutate({
      id: selectedTransaction.id,
      updates: { proof: uploadProofPreview }
    }, {
      onSuccess: () => {
        toast({
          title: "Berhasil!",
          description: "Bukti pembayaran berhasil diunggah.",
        });
        setUploadProofDialogOpen(false);
        setUploadProofPreview(null);
        setSelectedTransaction(null);
      }
    });
  };

  async function onSubmit(data: TreasuryFormData) {
    // Pastikan userId yang dikirim adalah ID anggota yang dipilih dari search
    const finalUserId = user?.role === "admin" ? selectedUserId : user?.id;

    if (user?.role === "admin" && !finalUserId) {
      toast({
        title: "Pilih Anggota",
        description: "Silakan pilih anggota terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      ...data,
      userId: finalUserId, // Hasil dari state pencarian
      type: "in",
      status: user?.role === "admin" ? "verified" : "pending",
      recordedBy: user?.id  // ID kamu tetap dicatat sebagai admin penginput
    });
  }

  // 2. Robust Filter: Toleran terhadap spasi, huruf besar/kecil, dan data null
  const filteredUsersList = useMemo(() => {
    return users?.filter((u: any) => {
      const search = (memberSearchTerm || "").trim().toLowerCase();
      const userName = (u.name || "").trim().toLowerCase();
      const userEmail = (u.email || "").toLowerCase();

      // Jika kolom cari kosong, tampilkan semua (atau limit jika perlu, di sini tampilkan semua)
      if (!search) return true;

      return userName.includes(search) || userEmail.includes(search);
    }) || [];
  }, [users, memberSearchTerm]);

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      iuran_wajib: "Iuran Wajib",
      iuran_sukarela: "Sumbangan Sukarela",
      denda: "Denda",
      lainnya: "Lainnya",
      konsumsi: "Konsumsi Rapat",
      souvenir: "Souvenir",
      hadiah: "Hadiah",
      operasional: "Operasional",
    };
    return labels[cat] || cat;
  };

  const statusBadgeClass = (status: string) => {
    return status === "verified"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  };

  const verifyPayment = async (treasuryId: string, newStatus: string) => {
    updateMutation.mutate({
      id: treasuryId,
      updates: { status: newStatus }
    }, {
      onSuccess: () => {
        toast({
          title: "Berhasil!",
          description: "Pembayaran sudah diverifikasi.",
        });
      }
    });
  };

  const deletePayment = async (treasuryId: string) => {
    if (!confirm("Yakin hapus data kas ini?")) return;
    deleteMutation.mutate(treasuryId);
  };

  const clearAllTreasury = async () => {
    if (!confirm("Yakin hapus SEMUA data kas? Tidak bisa diurungkan!")) return;
    deleteAllMutation.mutate();
  };

  async function onExpenseSubmit(values: ExpenseFormData) {
    createMutation.mutate({
      userId: user?.id,
      date: values.date,
      amount: values.amount,
      type: "out",
      category: values.category,
      notes: values.notes,
      status: "verified",
      recordedBy: user?.id,
    }, {
      onSuccess: () => {
        toast({
          title: "Berhasil!",
          description: "Pengeluaran sudah dicatat.",
        });
        expenseForm.reset();
        setIsExpenseDialogOpen(false);
      }
    });
  }

  const treasuryTotals = useMemo(() => {
    // Priority: use deterministic balance from server if available
    if (balanceData) {
      return {
        income: balanceData.details.income,
        expense: balanceData.details.expensesVerified,
        pending: balanceData.details.pending,
        pendingIncome: treasury.filter(t => t.type === "in" && t.status === "pending").reduce((sum, t) => sum + t.amount, 0),
        pendingExpense: treasury.filter(t => t.type === "out" && t.status === "pending").reduce((sum, t) => sum + t.amount, 0),
        balance: balanceData.balance
      };
    }

    const income = treasury
      .filter(t => t.type === "in" && t.status === "verified")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = treasury
      .filter(t => t.type === "out" && t.status === "verified")
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingIncome = treasury
      .filter(t => t.type === "in" && t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingExpense = treasury
      .filter(t => t.type === "out" && t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      pendingIncome,
      pendingExpense,
      pending: pendingIncome + pendingExpense,
      balance: income - expense,
    };
  }, [balanceData, treasury]);

  // Group verified payments by year, month, and date
  const groupedPaymentsData = useMemo(() => {
    const verified = treasury.filter(t => t.status === "verified" && t.type === "in");
    const grouped: Record<string, Record<string, Record<string, any[]>>> = {};

    verified.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear().toString();
      const month = format(date, "MMMM", { locale: id });
      const monthNum = format(date, "MM");
      const day = format(date, "dd");
      const dayName = format(date, "EEEE", { locale: id });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][monthNum]) grouped[year][monthNum] = {};
      if (!grouped[year][monthNum][day]) grouped[year][monthNum][day] = [];

      grouped[year][monthNum][day].push({ ...item, month, dayName });
    });

    return grouped;
  }, [treasury]);

  const exportComplianceReport = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/treasury/export/compliance");
      if (!res.ok) throw new Error("Gagal mengekspor laporan");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Kepatuhan_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Berhasil!",
        description: "Laporan kepatuhan telah diunduh dalam format Markdown.",
      });
    } catch (error) {
      toast({
        title: "Gagal Ekspor",
        description: "Terjadi kesalahan saat mengunduh laporan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-slate-50 relative pb-32">
          {/* Instagram-Style Header */}
          <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-10">
            <div className="h-14 flex items-center justify-between px-4 lg:px-6">
              <h2 className="text-xl font-bold text-slate-900">
                Kas & Treasury
              </h2>

              <div className="flex items-center gap-2">
                {user?.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={exportComplianceReport}
                    disabled={isLoading}
                    className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  </Button>
                )}

                {/* Member Kas Button */}
                {user?.role === "anggota" && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Isi Pembayaran Kas</DialogTitle>
                        <DialogDescription>
                          Isi form berikut untuk melaporkan pembayaran kas Anda.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-4 py-4 pb-12">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label htmlFor="date" className="text-sm font-bold text-slate-700 mb-2 block">Tanggal</Label>
                              <Input
                                id="date"
                                type="date"
                                className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200"
                                {...form.register("date")}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="amount" className="text-sm font-bold text-slate-700 mb-2 block">Jumlah (Rp)</Label>
                              <Input
                                id="amount"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Rp 50.000"
                                className={cn(
                                  "h-[48px] w-full px-4 rounded-2xl bg-slate-100 border-none shadow-inner transition-all duration-300",
                                  isHighAmount && "ring-2 ring-amber-500 bg-amber-50"
                                )}
                                {...form.register("amount", { valueAsNumber: true })}
                              />
                              {isHighAmount && (
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  Perhatian: Transaksi ini akan ditandai sebagai transaksi besar
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="category" className="text-sm font-bold text-slate-700 mb-2 block">Jenis Pembayaran</Label>
                            <Select value={form.watch("category")} onValueChange={(val) => form.setValue("category", val as any)}>
                              <SelectTrigger className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200 focus:ring-primary/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" className="rounded-2xl shadow-xl">
                                <SelectItem value="iuran_wajib" className="rounded-lg py-3">Iuran Wajib Bulanan</SelectItem>
                                <SelectItem value="iuran_sukarela" className="rounded-lg py-3">Sumbangan Sukarela</SelectItem>
                                <SelectItem value="denda" className="rounded-lg py-3">Denda Keterlambatan</SelectItem>
                                <SelectItem value="lainnya" className="rounded-lg py-3">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="notes" className="text-sm font-bold text-slate-700 mb-2 block">Keterangan</Label>
                            <Textarea
                              id="notes"
                              placeholder="Contoh: Transfer via BCA..."
                              className="min-h-[80px] w-full rounded-2xl bg-slate-50 border-slate-200 p-4"
                              {...form.register("notes")}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm font-bold text-slate-700 mb-2 block">QRIS Pembayaran</Label>
                            <div className="border border-border rounded-2xl p-4 bg-slate-50 shadow-inner">
                              <img
                                src={qrisImage}
                                alt="QRIS Meraki Berbagi"
                                className="w-full h-auto rounded-xl"
                              />
                              <p className="text-xs text-muted-foreground text-center mt-3 font-medium">Scan QRIS di atas untuk pembayaran</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="proof" className="text-sm font-bold text-slate-700 mb-2 block">Bukti Transfer (Foto)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                ref={fileInputRef}
                                id="proof"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="flex-1 h-[48px] rounded-2xl bg-slate-50 border-slate-200"
                              />
                              <Button type="button" variant="outline" size="icon" className="h-[48px] w-[48px] rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4" />
                              </Button>
                            </div>
                            {proofPreview && (
                              <div className="mt-4 space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 block mb-2">Pratinjau Bukti</Label>
                                <div className="w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                                  <img
                                    src={proofPreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover transition-all hover:scale-105"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <DialogFooter className="mt-6 sticky bottom-0 bg-white pt-2">
                          <Button
                            type="submit"
                            disabled={createMutation.isPending || isProcessingImage}
                            className="w-full h-[56px] rounded-2xl text-md font-bold shadow-strong active:scale-95 transition-all"
                          >
                            {createMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyinkronkan...
                              </>
                            ) : isProcessingImage ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memproses Gambar...
                              </>
                            ) : (
                              "Kirim Pembayaran"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Admin Kas Button */}
                {user?.role === "admin" && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="shadow-md shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" /> Catat Pembayaran Kas
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Catat Pembayaran Kas Anggota</DialogTitle>
                        <DialogDescription>
                          Catat pembayaran kas anggota secara manual.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-20">
                        <div className="space-y-4 py-4 px-0 sm:px-2">
                          {user?.role === "admin" && (
                            <div className="space-y-1 relative">
                              <Label htmlFor="member-search" className="text-sm font-bold text-slate-700 mb-2 block">Cari & Pilih Anggota</Label>
                              <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  id="member-search"
                                  type="text"
                                  inputMode="text"
                                  placeholder="Ketik nama anggota..."
                                  autoFocus={false}
                                  value={memberSearchTerm}
                                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                                  className="pl-12 h-[48px] rounded-2xl bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-primary/50 text-sm outline-none transition-all w-full shadow-inner"
                                />

                                {/* Floating Results */}
                                {memberSearchTerm.trim() !== "" && (
                                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[50] max-h-60 overflow-y-auto">
                                    {isLoadingUsers ? (
                                      <div className="py-4 text-center text-slate-500 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                                        Mencari...
                                      </div>
                                    ) : filteredUsersList.length > 0 ? (
                                      <div className="p-2 space-y-1">
                                        {filteredUsersList.map((u: any) => (
                                          <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedUserId(u.id);
                                              setMemberSearchTerm(u.name); // Fill input with selected name
                                            }}
                                            className={cn(
                                              "w-full text-left px-4 py-3 rounded-xl text-sm transition-colors",
                                              selectedUserId === u.id
                                                ? "bg-primary text-white"
                                                : "hover:bg-slate-100 text-slate-700"
                                            )}
                                          >
                                            <div className="font-bold">{u.name}</div>
                                            <div className={cn("text-xs", selectedUserId === u.id ? "text-white/80" : "text-slate-400")}>
                                              {u.email}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-6 px-4 text-center">
                                        <p className="text-sm text-red-500 font-medium">
                                          "{memberSearchTerm}" tidak ditemukan
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Selected Member Indicator */}
                              {selectedUserId && !memberSearchTerm.includes(users.find(u => u.id === selectedUserId)?.name || "") && (
                                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                                  <div className="text-xs text-emerald-700 font-medium">
                                    Terpilih: <span className="font-bold">{users.find(u => u.id === selectedUserId)?.name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedUserId(null)}
                                    className="text-emerald-500 hover:text-emerald-700 font-bold text-xs"
                                  >
                                    Ganti
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label htmlFor="date" className="text-sm font-bold text-slate-700 mb-2 block">Tanggal</Label>
                              <Input
                                id="date"
                                type="date"
                                className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200"
                                {...form.register("date")}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="amount" className="text-sm font-bold text-slate-700 mb-2 block">Jumlah (Rp)</Label>
                              <Input
                                id="amount"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Rp 50.000"
                                className={cn(
                                  "h-[48px] w-full px-4 rounded-2xl bg-slate-100 border-none shadow-inner transition-all duration-300",
                                  isHighAmount && "ring-2 ring-amber-500 bg-amber-50"
                                )}
                                {...form.register("amount", { valueAsNumber: true })}
                              />
                              {isHighAmount && (
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  Perhatian: Transaksi ini akan ditandai sebagai transaksi besar
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="category" className="text-sm font-bold text-slate-700 mb-2 block">Jenis Pembayaran</Label>
                            <Select value={form.watch("category")} onValueChange={(val) => form.setValue("category", val as any)}>
                              <SelectTrigger className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200 focus:ring-primary/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" className="rounded-2xl shadow-xl">
                                <SelectItem value="iuran_wajib" className="rounded-lg py-3">Iuran Wajib Bulanan</SelectItem>
                                <SelectItem value="iuran_sukarela" className="rounded-lg py-3">Sumbangan Sukarela</SelectItem>
                                <SelectItem value="denda" className="rounded-lg py-3">Denda Keterlambatan</SelectItem>
                                <SelectItem value="lainnya" className="rounded-lg py-3">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="notes" className="text-sm font-bold text-slate-700 mb-2 block">Keterangan</Label>
                            <Textarea
                              id="notes"
                              placeholder="Catatan pembayaran..."
                              className="min-h-[100px] w-full rounded-2xl bg-slate-50 border-slate-200 p-4 focus:ring-primary/20"
                              {...form.register("notes")}
                            />
                          </div>
                        </div>

                        <DialogFooter className="mt-4 sticky bottom-0 bg-white pt-2">
                          <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="w-full h-[56px] rounded-2xl text-md font-bold shadow-strong active:scale-95 transition-all"
                          >
                            {createMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyinkronkan...
                              </>
                            ) : (
                              "Catat Pembayaran"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Admin Expense Controls */}
                {user?.role === "admin" && (
                  <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="shadow-md shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" /> Catat Pengeluaran
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Catat Pengeluaran Kas</DialogTitle>
                        <DialogDescription>
                          Masukkan data pengeluaran kas organisasi.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)}>
                        <div className="space-y-4 py-4 pb-10">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label htmlFor="exp-date" className="text-sm font-bold text-slate-700 mb-2 block">Tanggal</Label>
                              <Input
                                id="exp-date"
                                type="date"
                                className="h-[48px] rounded-2xl bg-slate-50 border-slate-200"
                                {...expenseForm.register("date")}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="exp-amount" className="text-sm font-bold text-slate-700 mb-2 block">Jumlah (Rp)</Label>
                              <Input
                                id="exp-amount"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Rp 50.000"
                                className="h-[48px] rounded-2xl bg-slate-100 border-none shadow-inner"
                                {...expenseForm.register("amount", { valueAsNumber: true })}
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="exp-category" className="text-sm font-bold text-slate-700 mb-2 block">Kategori Pengeluaran</Label>
                            <Select value={expenseForm.watch("category")} onValueChange={(val) => expenseForm.setValue("category", val as any)}>
                              <SelectTrigger className="h-[48px] rounded-2xl bg-slate-50 border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-xl">
                                <SelectItem value="konsumsi" className="rounded-lg py-3">Konsumsi Rapat</SelectItem>
                                <SelectItem value="souvenir" className="rounded-lg py-3">Souvenir</SelectItem>
                                <SelectItem value="hadiah" className="rounded-lg py-3">Hadiah</SelectItem>
                                <SelectItem value="operasional" className="rounded-lg py-3">Operasional</SelectItem>
                                <SelectItem value="lainnya" className="rounded-lg py-3">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="exp-notes" className="text-sm font-bold text-slate-700 mb-2 block">Keterangan</Label>
                            <Textarea
                              id="exp-notes"
                              placeholder="Deskripsi pengeluaran..."
                              className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-200 p-4"
                              {...expenseForm.register("notes")}
                            />
                          </div>
                        </div>

                        <DialogFooter className="sticky bottom-0 bg-white pt-2">
                          <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="w-full h-[56px] rounded-2xl text-md font-bold shadow-strong active:scale-95 transition-all"
                          >
                            {createMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyinkronkan...
                              </>
                            ) : (
                              "Simpan Pengeluaran"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overscroll-contain">
            <div className="p-4 lg:p-8 space-y-6">

              {/* Admin Treasury View */}
              {user?.role === "admin" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-primary text-primary-foreground border-none shadow-md rounded-2xl active:scale-[0.98] transition-all">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Saldo Kas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">Rp {treasuryTotals.balance.toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-primary-foreground/70">Total: Pemasukan - Pengeluaran</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">Rp {treasuryTotals.income.toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-muted-foreground">Dari {treasury.filter(t => t.type === "in" && t.status === "verified").length} pembayaran terverifikasi</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-rose-600">Rp {treasuryTotals.expense.toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-muted-foreground">Dari {treasury.filter(t => t.type === "out").length} pengeluaran</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pending Payments Section for Admin */}
                  {user?.role === "admin" && (
                    <Card className="shadow-sm border-orange-200 bg-orange-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-orange-500" />
                              Menunggu Verifikasi ({treasury.filter(t => t.status === "pending").length})
                            </div>
                            {user?.role === "admin" && treasury.filter(t => t.status === "pending").length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-10 px-4"
                                onClick={() => handleSegmentDelete('queue')}
                                disabled={bulkDeleteMutation.isPending}
                              >
                                {bulkDeleteMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Menyinkronkan...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Bersihkan Antrean
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {treasury.filter(t => t.status === "pending").length > 0 ? (
                            <div className="rounded-md border border-orange-200 overflow-hidden bg-white">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-orange-100/50 text-orange-900 font-medium">
                                  <tr>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Anggota</th>
                                    <th className="px-4 py-3">Nominal</th>
                                    <th className="px-4 py-3">Jenis</th>
                                    <th className="px-4 py-3">Bukti</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                  {treasury.filter(t => t.status === "pending").map((item) => (
                                    <tr key={item.id} className="hover:bg-orange-50/50 transition-colors">
                                      <td className="px-4 py-3">{format(new Date(item.date), "dd MMM yyyy", { locale: id })}</td>
                                      <td className="px-4 py-3">
                                        <div className="font-medium">{item.userName}</div>
                                        <div className="text-xs text-muted-foreground">{item.userEmail}</div>
                                      </td>
                                      <td className="px-4 py-3 font-bold">Rp {item.amount.toLocaleString('id-ID')}</td>
                                      <td className="px-4 py-3 capitalize">{categoryLabel(item.category)}</td>
                                      <td className="px-4 py-3">
                                        {item.proof ? (
                                          <Button variant="ghost" size="sm" onClick={() => { setSelectedProof(item.proof); setProofModalOpen(true); }}>
                                            <Eye className="h-4 w-4 mr-1" /> Lihat
                                          </Button>
                                        ) : (
                                          <span className="text-xs text-muted-foreground italic">Tidak ada</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 w-[80px]"
                                            onClick={() => verifyPayment(item.id, "verified")}
                                            disabled={updateMutation.isPending}
                                          >
                                            {updateMutation.isPending && selectedTransaction?.id === item.id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              "Terima"
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-8 w-[80px]"
                                            onClick={() => deletePayment(item.id)}
                                            disabled={deleteMutation.isPending}
                                          >
                                            {deleteMutation.isPending ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              "Tolak"
                                            )}
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              Tidak ada pembayaran yang perlu diverifikasi.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Riwayat Pembayaran Kas ({treasury.filter(t => t.status === "verified").length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {Object.keys(groupedPaymentsData).length > 0 ? (
                          Object.keys(groupedPaymentsData)
                            .sort()
                            .reverse()
                            .map((year) => (
                              <div key={year} className="space-y-4">
                                <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                                  Tahun {year}
                                </div>
                                {Object.keys(groupedPaymentsData[year])
                                  .sort()
                                  .reverse()
                                  .map((monthNum) => (
                                    <div key={monthNum} className="space-y-3 ml-4">
                                      <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                        {groupedPaymentsData[year][monthNum][
                                          Object.keys(groupedPaymentsData[year][monthNum])[0]
                                        ][0]?.month}
                                      </div>
                                      {Object.keys(groupedPaymentsData[year][monthNum])
                                        .sort()
                                        .reverse()
                                        .map((day) => (
                                          <div key={day} className="ml-4">
                                            <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                              {day} {groupedPaymentsData[year][monthNum][day][0]?.dayName}
                                            </div>
                                            <div className="rounded border border-border overflow-hidden">
                                              <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/20 text-muted-foreground font-medium">
                                                  <tr>
                                                    <th className="px-3 py-2">Nama Anggota</th>
                                                    <th className="px-3 py-2">Nominal (Rp)</th>
                                                    <th className="px-3 py-2">Jenis</th>
                                                    <th className="px-3 py-2">Bukti</th>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2 text-right">Aksi</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                  {groupedPaymentsData[year][monthNum][day].map((item: any) => (
                                                    <tr key={item.id} className="bg-card hover:bg-muted/10 transition-colors">
                                                      <td className="px-3 py-2 font-medium">{item.userName}</td>
                                                      <td className="px-3 py-2 font-medium">Rp {item.amount.toLocaleString('id-ID')}</td>
                                                      <td className="px-3 py-2 text-xs">{categoryLabel(item.category)}</td>
                                                      <td className="px-3 py-2">
                                                        {item.proof && (
                                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedProof(item.proof); setProofModalOpen(true); }}>
                                                            <Eye className="h-3 w-3" />
                                                          </Button>
                                                        )}
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <Badge variant="outline" className={statusBadgeClass(item.status)}>
                                                          {item.status}
                                                        </Badge>
                                                      </td>
                                                      <td className="px-3 py-2 text-right">
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => deletePayment(item.id)}
                                                          disabled={deleteMutation.isPending}
                                                          className="text-xs text-destructive hover:text-destructive"
                                                        >
                                                          {deleteMutation.isPending ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                          ) : (
                                                            <Trash2 className="h-3 w-3" />
                                                          )}
                                                        </Button>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  ))}
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Belum ada pembayaran yang terverifikasi
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Income History */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Riwayat Pemasukan</h3>
                            <p className="text-sm text-slate-500">Total {treasury.filter(t => t.type === "in").length} transaksi</p>
                          </div>
                          {user?.role === "admin" && treasury.filter(t => t.type === "in").length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-10 px-4"
                              onClick={() => handleSegmentDelete('income')}
                              disabled={bulkDeleteMutation.isPending}
                            >
                              {bulkDeleteMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Menyinkronkan...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Bersihkan Pemasukan
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                              <th className="px-4 py-3">Tanggal</th>
                              <th className="px-4 py-3">Nama/Keterangan</th>
                              <th className="px-4 py-3">Kategori</th>
                              <th className="px-4 py-3">Nominal</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {treasury.filter(t => t.type === "in").length > 0 ? (
                              treasury.filter(t => t.type === "in").map((item) => (
                                <tr key={item.id} className="bg-card hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium">
                                    {format(new Date(item.date), "dd MMM yyyy", { locale: id })}
                                  </td>
                                  <td className="px-4 py-3">{item.userName || item.notes || "-"}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm">{categoryLabel(item.category)}</span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-emerald-600">Rp {item.amount.toLocaleString('id-ID')}</td>
                                  <td className="px-4 py-3">
                                    {item.status === "pending" ? (
                                      <Button
                                        size="sm"
                                        onClick={() => verifyPayment(item.id, "verified")}
                                        disabled={updateMutation.isPending}
                                        className="h-7 text-xs"
                                      >
                                        {updateMutation.isPending && selectedTransaction?.id === item.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          "Verifikasi"
                                        )}
                                      </Button>
                                    ) : (
                                      <Badge className={statusBadgeClass(item.status)}>
                                        {item.status === "verified" ? "Terverifikasi" : "Menunggu"}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 flex gap-2">
                                    {item.proof ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedProof(item.proof);
                                          setProofModalOpen(true);
                                        }}
                                        className="text-xs"
                                      >
                                        <Eye className="w-3 h-3 mr-1" /> Lihat Bukti
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTransaction(item);
                                          setUploadProofDialogOpen(true);
                                          setUploadProofPreview(null);
                                        }}
                                        className="text-xs"
                                      >
                                        <Upload className="w-3 h-3 mr-1" /> Upload Bukti
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePayment(item.id)}
                                      className="text-xs text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                  Belum ada pemasukan
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expense History */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Riwayat Pengeluaran</h3>
                            <p className="text-sm text-slate-500">Total {treasury.filter(t => t.type === "out" && t.status === "verified").length} transaksi terverifikasi</p>
                          </div>
                          {user?.role === "admin" && treasury.filter(t => t.type === "out" && t.status === "verified").length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-10 px-4"
                              onClick={() => handleSegmentDelete('expenses')}
                              disabled={bulkDeleteMutation.isPending}
                            >
                              {bulkDeleteMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Menyinkronkan...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Bersihkan Pengeluaran
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                              <th className="px-4 py-3">Tanggal</th>
                              <th className="px-4 py-3">Keterangan</th>
                              <th className="px-4 py-3">Kategori</th>
                              <th className="px-4 py-3">Nominal</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {treasury.filter(t => t.type === "out").length > 0 ? (
                              treasury.filter(t => t.type === "out").map((item) => (
                                <tr key={item.id} className="bg-card hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium">
                                    {format(new Date(item.date), "dd MMM yyyy", { locale: id })}
                                  </td>
                                  <td className="px-4 py-3">{item.notes || "-"}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm">{categoryLabel(item.category)}</span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-rose-600">Rp {item.amount.toLocaleString('id-ID')}</td>
                                  <td className="px-4 py-3">
                                    <Badge className="bg-slate-100 text-slate-700">Tercatat</Badge>
                                  </td>
                                  <td className="px-4 py-3 flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePayment(item.id)}
                                      disabled={deleteMutation.isPending}
                                      className="text-xs text-destructive hover:text-destructive"
                                    >
                                      {deleteMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                  Belum ada pengeluaran
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-primary text-primary-foreground border-none shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Bayar Kas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">Rp {treasuryTotals.income.toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-primary-foreground/70">Pembayaran terverifikasi</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600 currency">Rp {treasuryTotals.pendingIncome.toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-muted-foreground">{treasury.filter(t => t.type === "in" && t.status === "pending").length} menunggu verifikasi</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pembayaran</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold currency">Rp {(treasuryTotals.income + treasuryTotals.pendingIncome).toLocaleString('id-ID')}</div>
                        <p className="text-xs mt-1 text-muted-foreground">{treasury.filter(t => t.type === "in").length} transaksi</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Riwayat Pembayaran Kas Saya ({treasury.filter(t => t.type === "in").length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                              <th className="px-4 py-3">Tanggal</th>
                              <th className="px-4 py-3">Kategori</th>
                              <th className="px-4 py-3">Nominal</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {treasury.filter(t => t.type === "in").length > 0 ? (
                              treasury.filter(t => t.type === "in").map((item) => (
                                <tr key={item.id} className="bg-card hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium">
                                    {format(new Date(item.date), "dd MMM yyyy", { locale: id })}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm">{categoryLabel(item.category)}</span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-emerald-600">Rp {item.amount.toLocaleString('id-ID')}</td>
                                  <td className="px-4 py-3">
                                    {item.status === "pending" ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                    ) : (
                                      <Badge className={statusBadgeClass(item.status)}>
                                        {item.status === "verified" ? "Terverifikasi" : "Menunggu"}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 flex gap-2">
                                    {item.proof ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedProof(item.proof);
                                          setProofModalOpen(true);
                                        }}
                                        className="text-xs"
                                      >
                                        <Eye className="w-3 h-3 mr-1" /> Lihat Bukti
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTransaction(item);
                                          setUploadProofDialogOpen(true);
                                          setUploadProofPreview(null);
                                        }}
                                        className="text-xs"
                                      >
                                        <Upload className="w-3 h-3 mr-1" /> Upload Bukti
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePayment(item.id)}
                                      className="text-xs text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                  Belum ada pembayaran
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Proof Modal */}
              {proofModalOpen && selectedProof && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                  <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
                    <button
                      onClick={() => setProofModalOpen(false)}
                      className="absolute top-4 right-4 p-1 hover:bg-muted rounded"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-4">Bukti Pembayaran</h3>
                      <img
                        src={selectedProof}
                        alt="Bukti Pembayaran"
                        className="w-full h-auto rounded border border-border"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Dialog open={uploadProofDialogOpen} onOpenChange={setUploadProofDialogOpen}>
                <DialogContent className="sm:max-w-[425px] p-6 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Upload Bukti Pembayaran</DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Upload foto bukti pembayaran untuk transaksi {selectedTransaction?.userName || "-"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 pb-6">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={uploadProofInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadProofFile}
                        className="flex-1 h-[48px] rounded-2xl bg-slate-50 border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-[48px] w-[48px] rounded-2xl"
                        onClick={() => uploadProofInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {uploadProofPreview && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 block mb-2">Pratinjau Bukti</Label>
                        <div className="w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                          <img
                            src={uploadProofPreview}
                            alt="Preview"
                            className="w-full h-full object-cover transition-all hover:scale-105"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-[52px] rounded-2xl font-semibold"
                      onClick={() => setUploadProofDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      onClick={submitUploadProof}
                      disabled={!uploadProofPreview || isUploadingProof || isProcessingImage}
                      className="h-[52px] rounded-2xl font-bold shadow-md active:scale-95"
                    >
                      {isUploadingProof || isProcessingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isProcessingImage ? "Memproses..." : "Upload..."}
                        </>
                      ) : (
                        "Upload Sekarang"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Ruang Tambahan Akhir (160px) agar tidak tertutup Bottom Navigation */}
              <div className="h-40 w-full shrink-0" />
            </div>
          </div>
        </div>

        {/* Segmented Delete Confirmation Dialog */}
        <AlertDialog open={showSegmentDeleteDialog} onOpenChange={setShowSegmentDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Konfirmasi Penghapusan
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-700">
                {segmentToDelete === 'income' && (
                  <>
                    Anda akan menghapus <span className="font-semibold text-slate-900">semua data Pemasukan</span>.
                    Saldo akan diperbarui dan mungkin menjadi <span className="font-semibold text-red-600">negatif</span> jika
                    masih ada pengeluaran tersisa.
                  </>
                )}
                {segmentToDelete === 'expenses' && (
                  <>
                    Anda akan menghapus <span className="font-semibold text-slate-900">semua data Pengeluaran yang terverifikasi</span>.
                    Saldo akan meningkat secara otomatis.
                  </>
                )}
                {segmentToDelete === 'queue' && (
                  <>
                    Anda akan menghapus <span className="font-semibold text-slate-900">semua transaksi di Antrean</span>.
                    Hanya data terverifikasi yang akan tersisa.
                  </>
                )}
                <br /><br />
                <span className="text-red-600 font-medium">Tindakan ini tidak dapat dibatalkan.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmSegmentDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ya, Hapus Sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageTransition>
    </DashboardLayout>
  );
}
