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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, UserPlus, Trash2, Loader2, Bell, Eye, X } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "anggota"]),
});

const notificationSchema = z.object({
  title: z.string().min(1, "Judul tidak boleh kosong"),
  message: z.string().min(1, "Pesan tidak boleh kosong"),
});

type UserFormData = z.infer<typeof userSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export default function MembersPage() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [memberTreasury, setMemberTreasury] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [memberPaymentProofsOpen, setMemberPaymentProofsOpen] = useState(false);
  const [memberPaymentProofs, setMemberPaymentProofs] = useState<any[]>([]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "anggota",
    },
  });

  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "Pemberitahuan Kas Belum Dibayar",
      message: "",
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

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

  async function onSubmit(values: UserFormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal membuat user");
      }

      toast({
        title: "Berhasil!",
        description: `User ${values.name} berhasil dibuat.`,
      });

      form.reset();
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Gagal",
        description: (error as Error).message || "Tidak bisa membuat user.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Yakin hapus user ini?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        toast({
          title: "Berhasil!",
          description: "User berhasil dihapus.",
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Tidak bisa hapus user.",
        variant: "destructive",
      });
    }
  };

  const updateUserActive = async (userId: string, isActive: number) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchUsers();
      toast({ title: "Berhasil!", description: isActive === 1 ? "Anggota diaktifkan." : "Anggota di-kick." });
    } catch {
      toast({ title: "Gagal", description: "Tidak bisa update status.", variant: "destructive" });
    }
  };

  const openNotificationDialog = async (member: any) => {
    setSelectedMember(member);
    notificationForm.reset({
      title: "Pemberitahuan Kas Belum Dibayar",
      message: "",
    });
    // Fetch member's treasury data
    try {
      const res = await fetch("/api/treasury");
      if (res.ok) {
        const data = await res.json();
        setMemberTreasury(data.filter((t: any) => t.userId === member.id));
      }
    } catch (error) {
      console.error("Failed to fetch treasury");
    }
    setIsNotificationDialogOpen(true);
  };

  const openMemberPaymentProofs = async (member: any) => {
    setSelectedMember(member);
    try {
      const res = await fetch("/api/treasury");
      if (res.ok) {
        const data = await res.json();
        const memberProofs = data
          .filter((t: any) => t.userId === member.id && t.proof && t.type === "in")
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMemberPaymentProofs(memberProofs);
        setMemberPaymentProofsOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch payment proofs");
    }
  };

  async function onNotificationSubmit(values: NotificationFormData) {
    if (!selectedMember) return;

    setIsNotificationLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMember.id,
          type: "unpaid_kas",
          title: values.title,
          message: values.message,
        }),
      });

      if (res.ok) {
        toast({
          title: "Berhasil!",
          description: `Notifikasi dikirim ke ${selectedMember.name}.`,
        });
        setIsNotificationDialogOpen(false);
        notificationForm.reset();
        setSelectedMember(null);
      } else {
        const error = await res.json();
        toast({
          title: "Gagal",
          description: error.message || "Tidak bisa kirim notifikasi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Notification error:", error);
      toast({
        title: "Gagal",
        description: "Tidak bisa kirim notifikasi.",
        variant: "destructive",
      });
    } finally {
      setIsNotificationLoading(false);
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Only show this page to admins
  if (authUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Akses Ditolak</h2>
            <p className="text-muted-foreground mt-2">Hanya admin yang bisa kelola anggota.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Daftar Anggota
            </h2>
            <p className="text-muted-foreground">
              Kelola data anggota dan hak akses.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md shadow-primary/20">
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Anggota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Anggota Baru</DialogTitle>
                <DialogDescription>
                  Buat akun baru untuk anggota atau admin.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input 
                    id="name"
                    placeholder="Contoh: Budi Santoso"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="contoh@meraki.org"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value as "admin" | "anggota")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anggota">Anggota</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      "Buat Akun"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Semua Anggota ({filteredUsers.length})</CardTitle>
              <div className="relative w-64">
                <Input
                  type="search"
                  placeholder="Cari nama atau email..."
                  className="pl-4 h-9 bg-muted/50 border-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3">Anggota</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Kirim Notif Kas</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="bg-card hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                          {u.isSuperAdmin === 1 && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Protected
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button 
                          size="sm" 
                          onClick={() => openNotificationDialog(u)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                        >
                          <Bell className="mr-1 h-4 w-4" /> Kirim
                        </Button>
                      </td>
                      <td className="px-4 py-3 flex gap-1 items-center">
                        <Button
                          size="sm"
                          variant={u.isActive === 1 ? "outline" : "default"}
                          onClick={() => updateUserActive(u.id, u.isActive === 1 ? 0 : 1)}
                          disabled={u.isSuperAdmin === 1}
                          className="h-8 px-2 text-xs"
                          title={u.isSuperAdmin === 1 ? "Tidak bisa mengubah super admin" : ""}
                        >
                          {u.isActive === 1 ? "Kick" : "Aktifkan"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openMemberPaymentProofs(u)}
                          className="h-8 px-2 text-xs"
                          title="Lihat bukti pembayaran"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={u.isSuperAdmin === 1}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteUser(u.id)}
                              disabled={u.isSuperAdmin === 1}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus Anggota
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notification Dialog */}
        <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kirim Notifikasi Kas</DialogTitle>
              <DialogDescription>
                Kirim pemberitahuan reminder kas ke {selectedMember?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
              {memberTreasury.length > 0 && (
                <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                  <Label className="font-semibold">Riwayat Pembayaran Kas</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {memberTreasury.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-background p-2 rounded border border-border text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{new Date(item.date).toLocaleDateString('id-ID')}</p>
                          <p className="text-xs text-muted-foreground">Rp {item.amount?.toLocaleString('id-ID')} - {item.status}</p>
                        </div>
                        {item.proof && item.type === "in" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProof(item.proof);
                              setProofModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notif-title">Judul</Label>
                <Input 
                  id="notif-title"
                  placeholder="Judul notifikasi..."
                  {...notificationForm.register("title")}
                />
                {notificationForm.formState.errors.title && (
                  <p className="text-sm text-red-500">{notificationForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif-message">Pesan</Label>
                <Textarea 
                  id="notif-message"
                  placeholder="Masukkan pesan notifikasi..."
                  className="min-h-[100px]"
                  {...notificationForm.register("message")}
                />
                {notificationForm.formState.errors.message && (
                  <p className="text-sm text-red-500">{notificationForm.formState.errors.message.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNotificationDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isNotificationLoading}>
                  {isNotificationLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Notifikasi"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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

        {/* Member Payment Proofs Dialog */}
        <Dialog open={memberPaymentProofsOpen} onOpenChange={setMemberPaymentProofsOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran - {selectedMember?.name}</DialogTitle>
              <DialogDescription>
                Daftar bukti pembayaran kas dari {selectedMember?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {memberPaymentProofs.length > 0 ? (
                memberPaymentProofs.map((proof) => (
                  <div key={proof.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Info */}
                      <div className="col-span-2">
                        <p className="font-medium text-sm">{new Date(proof.date).toLocaleDateString('id-ID')}</p>
                        <p className="text-lg font-bold">Rp {proof.amount?.toLocaleString('id-ID')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Kategori: {proof.category}
                        </p>
                        {proof.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Catatan: {proof.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Status: <span className={proof.status === 'verified' ? 'text-green-600' : 'text-amber-600'}>
                            {proof.status === 'verified' ? 'Terverifikasi' : 'Menunggu'}
                          </span>
                        </p>
                      </div>
                      
                      {/* Proof Image Thumbnail */}
                      <div className="flex flex-col items-center justify-center">
                        {proof.proof ? (
                          <button
                            onClick={() => {
                              setSelectedProof(proof.proof);
                              setProofModalOpen(true);
                            }}
                            className="w-full h-24 rounded border border-border overflow-hidden hover:opacity-75 transition-opacity"
                          >
                            <img 
                              src={proof.proof} 
                              alt="Bukti Pembayaran" 
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-full h-24 rounded border border-dashed border-border flex items-center justify-center bg-muted/20">
                            <span className="text-xs text-muted-foreground">Tidak ada bukti</span>
                          </div>
                        )}
                        {proof.proof && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 w-full h-7 text-xs"
                            onClick={() => {
                              setSelectedProof(proof.proof);
                              setProofModalOpen(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" /> Lihat Penuh
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Tidak ada bukti pembayaran</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
