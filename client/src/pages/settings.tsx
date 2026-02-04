import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Smartphone, Download } from "lucide-react";

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: settings, isLoading } = useQuery<any[]>({
        queryKey: ["/api/settings"],
    });

    const mutation = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const res = await apiRequest("PATCH", `/api/settings/${key}`, { value });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
            toast({
                title: "Pengaturan disimpan",
                description: "Perubahan telah diterapkan secara global.",
            });
        },
        onError: () => {
            toast({
                title: "Gagal menyimpan",
                description: "Terjadi kesalahan saat memperbarui pengaturan.",
                variant: "destructive",
            });
        },
    });

    const passwordForm = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: async (data: PasswordFormData) => {
            if (data.currentPassword !== user?.password) {
                throw new Error("Password saat ini salah");
            }
            const res = await apiRequest("PATCH", "/api/user/password", {
                userId: user?.id,
                newPassword: data.newPassword
            });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Berhasil!", description: "Password Anda telah diperbarui." });
            passwordForm.reset();
        },
        onError: (error: any) => {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        },
    });

    const { isInstallable, installApp } = usePWAInstall();
    const isAutoNotifEnabled = settings?.find(s => s.key === "whatsapp_auto_notif")?.value === "true";

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-32">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengaturan & Profil</h1>
                    <p className="text-muted-foreground">Kelola akun Anda dan konfigurasi sistem.</p>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full lg:w-[400px] grid-cols-2">
                        <TabsTrigger value="profile">Profil Saya</TabsTrigger>
                        {(user?.role === "admin" || user?.isSuperAdmin === 1) && (
                            <TabsTrigger value="system">Sistem</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="profile" className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Info className="w-5 h-5 text-primary" />
                                    <CardTitle>Informasi Akun</CardTitle>
                                </div>
                                <CardDescription>
                                    Detail informasi profil Anda di Meraki-Berbagi.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nama Lengkap</Label>
                                        <p className="font-medium text-lg">{user?.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                                        <p className="font-medium">{user?.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Peran</Label>
                                        <p className="font-medium capitalize">{user?.role}</p>
                                    </div>
                                    {user?.phone && (
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">No. WhatsApp</Label>
                                            <p className="font-medium">{user.phone}</p>
                                        </div>
                                    )}
                                    {user?.skills && (
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Keahlian (Skills)</Label>
                                            <p className="font-medium">{user.skills}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* PWA Install Card - Always visible */}
                        <Card className="glass-card border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-primary" />
                                    <CardTitle>📱 Install Aplikasi</CardTitle>
                                </div>
                                <CardDescription>
                                    Akses Meraki-Berbagi lebih cepat dari home screen perangkat Anda
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isInstallable ? (
                                    <>
                                        <Button
                                            onClick={async () => {
                                                await installApp();
                                                toast({
                                                    title: "✅ Aplikasi Terinstall",
                                                    description: "Meraki-Berbagi berhasil ditambahkan ke home screen"
                                                });
                                            }}
                                            className="w-full"
                                            size="lg"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Install Sekarang
                                        </Button>

                                        <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-primary/30">
                                            <p>✨ Akses lebih cepat tanpa browser</p>
                                            <p>📱 Tampilan full-screen seperti app native</p>
                                            <p>🔔 Notifikasi push (coming soon)</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800 text-sm">
                                                <strong>Cara Install Manual:</strong>
                                            </AlertDescription>
                                        </Alert>

                                        <div className="text-sm space-y-2">
                                            <p className="font-semibold">📱 Android (Chrome):</p>
                                            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-2">
                                                <li>Tap menu (⋮) di pojok kanan atas</li>
                                                <li>Pilih "Add to Home screen"</li>
                                                <li>Tap "Add"</li>
                                            </ol>

                                            <p className="font-semibold mt-3">🍎 iPhone (Safari):</p>
                                            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-2">
                                                <li>Tap tombol Share (□↑)</li>
                                                <li>Scroll dan pilih "Add to Home Screen"</li>
                                                <li>Tap "Add"</li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <CardTitle>Keamanan Akun</CardTitle>
                                </div>
                                <CardDescription>
                                    Ubah kata sandi Anda secara berkala untuk menjaga keamanan data organisasi.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...passwordForm}>
                                    <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4 max-w-md">
                                        <FormField
                                            control={passwordForm.control}
                                            name="currentPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password Saat Ini</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={passwordForm.control}
                                            name="newPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password Baru</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" className="h-12 rounded-2xl" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Minimal 8 karakter.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={passwordForm.control}
                                            name="confirmPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={changePasswordMutation.isPending} className="w-full sm:w-auto shadow-md">
                                            {changePasswordMutation.isPending ? "Menyimpan..." : "Perbarui Password"}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="system" className="mt-6">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-primary" />
                                        <CardTitle>Notifikasi & Komunikasi</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Kelola bagaimana sistem berinteraksi dengan relawan melalui WhatsApp.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="flex flex-col space-y-1">
                                            <Label htmlFor="auto-notif" className="text-base font-semibold">WhatsApp Prestasi Otomatis</Label>
                                            <p className="text-sm text-muted-foreground font-light">
                                                Kirim pesan ucapan selamat secara otomatis saat relawan naik ke taraf (Tier) baru.
                                            </p>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-6 w-10" />
                                        ) : (
                                            <Switch
                                                id="auto-notif"
                                                checked={isAutoNotifEnabled}
                                                onCheckedChange={(checked) =>
                                                    mutation.mutate({ key: "whatsapp_auto_notif", value: checked ? "true" : "false" })
                                                }
                                            />
                                        )}
                                    </div>

                                    <Alert className="bg-primary/5 border-primary/20">
                                        <Info className="h-4 w-4 text-primary" />
                                        <AlertTitle className="text-primary font-bold">Info Transparansi</AlertTitle>
                                        <AlertDescription className="text-xs opacity-90">
                                            Setiap pengiriman notifikasi akan dicatat dalam Audit Logs. Anda dapat mematikan fitur ini kapan saja jika kredensial API WhatsApp sedang bermasalah atau kuota habis.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>

                            {/* Anomaly Detection Configuration */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        <CardTitle>Konfigurasi Deteksi Anomali</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Atur threshold untuk mendeteksi transaksi mencurigakan di Intelligence Dashboard.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="threshold-amount" className="text-base font-semibold">
                                            Batas Transaksi Besar (Rp)
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Transaksi di atas jumlah ini tanpa bukti foto akan ditandai sebagai anomali kritis.
                                        </p>
                                        {isLoading ? (
                                            <Skeleton className="h-12 w-full" />
                                        ) : (
                                            <Input
                                                id="threshold-amount"
                                                type="number"
                                                className="h-12 rounded-2xl"
                                                placeholder="1000000"
                                                defaultValue={settings?.find(s => s.key === "anomaly_threshold_amount")?.value || "1000000"}
                                                onBlur={(e) => {
                                                    const value = e.target.value;
                                                    if (value && parseInt(value) > 0) {
                                                        mutation.mutate({ key: "anomaly_threshold_amount", value });
                                                    }
                                                }}
                                            />
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Default: Rp 1.000.000 (1 juta rupiah)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duplicate-hours" className="text-base font-semibold">
                                            Sensitivitas Duplikasi (Jam)
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Transaksi identik (nominal + kategori) dalam rentang waktu ini akan ditandai sebagai duplikasi.
                                        </p>
                                        {isLoading ? (
                                            <Skeleton className="h-12 w-full" />
                                        ) : (
                                            <Input
                                                id="duplicate-hours"
                                                type="number"
                                                className="h-12 rounded-2xl"
                                                placeholder="24"
                                                defaultValue={settings?.find(s => s.key === "anomaly_duplicate_hours")?.value || "24"}
                                                onBlur={(e) => {
                                                    const value = e.target.value;
                                                    if (value && parseInt(value) > 0) {
                                                        mutation.mutate({ key: "anomaly_duplicate_hours", value });
                                                    }
                                                }}
                                            />
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Default: 24 jam
                                        </p>
                                    </div>

                                    <Alert className="bg-amber-50 border-amber-200">
                                        <Info className="h-4 w-4 text-amber-600" />
                                        <AlertTitle className="text-amber-900 font-bold">Perhatian</AlertTitle>
                                        <AlertDescription className="text-xs text-amber-800">
                                            Perubahan threshold akan langsung diterapkan pada Intelligence Dashboard. Threshold yang terlalu rendah dapat menghasilkan banyak false positive.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>

                            <Card className="opacity-70 grayscale cursor-not-allowed border-dashed">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-muted-foreground" />
                                        <CardTitle>Keamanan & Backup (Coming Soon)</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Konfigurasi retensi data dan jadwal backup otomatis database lokal.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm italic text-muted-foreground">Fitur ini sedang dalam pengembangan oleh tim IT Meraki untuk menjamin keamanan jangka panjang.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
