
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast"; // Use new hook based on previous file exploration
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { Loader2, Wallet, Camera, User, CheckCircle2, QrCode, UserPlus, Medal, Sparkles } from "lucide-react";
import AchievementSection from "@/components/profile/AchievementSection";
import CertificateModal from "@/components/profile/CertificateModal";
import { motion } from "framer-motion";

// Zod Schema for Payment
const paymentSchema = z.object({
    amount: z.coerce.number().min(1000, "Minimal pembayaran Rp 1.000"),
    notes: z.string().optional()
});

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showQRIS, setShowQRIS] = useState(false);
    const [isSessionValid, setIsSessionValid] = useState(true);
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

    const parseBadges = (badgesStr: string | undefined | null) => {
        try {
            if (Array.isArray(badgesStr)) return badgesStr;
            return badgesStr ? JSON.parse(badgesStr) : [];
        } catch {
            return [];
        }
    };

    // Validate Session on Mount
    useEffect(() => {
        if (!user || !user.id || user.id === 'system') {
            setIsSessionValid(false);
            toast({
                title: "Sesi Tidak Valid ⚠️",
                description: "Sesi Anda kadaluarsa atau tidak valid. Harap login ulang.",
                variant: "destructive",
            });
            // Optional: Auto-logout after delay? keeping it manual for now so they see the msg
        } else {
            setIsSessionValid(true);
        }
    }, [user, toast]);

    // Queries
    const { data: treasury = [] } = useQuery<any[]>({
        queryKey: ["/api/treasury"],
    });

    // Calculate Member's Total Contribution (Pending & Verified)
    const myTransactions = treasury.filter((t: any) => t.userId === user?.id && t.type === 'in');
    const totalPaid = myTransactions
        .filter((t: any) => t.status === 'verified')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalPending = myTransactions
        .filter((t: any) => t.status === 'pending')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    // Forms
    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: 20000,
            notes: ""
        }
    });

    // Mutations
    // Mutations
    const attendanceMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error("Sesi login tidak valid/kadaluarsa. Silakan login ulang.");

            // Send complete payload to satisfy Zod schema
            const res = await apiRequest("POST", "/api/attendance", {
                userId: user.id,
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                status: "hadir",
                notes: "Self-service check-in",
            });
            return res.json();
        },
        onSuccess: () => {
            // 1. Invalidate Caches
            queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] });
            queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/status", user?.id] });

            toast({
                title: "Absen Berhasil! ✅",
                description: "Kehadiranmu hari ini sudah tercatat dan diverifikasi sistem.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal Absen ❌",
                description: "Pastikan koneksi stabil ataub hubungi admin. (" + error.message + ")",
                variant: "destructive"
            });
        }
    });

    const paymentMutation = useMutation({
        mutationFn: async (values: z.infer<typeof paymentSchema>) => {
            if (!user?.id) throw new Error("Sesi login tidak valid/kadaluarsa. Silakan login ulang.");

            const res = await apiRequest("POST", "/api/treasury", {
                userId: user.id,
                amount: values.amount,
                type: "in",
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                status: "pending",
                category: "iuran_wajib", // Default for now
                notes: values.notes || "Setoran Mandiri via Web",
                proof: "manual_entry",
            });
            return res.json();
        },
        onSuccess: () => {
            // Invalidate Caches
            queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] });
            queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });

            form.reset();
            setShowQRIS(false);

            toast({
                title: "Pembayaran Terkirim! 💸",
                description: "Menunggu verifikasi admin di Dashboard Verifikasi.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal Kirim ❌",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const onSubmitPayment = (values: z.infer<typeof paymentSchema>) => {
        paymentMutation.mutate(values);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Profile */}
                <div className="flex flex-col md:flex-row gap-6 items-center bg-card p-8 rounded-xl shadow-sm border border-border/50">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {user?.name?.charAt(0) || "U"}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full border shadow-sm">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold">{user?.name}</h1>
                        <p className="text-muted-foreground">{user?.email}</p>
                        <div className="flex gap-2 justify-center md:justify-start mt-3">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                {user?.role}
                            </span>
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                Active Member
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        {user?.role === "admin" && (
                            <AddMemberDialog
                                trigger={
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/5"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Tambah Anggota
                                    </Button>
                                }
                            />
                        )}
                        <Button
                            size="lg"
                            className="w-full gap-2 shadow-lg shadow-primary/20"
                            onClick={() => attendanceMutation.mutate()}
                            disabled={attendanceMutation.isPending || !isSessionValid}
                        >
                            {attendanceMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            {isSessionValid ? "Absen Sekarang" : "Sesi Invalid"}
                        </Button>
                    </div>
                </div>

                {/* Achievement Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            Pencapaian & Lencana
                        </h2>
                        <Button
                            variant="outline"
                            onClick={() => setIsCertificateModalOpen(true)}
                            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                            <Medal className="w-4 h-4" />
                            Lihat Sertifikat
                        </Button>
                    </div>
                    <AchievementSection
                        badges={parseBadges(user?.badges)}
                        contributionScore={user?.contributionScore || 0}
                    />
                </div>

                {/* Certificate Modal */}
                {user && (
                    <CertificateModal
                        isOpen={isCertificateModalOpen}
                        onClose={() => setIsCertificateModalOpen(false)}
                        member={{
                            name: user.name,
                            role: user.role,
                            contributionScore: user.contributionScore || 0,
                            badges: parseBadges(user.badges)
                        }}
                    />
                )}

                {/* Action Grid */}
                <div className="grid md:grid-cols-2 gap-6">

                    {/* Card: Financial Status */}
                    <Card className="shadow-md border-emerald-500/20 bg-emerald-50/10 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-emerald-600" />
                                Status Kas Pribadi
                            </CardTitle>
                            <CardDescription>Riwayat kontribusi Anda</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b pb-4">
                                    <div className="text-sm text-muted-foreground">Total Terverifikasi</div>
                                    <div className="text-2xl font-bold text-emerald-600">
                                        Rp {new Intl.NumberFormat("id-ID").format(totalPaid)}
                                    </div>
                                </div>
                                {totalPending > 0 && (
                                    <div className="flex justify-between items-end">
                                        <div className="text-sm text-amber-600 font-medium">Menunggu Verifikasi</div>
                                        <div className="text-lg font-bold text-amber-600">
                                            Rp {new Intl.NumberFormat("id-ID").format(totalPending)}
                                        </div>
                                    </div>
                                )}
                                <div className="pt-2">
                                    <p className="text-xs text-muted-foreground italic">
                                        * Status "Pending" akan berubah setelah diverifikasi admin.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card: Pay Cash */}
                    <Card className="shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-primary" />
                                Bayar Kas / Iuran
                            </CardTitle>
                            <CardDescription>Self-service payment entry</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!showQRIS ? (
                                <div className="space-y-4">
                                    <div className="bg-primary/5 p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setShowQRIS(true)}>
                                        <div className="bg-white p-2 rounded-md shadow-sm">
                                            <img src="/qris.jpg" alt="QRIS Mini" className="w-12 h-12 object-cover rounded" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-primary">Lihat QRIS Meraki</h3>
                                            <p className="text-xs text-muted-foreground">Klik untuk memperbesar QR Code</p>
                                        </div>
                                    </div>

                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmitPayment)} className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nominal Pembayaran (Rp)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={paymentMutation.isPending}
                                            >
                                                {paymentMutation.isPending ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    "Kirim Bukti Bayar"
                                                )}
                                            </Button>
                                        </form>
                                    </Form>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <div className="relative w-full aspect-[3/4] max-w-sm overflow-hidden rounded-xl border shadow-2xl mb-4">
                                        <img
                                            src="/qris.jpg"
                                            alt="QRIS Full"
                                            className="w-full h-full object-contain bg-white"
                                        />
                                    </div>
                                    <Button variant="outline" onClick={() => setShowQRIS(false)}>
                                        Tutup Kode QR
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </DashboardLayout>
    );
}
