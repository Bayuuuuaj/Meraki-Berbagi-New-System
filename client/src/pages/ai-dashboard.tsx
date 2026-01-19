import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
    Brain,
    FileText,
    Calendar,
    Shield,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Users,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    Sparkles,
    Search,
    Loader2,
    RefreshCw,
    ChevronRight,
    Lightbulb,
    Wallet
} from "lucide-react";

// Types
// Types
interface RiskScore {
    overall: number;
    financial: number;
    compliance: number;
    operational: number;
    trend: 'improving' | 'stable' | 'worsening';
    details: {
        financial: string;
        compliance: string;
        operational: string;
        overall: string;
    };
}

interface RiskAlert {
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendations: string[];
}

interface HabitInsight {
    category: 'meeting' | 'spending' | 'activity';
    title: string;
    description: string;
    metrics: string;
    confidence: number;
    recommendation: string;
    actionPlan?: string[];
}

interface DashboardData {
    riskScore: RiskScore;
    alerts: RiskAlert[];
    habits?: HabitInsight[];
    summary: {
        totalTransactions: number;
        suspiciousTransactions: number;
        totalMembers: number;
        complianceRate: number;
        financialTrend: string;
    };
    predictions: number[];
    predictedPeriods: string[];
    // New field for Strategic Advice
    actionPlan?: string[];
}

interface DocumentProcessResult {
    category: string;
    confidence: number;
    keywords: string[];
    summary: string;
    entities?: {
        money: number[];
        dates: string[]; // Dates come as strings from JSON
        people: string[];
    };
    priority?: {
        level: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    };
}

interface MeetingAnalysis {
    summary: string;
    actionItems: Array<{
        id: string;
        description: string;
        priority: string;
        status: string;
    }>;
    sentiment: {
        score: number;
        label: string;
        positiveAspects: string[];
        negativeAspects: string[];
        suggestions: string[];
    };
    recommendations?: string[]; // New field for Strategic Advice
}

interface TimeSuggestion {
    date: string;
    startTime: string;
    endTime: string;
    availableParticipants: number;
    totalParticipants: number;
    score: number;
}

interface BudgetSuggestion {
    category: string;
    suggestedAmount: number;
    reason: string;
}

interface BudgetData {
    suggestions: BudgetSuggestion[];
    totalBudget: number;
    strategyNote: string;
}

