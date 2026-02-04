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
import { Plus, Search, Filter, Lock, Loader2, Trash2, Users, CalendarCheck } from "lucide-react";


const attendanceSchema = z.object({
  date: z.string(),
  status: z.enum(["hadir", "izin", "sakit", "alpha"]),
  notes: z.string().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Reset search term when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setMemberSearchTerm("");
    }
  }, [isDialogOpen]);

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: "hadir",
      notes: "",
    },
  });

  const queryClient = useQueryClient();

  const { data: attendance = [], isLoading: isFetchingAttendance } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
    staleTime: 30 * 1000,
    select: (data) => {
      if (user?.role === "anggota") {
        return data.filter((t: any) => String(t.userId) === String(user.id));
      }
      return data;
    }
  });

  const currentMonthRate = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthAttendance = attendance.filter(a => {
      const date = new Date(a.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    if (monthAttendance.length === 0) return 0;

    const present = monthAttendance.filter(a => a.status === 'hadir').length;
    return Math.round((present / monthAttendance.length) * 100);
  }, [attendance]);

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
    staleTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/attendance", values);
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      toast({
        title: "Berhasil!",
        description: user?.role === "admin" ? "Absen anggota sudah dicatat." : "Absen Anda sudah disimpan.",
      });

      form.reset();
      setSelectedUserId(null);
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Mencatat",
        description: error.message || "Tidak bisa menyimpan absen. Coba lagi.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/attendance/${id}`);
    },
    onSuccess: async () => {
      // HARD INVALIDATION: Remove stale queries from cache
      queryClient.removeQueries({ queryKey: ["/api/attendance"] });

      // Then refetch fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] }),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      toast({ title: "Berhasil!", description: "Data absensi dihapus." });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Hapus",
        description: error.message || "Data tidak ditemukan atau sudah terhapus.",
        variant: "destructive"
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/attendance-all");
    },
    onSuccess: async () => {
      // HARD INVALIDATION: Remove stale queries from cache
      queryClient.removeQueries({ queryKey: ["/api/attendance"] });
      queryClient.removeQueries({ queryKey: ["/api/admin/intelligence"] });
      queryClient.removeQueries({ queryKey: ["/api/ai/dashboard"] });

      // Then refetch fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/ai/dashboard"] }),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      toast({ title: "Berhasil!", description: "Semua data absensi dihapus." });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Reset",
        description: error.message || "Gagal menghapus semua data.",
        variant: "destructive"
      });
    }
  });

  async function onSubmit(data: AttendanceFormData) {
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
      userId: finalUserId, // Ini ID anggota
      recordedBy: user?.id   // Ini ID kamu sebagai admin
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hadir": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "izin": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "sakit": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "alpha": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const deleteAttendance = async (attendanceId: string) => {
    if (!confirm("Yakin hapus data absensi ini?")) return;
    deleteMutation.mutate(attendanceId);
  };

  const clearAllAttendance = async () => {
    if (!confirm("Yakin hapus SEMUA data absensi? Tidak bisa diurungkan!")) return;
    deleteAllMutation.mutate();
  };

  // Group attendance by year, month, and date
  const groupedAttendanceData = useMemo(() => {
    const grouped: Record<string, Record<string, Record<string, any[]>>> = {};

    attendance.forEach(item => {
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
  }, [attendance]);

  useEffect(() => {
    // Memaksa body untuk bisa scroll kembali
    document.body.style.overflow = 'auto';
    return () => { };
  }, []);

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="flex flex-col min-h-screen bg-slate-50 relative pb-32">
          {/* Instagram-Style Header */}
          <header className="flex-none bg-white/90 backdrop-blur-md border-b border-slate-100 z-10">
            <div className="h-14 flex items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Absensi
                </h1>
                <Badge
                  variant={currentMonthRate >= 80 ? 'default' : currentMonthRate >= 60 ? 'secondary' : 'destructive'}
                  className="text-xs h-5 px-2 font-semibold shrink-0"
                >
                  {currentMonthRate}%
                </Badge>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{user?.role === "admin" ? "Catat Kehadiran Baru" : "Isi Absen"}</DialogTitle>
                    <DialogDescription>
                      {user?.role === "admin" ? "Isi form berikut untuk mencatat kehadiran manual." : "Isi data kehadiran Anda untuk hari ini."}
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
                                          // Note: We don't clear searchTerm here so user knows what's selected
                                          // but we typically might want to hide the dropdown.
                                          // For now, let's just make it clear.
                                        }}
                                        className={cn(
                                          "w-full text-left px-4 py-3 min-h-[56px] rounded-xl text-sm transition-all active:scale-[0.98] flex flex-col justify-center",
                                          selectedUserId === u.id
                                            ? "bg-primary text-white shadow-md"
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
                      <div className="space-y-1">
                        <Label htmlFor="date" className="text-sm font-bold text-slate-700 mb-2 block">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200"
                          {...form.register("date")}
                        />
                        {form.formState.errors.date && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.date.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="status" className="text-sm font-bold text-slate-700 mb-2 block">Status</Label>
                        <Select value={form.watch("status")} onValueChange={(val) => form.setValue("status", val as any)}>
                          <SelectTrigger className="h-[48px] w-full rounded-2xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Pilih status" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="rounded-2xl shadow-xl">
                            <SelectItem value="hadir" className="rounded-lg py-3">Hadir</SelectItem>
                            <SelectItem value="izin" className="rounded-lg py-3">Izin</SelectItem>
                            <SelectItem value="sakit" className="rounded-lg py-3">Sakit</SelectItem>
                            <SelectItem value="alpha" className="rounded-lg py-3">Alpha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="notes" className="text-sm font-bold text-slate-700 mb-2 block">Keterangan</Label>
                        <Textarea
                          id="notes"
                          placeholder="Catatan tambahan..."
                          className="min-h-[100px] w-full rounded-2xl bg-slate-50 border-slate-200 p-4 focus:ring-primary/20"
                          {...form.register("notes")}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-2 sticky bottom-0 bg-white pt-2">
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
                          "Simpan Data"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <div className="flex-1 overscroll-contain">
            <div className="p-4 lg:p-8 space-y-6">

              {user?.role === "admin" ? (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-medium">Riwayat Kehadiran Semua Anggota ({attendance.length})</CardTitle>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearAllAttendance}
                        disabled={deleteAllMutation.isPending}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 rounded-xl"
                      >
                        {deleteAllMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-4 w-4" /> Hapus Semua
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.keys(groupedAttendanceData).length > 0 ? (
                        Object.keys(groupedAttendanceData)
                          .sort()
                          .reverse()
                          .map((year) => (
                            <div key={year} className="space-y-4">
                              <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                                Tahun {year}
                              </div>
                              {Object.keys(groupedAttendanceData[year])
                                .sort()
                                .reverse()
                                .map((monthNum) => (
                                  <div key={monthNum} className="space-y-3 ml-4">
                                    <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                      {groupedAttendanceData[year][monthNum][
                                        Object.keys(groupedAttendanceData[year][monthNum])[0]
                                      ][0]?.month}
                                    </div>
                                    {Object.keys(groupedAttendanceData[year][monthNum])
                                      .sort()
                                      .reverse()
                                      .map((day) => (
                                        <div key={day} className="ml-4">
                                          <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                            {day} {groupedAttendanceData[year][monthNum][day][0]?.dayName}
                                          </div>
                                          <div className="rounded border border-border overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                              <thead className="bg-muted/20 text-muted-foreground font-medium">
                                                <tr>
                                                  <th className="px-3 py-2">Nama</th>
                                                  <th className="px-3 py-2">Status</th>
                                                  <th className="px-3 py-2">Keterangan</th>
                                                  <th className="px-3 py-2">Aksi</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-border">
                                                {groupedAttendanceData[year][monthNum][day].map((item: any) => (
                                                  <tr key={item.id} className="bg-card hover:bg-muted/10 transition-colors min-h-[60px]">
                                                    <td className="px-3 py-3 h-[60px]">{item.userName}</td>
                                                    <td className="px-3 py-3 h-[60px]">
                                                      <Badge variant="outline" className={`${getStatusColor(item.status)} capitalize`}>
                                                        {item.status}
                                                      </Badge>
                                                    </td>
                                                    <td className="px-3 py-3 h-[60px] text-muted-foreground text-xs truncate max-w-[200px]">
                                                      {item.notes || "-"}
                                                    </td>
                                                    <td className="px-3 py-3 h-[60px]">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteAttendance(item.id)}
                                                        disabled={deleteMutation.isPending}
                                                        className="min-h-[44px] min-w-[44px] text-destructive hover:text-red-600 hover:bg-red-50 p-0 flex items-center justify-center rounded-xl transition-all active:scale-90"
                                                      >
                                                        {deleteMutation.isPending ? (
                                                          <Loader2 className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                          <Trash2 className="h-5 w-5" />
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
                          Belum ada data absensi
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Total Kehadiran</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{attendance.filter(a => a.status === "hadir").length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-900">Izin</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">{attendance.filter(a => a.status === "izin").length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-900">Sakit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-600">{attendance.filter(a => a.status === "sakit").length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">Alpha</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600">{attendance.filter(a => a.status === "alpha").length}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Riwayat Kehadiran Saya ({attendance.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {Object.keys(groupedAttendanceData).length > 0 ? (
                          Object.keys(groupedAttendanceData)
                            .sort()
                            .reverse()
                            .map((year) => (
                              <div key={year} className="space-y-4">
                                <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                                  Tahun {year}
                                </div>
                                {Object.keys(groupedAttendanceData[year])
                                  .sort()
                                  .reverse()
                                  .map((monthNum) => (
                                    <div key={monthNum} className="space-y-3 ml-4">
                                      <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                        {groupedAttendanceData[year][monthNum][
                                          Object.keys(groupedAttendanceData[year][monthNum])[0]
                                        ][0]?.month}
                                      </div>
                                      {Object.keys(groupedAttendanceData[year][monthNum])
                                        .sort()
                                        .reverse()
                                        .map((day) => (
                                          <div key={day} className="ml-4">
                                            <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                              {day} {groupedAttendanceData[year][monthNum][day][0]?.dayName}
                                            </div>
                                            <div className="rounded border border-border overflow-hidden">
                                              <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/20 text-muted-foreground font-medium">
                                                  <tr>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2">Keterangan</th>
                                                    <th className="px-3 py-2">Aksi</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                  {groupedAttendanceData[year][monthNum][day].map((item: any) => (
                                                    <tr key={item.id} className="bg-card hover:bg-muted/10 transition-colors min-h-[60px]">
                                                      <td className="px-3 py-3 h-[60px]">
                                                        <Badge variant="outline" className={`${getStatusColor(item.status)} capitalize`}>
                                                          {item.status}
                                                        </Badge>
                                                      </td>
                                                      <td className="px-3 py-3 h-[60px] text-muted-foreground text-xs truncate max-w-[200px]">
                                                        {item.notes || "-"}
                                                      </td>
                                                      <td className="px-3 py-3 h-[60px]">
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() => deleteAttendance(item.id)}
                                                          disabled={deleteMutation.isPending}
                                                          className="min-h-[44px] min-w-[44px] text-destructive hover:text-red-600 hover:bg-red-50 p-0 flex items-center justify-center rounded-xl transition-all active:scale-90"
                                                        >
                                                          {deleteMutation.isPending ? (
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                          ) : (
                                                            <Trash2 className="h-5 w-5" />
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
                            Belum ada data kehadiran Anda
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}


              {/* Ruang Tambahan Akhir (160px) agar tidak tertutup Bottom Navigation */}
              <div className="h-40 w-full shrink-0" />
            </div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
