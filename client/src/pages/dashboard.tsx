import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CalendarCheck, Wallet, Users, TrendingUp, ArrowUpRight, Plus, X as XIcon, MessageCircle, Upload, Trash2, Loader2, Database, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRef, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { type News } from "@shared/schema";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { compressImage } from "@/lib/utils-image";
import AIAdvisorPanel from "@/components/ai/AIAdvisorPanel";
import SmartVerificationModal from "@/components/ai/SmartVerificationModal";
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";
import { Sparkles, Brain, Check, FileText } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [treasury, setTreasury] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(localStorage.getItem("lastBackupTime"));

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

  // AI Advisor & HITL State
  const [aiStats, setAiStats] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean, data: any }>({
    isOpen: false,
    data: null
  });
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { "ngrok-skip-browser-warning": "true" };
      const [attendRes, treasuryRes, usersRes, newsRes, aiRes] = await Promise.all([
        fetch("/api/attendance", { headers }),
        fetch("/api/treasury", { headers }),
        fetch("/api/users", { headers }),
        fetch("/api/news", { headers }),
        fetch("/api/ai/analytics/stats", { headers }),
      ]);

      if (attendRes.ok) setAttendance(await attendRes.json());
      if (treasuryRes.ok) setTreasury(await treasuryRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (newsRes.ok) setNews(await newsRes.json());
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiStats(aiData.data[0] || null);
      }
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

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
      a.download = `meraki-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem("lastBackupTime", now);
      setLastBackupTime(now);

      toast({
        title: "✅ Backup Berhasil",
        description: `Database berhasil diunduh (${(blob.size / 1024).toFixed(2)} KB)`
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

    users.forEach(u => {
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
    attendance.forEach(a => {
      const member = memberMap.get(a.userId);
      if (member) {
        member.attendanceCount += 1;
        if (a.status === "hadir") member.hadirCount += 1;
      }
    });

    // Add treasury data
    treasury.forEach(t => {
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
    return memberTotals.slice(0, 10).map(m => ({
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

    try {
      setIsSubmittingNews(true);
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newsForm,
          author: user?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error("Gagal membuat berita");

      const newPost = await res.json();
      setNews([newPost, ...news]);
      setNewsForm({ title: "", content: "", imageUrl: "", tags: "" });
      setNewsImagePreview(null);
      if (newsFileInputRef.current) newsFileInputRef.current.value = "";
      toast({
        title: "Berhasil",
        description: "Berita berhasil dipublikasikan",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memposting berita",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;

    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");

      setNews(news.filter(n => n.id !== id));
      toast({
        title: "Berhasil",
        description: "Berita berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus berita",
        variant: "destructive"
      });
    }
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: updatedData.id,
          status: 'verified',
          verifierName: user?.name,
          updatedData: updatedData
        })
      });

      if (res.ok) {
        fetchData();
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
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2">
          <TabsList>
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="news">Berita & Informasi</TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="ai-advisor">AI Strategic Advisor</TabsTrigger>
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
          {user?.role === "admin" && (
            <ExecutiveDashboard
              treasury={treasury}
              aiLogs={aiStats ? [aiStats] : []}
              onUploadClick={() => receiptFileInputRef.current?.click()}
              onExportClick={exportComplianceReport}
              aiInsight={aiStats?.meetingSummary}
            />
          )}

          {/* Backup UI for Admin */}
          {user?.role === "admin" && (
            <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Database Backup</CardTitle>
                    <CardDescription>Keamanan data organisasi adalah prioritas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="w-full sm:w-auto font-bold shadow-soft px-8"
                    size="lg"
                  >
                    {isBackingUp ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunduh...</>
                    ) : (
                      <><Download className="mr-2 h-4 w-4" /> Download Cadangan Database</>
                    )}
                  </Button>

                  {lastBackupTime && (
                    <p className="text-sm text-muted-foreground italic">
                      Terakhir dicadangkan: {new Date(lastBackupTime).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </p>
                  )}
                </div>

                <Alert className="bg-amber-500/10 border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                    <strong>Penting:</strong> Simpan file .json ini di Google Drive rahasia Meraki.
                    Meskipun password telah disensor, iuran anggota tetap bersifat pribadi.
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
              <Button variant="outline" onClick={fetchData} className="w-full sm:w-auto">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* News List */}
            <Card className="col-span-4 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Daftar Berita
                </CardTitle>
                <CardDescription>
                  Kelola berita yang ditampilkan di halaman utama
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {news.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                      Belum ada berita yang diposting
                    </div>
                  ) : (
                    news.map((item) => (
                      <div key={item.id} className="group flex flex-col sm:flex-row gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors relative">
                        <div className="w-full sm:w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary/30">
                              <MessageCircle className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                              {format(new Date(item.date), "dd MMM yyyy", { locale: idLocale })}
                            </span>
                            <div className="flex gap-2 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteNews(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="font-bold text-lg mb-1 line-clamp-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {item.author}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Create News Form */}
            <Card className="col-span-3 shadow-md border-primary/20 h-fit sticky top-24">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardTitle className="text-xl">Buat Berita Baru</CardTitle>
                <CardDescription>
                  Bagikan informasi terbaru kepada anggota dan publik
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateNews} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul Berita <span className="text-destructive">*</span></Label>
                    <Input
                      id="title"
                      placeholder="Contoh: Kegiatan Bakti Sosial 2024"
                      value={newsForm.title}
                      onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Konten Berita <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="content"
                      placeholder="Tuliskan isi berita di sini..."
                      className="min-h-[150px] bg-background"
                      value={newsForm.content}
                      onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="image">Foto Berita</Label>

                    <div className="flex flex-col gap-4">
                      {newsImagePreview ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border group">
                          <img
                            src={newsImagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => {
                              setNewsImagePreview(null);
                              setNewsForm(prev => ({ ...prev, imageUrl: "" }));
                              if (newsFileInputRef.current) newsFileInputRef.current.value = "";
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => newsFileInputRef.current?.click()}
                        >
                          <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold">Upload Foto Berita</p>
                            <p className="text-[10px] text-muted-foreground">Maksimal 5MB (JPG, PNG, WEBP)</p>
                          </div>
                        </div>
                      )}

                      <input
                        type="file"
                        id="image-upload"
                        className="hidden"
                        accept="image/*"
                        ref={newsFileInputRef}
                        onChange={handleNewsImageUpload}
                      />

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-background px-2 text-muted-foreground font-bold tracking-widest">Atau Gunakan Link</span>
                        </div>
                      </div>

                      <Input
                        id="image-link"
                        placeholder="https://example.com/foto.jpg"
                        value={newsForm.imageUrl?.startsWith('data:image') ? "" : newsForm.imageUrl}
                        onChange={(e) => {
                          setNewsForm({ ...newsForm, imageUrl: e.target.value });
                          setNewsImagePreview(e.target.value);
                        }}
                        className="bg-background text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (Opsional)</Label>
                    <Input
                      id="tags"
                      placeholder="Contoh: Sosial, Pendidikan, Event"
                      value={newsForm.tags}
                      onChange={(e) => setNewsForm({ ...newsForm, tags: e.target.value })}
                      className="bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">Pisahkan dengan koma</p>
                  </div>

                  <Button type="submit" className="w-full font-bold shadow-soft" disabled={isSubmittingNews}>
                    {isSubmittingNews ? "Memposting..." : "Publikasikan Berita"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
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
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border-4 border-emerald-500/20">
                  <Check className="w-12 h-12 text-emerald-600" />
                </div>
                <p className="mt-4 font-bold text-center">Standard Audit Terpenuhi</p>
                <p className="text-xs text-muted-foreground text-center px-4 mt-1">
                  Sistem Strategic Advisor telah memverifikasi semua transaksi sesuai regulasi organisasi.
                </p>
                <Button variant="outline" className="mt-6 w-full font-bold">Unduh Laporan PDF</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <SmartVerificationModal
          isOpen={verificationModal.isOpen}
          onClose={() => setVerificationModal({ ...verificationModal, isOpen: false })}
          receiptData={verificationModal.data}
          onVerify={async (updated) => {
            // Mock verify API
            const res = await fetch("/api/ai/treasury/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: updated.id, status: "verified", ...updated })
            });
            if (res.ok) fetchData();
          }}
        />
      </Tabs>
    </DashboardLayout>
  );
}
