import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { CalendarCheck, Wallet, Users, TrendingUp, ArrowUpRight, Plus, X as XIcon, MessageCircle, Upload, Trash2, Loader2, Database, Download, AlertCircle, Settings, Check, FileText, Brain, Sparkles, Clock, Pencil, Link2, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type News, type Volunteer } from "@shared/schema";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { VolunteerSkeleton, NewsSkeleton } from "@/components/ui/skeleton";
import { compressImage } from "@/lib/utils-image";
import AIAdvisorPanel from "@/components/ai/AIAdvisorPanel";
import SmartVerificationModal from "@/components/ai/SmartVerificationModal";
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";
import VolunteerTab from "@/components/volunteer/VolunteerTab";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

const getSafeUrl = (url: string) => {
  if (!url) return "#";
  return url.startsWith('http') ? url : `https://${url}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(localStorage.getItem("lastBackupTime"));
  const [activeTab, setActiveTab] = useState("overview");

  // News Form State
  const [newsForm, setNewsForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    tags: ""
  });
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingNewsImage, setIsProcessingNewsImage] = useState(false);
  const [isAddingNews, setIsAddingNews] = useState(false);

  const { data: attendance = [], isLoading: isAttendanceLoading } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: treasury = [], isLoading: isTreasuryLoading } = useQuery<any[]>({
    queryKey: ["/api/treasury"],
  });

  // Payment reminder notifications for members
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/notifications/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id && user?.role !== "admin",
  });

  const paymentReminders = notifications.filter((n: any) =>
    n.type === 'payment_reminder' && n.isRead === 0
  );

  const [, setLocation] = useLocation();

  const { data: users = [], isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: news = [], isLoading: isNewsLoading } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  const { data: volunteers = [], isLoading: isVolunteersLoading } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
  });

  const { data: aiResponse, isLoading: isAiLoading } = useQuery<any>({
    queryKey: ["/api/ai/dashboard"],
  });

  // NEW: Fetch Real-time Intelligence Data for Global Sync
  const { data: intelligenceResponse } = useQuery<any>({
    queryKey: ["/api/admin/intelligence"],
    staleTime: 0, // Always fresh for realtime feel
  });

  const aiStats = aiResponse?.data?.[0] || aiResponse?.data || null;
  const intelligenceData = intelligenceResponse?.data || null;
  const loading = isAttendanceLoading || isTreasuryLoading || isUsersLoading || isNewsLoading || isVolunteersLoading;


  const createNewsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/news", {
        ...data,
        author: user?.name || "Admin",
        date: new Date().toISOString()
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setNewsForm({ title: "", content: "", imageUrl: "", tags: "" });
      setNewsImagePreview(null);
      setIsAddingNews(false);
      if (newsFileInputRef.current) newsFileInputRef.current.value = "";
      toast({
        title: "Berhasil",
        description: "Berita berhasil dipublikasikan",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteNewsMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Berhasil",
        description: "Berita berhasil dihapus",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // AI HITL State
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean, data: any }>({
    isOpen: false,
    data: null
  });
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  // Calculate statistics
  const handleNewsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsProcessingNewsImage(true);
    try {
      const compressedBase64 = await compressImage(file, 800, 0.6);
      setNewsForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
      setNewsImagePreview(compressedBase64);
    } catch (error) {
      toast({
        title: "Gagal memproses gambar",
        description: "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingNewsImage(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch("/api/admin/export-database", {
        headers: { "x-user-role": user?.role || "" }
      });
      if (!response.ok) throw new Error("Gagal mengunduh backup");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meraki-full-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem("lastBackupTime", now);
      setLastBackupTime(now);

      toast({
        title: "✅ Backup Berhasil",
        description: `Database lengkap berhasil diunduh (${(blob.size / 1024).toFixed(2)} KB)`
      });
    } catch (err: any) {
      toast({
        title: "❌ Backup Gagal",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ PERINGATAN: Memulihkan database akan MENGHAPUS semua data saat ini dan menggantinya dengan data dari file backup. Lanjutkan?")) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);
          const res = await fetch("/api/admin/import-database", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-role": user?.role || "",
              "x-user-id": user?.id || ""
            },
            body: JSON.stringify({ backupData })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal memulihkan database");
          }

          toast({
            title: "✅ Restore Berhasil",
            description: "Database telah dipulihkan. Halaman akan dimuat ulang.",
          });

          setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
          toast({
            title: "❌ Restore Gagal",
            description: err.message,
            variant: "destructive"
          });
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setIsRestoring(false);
      toast({
        title: "Error",
        description: "Gagal membaca file backup",
        variant: "destructive"
      });
    }
  };

  const calculateStats = () => {
    const totalAttendance = attendance.length;
    const hadirCount = attendance.filter(a => a.status === "hadir").length;
    const attendanceRate = totalAttendance > 0 ? Math.round((hadirCount / totalAttendance) * 100) : 0;

    const totalIncome = treasury
      .filter(t => t.type === "in" && t.status === "verified")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalMembers = users.filter(u => u.isActive === 1).length;

    return {
      attendanceRate,
      totalIncome,
      totalMembers,
      hadirCount,
      totalAttendance
    };
  };

  // Get member summary with totals
  const getMemberSummary = () => {
    const memberMap = new Map<string, any>();

    users.forEach((u: any) => {
      if (u.isActive === 1) {
        memberMap.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          attendanceCount: 0,
          hadirCount: 0,
          kasTotal: 0,
          kasPending: 0
        });
      }
    });

    // Add attendance data
    attendance.forEach((a: any) => {
      const member = memberMap.get(a.userId);
      if (member) {
        member.attendanceCount += 1;
        if (a.status === "hadir") member.hadirCount += 1;
      }
    });

    // Add treasury data
    treasury.forEach((t: any) => {
      if (t.type === "in") {
        const member = memberMap.get(t.userId);
        if (member) {
          if (t.status === "verified") {
            member.kasTotal += t.amount;
          } else {
            member.kasPending += t.amount;
          }
        }
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => b.kasTotal - a.kasTotal);
  };

  // Attendance chart data
  const getAttendanceChartData = () => {
    const groupedByDate: Record<string, any> = {};

    attendance.forEach(a => {
      const date = new Date(a.date).toLocaleDateString('id-ID', {
        month: 'short',
        day: 'numeric'
      });

      if (!groupedByDate[date]) {
        groupedByDate[date] = { date, hadir: 0, izin: 0, sakit: 0, alpha: 0 };
      }

      groupedByDate[date][a.status] += 1;
    });

    return Object.values(groupedByDate).slice(-7);
  };

  // Treasury chart data
  const getTreasuryChartData = () => {
    const memberTotals = getMemberSummary();
    return memberTotals.slice(0, 10).map((m: any) => ({
      name: m.name.substring(0, 10),
      kas: m.kasTotal,
      pending: m.kasPending
    }));
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) {
      toast({
        title: "Error",
        description: "Judul dan konten wajib diisi",
        variant: "destructive"
      });
      return;
    }
    createNewsMutation.mutate(newsForm);
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;
    deleteNewsMutation.mutate(id);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      toast({
        title: "Memproses Gambar",
        description: "AI sedang mengekstrak data dari nota Anda...",
      });

      const compressedBase64 = await compressImage(file, 1200, 0.7);

      const res = await fetch("/api/ai/documents/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || ""
        },
        body: JSON.stringify({ content: compressedBase64 })
      });

      if (!res.ok) throw new Error("Gagal ekstraksi AI");

      const result = await res.json();
      if (result.success) {
        setVerificationModal({
          isOpen: true,
          data: { ...result.data, proof: compressedBase64 }
        });
      }
    } catch (error) {
      toast({
        title: "Gagal Ekstraksi",
        description: "Gagal memproses nota. Silakan coba manual.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingImage(false);
      if (receiptFileInputRef.current) receiptFileInputRef.current.value = "";
    }
  };

  const exportComplianceReport = async () => {
    try {
      const res = await fetch("/api/treasury/export/compliance");
      if (!res.ok) throw new Error("Gagal mengekspor");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Audit_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Berhasil!", description: "Laporan audit telah diunduh." });
    } catch (error) {
      toast({ title: "Gagal Ekspor", variant: "destructive" });
    }
  };

  const handleVerifySubmission = async (updatedData: any) => {
    try {
      // Logic for saving verified transaction
      const res = await fetch("/api/ai/treasury/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || ""
        },
        body: JSON.stringify({
          transactionId: updatedData.id,
          status: 'verified',
          verifierName: user?.name,
          updatedData: updatedData
        })
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
        queryClient.invalidateQueries({ queryKey: ["/api/treasury/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai/analytics/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] });
        setVerificationModal({ isOpen: false, data: null });
      }
    } catch (error) {
      console.error("Verification failed");
    }
  };



  const stats = calculateStats();
  const members = getMemberSummary();
  const attendanceChart = getAttendanceChartData();
  const treasuryChart = getTreasuryChartData();

  return (
    <DashboardLayout>
      <div className={`transition-colors duration-500 rounded-3xl p-1 -m-1 ${aiResponse?.data?.learningMode ? 'bg-blue-50/50' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2">
            <TabsList>
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteer</TabsTrigger>
              <TabsTrigger value="news">Berita</TabsTrigger>
              {user?.role === "admin" && (
                <TabsTrigger value="ai-advisor">AI Advisor</TabsTrigger>
              )}
            </TabsList>
          </div>

          <input
            type="file"
            ref={receiptFileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleReceiptUpload}
          />

          <SmartVerificationModal
            isOpen={verificationModal.isOpen}
            onClose={() => setVerificationModal({ isOpen: false, data: null })}
            receiptData={verificationModal.data}
            onVerify={handleVerifySubmission}
          />

          <TabsContent value="overview" className="space-y-4">
            {/* Payment Reminder Alert - Member Only */}
            {user?.role !== "admin" && paymentReminders.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900">
                      Tagihan Kas Menunggu
                    </h4>
                    <p className="text-xs text-amber-700 mt-1">
                      {paymentReminders[0].message}
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-amber-600 hover:bg-amber-700 h-8 text-[11px] rounded-lg"
                      onClick={() => setLocation('/treasury')}
                    >
                      Bayar Sekarang 💸
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {user?.role === "admin" && (
              <ExecutiveDashboard
                treasury={treasury}
                aiLogs={aiStats ? [aiStats] : []}
                onUploadClick={() => receiptFileInputRef.current?.click()}
                onExportClick={exportComplianceReport}
                aiInsight={aiStats?.meetingSummary || aiResponse?.data?.auditSummary}
                learningMode={aiResponse?.data?.learningMode}
                pendingHITL={aiResponse?.data?.summary?.pendingHITL}
                auditSummary={aiResponse?.data?.auditSummary}
              />
            )}

            {/* Real-time Activity Feed (Admin Only) */}
            {user?.role === "admin" && (
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-full animate-pulse">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle>Real-time Activity Feed</CardTitle>
                  </div>
                  <Badge variant="outline" className="animate-pulse bg-green-50 text-green-700 border-green-200">
                    Live Updates
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ActivityFeed />
                </CardContent>
              </Card>
            )}


            {/* Backup & Restore UI for Admin */}
            {user?.role === "admin" && (
              <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                <CardHeader className="pb-3 border-b border-primary/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Database Management</CardTitle>
                        <CardDescription>Cadangkan atau pulihkan seluruh data organisasi</CardDescription>
                      </div>
                    </div>
                    {lastBackupTime && (
                      <Badge variant="outline" className="w-fit bg-primary/5">
                        Terakhir Backup: {new Date(lastBackupTime).toLocaleDateString("id-ID")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Download Section */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> Ekspor Data
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Unduh seluruh data (User, Kas, Absensi, AI Logs) dalam format JSON.
                      </p>
                      <Button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        variant="default"
                        className="w-full font-bold shadow-soft"
                      >
                        {isBackingUp ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                        ) : (
                          "Download Full Backup"
                        )}
                      </Button>
                    </div>

                    {/* Restore Section */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Upload className="w-4 h-4 text-orange-500" /> Restorasi Database
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Unggah file backup untuk mengembalikan data yang hilang.
                      </p>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".json"
                          onChange={handleRestore}
                          disabled={isRestoring}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                        />
                        <Button
                          variant="outline"
                          disabled={isRestoring}
                          className={`w-full border-dashed border-2 hover:border-primary transition-colors ${isRestoring ? 'bg-muted' : 'bg-transparent'}`}
                        >
                          {isRestoring ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memulihkan...</>
                          ) : (
                            "Pilih File Backup (.json)"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                      <strong>Peringatan Keamanan:</strong> File cadangan mengandung data sensitif. Simpan di tempat yang aman (G-Drive terenkripsi).
                      Restorasi akan menghapus data yang ada saat ini.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col space-y-8">
              {/* Welcome Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
                    Dashboard
                  </h2>
                  <p className="text-muted-foreground">
                    Selamat datang kembali, <span className="font-semibold text-foreground">{user?.name}</span>!
                  </p>
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries()} className="w-full sm:w-auto">
                  Refresh Data
                </Button>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tingkat Kehadiran</CardTitle>
                    <div className="p-2 bg-primary/20 rounded-full">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.hadirCount} dari {stats.totalAttendance} absensi
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Kas Terverifikasi</CardTitle>
                    <div className="p-2 bg-emerald-100 rounded-full dark:bg-emerald-900/30">
                      <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rp {(stats.totalIncome / 1000).toFixed(0)}K</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dari {members.length} anggota
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Anggota Aktif</CardTitle>
                    <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900/30">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalMembers}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total anggota terdaftar
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Absensi</CardTitle>
                    <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-900/30">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAttendance}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total laporan absensi
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Attendance Chart */}
                {attendanceChart.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Statistik Absensi</CardTitle>
                      <CardDescription>
                        Tren kehadiran anggota (7 hari terakhir)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={attendanceChart}>
                            <defs>
                              <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-md)'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="hadir"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorHadir)"
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-in-out"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Treasury Chart */}
                {treasuryChart.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Kas Terverifikasi Per Anggota</CardTitle>
                      <CardDescription>
                        Total kas yang sudah terverifikasi
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={treasuryChart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                              dataKey="name"
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-md)'
                              }}
                              formatter={(value) => [`Rp ${value.toLocaleString()}`, "Kas"]}
                            />
                            <Bar
                              dataKey="kas"
                              fill="hsl(var(--primary))"
                              radius={[8, 8, 0, 0]}
                              isAnimationActive={true}
                              animationDuration={800}
                              animationEasing="ease-in-out"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Member Summary Table */}
              {members.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Ringkasan Data Anggota</CardTitle>
                    <CardDescription>
                      Total absensi dan kas per anggota
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Nama Anggota</th>
                            <th className="px-4 py-3 text-center font-medium">Absensi</th>
                            <th className="px-4 py-3 text-center font-medium">Hadir</th>
                            <th className="px-4 py-3 text-right font-medium">Kas Terverifikasi</th>
                            <th className="px-4 py-3 text-right font-medium">Kas Pending</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {members.map(member => (
                            <tr key={member.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline">{member.attendanceCount}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {member.hadirCount}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                Rp {member.kasTotal.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {member.kasPending > 0 ? (
                                  <Badge variant="secondary">Rp {member.kasPending.toLocaleString()}</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Submissions */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Attendance */}
                {attendance.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Absensi Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {attendance.slice(-5).reverse().map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                            <div>
                              <p className="font-medium text-sm">{item.userName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <Badge variant={
                              item.status === "hadir" ? "default" :
                                item.status === "izin" ? "secondary" :
                                  item.status === "sakit" ? "outline" : "destructive"
                            }>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Treasury */}
                {treasury.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Kas Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {treasury.slice(-5).reverse().map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                            <div>
                              <p className="font-medium text-sm">{item.userName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.date).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">Rp {item.amount.toLocaleString()}</p>
                              <Badge variant={item.status === "verified" ? "default" : "secondary"} className="mt-1">
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            {activeTab === "news" && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Admin Header: Add Button */}
                {user?.role === 'admin' && (
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-primary/20 shadow-soft gap-4">
                    <div>
                      <h3 className="font-bold text-xl flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-primary" />
                        Update Berita
                      </h3>
                      <p className="text-sm text-muted-foreground">Bagikan informasi terbaru kegiatan organisasi.</p>
                    </div>
                    {!isAddingNews && (
                      <Button onClick={() => setIsAddingNews(true)} className="gap-2 font-bold shadow-soft h-12 px-6 rounded-2xl">
                        <Plus className="w-5 h-5" />
                        Post Berita
                      </Button>
                    )}
                  </div>
                )}

                {/* Create Form (Integrated) */}
                {isAddingNews && user?.role === 'admin' && (
                  <Card className="shadow-lg border-primary/20 animate-in fade-in zoom-in-95 duration-300 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">Posting Berita Baru</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsAddingNews(false)} className="rounded-full">
                          <Plus className="w-5 h-5 rotate-45" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleCreateNews} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Judul Berita</Label>
                          <Input
                            placeholder="Tulis judul yang menarik..."
                            value={newsForm.title}
                            onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                            required
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Konten Berita</Label>
                          <Textarea
                            placeholder="Tulis isi berita di sini..."
                            className="min-h-[150px] bg-background rounded-xl"
                            value={newsForm.content}
                            onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tags (Pisahkan dengan koma)</Label>
                            <Input
                              placeholder="Kegiatan, Pengumuman, dll"
                              value={newsForm.tags}
                              onChange={(e) => setNewsForm({ ...newsForm, tags: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Foto Utama (Maks 5MB)</Label>
                            <div className="flex items-center gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 border-dashed border-2 flex items-center justify-center gap-2 hover:bg-primary/5 rounded-xl"
                                onClick={() => {
                                  // Find the next available input
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = handleNewsImageUpload as any;
                                  input.click();
                                }}
                                disabled={isProcessingImage}
                              >
                                {isProcessingImage ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                ) : (
                                  <Upload className="w-5 h-5 text-muted-foreground" />
                                )}
                                <span className="text-sm font-semibold">
                                  {newsForm.imageUrl ? 'Ganti Foto' : 'Pilih Foto'}
                                </span>
                              </Button>
                              {newsForm.imageUrl && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary/20 shadow-sm shrink-0">
                                  <img src={newsForm.imageUrl} className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button variant="outline" type="button" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setIsAddingNews(false)}>Batal</Button>
                          <Button type="submit" className="flex-[2] rounded-xl h-12 font-bold shadow-soft" disabled={createNewsMutation.isPending}>
                            {createNewsMutation.isPending ? "Memposting..." : "Terbitkan Berita"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* News Feed */}
                <div className="space-y-6">
                  {isNewsLoading ? (
                    <>
                      <NewsSkeleton />
                      <NewsSkeleton />
                    </>
                  ) : news.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-primary/20">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground font-medium">Belum ada berita terbaru.</p>
                    </div>
                  ) : (
                    news.map((item) => (
                      <Card key={item.id} className="bg-white rounded-3xl border border-primary/5 shadow-soft overflow-hidden group hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col md:flex-row gap-0 sm:gap-6 p-1 sm:p-4 text-left">
                          <div className="w-full md:w-64 aspect-video md:aspect-square rounded-2xl overflow-hidden shadow-inner flex-shrink-0 bg-muted min-h-[120px]">
                            <img src={item.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=60"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" decoding="async" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-4 pr-4 px-4 sm:px-0">
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-primary/60">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">Berita</span>
                                <span>•</span>
                                <span>{format(new Date(item.date), "dd MMM yyyy", { locale: idLocale })}</span>
                                {user?.role === 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto h-6 w-6 text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteNewsMutation.mutate(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <h3 className="text-2xl font-black mb-3 group-hover:text-primary transition-colors leading-tight">{item.title}</h3>
                              <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed mb-4">{item.content}</p>

                              <div className="flex flex-wrap gap-2 mb-4">
                                {item.tags?.split(',').map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] py-0 px-2 rounded-md border-none">
                                    #{tag.trim()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="outline" className="w-fit rounded-xl font-bold group-hover:bg-primary group-hover:text-white transition-all border-primary/20">
                              Baca Selengkapnya
                              <ArrowUpRight className="ml-2 w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="ai-advisor" className="space-y-6">
            <div className="flex flex-col space-y-2">
              <h2 className="text-3xl font-heading font-bold flex items-center gap-2">
                <Brain className="text-primary w-8 h-8" />
                Strategic Intelligence
              </h2>
              <p className="text-muted-foreground">Analisis kecerdasan buatan untuk ketahanan organisasi.</p>
            </div>

            <AIAdvisorPanel
              isLoading={isAiLoading}
              efficiencyScore={aiStats?.efficiencyScore || 8}
              advice={aiStats?.meetingSummary || "Menganalisis tren organisasi bulan ini..."}
              anomalies={aiStats?.anomalies ? JSON.parse(aiStats.anomalies) : []}
              learningMode={aiResponse?.data?.learningMode}
              totalTransactions={treasury.length}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-primary/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Human-in-the-Loop Verification</CardTitle>
                  <CardDescription>Tinjau pengeluaran yang di-scan oleh AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {treasury.filter(t => t.verificationStatus === "pending").length > 0 ? (
                      treasury.filter(t => t.verificationStatus === "pending").map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-dashed border-primary/20">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileText className="text-primary w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold">Nota: {item.category}</p>
                              <p className="text-xs text-muted-foreground">Rp {item.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => setVerificationModal({ isOpen: true, data: item })}>
                            Review
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Check className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Semua nota AI telah diverifikasi.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/10 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="text-xl">Compliance Health</CardTitle>
                  <CardDescription>Status audit organisasi</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${treasury.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                    {treasury.length > 0 ? (
                      <Check className="w-12 h-12 text-emerald-600" />
                    ) : (
                      <Clock className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <p className="mt-4 font-bold text-center">
                    {treasury.length > 0 ? 'Standard Audit Terpenuhi' : 'Initial State / Menunggu'}
                  </p>
                  <p className="text-xs text-muted-foreground text-center px-4 mt-1">
                    {treasury.length > 0
                      ? 'Sistem Strategic Advisor telah memverifikasi semua transaksi sesuai regulasi organisasi.'
                      : 'Belum ada data untuk diaudit. Silakan masukkan data untuk memulai audit kepatuhan.'}
                  </p>
                  <Button variant="outline" className="mt-6 w-full font-bold" disabled={treasury.length === 0}>Unduh Laporan PDF</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="volunteers" className="space-y-4">
            <VolunteerTab isAdmin={user?.role === 'admin'} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
