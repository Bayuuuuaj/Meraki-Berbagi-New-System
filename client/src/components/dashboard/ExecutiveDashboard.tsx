import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Wallet,
    TrendingUp,
    AlertTriangle,
    Lightbulb,
    Upload,
    FileText,
    Copy,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download } from "lucide-react";

interface ExecutiveDashboardProps {
    treasury: any[];
    aiLogs: any[];
    onUploadClick: () => void;
    onExportClick: () => void;
    aiInsight?: string;
}

export default function ExecutiveDashboard({
    treasury,
    aiLogs,
    onUploadClick,
    onExportClick,
    aiInsight
}: ExecutiveDashboardProps) {
    const { toast } = useToast();
    const { isInstallable, installApp } = usePWAInstall();

    // 1. Logic: Health Score
    const latestAudit = aiLogs[0] || { efficiencyScore: 8 };
    const healthScore = latestAudit.efficiencyScore;
    const isHealthy = healthScore >= 6;

    // 2. Logic: Runway & Balance
    const { runway, balance, activeAnomalies, recentActivity } = useMemo(() => {
        const totalIn = treasury
            .filter(t => t.type === 'in' && t.status === 'verified')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalOut = treasury
            .filter(t => t.type === 'out' && t.status === 'verified')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentBalance = totalIn - totalOut;

        // Runway calculation
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const expenses = treasury.filter(t => new Date(t.date) >= threeMonthsAgo && t.type === 'out');
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const avgMonthlyExpense = totalExpenses / 3;
        const runwayVal = avgMonthlyExpense <= 0 ? "∞" : (currentBalance / avgMonthlyExpense).toFixed(1);

        // Anomalies
        const anomalies = treasury.filter(t => t.status === 'flagged').length;

        // Recent Activity
        const activity = [...treasury]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return {
            runway: runwayVal,
            balance: currentBalance,
            activeAnomalies: anomalies,
            recentActivity: activity
        };
    }, [treasury]);

    // 3. Logic: WhatsApp Copy
    const copyWhatsAppSummary = () => {
        const text = `*Executive Summary Meraki-Berbagi*\n\n` +
            `📌 *Saldo Aktif:* Rp ${balance.toLocaleString('id-ID')}\n` +
            `⏳ *Financial Runway:* ${runway} Bulan\n` +
            `⚠️ *Anomali:* ${activeAnomalies} temuan\n\n` +
            `💡 *AI Insight:* "${aiInsight || 'Sistem memantau efisiensi operasional dengan baik.'}"\n\n` +
            `_Pesan otomatis dari Audit System AI_`;

        navigator.clipboard.writeText(text);
        toast({
            title: "Berhasil!",
            description: "Ringkasan telah disalin untuk WhatsApp.",
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Hero Insight (Glassmorphism) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -m-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -m-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-xl border border-white/30 shadow-inner">
                        <Lightbulb className="text-yellow-300 w-10 h-10 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[10px] uppercase font-bold tracking-widest text-indigo-100">
                                AI Intelligence View
                            </span>
                            <Badge variant="outline" className={`border-none ${isHealthy ? 'bg-emerald-400/20 text-emerald-300' : 'bg-orange-400/20 text-orange-300'}`}>
                                Health Score: {healthScore}/10
                            </Badge>
                        </div>
                        <h2 className="text-2xl font-bold font-heading text-white mb-2">Halo Ketua, Berikut Ringkasan Organisasi</h2>
                        <p className="text-indigo-100 text-lg italic leading-relaxed max-w-2xl font-medium">
                            "{aiInsight || 'Menganalisis tren keuangan Anda... Tunggu sebentar untuk wawasan strategis.'}"
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <Button onClick={onUploadClick} className="bg-white text-indigo-700 hover:bg-white/90 font-bold shadow-lg">
                            <Upload className="w-4 h-4 mr-2" /> Unggah Nota
                        </Button>
                        <Button onClick={onExportClick} variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm">
                            <FileText className="w-4 h-4 mr-2" /> Cetak Laporan Audit
                        </Button>
                        {isInstallable && (
                            <Button onClick={installApp} variant="secondary" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-none shadow-lg animate-bounce-subtle">
                                <Download className="w-4 h-4 mr-2" /> Install Aplikasi Meraki
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Three-Pillar Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 group hover:translate-y-[-4px] transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Saldo Aktif Organisasi</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center justify-between">
                            Rp {balance.toLocaleString('id-ID')}
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                                <Wallet className="w-5 h-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Total In - Total Out (Verified)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 group hover:translate-y-[-4px] transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Financial Runway</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center justify-between">
                            {runway} <span className="text-lg text-muted-foreground ml-1">Bulan</span>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Berbasis rata-rata pengeluaran 3 bulan terakhir</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 group hover:translate-y-[-4px] transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-bold uppercase tracking-wider">Anomali & Flag Terdeteksi</CardDescription>
                        <CardTitle className={`text-3xl font-bold flex items-center justify-between ${activeAnomalies > 0 ? 'text-rose-600' : ''}`}>
                            {activeAnomalies}
                            <div className={`p-2 rounded-xl ${activeAnomalies > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Transaksi yang memerlukan review pimpinan</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity Feed */}
                <Card className="lg:col-span-2 border-none shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-xl">Aktivitas Terkini</CardTitle>
                            <CardDescription>5 Transaksi terbaru dalam sistem audit</CardDescription>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl ${item.type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {item.type === 'in' ? <ArrowUpRight className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-90" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{item.category}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {item.userName || 'System'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${item.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {item.type === 'in' ? '+' : '-'} Rp {item.amount.toLocaleString()}
                                        </p>
                                        <Badge variant={item.status === 'verified' ? 'default' : 'outline'} className={`mt-1 text-[10px] py-0 px-2 ${item.status === 'flagged' ? 'bg-rose-100 text-rose-600 border-rose-200' : ''}`}>
                                            {item.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Operational Column */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Brain className="w-20 h-20" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">Broadcast Update</CardTitle>
                            <CardDescription className="text-indigo-200/60">Kirim ringkasan ke WhatsApp Grup</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-indigo-100 mb-6 leading-relaxed">
                                Salin ringkasan kesehatan organisasi untuk menjaga transparansi kepada seluruh anggota.
                            </p>
                            <Button onClick={copyWhatsAppSummary} variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white hover:text-indigo-900 font-bold">
                                <Copy className="w-4 h-4 mr-2" /> Salin Executive Summary
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle className="text-lg">Kesehatan Organisasi</CardTitle>
                            <CardDescription>Berdasarkan ai_audit_logs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                                <div className={`text-6xl font-bold mb-2 ${isHealthy ? 'text-primary' : 'text-orange-500 animate-pulse'}`}>
                                    {healthScore}
                                    <span className="text-xl text-muted-foreground">/10</span>
                                </div>
                                <p className={`text-sm font-bold uppercase tracking-widest ${isHealthy ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {healthScore < 6 ? 'STATUS: WASPADA' : 'STATUS: SEHAT'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-4 italic max-w-xs">
                                    "{isHealthy ? 'Pertahankan efisiensi program kerja bulan ini.' : 'Segera tinjau anomali pengeluaran logistik.'}"
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
