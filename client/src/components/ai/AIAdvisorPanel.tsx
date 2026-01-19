import { AlertTriangle, TrendingUp, ClipboardCopy, Sparkles, Target, Zap } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Anomaly {
    id: string;
    reason: string;
    severity?: 'low' | 'medium' | 'high';
}

interface AIAdvisorPanelProps {
    advice?: string;
    anomalies?: Anomaly[];
    efficiencyScore?: number;
    isLoading?: boolean;
}

export default function AIAdvisorPanel({
    advice = "",
    anomalies = [],
    efficiencyScore = 0,
    isLoading = false
}: AIAdvisorPanelProps) {

    const handleCopySummary = () => {
        const summary = `### Laporan Audit AI - Meraki-Berbagi\n\nEfficiency Score: ${efficiencyScore}/10\n\n**Analisis Terdeteksi:**\n${anomalies.map(a => `- ${a.reason}`).join('\n')}\n\n**Nasihat Strategis:**\n${advice}`;
        navigator.clipboard.writeText(summary);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 animate-pulse">
                <div className="col-span-2 h-40 bg-muted rounded-2xl" />
                <div className="h-40 bg-muted rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. Financial Advisor Note (Glassmorphism) */}
            <Card className="col-span-1 md:col-span-2 relative overflow-hidden bg-white/40 backdrop-blur-xl border-white/20 shadow-xl border">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-24 h-24 text-primary" />
                </div>
                <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/20 rounded-lg backdrop-blur-md">
                            <Zap className="text-primary w-5 h-5 fill-primary" />
                        </div>
                        <h3 className="font-heading font-bold text-xl text-foreground">AI Strategic Advisor</h3>
                    </div>
                    <div className="relative">
                        <p className="text-lg leading-relaxed text-foreground/80 font-medium italic">
                            "{advice || "Sedang menganalisis stabilitas keuangan organisasi..."}"
                        </p>
                    </div>
                    <div className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            Live Audit Active
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div>Gemini 1.5 Flash Enabled</div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Efficiency Score Gauge (Premium SVG) */}
            <Card className="bg-white/40 backdrop-blur-xl border-white/20 shadow-xl border flex flex-col items-center justify-center p-6 text-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-muted/20"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 58}
                            strokeDashoffset={2 * Math.PI * 58 * (1 - efficiencyScore / 10)}
                            strokeLinecap="round"
                            className="text-primary transition-all duration-1000 ease-in-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-foreground">{efficiencyScore}<span className="text-sm text-muted-foreground">/10</span></span>
                    </div>
                </div>
                <div className="mt-4">
                    <h4 className="font-bold text-foreground">Efficiency Score</h4>
                    <p className="text-xs text-muted-foreground mt-1">Rasio Program vs Operasional</p>
                </div>
                <Badge variant="secondary" className="mt-4 bg-primary/10 text-primary border-none">Excellent Health</Badge>
            </Card>

            {/* 3. Anomaly Alerts (Soft Red Design) */}
            <Card className="col-span-1 md:col-span-3 bg-white/40 backdrop-blur-xl border-white/20 shadow-xl border overflow-hidden">
                <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/10 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-red-600 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        Audit Temuan & Anomali
                    </div>
                    <Badge variant="destructive" className="font-bold">
                        {anomalies.length} Critical Findings
                    </Badge>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {anomalies.length > 0 ? (
                        anomalies.map((item, idx) => (
                            <div key={idx} className="group relative p-4 bg-white/50 rounded-xl border border-red-100/50 hover:bg-red-50/50 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <p className="text-sm text-foreground/80 font-medium">{item.reason}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-8">
                            <Sparkles className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                            <p className="text-muted-foreground italic">Sistem Keuangan Bersih. Tidak ada anomali terdeteksi bulan ini.</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-black/5 flex justify-center">
                    <button
                        onClick={handleCopySummary}
                        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ClipboardCopy className="w-4 h-4" />
                        Salin Ringkasan untuk Rapat Pengurus
                    </button>
                </div>
            </Card>
        </div>
    );
}