export default function AIDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");

    // Only show this page to admins
    if (user?.role !== "admin") {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Akses Ditolak</h2>
                        <p className="text-muted-foreground mt-2">Hanya admin yang bisa mengakses AI Dashboard.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Document processing state
    const [docTitle, setDocTitle] = useState("");
    const [docContent, setDocContent] = useState("");
    const [docResult, setDocResult] = useState<DocumentProcessResult | null>(null);

    // Meeting analysis state
    const [meetingNotes, setMeetingNotes] = useState("");
    const [meetingTitle, setMeetingTitle] = useState("");
    const [meetingResult, setMeetingResult] = useState<MeetingAnalysis | null>(null);
    const [timeSuggestions, setTimeSuggestions] = useState<TimeSuggestion[]>([]);

    // Fetch AI Dashboard data
    const { data: dashboardData, isLoading, refetch, error } = useQuery<{ success: boolean; data: DashboardData }>({
        queryKey: ["/api/ai/dashboard"],
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: budgetData, isLoading: isBudgetLoading } = useQuery<{ success: boolean; data: BudgetData }>({
        queryKey: ["/api/ai/budget/suggest"],
    });

    if (error) {
        console.error("AI Dashboard Fetch Error:", error);
    }

    // Document processing mutation
    const processDocMutation = useMutation({
        mutationFn: async ({ title, content }: { title: string; content: string }) => {
            const res = await fetch("/api/ai/documents/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                setDocResult(data.data);
                toast({ title: "Dokumen berhasil diproses dengan AI" });
            }
        },
        onError: () => {
            toast({ title: "Gagal memproses dokumen", variant: "destructive" });
        },
    });

    // Meeting analysis mutation
    const analyzeMeetingMutation = useMutation({
        mutationFn: async ({ notes, title }: { notes: string; title: string }) => {
            const res = await fetch("/api/ai/meetings/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes, title }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                setMeetingResult(data.data);
                toast({ title: "Notulen berhasil dianalisis dengan AI" });
            }
        },
        onError: () => {
            toast({ title: "Gagal menganalisis notulen", variant: "destructive" });
        },
    });

    // Time suggestion mutation
    const suggestTimeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/ai/meetings/suggest-time", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration: 60, preferredDays: 7 }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                setTimeSuggestions(data.data);
                toast({ title: "Rekomendasi waktu berhasil dibuat" });
            }
        },
        onError: () => {
            toast({ title: "Gagal membuat rekomendasi waktu", variant: "destructive" });
        },
    });

    const data = dashboardData?.data;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'medium': return 'bg-yellow-500';
            case 'low': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'worsening': return <TrendingDown className="w-4 h-4 text-red-500" />;
            default: return <Minus className="w-4 h-4 text-gray-500" />;
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 70) return 'text-red-500';
        if (score >= 40) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'laporan_kegiatan': 'Laporan Kegiatan',
            'proposal': 'Proposal',
            'keuangan': 'Keuangan',
            'notulen': 'Notulen',
            'surat': 'Surat',
            'dokumentasi': 'Dokumentasi',
            'lainnya': 'Lainnya'
        };
        return labels[category] || category;
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Brain className="w-8 h-8 text-purple-500" />
                            AI Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Analisis cerdas untuk manajemen organisasi
                        </p>
                    </div>
                    <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Dokumen
                        </TabsTrigger>
                        <TabsTrigger value="meetings" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Meeting
                        </TabsTrigger>
                        <TabsTrigger value="risks" className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Risiko
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            </div>
                        ) : data ? (
                            <>
                                {/* Risk Score Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                                Skor Risiko Total
                                                {getTrendIcon(data.riskScore.trend)}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-4xl font-bold ${getRiskColor(data.riskScore.overall)}`}>
                                                {data.riskScore.overall}
                                            </div>
                                            <Progress value={data.riskScore.overall} className="mt-2" />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {data.riskScore.details?.overall || "Analisis risiko keseluruhan organisasi."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                Risiko Keuangan
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-3xl font-bold ${getRiskColor(data.riskScore.financial)}`}>
                                                {data.riskScore.financial}
                                            </div>
                                            <Progress value={data.riskScore.financial} className="mt-2" />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {data.riskScore.details?.financial || "Analisis arus kas dan transaksi."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                Risiko Kepatuhan
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-3xl font-bold ${getRiskColor(data.riskScore.compliance)}`}>
                                                {data.riskScore.compliance}
                                            </div>
                                            <Progress value={data.riskScore.compliance} className="mt-2" />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {data.riskScore.details?.compliance || "Analisis tingkat kehadiran anggota."}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Shield className="w-4 h-4" />
                                                Risiko Operasional
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`text-3xl font-bold ${getRiskColor(data.riskScore.operational)}`}>
                                                {data.riskScore.operational}
                                            </div>
                                            <Progress value={data.riskScore.operational} className="mt-2" />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {data.riskScore.details?.operational || "Analisis beban kerja dan admin."}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div >

                                {/* Summary Stats */}
                                < div className="grid grid-cols-1 md:grid-cols-4 gap-4" >
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Total Transaksi</p>
                                                    <p className="text-2xl font-bold">{data.summary.totalTransactions}</p>
                                                </div>
                                                <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Transaksi Mencurigakan</p>
                                                    <p className="text-2xl font-bold text-orange-500">{data.summary.suspiciousTransactions}</p>
                                                </div>
                                                <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Total Anggota Aktif</p>
                                                    <p className="text-2xl font-bold">{data.summary.totalMembers}</p>
                                                </div>
                                                <Users className="w-8 h-8 text-blue-500 opacity-50" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Tingkat Kepatuhan</p>
                                                    <p className="text-2xl font-bold text-green-500">{data.summary.complianceRate}%</p>
                                                </div>
                                                <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div >



                                {/* Organizational Insights - Always Render for Debugging */}
                                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-blue-800">
                                            <Lightbulb className="w-5 h-5" />
                                            Wawasan & Kebiasaan Organisasi
                                        </CardTitle>
                                        <CardDescription className="text-blue-600">
                                            AI mempelajari pola historis untuk memberikan rekomendasi cerdas
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {data?.habits && data.habits.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {data.habits.map((habit, i) => {
                                                    // Determine styles based on category
                                                    let icon = <Lightbulb className="w-4 h-4" />;
                                                    let colorClass = "bg-blue-100 text-blue-700 border-blue-200";

                                                    if (habit.category === 'meeting') {
                                                        icon = <Users className="w-4 h-4" />;
                                                        colorClass = "bg-purple-100 text-purple-700 border-purple-200";
                                                    } else if (habit.category === 'spending') {
                                                        icon = <RefreshCw className="w-4 h-4" />;
                                                        colorClass = "bg-amber-100 text-amber-700 border-amber-200";
                                                    } else if (habit.category === 'activity') {
                                                        icon = <Sparkles className="w-4 h-4" />;
                                                        colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                                                    }

                                                    return (
                                                        <div key={i} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className={`flex gap-1 items-center ${colorClass}`}>
                                                                        {icon}
                                                                        {habit.category === 'meeting' ? 'Pertemuan' :
                                                                            habit.category === 'spending' ? 'Keuangan' : 'Keaktifan'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                                                    {Math.round(habit.confidence * 100)}% Conf
                                                                </div>
                                                            </div>

                                                            <div className="mb-3">
                                                                <h4 className="font-bold text-gray-800 text-sm mb-1">{habit.title}</h4>
                                                                <p className="text-xs text-gray-500 line-clamp-2">{habit.description}</p>
                                                            </div>

                                                            <div className="flex items-start gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                                                                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                                                                <span className="font-medium italic">"{habit.recommendation}"</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground bg-white/50 rounded-xl border border-dashed border-blue-200">
                                                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Search className="w-8 h-8 text-blue-500" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-blue-900">Menunggu Data</h3>
                                                <p className="text-sm max-w-sm mx-auto mt-1 mb-4">Sistem sedang mempelajari pola organisasi Anda. Tambahkan lebih banyak transaksi atau absensi untuk melihat wawasan.</p>
                                                <div className="inline-flex items-center gap-2 text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-mono">
                                                    AI Status: Learning ({data?.habits?.length || 0} patterns found)
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Strategic Action Plan (Gemini/Smart Risk) */}
                                <Card className="border-green-200 bg-green-50/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-800">
                                            <Sparkles className="w-5 h-5 text-green-600" />
                                            Rencana Aksi Strategis (AI)
                                        </CardTitle>
                                        <CardDescription className="text-green-700">
                                            Langkah konkrit yang disarankan berdasarkan analisis tren & risiko terkini
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {data.actionPlan && data.actionPlan.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.actionPlan.map((step, i) => (
                                                    <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold border border-green-200">
                                                            {i + 1}
                                                        </div>
                                                        <div className="pt-1">
                                                            <p className="text-sm text-gray-800 font-medium leading-relaxed">{step}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-muted-foreground">
                                                <p>Belum ada rekomendasi strategis saat ini. (Lakukan lebih banyak transaksi untuk analisis)</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* AI Budget Suggestion Section */}
                                <Card className="border-purple-200 bg-purple-50/30">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-purple-800">
                                            <Wallet className="w-5 h-5 text-purple-600" />
                                            Saran Anggaran Bulan Depan (AI)
                                        </CardTitle>
                                        <CardDescription className="text-purple-700">
                                            Alokasi optimal berdasarkan skor efisiensi operasional dan profil risiko
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isBudgetLoading ? (
                                            <div className="flex justify-center py-6">
                                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                            </div>
                                        ) : budgetData?.data?.suggestions ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {budgetData.data.suggestions.map((item, i) => (
                                                        <div key={i} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-bold text-gray-700">{item.category}</span>
                                                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
                                                                    Rp {item.suggestedAmount.toLocaleString('id-ID')}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {item.reason}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-4 p-4 bg-purple-100/50 rounded-lg border border-purple-200">
                                                    <div className="flex items-center gap-2 mb-2 text-purple-900 font-bold">
                                                        <Sparkles className="w-4 h-4" />
                                                        Strategi Anggaran
                                                    </div>
                                                    <p className="text-sm text-purple-800 italic">
                                                        "{budgetData.data.strategyNote}"
                                                    </p>
                                                    <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between items-center">
                                                        <span className="text-sm font-medium text-purple-900">Estimasi Total Anggaran:</span>
                                                        <span className="text-lg font-bold text-purple-900">Rp {budgetData.data.totalBudget.toLocaleString('id-ID')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-muted-foreground">
                                                <p>Belum ada saran anggaran tersedia.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Alerts */}
                                {
                                    data.alerts.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                    Peringatan AI
                                                </CardTitle>
                                                <CardDescription>
                                                    Masalah yang terdeteksi oleh sistem AI
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {data.alerts.map((alert) => (
                                                        <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                                            <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-medium">{alert.title}</h4>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {alert.type}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{alert.description}</p>
                                                                {alert.recommendations && alert.recommendations.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Rekomendasi:</p>
                                                                        <ul className="text-xs text-muted-foreground space-y-1">
                                                                            {alert.recommendations.slice(0, 2).map((rec, i) => (
                                                                                <li key={i} className="flex items-center gap-1">
                                                                                    <ChevronRight className="w-3 h-3" />
                                                                                    {rec}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                }
                            </>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Tidak ada data tersedia</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent >

                    {/* Documents Tab */}
                    < TabsContent value="documents" className="space-y-6" >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Input Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Proses Dokumen dengan AI
                                    </CardTitle>
                                    <CardDescription>
                                        Klasifikasi otomatis, ekstraksi kata kunci, dan ringkasan
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="docTitle">Judul Dokumen</Label>
                                        <Input
                                            id="docTitle"
                                            placeholder="Masukkan judul dokumen..."
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="docContent">Isi Dokumen</Label>
                                        <Textarea
                                            id="docContent"
                                            placeholder="Paste atau ketik isi dokumen di sini..."
                                            value={docContent}
                                            onChange={(e) => setDocContent(e.target.value)}
                                            rows={8}
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => processDocMutation.mutate({ title: docTitle, content: docContent })}
                                        disabled={!docTitle || !docContent || processDocMutation.isPending}
                                    >
                                        {processDocMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 mr-2" />
                                        )}
                                        Proses dengan AI
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Results */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Search className="w-5 h-5 text-green-500" />
                                        Hasil Analisis AI
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {docResult ? (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-1">Kategori</p>
                                                <Badge className="text-sm">
                                                    {getCategoryLabel(docResult.category)}
                                                </Badge>
                                                <span className="ml-2 text-sm text-muted-foreground">
                                                    (Confidence: {Math.round(docResult.confidence * 100)}%)
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-2">Kata Kunci</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {docResult.keywords.map((keyword, i) => (
                                                        <Badge key={i} variant="outline">{keyword}</Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-2">Ringkasan</p>
                                                <p className="text-sm bg-muted p-3 rounded-lg">{docResult.summary}</p>
                                            </div>

                                            {/* Smart Features: Priority & Entities */}
                                            {docResult.priority && (
                                                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 border rounded-lg">
                                                    <AlertTriangle className={`w-4 h-4 ${docResult.priority.level === 'critical' ? 'text-red-600' :
                                                        docResult.priority.level === 'high' ? 'text-orange-500' : 'text-blue-500'
                                                        }`} />
                                                    <div>
                                                        <span className="text-sm font-bold uppercase mr-2">{docResult.priority.level} Priority</span>
                                                        <span className="text-xs text-muted-foreground">({docResult.priority.reason})</span>
                                                    </div>
                                                </div>
                                            )}

                                            {docResult.entities && (
                                                <div className="grid grid-cols-3 gap-2 mt-2">
                                                    {docResult.entities.money?.length > 0 && (
                                                        <div className="bg-green-50 p-2 rounded border border-green-100">
                                                            <p className="text-xs font-bold text-green-700 flex items-center gap-1">
                                                                <DollarSign className="w-3 h-3" /> Uang
                                                            </p>
                                                            <p className="text-xs truncate">
                                                                {docResult.entities.money.map(m => `Rp ${m.toLocaleString()}`).join(', ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {docResult.entities.dates?.length > 0 && (
                                                        <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                                            <p className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> Tanggal
                                                            </p>
                                                            <p className="text-xs truncate">
                                                                {docResult.entities.dates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {docResult.entities.people?.length > 0 && (
                                                        <div className="bg-purple-50 p-2 rounded border border-purple-100">
                                                            <p className="text-xs font-bold text-purple-700 flex items-center gap-1">
                                                                <Users className="w-3 h-3" /> Orang
                                                            </p>
                                                            <p className="text-xs truncate">
                                                                {docResult.entities.people.join(', ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">
                                                Masukkan dokumen untuk diproses
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent >

                    {/* Meetings Tab */}
                    < TabsContent value="meetings" className="space-y-6" >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Meeting Analysis */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-purple-500" />
                                        Analisis Notulen Meeting
                                    </CardTitle>
                                    <CardDescription>
                                        Generate ringkasan, action items, dan analisis sentimen
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="meetingTitle">Judul Meeting</Label>
                                        <Input
                                            id="meetingTitle"
                                            placeholder="Rapat Koordinasi..."
                                            value={meetingTitle}
                                            onChange={(e) => setMeetingTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="meetingNotes">Notulen Meeting</Label>
                                        <Textarea
                                            id="meetingNotes"
                                            placeholder="Paste notulen meeting di sini..."
                                            value={meetingNotes}
                                            onChange={(e) => setMeetingNotes(e.target.value)}
                                            rows={8}
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => analyzeMeetingMutation.mutate({ notes: meetingNotes, title: meetingTitle })}
                                        disabled={!meetingNotes || analyzeMeetingMutation.isPending}
                                    >
                                        {analyzeMeetingMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 mr-2" />
                                        )}
                                        Analisis dengan AI
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Meeting Results */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Hasil Analisis Meeting</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {meetingResult ? (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-2">Ringkasan</p>
                                                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-line">
                                                    {meetingResult.summary}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                                    Sentimen
                                                    <Badge
                                                        className="ml-2"
                                                        variant={
                                                            meetingResult.sentiment.label === 'positive' ? 'default' :
                                                                meetingResult.sentiment.label === 'negative' ? 'destructive' : 'secondary'
                                                        }
                                                    >
                                                        {meetingResult.sentiment.label}
                                                    </Badge>
                                                </p>
                                            </div>

                                            {meetingResult.actionItems.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Action Items</p>
                                                    <div className="space-y-2">
                                                        {meetingResult.actionItems.slice(0, 5).map((item) => (
                                                            <div key={item.id} className="flex items-start gap-2 text-sm p-2 bg-muted rounded">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {item.priority}
                                                                </Badge>
                                                                <span>{item.description}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {meetingResult.recommendations && meetingResult.recommendations.length > 0 && (
                                                <div className="pt-4 border-t">
                                                    <p className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" />
                                                        Saran Strategis AI
                                                    </p>
                                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 space-y-2">
                                                        {meetingResult.recommendations.map((rec, i) => (
                                                            <div key={i} className="flex gap-2 text-sm text-purple-900">
                                                                <span className="font-bold">•</span>
                                                                <span>{rec}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground">
                                                Masukkan notulen untuk dianalisis
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Time Suggestions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-500" />
                                    Rekomendasi Waktu Meeting
                                </CardTitle>
                                <CardDescription>
                                    AI akan merekomendasikan waktu optimal berdasarkan ketersediaan
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => suggestTimeMutation.mutate()}
                                    disabled={suggestTimeMutation.isPending}
                                    className="mb-4"
                                >
                                    {suggestTimeMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Rekomendasi
                                </Button>

                                {timeSuggestions.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {timeSuggestions.map((suggestion, i) => (
                                            <div key={i} className="p-3 border rounded-lg">
                                                <div className="font-medium">{suggestion.date}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {suggestion.startTime} - {suggestion.endTime}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Score: {Math.round(suggestion.score * 100)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent >

                    {/* Risks Tab */}
                    < TabsContent value="risks" className="space-y-6" >
                        {
                            isLoading ? (
                                <div className="flex items-center justify-center py-12" >
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                </div>
                            ) : data ? (
                                <>
                                    {/* Risk Overview */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Analisis Risiko Lengkap</CardTitle>
                                            <CardDescription>
                                                Deteksi fraud, monitoring kepatuhan, dan prediksi keuangan
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="text-center p-4 bg-muted rounded-lg">
                                                    <Shield className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                                                    <h4 className="font-medium">Fraud Detection</h4>
                                                    <p className="text-2xl font-bold mt-2">{data.summary.suspiciousTransactions}</p>
                                                    <p className="text-sm text-muted-foreground">Transaksi mencurigakan</p>
                                                </div>

                                                <div className="text-center p-4 bg-muted rounded-lg">
                                                    <Users className="w-10 h-10 mx-auto mb-2 text-green-500" />
                                                    <h4 className="font-medium">Compliance</h4>
                                                    <p className="text-2xl font-bold mt-2">{data.summary.complianceRate}%</p>
                                                    <p className="text-sm text-muted-foreground">Tingkat kepatuhan</p>
                                                </div>

                                                <div className="text-center p-4 bg-muted rounded-lg">
                                                    <TrendingUp className="w-10 h-10 mx-auto mb-2 text-purple-500" />
                                                    <h4 className="font-medium">Prediksi</h4>
                                                    <p className="text-2xl font-bold mt-2 capitalize">{data.summary.financialTrend}</p>
                                                    <p className="text-sm text-muted-foreground">Tren keuangan</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Predictions */}
                                    {data.predictions && data.predictions.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-purple-500" />
                                                    Prediksi Keuangan
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {data.predictions.map((prediction, i) => (
                                                        <div key={i} className="p-4 border rounded-lg">
                                                            <p className="text-sm text-muted-foreground">
                                                                {data.predictedPeriods[i]}
                                                            </p>
                                                            <p className="text-2xl font-bold">
                                                                Rp {prediction.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* All Alerts */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                                Semua Alert
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {data.alerts.length > 0 ? (
                                                <div className="space-y-3">
                                                    {data.alerts.map((alert) => (
                                                        <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                                            <div className={`w-3 h-3 rounded-full mt-1 ${getSeverityColor(alert.severity)}`} />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-medium">{alert.title}</h4>
                                                                    <Badge variant="outline">{alert.severity}</Badge>
                                                                    <Badge variant="secondary">{alert.type}</Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">{alert.description}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                                                    <p className="text-muted-foreground">
                                                        Tidak ada alert saat ini. Sistem berjalan normal.
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </>
                            ) : null}
                    </TabsContent >
                </Tabs >
            </div >
        </DashboardLayout >
    );
}
