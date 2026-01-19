import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Plus, Wallet, Download, Lock, Loader2, Upload, Trash2, AlertTriangle, Eye, X, FileText } from "lucide-react";
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


  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const { data: treasury = [], isLoading: isFetchingTreasury } = useQuery<any[]>({
    queryKey: ["/api/treasury"],
    select: (data) => {
      if (user?.role === "anggota") {
        return data.filter((t: any) => String(t.userId) === String(user.id));
      }
      return data;
    }
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/treasury", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      toast({
        title: "Berhasil!",
        description: user?.role === "admin" ? "Pembayaran kas anggota sudah dicatat." : "Pembayaran kas Anda sudah disimpan dan menunggu verifikasi admin.",
      });
      form.reset();
      setProofPreview(null);
      setSelectedUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Tidak bisa menyimpan pembayaran. Coba lagi.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/treasury/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Tidak bisa memperbarui data kas.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/treasury/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      toast({ title: "Berhasil!", description: "Data kas dihapus." });
    },
    onError: () => {
      toast({ title: "Gagal", description: "Tidak bisa menghapus data.", variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/treasury-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      toast({ title: "Berhasil!", description: "Semua data kas dihapus." });
    },
  });

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

  async function onSubmit(values: TreasuryFormData) {
    const userId = user?.role === "admin" && selectedUserId ? selectedUserId : user?.id;
    createMutation.mutate({
      userId,
      type: "in",
      status: user?.role === "admin" ? "verified" : "pending",
      ...values,
    });
  }

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

  const calculateTotals = () => {
    const income = treasury
      .filter(t => t.type === "in" && t.status === "verified")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = treasury
      .filter(t => t.type === "out")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  };

  // Group verified payments by year, month, and date
  const groupedVerifiedPayments = () => {
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
  };

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
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Kas & Treasury
            </h2>
            <p className="text-muted-foreground">
              {user?.role === "admin" ? "Transparansi keuangan organisasi." : "Isi pembayaran kas Anda."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                onClick={exportComplianceReport}
                disabled={isLoading}
                className="border-primary/20 hover:bg-primary/5"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Export Laporan Kepatuhan
              </Button>
            )}

            {/* Member Kas Button */}
            {user?.role === "anggota" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-md shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Isi Pembayaran Kas
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Isi Pembayaran Kas</DialogTitle>
                    <DialogDescription>
                      Isi form berikut untuk melaporkan pembayaran kas Anda.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          {...form.register("date")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="50000"
                          {...form.register("amount", { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Jenis Pembayaran</Label>
                      <Select value={form.watch("category")} onValueChange={(val) => form.setValue("category", val as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iuran_wajib">Iuran Wajib Bulanan</SelectItem>
                          <SelectItem value="iuran_sukarela">Sumbangan Sukarela</SelectItem>
                          <SelectItem value="denda">Denda Keterlambatan</SelectItem>
                          <SelectItem value="lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Keterangan</Label>
                      <Textarea
                        id="notes"
                        placeholder="Contoh: Transfer via BCA..."
                        {...form.register("notes")}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>QRIS Pembayaran</Label>
                      <div className="border border-border rounded-lg p-3 bg-muted/20">
                        <img
                          src={qrisImage}
                          alt="QRIS Meraki Berbagi"
                          className="w-full h-auto rounded"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-2">Scan QRIS di atas untuk pembayaran</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proof">Bukti Transfer (Foto)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          id="proof"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      {proofPreview && (
                        <div className="mt-2 relative">
                          <img
                            src={proofPreview}
                            alt="Preview"
                            className="h-24 w-24 object-cover rounded border border-border"
                          />
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending || isProcessingImage}>
                        {createMutation.isPending || isProcessingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isProcessingImage ? "Memproses Gambar..." : "Mengirim..."}
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member">Pilih Anggota</Label>
                      <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih anggota" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          {...form.register("date")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="50000"
                          {...form.register("amount", { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Jenis Pembayaran</Label>
                      <Select value={form.watch("category")} onValueChange={(val) => form.setValue("category", val as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iuran_wajib">Iuran Wajib Bulanan</SelectItem>
                          <SelectItem value="iuran_sukarela">Sumbangan Sukarela</SelectItem>
                          <SelectItem value="denda">Denda Keterlambatan</SelectItem>
                          <SelectItem value="lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Keterangan</Label>
                      <Textarea
                        id="notes"
                        placeholder="Catatan pembayaran..."
                        {...form.register("notes")}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menyimpan...
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
                  <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="exp-date">Tanggal</Label>
                        <Input
                          id="exp-date"
                          type="date"
                          {...expenseForm.register("date")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exp-amount">Jumlah (Rp)</Label>
                        <Input
                          id="exp-amount"
                          type="number"
                          placeholder="50000"
                          {...expenseForm.register("amount", { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exp-category">Kategori Pengeluaran</Label>
                      <Select value={expenseForm.watch("category")} onValueChange={(val) => expenseForm.setValue("category", val as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="konsumsi">Konsumsi Rapat</SelectItem>
                          <SelectItem value="souvenir">Souvenir</SelectItem>
                          <SelectItem value="hadiah">Hadiah</SelectItem>
                          <SelectItem value="operasional">Operasional</SelectItem>
                          <SelectItem value="lainnya">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exp-notes">Keterangan</Label>
                      <Textarea
                        id="exp-notes"
                        placeholder="Deskripsi pengeluaran..."
                        {...expenseForm.register("notes")}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menyimpan...
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

        {/* Admin Treasury View */}
        {user?.role === "admin" ? (
          <>
            {(() => {
              const totals = calculateTotals();
              return (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-primary text-primary-foreground border-none shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Saldo Kas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">Rp {totals.balance.toLocaleString('id-ID')}</div>
                      <p className="text-xs mt-1 text-primary-foreground/70">Total: Pemasukan - Pengeluaran</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600">Rp {totals.income.toLocaleString('id-ID')}</div>
                      <p className="text-xs mt-1 text-muted-foreground">Dari {treasury.filter(t => t.type === "in" && t.status === "verified").length} pembayaran terverifikasi</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-rose-600">Rp {totals.expense.toLocaleString('id-ID')}</div>
                      <p className="text-xs mt-1 text-muted-foreground">Dari {treasury.filter(t => t.type === "out").length} pengeluaran</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Pending Payments Section for Admin */}
            {user?.role === "admin" && (
              <Card className="shadow-sm border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Menunggu Verifikasi ({treasury.filter(t => t.status === "pending").length})
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
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                      onClick={() => verifyPayment(item.id, "verified")}
                                    >
                                      Terima
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8"
                                      onClick={() => deletePayment(item.id)}
                                    >
                                      Tolak
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
                  {Object.keys(groupedVerifiedPayments()).length > 0 ? (
                    Object.keys(groupedVerifiedPayments())
                      .sort()
                      .reverse()
                      .map((year) => (
                        <div key={year} className="space-y-4">
                          <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                            Tahun {year}
                          </div>
                          {Object.keys(groupedVerifiedPayments()[year])
                            .sort()
                            .reverse()
                            .map((monthNum) => (
                              <div key={monthNum} className="space-y-3 ml-4">
                                <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                  {groupedVerifiedPayments()[year][monthNum][
                                    Object.keys(groupedVerifiedPayments()[year][monthNum])[0]
                                  ][0]?.month}
                                </div>
                                {Object.keys(groupedVerifiedPayments()[year][monthNum])
                                  .sort()
                                  .reverse()
                                  .map((day) => (
                                    <div key={day} className="ml-4">
                                      <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                        {day} {groupedVerifiedPayments()[year][monthNum][day][0]?.dayName}
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
                                            {groupedVerifiedPayments()[year][monthNum][day].map((item) => (
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
                                                    className="text-xs text-destructive hover:text-destructive"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">Riwayat Pemasukan ({treasury.filter(t => t.type === "in").length})</CardTitle>
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
                                  className="h-7 text-xs"
                                >
                                  Verifikasi
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium">Riwayat Pengeluaran ({treasury.filter(t => t.type === "out").length})</CardTitle>
                <Button variant="destructive" size="sm" onClick={clearAllTreasury}>
                  <Trash2 className="mr-1 h-3 w-3" /> Hapus Semua
                </Button>
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
                  <div className="text-3xl font-bold">Rp {treasury.filter(t => t.type === "in" && t.status === "verified").reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}</div>
                  <p className="text-xs mt-1 text-primary-foreground/70">Pembayaran terverifikasi</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">Rp {treasury.filter(t => t.type === "in" && t.status === "pending").reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}</div>
                  <p className="text-xs mt-1 text-muted-foreground">{treasury.filter(t => t.type === "in" && t.status === "pending").length} menunggu verifikasi</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">Rp {treasury.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0).toLocaleString('id-ID')}</div>
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

        {/* Upload Proof Dialog */}
        <Dialog open={uploadProofDialogOpen} onOpenChange={setUploadProofDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
              <DialogDescription>
                Upload foto bukti pembayaran untuk transaksi {selectedTransaction?.userName || "-"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  ref={uploadProofInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadProofFile}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => uploadProofInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {uploadProofPreview && (
                <div className="relative">
                  <img
                    src={uploadProofPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded border border-border"
                  />
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadProofDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={submitUploadProof}
                  disabled={!uploadProofPreview || isUploadingProof || isProcessingImage}
                >
                  {isUploadingProof || isProcessingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isProcessingImage ? "Memproses..." : "Upload..."}
                    </>
                  ) : (
                    "Upload Bukti"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
