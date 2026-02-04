import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    Wallet,
    Download,
    Info
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
    predictions?: {
        expenses: {
            prediction: number;
            confidence: 'low' | 'medium' | 'high';
            trend: 'increasing' | 'stable' | 'decreasing';
            basis: string;
            monthlyAverages: number[];
            hasInsufficientData: boolean;
        };
        attendance: {
            prediction: number;
            confidence: 'low' | 'medium' | 'high';
            historicalAverage: number;
            trend: 'improving' | 'stable' | 'declining';
            hasInsufficientData: boolean;
        };
    };
    predictedPeriods: string[];
    meetingSuggestions?: Array<{
        date: string;
        reason: string;
        score: number;
        attendanceRate: number;
        operationalLoad: string;
    }>;
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

// Helper Components (Memoized)
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
        'nota_kas': 'Nota Kas',
        'proposal_proker': 'Proposal Proker',
        'laporan_kegiatan': 'Laporan Kegiatan',
        'surat_keluar': 'Surat Keluar',
        'lainnya': 'Lainnya'
    };
    return labels[category] || category;
};

const LearningModeBanner = React.memo(({ learningMode, totalTransactions }: { learningMode: boolean, totalTransactions: number }) => {
    if (!learningMode) return null;
    return (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-md">
            <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                    <div className="bg-amber-100 p-3 rounded-2xl">
                        <Brain className="w-8 h-8 text-amber-600 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-amber-900 text-lg">
                                🧠 AI Sedang Mempelajari Pola Organisasi
                            </h3>
                            <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200 border-none">
                                {Math.round((totalTransactions / 5) * 100)}%
                            </Badge>
                        </div>
                        <p className="text-sm text-amber-800 mb-3">
                            Sistem membutuhkan minimal <strong>5 transaksi</strong> untuk mengaktifkan fitur analisis penuh.
                            Saat ini: <strong>{totalTransactions}/5 transaksi</strong>.
                        </p>
                        <div className="space-y-3">
                            <Progress
                                value={(totalTransactions / 5) * 100}
                                className="h-2 bg-amber-100 [&>div]:bg-amber-500 animate-in fade-in duration-1000"
                            />
                            <div className="bg-amber-100/50 p-3 rounded-xl border border-amber-200">
                                <p className="text-xs text-amber-700 font-medium">
                                    💡 <strong>Tips:</strong> Tambahkan {5 - totalTransactions} transaksi lagi untuk membuka analisis "Wawasan & Kebiasaan"!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

const RiskScoreSection = React.memo(({ riskScore }: { riskScore: RiskScore }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Skor Risiko Total
                    {getTrendIcon(riskScore.trend)}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-4xl font-bold ${getRiskColor(riskScore.overall)}`}>
                    {riskScore.overall}
                </div>
                <Progress value={riskScore.overall} className="mt-2 animate-in fade-in slide-in-from-left duration-1000" />
                <p className="text-xs text-muted-foreground mt-2">
                    {riskScore.details?.overall || "Analisis risiko keseluruhan organisasi."}
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
                <div className={`text-3xl font-bold ${getRiskColor(riskScore.financial)}`}>
                    {riskScore.financial}
                </div>
                <Progress value={riskScore.financial} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                    {riskScore.details?.financial || "Analisis arus kas dan transaksi."}
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
                <div className={`text-3xl font-bold ${getRiskColor(riskScore.compliance)}`}>
                    {riskScore.compliance}
                </div>
                <Progress value={riskScore.compliance} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                    {riskScore.details?.compliance || "Analisis tingkat kehadiran anggota."}
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
                <div className={`text-3xl font-bold ${getRiskColor(riskScore.operational)}`}>
                    {riskScore.operational}
                </div>
                <Progress value={riskScore.operational} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                    {riskScore.details?.operational || "Analisis beban kerja dan admin."}
                </p>
            </CardContent>
        </Card>
    </div>
));

const SummaryStatsSection = React.memo(({ summary }: { summary: DashboardData['summary'] }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Transaksi</p>
                        <p className="text-2xl font-bold">{summary.totalTransactions}</p>
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
                        <p className="text-2xl font-bold text-orange-500">{summary.suspiciousTransactions}</p>
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
                        <p className="text-2xl font-bold">{summary.totalMembers}</p>
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
                        <p className="text-2xl font-bold text-green-500">{summary.complianceRate}%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                </div>
            </CardContent>
        </Card>
    </div>
));

const PredictiveAnalyticsSection = React.memo(({ predictions }: { predictions: DashboardData['predictions'] }) => {
    if (!predictions) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:scale-[1.02] transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-emerald-800">
                        <span className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Prediksi Pengeluaran Bulan Depan
                        </span>
                        <Badge variant={
                            predictions.expenses.confidence === 'high' ? 'default' :
                                predictions.expenses.confidence === 'medium' ? 'secondary' : 'outline'
                        }>
                            {predictions.expenses.confidence === 'high' ? '🎯 High' :
                                predictions.expenses.confidence === 'medium' ? '📊 Medium' : '⚠️ Low'} Confidence
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-emerald-600">
                        Berdasarkan Simple Moving Average (3 bulan terakhir)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {predictions.expenses.hasInsufficientData ? (
                        <div className="text-center py-4">
                            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                {predictions.expenses.basis}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Tambahkan lebih banyak transaksi untuk prediksi yang akurat
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2 mb-4">
                                <p className="text-4xl font-bold text-emerald-700 currency">
                                    Rp{(predictions.expenses.prediction / 1000).toFixed(0)}K
                                </p>
                                <Badge variant={
                                    predictions.expenses.trend === 'increasing' ? 'destructive' :
                                        predictions.expenses.trend === 'decreasing' ? 'default' : 'secondary'
                                }>
                                    {predictions.expenses.trend === 'increasing' ? '📈 Naik' :
                                        predictions.expenses.trend === 'decreasing' ? '📉 Turun' : '➡️ Stabil'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {predictions.expenses.basis}
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:scale-[1.02] transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-blue-800">
                        <span className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Prediksi Tingkat Kehadiran
                        </span>
                        <Badge variant={
                            predictions.attendance.confidence === 'high' ? 'default' :
                                predictions.attendance.confidence === 'medium' ? 'secondary' : 'outline'
                        }>
                            {predictions.attendance.confidence === 'high' ? '🎯 High' :
                                predictions.attendance.confidence === 'medium' ? '📊 Medium' : '⚠️ Low'} Confidence
                        </Badge>
                    </CardTitle>
                    <CardDescription className="text-blue-600">
                        Berdasarkan rata-rata historis 3 bulan terakhir
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {predictions.attendance.hasInsufficientData ? (
                        <div className="text-center py-4">
                            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Data kehadiran kurang dari 10 record
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Catat lebih banyak kehadiran untuk prediksi yang akurat
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2 mb-4">
                                <p className="text-4xl font-bold text-blue-700">
                                    {predictions.attendance.prediction}%
                                </p>
                                <Badge variant={
                                    predictions.attendance.trend === 'improving' ? 'default' :
                                        predictions.attendance.trend === 'declining' ? 'destructive' : 'secondary'
                                }>
                                    {predictions.attendance.trend === 'improving' ? '📈 Membaik' :
                                        predictions.attendance.trend === 'declining' ? '📉 Menurun' : '➡️ Stabil'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Rata-rata historis: {predictions.attendance.historicalAverage}%
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

const MeetingRecommenderSection = React.memo(({ suggestions }: { suggestions: DashboardData['meetingSuggestions'] }) => {
    if (!suggestions || suggestions.length === 0) return null;
    return (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Calendar className="w-5 h-5" />
                    Rekomendasi Waktu Meeting
                </CardTitle>
                <CardDescription className="text-purple-600">
                    Berdasarkan analisis kehadiran dan beban operasional
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestions.map((suggestion, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-lg text-purple-900">
                                    {suggestion.date}
                                </h4>
                                <Badge variant={i === 0 ? 'default' : 'secondary'}>
                                    #{i + 1}
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                                {suggestion.reason}
                            </p>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Tingkat Kehadiran:</span>
                                    <Badge variant="outline" className="font-mono">
                                        {suggestion.attendanceRate}%
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Beban Operasional:</span>
                                    <Badge variant={
                                        suggestion.operationalLoad === 'Rendah' ? 'default' :
                                            suggestion.operationalLoad === 'Sedang' ? 'secondary' : 'destructive'
                                    }>
                                        {suggestion.operationalLoad}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-muted-foreground font-semibold">Skor Total:</span>
                                    <span className="font-bold text-purple-700">
                                        {(suggestion.score * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Alert className="mt-4 bg-purple-50 border-purple-200">
                    <Info className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-xs text-purple-800">
                        <strong>Formula Skor:</strong> (Tingkat Kehadiran × 70%) + (Beban Operasional Rendah × 30%)
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
});

const OrganizationalInsightsSection = React.memo(({ habits }: { habits: DashboardData['habits'] }) => (
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
            {habits && habits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {habits.map((habit, i) => {
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
                            <div key={i} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
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
                </div>
            )}
        </CardContent>
    </Card>
));

const StrategicActionPlanSection = React.memo(({ actionPlan }: { actionPlan: DashboardData['actionPlan'] }) => {
    if (!actionPlan || actionPlan.length === 0) return null;
    return (
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
                <div className="space-y-3">
                    {actionPlan.map((step, i) => (
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
            </CardContent>
        </Card>
    );
});

const BudgetSuggestionsSection = React.memo(({ budgetData, isLoading }: { budgetData: BudgetData | undefined, isLoading: boolean }) => (
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
            {isLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
            ) : budgetData?.suggestions ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {budgetData.suggestions.map((item, i) => (
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
                            "{budgetData.strategyNote}"
                        </p>
                        <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between items-center">
                            <span className="text-sm font-medium text-purple-900">Estimasi Total Anggaran:</span>
                            <span className="text-lg font-bold text-purple-900">Rp {budgetData.totalBudget.toLocaleString('id-ID')}</span>
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
));

const RiskAlertsSection = React.memo(({ alerts }: { alerts: RiskAlert[] }) => {
    if (!alerts || alerts.length === 0) return null;
    return (
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
                    {alerts.map((alert) => (
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
    );
});

// Memoized Tabs Components
const OverviewTab = React.memo(({ isLoading, dashboardData, refetch, budgetData, isBudgetLoading }: {
    isLoading: boolean;
    dashboardData: any;
    refetch: () => void;
    budgetData: any;
    isBudgetLoading: boolean;
}) => (
    <div className="space-y-6">
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        ) : dashboardData?.data ? (
            <>
                <LearningModeBanner
                    learningMode={dashboardData.data.learningMode || false}
                    totalTransactions={dashboardData.data.summary.totalTransactions}
                />
                <RiskScoreSection riskScore={dashboardData.data.riskScore} />
                <SummaryStatsSection summary={dashboardData.data.summary} />
                <PredictiveAnalyticsSection predictions={dashboardData.data.predictions} />
                <MeetingRecommenderSection suggestions={dashboardData.data.meetingSuggestions || []} />
                <OrganizationalInsightsSection habits={dashboardData.data.habits || []} />
                <StrategicActionPlanSection actionPlan={dashboardData.data.actionPlan || []} />
                <BudgetSuggestionsSection budgetData={budgetData?.data} isLoading={isBudgetLoading} />
                <RiskAlertsSection alerts={dashboardData.data.alerts} />
            </>
        ) : (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Brain className="w-12 h-12 mb-4 opacity-20" />
                    <p>Gagal memuat data intelligence organisasi. Pastikan data transaksi dan absensi sudah tersedia.</p>
                    <Button onClick={() => refetch()} variant="outline" className="mt-4">
                        <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
                    </Button>
                </CardContent>
            </Card>
        )}
    </div>
));

const DocumentsTab = React.memo(({ docTitle, setDocTitle, docContent, setDocContent, processDocMutation, docResult }: {
    docTitle: string;
    setDocTitle: (val: string) => void;
    docContent: string;
    setDocContent: (val: string) => void;
    processDocMutation: any;
    docResult: any;
}) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Proses Dokumen dengan AI
                    </CardTitle>
                    <CardDescription>
                        Klasifikasi otomatis dan ekstraksi kata kunci (Streaming)
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
                            placeholder="Paste isi dokumen di sini..."
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
                        Proses dengan AI (Streaming)
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hasil Analisis (Streaming)</CardTitle>
                </CardHeader>
                <CardContent>
                    {docResult ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Badge>{getCategoryLabel(docResult.category)}</Badge>
                                <div className="text-xs font-bold text-green-600">
                                    {Math.round(docResult.confidence * 100)}% Confidence
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Ringkasan Eksekutif</p>
                                <div className="text-sm bg-muted p-3 rounded-lg leading-relaxed whitespace-pre-line border-l-4 border-blue-500">
                                    {docResult.summary}
                                </div>
                            </div>

                            {docResult.keywords.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Kata Kunci Utama</p>
                                    <div className="flex flex-wrap gap-2">
                                        {docResult.keywords.map((kw: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="capitalize">
                                                {kw}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Data analisis akan muncul secara real-time di sini.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
));

const MeetingsTab = React.memo(({ meetingTitle, setMeetingTitle, meetingNotes, setMeetingNotes, analyzeMeetingMutation, meetingResult }: {
    meetingTitle: string;
    setMeetingTitle: (val: string) => void;
    meetingNotes: string;
    setMeetingNotes: (val: string) => void;
    analyzeMeetingMutation: any;
    meetingResult: any;
}) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        Analisis Notulen Meeting
                    </CardTitle>
                    <CardDescription>
                        Generate ringkasan dan action items secara real-time
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
                        Analisis dengan AI (Streaming)
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hasil Analisis (Streaming)</CardTitle>
                </CardHeader>
                <CardContent>
                    {meetingResult ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Ringkasan</p>
                                <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-line border-l-4 border-purple-500">
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
                                        {meetingResult.actionItems.slice(0, 5).map((item: any) => (
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
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Hasil analisis akan muncul secara real-time di sini.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
));

const RisksTab = React.memo(({ isLoading, dashboardData }: {
    isLoading: boolean;
    dashboardData: any;
}) => (
    <div className="space-y-6">
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        ) : dashboardData?.data ? (
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
                                <p className="text-2xl font-bold mt-2">{dashboardData.data.summary.suspiciousTransactions}</p>
                                <p className="text-sm text-muted-foreground">Transaksi mencurigakan</p>
                            </div>

                            <div className="text-center p-4 bg-muted rounded-lg">
                                <Users className="w-10 h-10 mx-auto mb-2 text-green-500" />
                                <h4 className="font-medium">Compliance</h4>
                                <p className="text-2xl font-bold mt-2">{dashboardData.data.summary.complianceRate}%</p>
                                <p className="text-sm text-muted-foreground">Tingkat kepatuhan</p>
                            </div>

                            <div className="text-center p-4 bg-muted rounded-lg">
                                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-purple-500" />
                                <h4 className="font-medium">Prediksi</h4>
                                <p className="text-2xl font-bold mt-2 capitalize">{dashboardData.data.summary.financialTrend}</p>
                                <p className="text-sm text-muted-foreground">Tren keuangan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* All Alerts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Semua Alert
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData.data.alerts.length > 0 ? (
                            <div className="space-y-3">
                                {dashboardData.data.alerts.map((alert: any) => (
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
    </div>
));

export default function AIDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
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
    const [meetingTitle, setMeetingTitle] = useState("");
    const [meetingNotes, setMeetingNotes] = useState("");
    const [meetingResult, setMeetingResult] = useState<MeetingAnalysis | null>(null);
    const [timeSuggestions, setTimeSuggestions] = useState<TimeSuggestion[]>([]);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // Fetch AI Dashboard data from real intelligence endpoint
    const { data: dashboardData, isLoading, refetch, error } = useQuery<{ success: boolean; data: DashboardData & { learningMode?: boolean } }>({
        queryKey: ["/api/admin/intelligence"],
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 60000,
    });

    const { data: budgetData, isLoading: isBudgetLoading } = useQuery<{ success: boolean; data: BudgetData }>({
        queryKey: ["/api/ai/budget/suggest"],
        staleTime: 30 * 60 * 1000,
    });

    if (error) {
        console.error("AI Dashboard Fetch Error:", error);
    }

    // Document processing mutation with Streaming support
    const processDocMutation = useMutation({
        mutationFn: async ({ title, content }: { title: string; content: string }) => {
            setDocResult(null); // Reset previous result
            const res = await fetch("/api/ai/documents/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, stream: true }),
            });

            if (!res.ok) throw new Error("Gagal memproses dokumen");

            const reader = res.body?.getReader();
            if (!reader) throw new Error("Stream not supported");

            let accumulatedSummary = "";
            let metadata: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = new TextDecoder().decode(value);
                const lines = chunkText.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "");
                        if (dataStr === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.type === 'metadata') {
                                metadata = parsed;
                            } else if (parsed.type === 'content') {
                                accumulatedSummary += parsed.chunk;
                                // Force state update for "typing" effect
                                setDocResult(prev => ({
                                    ...metadata,
                                    summary: accumulatedSummary,
                                    confidence: metadata?.confidence || 0,
                                    keywords: metadata?.keywords || [],
                                    category: metadata?.category || 'lainnya'
                                }));
                            }
                        } catch (e) { }
                    }
                }
            }
            return { success: true };
        },
        onSuccess: () => {
            toast({ title: "Dokumen berhasil dianalisis secara lokal" });
        },
        onError: () => {
            toast({ title: "Gagal menganalisis dokumen", variant: "destructive" });
        },
    });

    // Meeting analysis mutation with Streaming support
    const analyzeMeetingMutation = useMutation({
        mutationFn: async ({ notes, title }: { notes: string; title: string }) => {
            setMeetingResult(null); // Reset previous result
            const res = await fetch("/api/ai/meetings/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes, title, stream: true }),
            });

            if (!res.ok) throw new Error("Gagal menganalisis rapat");

            const reader = res.body?.getReader();
            if (!reader) throw new Error("Stream not supported");

            let accumulatedSummary = "";
            let metadata: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = new TextDecoder().decode(value);
                const lines = chunkText.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "");
                        if (dataStr === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.type === 'metadata') {
                                metadata = parsed;
                            } else if (parsed.type === 'content') {
                                accumulatedSummary += parsed.chunk;
                                // Update result with streaming content
                                setMeetingResult(prev => ({
                                    ...metadata,
                                    summary: accumulatedSummary,
                                    actionItems: metadata?.actionItems || [],
                                    sentiment: metadata?.sentiment || { score: 0, label: 'neutral', positiveAspects: [], negativeAspects: [], suggestions: [] },
                                    recommendations: metadata?.recommendations || []
                                }));
                            }
                        } catch (e) { }
                    }
                }
            }
            return { success: true };
        },
        onSuccess: () => {
            toast({ title: "Rapat berhasil dianalisis secara lokal" });
        },
        onError: () => {
            toast({ title: "Gagal menganalisis rapat", variant: "destructive" });
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


    // PDF Export Handler
    const handleExportPDF = async () => {
        try {
            setIsExportingPDF(true);
            const response = await fetch('/api/admin/intelligence/export-pdf');

            if (!response.ok) {
                throw new Error('Gagal mengekspor PDF');
            }

            // Get the PDF blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Intelligence-Report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "PDF Berhasil Diunduh",
                description: "Laporan intelligence telah diunduh ke perangkat Anda.",
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast({
                title: "Gagal Mengekspor PDF",
                description: "Terjadi kesalahan saat mengekspor laporan. Silakan coba lagi.",
                variant: "destructive",
            });
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <DashboardLayout>
            <PageTransition>
                <div className="space-y-6 pb-32 min-h-screen">
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
                        <div className="flex gap-2">
                            {/* Instagram-Style Refresh Button */}
                            <Button
                                onClick={() => {
                                    queryClient.invalidateQueries({ queryKey: ["/api/admin/intelligence"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                    toast({ title: "Data disegarkan", description: "Dashboard diperbarui dengan data terbaru" });
                                }}
                                variant="ghost"
                                size="icon"
                                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100"
                                title="Refresh Data"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                            <Button onClick={handleExportPDF} variant="default" disabled={isExportingPDF || isLoading}>
                                {isExportingPDF ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Export PDF
                            </Button>
                            <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
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

                        <TabsContent value="overview">
                            <OverviewTab
                                isLoading={isLoading}
                                dashboardData={dashboardData}
                                refetch={refetch}
                                budgetData={budgetData}
                                isBudgetLoading={isBudgetLoading}
                            />
                        </TabsContent>

                        <TabsContent value="documents">
                            <DocumentsTab
                                docTitle={docTitle}
                                setDocTitle={setDocTitle}
                                docContent={docContent}
                                setDocContent={setDocContent}
                                processDocMutation={processDocMutation}
                                docResult={docResult}
                            />
                        </TabsContent>

                        <TabsContent value="meetings">
                            <MeetingsTab
                                meetingTitle={meetingTitle}
                                setMeetingTitle={setMeetingTitle}
                                meetingNotes={meetingNotes}
                                setMeetingNotes={setMeetingNotes}
                                analyzeMeetingMutation={analyzeMeetingMutation}
                                meetingResult={meetingResult}
                            />
                        </TabsContent>

                        <TabsContent value="risks">
                            <RisksTab
                                isLoading={isLoading}
                                dashboardData={dashboardData}
                            />
                        </TabsContent>
                    </Tabs >
                </div>
            </PageTransition>
        </DashboardLayout >
    );
}
