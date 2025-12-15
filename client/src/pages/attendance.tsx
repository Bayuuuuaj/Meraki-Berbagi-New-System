import { useState, useEffect } from "react";
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
import { Plus, Search, Filter, Lock, Loader2, Trash2 } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: "hadir",
      notes: "",
    },
  });

  useEffect(() => {
    fetchAttendance();
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        // Anggota hanya bisa lihat data mereka sendiri
        if (user?.role === "anggota") {
          setAttendance(data.filter((t: any) => t.userId === user?.id));
        } else {
          setAttendance(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch attendance");
    }
  };

  async function onSubmit(values: AttendanceFormData) {
    setIsLoading(true);
    try {
      const userId = user?.role === "admin" && selectedUserId ? selectedUserId : user?.id;
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...values,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save attendance");
      }

      toast({
        title: "Berhasil!",
        description: user?.role === "admin" ? "Absen anggota sudah dicatat." : "Absen Anda sudah disimpan.",
      });
      
      form.reset();
      setSelectedUserId(null);
      setIsDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Tidak bisa menyimpan absen. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredAttendance = attendance.filter(item => 
    item.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      fetchAttendance();
      toast({ title: "Berhasil!", description: "Data absensi dihapus." });
    } catch {
      toast({ title: "Gagal", description: "Tidak bisa menghapus data.", variant: "destructive" });
    }
  };

  const clearAllAttendance = async () => {
    if (!confirm("Yakin hapus SEMUA data absensi? Tidak bisa diurungkan!")) return;
    try {
      const res = await fetch(`/api/attendance-all`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      fetchAttendance();
      toast({ title: "Berhasil!", description: "Semua data absensi dihapus." });
    } catch {
      toast({ title: "Gagal", description: "Tidak bisa menghapus.", variant: "destructive" });
    }
  };

  // Group attendance by year, month, and date
  const groupedAttendance = () => {
    const grouped: Record<string, Record<string, Record<string, any[]>>> = {};

    filteredAttendance.forEach(item => {
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

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Absensi
            </h2>
            <p className="text-muted-foreground">
              {user?.role === "admin" ? "Kelola data kehadiran kegiatan." : "Isi absen Anda di sini."}
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> {user?.role === "admin" ? "Catat Kehadiran" : "Isi Absen"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{user?.role === "admin" ? "Catat Kehadiran Baru" : "Isi Absen"}</DialogTitle>
                <DialogDescription>
                  {user?.role === "admin" ? "Isi form berikut untuk mencatat kehadiran manual." : "Isi data kehadiran Anda untuk hari ini."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {user?.role === "admin" && (
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
                )}
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input 
                    id="date" 
                    type="date"
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.watch("status")} onValueChange={(val) => form.setValue("status", val as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hadir">Hadir</SelectItem>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                      <SelectItem value="alpha">Alpha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Keterangan</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Catatan tambahan..." 
                    {...form.register("notes")}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
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

        {user?.role === "admin" ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-medium">Riwayat Kehadiran Semua Anggota ({filteredAttendance.length})</CardTitle>
                </div>
                <Button variant="destructive" size="sm" onClick={clearAllAttendance}>
                  <Trash2 className="mr-1 h-3 w-3" /> Hapus Semua
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Cari..."
                      className="w-[200px] pl-9 h-9 bg-muted/50 border-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.keys(groupedAttendance()).length > 0 ? (
                  Object.keys(groupedAttendance())
                    .sort()
                    .reverse()
                    .map((year) => (
                      <div key={year} className="space-y-4">
                        <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                          Tahun {year}
                        </div>
                        {Object.keys(groupedAttendance()[year])
                          .sort()
                          .reverse()
                          .map((monthNum) => (
                            <div key={monthNum} className="space-y-3 ml-4">
                              <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                {groupedAttendance()[year][monthNum][
                                  Object.keys(groupedAttendance()[year][monthNum])[0]
                                ][0]?.month}
                              </div>
                              {Object.keys(groupedAttendance()[year][monthNum])
                                .sort()
                                .reverse()
                                .map((day) => (
                                  <div key={day} className="ml-4">
                                    <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                      {day} {groupedAttendance()[year][monthNum][day][0]?.dayName}
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
                                          {groupedAttendance()[year][monthNum][day].map((item) => (
                                            <tr key={item.id} className="bg-card hover:bg-muted/10 transition-colors">
                                              <td className="px-3 py-2">{item.userName}</td>
                                              <td className="px-3 py-2">
                                                <Badge variant="outline" className={`${getStatusColor(item.status)} capitalize`}>
                                                  {item.status}
                                                </Badge>
                                              </td>
                                              <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[200px]">
                                                {item.notes || "-"}
                                              </td>
                                              <td className="px-3 py-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => deleteAttendance(item.id)}
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
                  {Object.keys(groupedAttendance()).length > 0 ? (
                    Object.keys(groupedAttendance())
                      .sort()
                      .reverse()
                      .map((year) => (
                        <div key={year} className="space-y-4">
                          <div className="bg-muted/50 px-4 py-3 rounded font-bold text-lg">
                            Tahun {year}
                          </div>
                          {Object.keys(groupedAttendance()[year])
                            .sort()
                            .reverse()
                            .map((monthNum) => (
                              <div key={monthNum} className="space-y-3 ml-4">
                                <div className="bg-muted/30 px-4 py-2 rounded font-semibold">
                                  {groupedAttendance()[year][monthNum][
                                    Object.keys(groupedAttendance()[year][monthNum])[0]
                                  ][0]?.month}
                                </div>
                                {Object.keys(groupedAttendance()[year][monthNum])
                                  .sort()
                                  .reverse()
                                  .map((day) => (
                                    <div key={day} className="ml-4">
                                      <div className="text-sm font-medium text-muted-foreground mb-2 pb-2 border-b">
                                        {day} {groupedAttendance()[year][monthNum][day][0]?.dayName}
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
                                            {groupedAttendance()[year][monthNum][day].map((item) => (
                                              <tr key={item.id} className="bg-card hover:bg-muted/10 transition-colors">
                                                <td className="px-3 py-2">
                                                  <Badge variant="outline" className={`${getStatusColor(item.status)} capitalize`}>
                                                    {item.status}
                                                  </Badge>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[200px]">
                                                  {item.notes || "-"}
                                                </td>
                                                <td className="px-3 py-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteAttendance(item.id)}
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
                      Belum ada data kehadiran Anda
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
