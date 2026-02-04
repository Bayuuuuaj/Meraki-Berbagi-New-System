import type { User, Attendance, Treasury, Document } from '@shared/schema.ts';
import { calculateOverallDocumentRisk } from './document-risk-analyzer';

// Types for Intelligence Dashboard
export interface EfficiencyScore {
    score: number;
    status: 'excellent' | 'good' | 'needs_improvement';
    programSpending: number;
    totalSpending: number;
    operationalSpending: number;
}

export interface Anomaly {
    id: string;
    type: 'high_amount_no_proof' | 'duplicate_transaction' | 'unusual_pattern';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    transactionId: string;
    amount: number;
    date: string;
    recommendations: string[];
}

export interface ComplianceMetrics {
    rate: number;
    totalMembers: number;
    activeMembers: number;
    monthlyAttendance: number;
    expectedAttendance: number;
    trend: 'improving' | 'stable' | 'worsening';
}

export interface HabitInsight {
    category: 'meeting' | 'spending' | 'activity';
    title: string;
    description: string;
    metrics: string;
    confidence: number;
    recommendation: string;
    actionPlan?: string[];
}

export interface ExpensePrediction {
    prediction: number;
    confidence: 'low' | 'medium' | 'high';
    trend: 'increasing' | 'stable' | 'decreasing';
    basis: string;
    monthlyAverages: number[];
    hasInsufficientData: boolean;
}

export interface AttendancePrediction {
    prediction: number;
    confidence: 'low' | 'medium' | 'high';
    historicalAverage: number;
    trend: 'improving' | 'stable' | 'declining';
    hasInsufficientData: boolean;
}

export interface IntelligenceData {
    isLearning: boolean;
    efficiencyScore: EfficiencyScore;
    anomalies: Anomaly[];
    complianceMetrics: ComplianceMetrics;
    habitInsights: HabitInsight[];
    predictions: {
        expenses: ExpensePrediction;
        attendance: AttendancePrediction;
    };
    summary: {
        totalTransactions: number;
        suspiciousTransactions: number;
        totalMembers: number;
        complianceRate: number;
        financialTrend: string;
    };
    riskScore: {
        overall: number;
        financial: number;
        compliance: number;
        operational: number;
        document: number;
        trend: 'improving' | 'stable' | 'worsening';
        details: {
            financial: string;
            compliance: string;
            operational: string;
            document: string;
            overall: string;
        };
    };
    actionPlan: string[];
}

/**
 * Calculate Efficiency Score based on Program vs Operational spending
 * Formula: (Program Spending / Total Spending) * 100
 * Status: >70% = Excellent, 50-70% = Good, <50% = Needs Improvement
 */
export function calculateEfficiencyScore(treasury: Treasury[]): EfficiencyScore {
    // Safety check: return safe default if no data
    if (!treasury || treasury.length === 0) {
        return {
            score: 0,
            status: 'needs_improvement',
            programSpending: 0,
            totalSpending: 0,
            operationalSpending: 0
        };
    }

    const expenses = treasury.filter(t => t.type === 'expense');

    const programSpending = expenses
        .filter(t => t.category?.toLowerCase().includes('program') ||
            t.category?.toLowerCase().includes('kegiatan'))
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const operationalSpending = expenses
        .filter(t => t.category?.toLowerCase().includes('operasional') ||
            t.category?.toLowerCase().includes('admin'))
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalSpending = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);

    const score = totalSpending > 0 ? (programSpending / totalSpending) * 100 : 0;

    let status: 'excellent' | 'good' | 'needs_improvement';
    if (score >= 70) status = 'excellent';
    else if (score >= 50) status = 'good';
    else status = 'needs_improvement';

    return {
        score: Math.round(score),
        status,
        programSpending,
        totalSpending,
        operationalSpending
    };
}

/**
 * Detect anomalies in treasury transactions
 * Rules:
 * 1. Amount > threshold without proof image (CRITICAL)
 * 2. Duplicate amount + category within specified hours (HIGH)
 * 
 * @param treasury - Treasury transactions to analyze
 * @param config - Configuration for anomaly detection thresholds
 */
export function detectAnomalies(
    treasury: Treasury[],
    config: { thresholdAmount: number; duplicateHours: number } = { thresholdAmount: 1000000, duplicateHours: 24 }
): Anomaly[] {
    // Safety check: return empty array if no data
    if (!treasury || treasury.length === 0) {
        return [];
    }

    const anomalies: Anomaly[] = [];

    // Rule 1: High amount without proof
    treasury.forEach(t => {
        if (t.amount > config.thresholdAmount && (!t.proof || t.proof.trim() === '')) {
            anomalies.push({
                id: `anomaly-${t.id}-no-proof`,
                type: 'high_amount_no_proof',
                severity: 'critical',
                title: 'Transaksi Besar Tanpa Bukti',
                description: `Transaksi sebesar Rp ${t.amount.toLocaleString('id-ID')} tidak memiliki lampiran foto bukti.`,
                transactionId: t.id,
                amount: t.amount,
                date: t.date,
                recommendations: [
                    'Segera unggah foto bukti transaksi',
                    'Verifikasi dengan bendahara',
                    `Pastikan semua transaksi >Rp${(config.thresholdAmount / 1000).toLocaleString('id-ID')}rb memiliki dokumentasi lengkap`
                ]
            });
        }
    });

    // Rule 2: Duplicate transactions within 24 hours
    const sortedTreasury = [...treasury].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sortedTreasury.length; i++) {
        for (let j = i + 1; j < sortedTreasury.length; j++) {
            const t1 = sortedTreasury[i];
            const t2 = sortedTreasury[j];

            const timeDiff = Math.abs(
                new Date(t2.date).getTime() - new Date(t1.date).getTime()
            );
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff <= config.duplicateHours &&
                t1.amount === t2.amount &&
                t1.category === t2.category &&
                t1.id !== t2.id) {
                anomalies.push({
                    id: `anomaly-${t2.id}-duplicate`,
                    type: 'duplicate_transaction',
                    severity: 'high',
                    title: 'Potensi Duplikasi Transaksi',
                    description: `Ditemukan 2 transaksi identik (Rp ${t1.amount.toLocaleString('id-ID')}, ${t1.category}) dalam rentang ${config.duplicateHours} jam.`,
                    transactionId: t2.id,
                    amount: t2.amount,
                    date: t2.date,
                    recommendations: [
                        'Periksa apakah ini transaksi yang sama',
                        'Hapus salah satu jika duplikat',
                        'Tambahkan catatan pembeda jika memang berbeda'
                    ]
                });
            }
        }
    }

    return anomalies;
}

/**
 * Calculate Compliance Rate based on monthly attendance
 * Formula: (Present Attendance / Expected Attendance) * 100
 * Expected Attendance = Active Members * Estimated Meetings This Month
 */
export function calculateComplianceRate(
    users: User[],
    attendance: Attendance[]
): ComplianceMetrics {
    // Safety check: return safe default if no data
    if (!users || !attendance) {
        return {
            rate: 0,
            totalMembers: 0,
            activeMembers: 0,
            monthlyAttendance: 0,
            expectedAttendance: 0,
            trend: 'worsening'
        };
    }

    // UTC Timezone Standardization for consistent "Today" across devices
    const timeZone = 'Asia/Jakarta';
    const now = toZonedTime(new Date(), timeZone);
    const startOfMonthDate = startOfMonth(now);
    const endOfMonthDate = endOfMonth(now);

    // Filter attendance for current month
    const monthlyAttendance = attendance.filter(a => {
        const attendanceDate = toZonedTime(new Date(a.date), timeZone);
        return attendanceDate >= startOfMonthDate && attendanceDate <= endOfMonthDate;
    });

    // Count active members
    const activeMembers = users.filter(u => u.isActive === 1);
    const totalMembers = users.length;

    // Count present attendance
    const presentCount = monthlyAttendance.filter(a => a.status === 'hadir').length;

    // Estimate expected meetings (assume 4 meetings per month as baseline)
    const expectedMeetingsThisMonth = 4;
    const expectedAttendance = activeMembers.length * expectedMeetingsThisMonth;

    // Calculate compliance rate
    const rate = expectedAttendance > 0
        ? (presentCount / expectedAttendance) * 100
        : 0;

    // Determine trend (simple heuristic: >75% = improving, 50-75% = stable, <50% = worsening)
    let trend: 'improving' | 'stable' | 'worsening';
    if (rate >= 75) trend = 'improving';
    else if (rate >= 50) trend = 'stable';
    else trend = 'worsening';

    return {
        rate: Math.round(rate),
        totalMembers,
        activeMembers: activeMembers.length,
        monthlyAttendance: monthlyAttendance.length,
        expectedAttendance,
        trend
    };
}

/**
 * Determine if AI is in Learning Mode
 * Learning Mode activates when treasury transactions < 5
 */
export function isAILearningMode(treasury: Treasury[]): boolean {
    // CRITICAL: Must check actual database data, not cached
    if (!treasury) return true;
    return treasury.length < 5;
}

/**
 * Generate habit insights based on historical patterns
 * Only available when AI has sufficient data (not in Learning Mode)
 */
export function generateHabitInsights(
    treasury: Treasury[],
    attendance: Attendance[],
    users: User[]
): HabitInsight[] {
    const insights: HabitInsight[] = [];

    // Safety check: return empty if insufficient data
    if (!treasury || !attendance || !users || treasury.length < 5) {
        return insights;
    }

    // Insight 1: Spending Pattern
    const expenses = treasury.filter(t => t.type === 'expense');
    const avgExpense = expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length;

    if (expenses.length >= 3) {
        insights.push({
            category: 'spending',
            title: 'Pola Pengeluaran Terdeteksi',
            description: `Rata-rata pengeluaran organisasi adalah Rp ${Math.round(avgExpense).toLocaleString('id-ID')} per transaksi.`,
            metrics: `${expenses.length} transaksi teranalisis`,
            confidence: 0.85,
            recommendation: 'Pertimbangkan membuat anggaran bulanan berdasarkan rata-rata ini untuk kontrol keuangan yang lebih baik.'
        });
    }

    // Insight 2: Meeting Attendance Pattern
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentAttendance = attendance.filter(a => new Date(a.date) >= last30Days);

    if (recentAttendance.length >= 2) {
        const avgAttendanceRate = (recentAttendance.filter(a => a.status === 'hadir').length / recentAttendance.length) * 100;

        insights.push({
            category: 'meeting',
            title: 'Tingkat Kehadiran Konsisten',
            description: `Tingkat kehadiran rata-rata dalam 30 hari terakhir adalah ${Math.round(avgAttendanceRate)}%.`,
            metrics: `${recentAttendance.length} sesi pertemuan`,
            confidence: 0.78,
            recommendation: avgAttendanceRate >= 70
                ? 'Pertahankan momentum kehadiran yang baik dengan reminder rutin.'
                : 'Tingkatkan engagement dengan menjadwalkan pertemuan di waktu yang lebih fleksibel.'
        });
    }

    // Insight 3: Active Member Engagement
    const activeMembers = users.filter(u => u.isActive === 1);
    const engagementRate = (activeMembers.length / users.length) * 100;

    if (users.length >= 5) {
        insights.push({
            category: 'activity',
            title: 'Tingkat Aktivitas Anggota',
            description: `${activeMembers.length} dari ${users.length} anggota aktif (${Math.round(engagementRate)}%).`,
            metrics: `${users.length} total anggota`,
            confidence: 0.92,
            recommendation: engagementRate >= 80
                ? 'Organisasi memiliki engagement yang sangat baik. Pertahankan dengan program apresiasi.'
                : 'Pertimbangkan program re-engagement untuk anggota yang kurang aktif.'
        });
    }

    return insights;
}

/**
 * Suggest optimal meeting times based on attendance and transaction patterns
 * Scoring: (attendanceRate * 0.7) + (lowOperationalLoad * 0.3)
 * Returns top 3 recommendations with detailed reasoning
 */
export function suggestMeetingTimes(
    treasury: Treasury[],
    attendance: Attendance[]
): { date: string; reason: string; score: number; attendanceRate: number; operationalLoad: string }[] {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Step 1: Analyze attendance by day of week
    const dayStats: Record<number, { present: number; total: number }> = {};

    attendance.forEach(a => {
        const day = new Date(a.date).getDay();
        if (!dayStats[day]) {
            dayStats[day] = { present: 0, total: 0 };
        }
        dayStats[day].total++;
        if (a.status === 'hadir') {
            dayStats[day].present++;
        }
    });

    // Step 2: Analyze operational transaction density by day of week
    const operationalExpenses: Record<number, number> = {};

    treasury.forEach(t => {
        if (t.type === 'expense' && (
            t.category?.toLowerCase().includes('operasional') ||
            t.category?.toLowerCase().includes('admin')
        )) {
            const day = new Date(t.date).getDay();
            operationalExpenses[day] = (operationalExpenses[day] || 0) + 1;
        }
    });

    // Find max operational load for normalization
    const maxOperationalLoad = Math.max(...Object.values(operationalExpenses), 1);

    // Step 3: Score each day
    const dayScores: Array<{
        day: number;
        dayName: string;
        attendanceRate: number;
        operationalLoad: string;
        score: number;
        reason: string;
    }> = [];

    for (let day = 0; day < 7; day++) {
        const stats = dayStats[day];

        // Skip if no attendance data for this day
        if (!stats || stats.total === 0) continue;

        // Calculate attendance rate (0-1)
        const attendanceRate = stats.present / stats.total;

        // Calculate operational load (0-1, inverted so lower is better)
        const operationalCount = operationalExpenses[day] || 0;
        const operationalLoad = operationalCount / maxOperationalLoad;
        const lowOperationalLoad = 1 - operationalLoad;

        // Calculate weighted score: 70% attendance, 30% low operational load
        const score = (attendanceRate * 0.7) + (lowOperationalLoad * 0.3);

        // Generate reason
        let reason = '';
        const attendancePercent = Math.round(attendanceRate * 100);

        if (attendanceRate >= 0.8 && lowOperationalLoad >= 0.7) {
            reason = `Tingkat kehadiran tinggi (${attendancePercent}%) dan beban operasional rendah`;
        } else if (attendanceRate >= 0.8) {
            reason = `Tingkat kehadiran sangat baik (${attendancePercent}%)`;
        } else if (lowOperationalLoad >= 0.7) {
            reason = `Beban operasional rendah, cocok untuk diskusi strategis`;
        } else {
            reason = `Kehadiran ${attendancePercent}%, beban operasional ${operationalCount > 0 ? 'sedang' : 'rendah'}`;
        }

        const operationalLoadLabel: string = operationalCount === 0 ? 'Rendah' :
            operationalLoad < 0.5 ? 'Sedang' : 'Tinggi';

        dayScores.push({
            day,
            dayName: dayNames[day],
            attendanceRate: Math.round(attendanceRate * 100),
            operationalLoad: operationalLoadLabel,
            score,
            reason
        });
    }

    // Step 4: Sort by score and return top 3
    const topRecommendations = dayScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(d => ({
            date: d.dayName,
            reason: d.reason,
            score: Math.round(d.score * 100) / 100,
            attendanceRate: d.attendanceRate,
            operationalLoad: d.operationalLoad
        }));

    return topRecommendations;
}

/**
 * Predict next month's expenses using Simple Moving Average (3-month trend)
 * Confidence levels:
 * - High: 3+ months of consistent data (low variance)
 * - Medium: 3+ months with moderate variance
 * - Low: Less than 3 months of data
 */
export function predictNextMonthExpenses(treasury: Treasury[]): ExpensePrediction {
    // Safety check: return safe default if no data
    if (!treasury || treasury.length === 0) {
        return {
            prediction: 0,
            confidence: 'low',
            trend: 'stable',
            basis: 'Tidak ada data historis',
            monthlyAverages: [],
            hasInsufficientData: true
        };
    }

    const now = new Date();
    const monthlyExpenses: { month: string; total: number }[] = [];

    // Group expenses by month for the last 6 months
    for (let i = 0; i < 6; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

        const monthExpenses = treasury.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'expense' && tDate >= monthStart && tDate <= monthEnd;
        });

        const total = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
        monthlyExpenses.push({
            month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
            total
        });
    }

    // Reverse to get chronological order
    monthlyExpenses.reverse();

    // Check if we have at least 3 months of data
    if (monthlyExpenses.length < 3) {
        return {
            prediction: 0,
            confidence: 'low',
            trend: 'stable',
            basis: 'Data historis kurang dari 3 bulan',
            monthlyAverages: monthlyExpenses.map(m => m.total),
            hasInsufficientData: true
        };
    }

    // Calculate Simple Moving Average (SMA) using last 3 months
    const last3Months = monthlyExpenses.slice(-3);
    const sma = last3Months.reduce((sum, m) => sum + m.total, 0) / 3;

    // Calculate variance to determine confidence
    const mean = sma;
    const variance = last3Months.reduce((sum, m) => sum + Math.pow(m.total - mean, 2), 0) / 3;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 0;

    // Determine confidence based on consistency (lower CV = higher confidence)
    let confidence: 'low' | 'medium' | 'high';
    if (coefficientOfVariation < 0.15) confidence = 'high';
    else if (coefficientOfVariation < 0.30) confidence = 'medium';
    else confidence = 'low';

    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing';
    const firstMonthAvg = (monthlyExpenses[0].total + monthlyExpenses[1].total) / 2;
    const lastMonthAvg = (monthlyExpenses[monthlyExpenses.length - 2].total + monthlyExpenses[monthlyExpenses.length - 1].total) / 2;
    const trendChange = ((lastMonthAvg - firstMonthAvg) / firstMonthAvg) * 100;

    if (trendChange > 10) trend = 'increasing';
    else if (trendChange < -10) trend = 'decreasing';
    else trend = 'stable';

    return {
        prediction: Math.round(sma),
        confidence,
        trend,
        basis: `Rata-rata 3 bulan terakhir: ${last3Months.map(m => `Rp${(m.total / 1000).toFixed(0)}K`).join(', ')}`,
        monthlyAverages: monthlyExpenses.map(m => m.total),
        hasInsufficientData: false
    };
}

/**
 * Predict attendance rate for next month based on historical averages
 */
export function predictAttendanceRate(
    users: User[],
    attendance: Attendance[]
): AttendancePrediction {
    // Safety check: return safe default if no data
    if (!users || !attendance || attendance.length === 0) {
        return {
            prediction: 0,
            confidence: 'low',
            historicalAverage: 0,
            trend: 'stable',
            hasInsufficientData: true
        };
    }

    const now = new Date();
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Filter attendance for last 3 months
    const recentAttendance = attendance.filter(a => new Date(a.date) >= last3Months);

    if (recentAttendance.length < 10) {
        return {
            prediction: 0,
            confidence: 'low',
            historicalAverage: 0,
            trend: 'stable',
            hasInsufficientData: true
        };
    }

    // Calculate historical attendance rate
    const presentCount = recentAttendance.filter(a => a.status === 'hadir').length;
    const historicalAverage = (presentCount / recentAttendance.length) * 100;

    // Calculate trend by comparing first half vs second half
    const midpoint = Math.floor(recentAttendance.length / 2);
    const firstHalf = recentAttendance.slice(0, midpoint);
    const secondHalf = recentAttendance.slice(midpoint);

    const firstHalfRate = (firstHalf.filter(a => a.status === 'hadir').length / firstHalf.length) * 100;
    const secondHalfRate = (secondHalf.filter(a => a.status === 'hadir').length / secondHalf.length) * 100;

    let trend: 'improving' | 'stable' | 'declining';
    const trendDiff = secondHalfRate - firstHalfRate;
    if (trendDiff > 5) trend = 'improving';
    else if (trendDiff < -5) trend = 'declining';
    else trend = 'stable';

    // Confidence based on data volume
    let confidence: 'low' | 'medium' | 'high';
    if (recentAttendance.length >= 30) confidence = 'high';
    else if (recentAttendance.length >= 20) confidence = 'medium';
    else confidence = 'low';

    return {
        prediction: Math.round(historicalAverage),
        confidence,
        historicalAverage: Math.round(historicalAverage),
        trend,
        hasInsufficientData: false
    };
}

/**
 * Generate strategic action plan based on current metrics
 */
export function generateActionPlan(
    efficiencyScore: EfficiencyScore,
    anomalies: Anomaly[],
    complianceMetrics: ComplianceMetrics
): string[] {
    const actions: string[] = [];

    // Financial efficiency actions
    if (efficiencyScore.status === 'needs_improvement') {
        actions.push('Tingkatkan alokasi anggaran untuk program inti (target: >70% dari total pengeluaran)');
        actions.push('Review dan optimalkan biaya operasional yang tidak esensial');
    } else if (efficiencyScore.status === 'excellent') {
        actions.push('Pertahankan rasio efisiensi program yang sangat baik (>70%)');
    }

    // Anomaly actions
    if (anomalies.length > 0) {
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
        if (criticalAnomalies.length > 0) {
            actions.push(`Segera tindak lanjuti ${criticalAnomalies.length} temuan kritis dalam audit keuangan`);
        }
    }

    // Compliance actions
    if (complianceMetrics.rate < 70) {
        actions.push('Tingkatkan partisipasi anggota dengan sistem reminder otomatis dan insentif kehadiran');
    } else if (complianceMetrics.rate >= 80) {
        actions.push('Kepatuhan anggota sangat baik. Pertimbangkan program penghargaan untuk mempertahankan momentum');
    }

    // General strategic actions
    if (actions.length === 0) {
        actions.push('Organisasi dalam kondisi stabil. Fokus pada inovasi program dan ekspansi dampak sosial');
    }

    return actions;
}

/**
 * Main function to generate complete intelligence data
 * @param users - All users in the system
 * @param attendance - All attendance records
 * @param treasury - All treasury transactions
 * @param documents - All documents for risk analysis
 * @param anomalyConfig - Optional configuration for anomaly detection thresholds
 */
export function generateIntelligenceData(
    users: User[],
    attendance: Attendance[],
    treasury: Treasury[],
    documents: Document[] = [],
    anomalyConfig?: { thresholdAmount: number; duplicateHours: number }
): IntelligenceData {
    const isLearning = isAILearningMode(treasury);
    const efficiencyScore = calculateEfficiencyScore(treasury);
    const anomalies = detectAnomalies(treasury, anomalyConfig);
    const complianceMetrics = calculateComplianceRate(users, attendance);
    const habitInsights = generateHabitInsights(treasury, attendance, users);
    const actionPlan = generateActionPlan(efficiencyScore, anomalies, complianceMetrics);

    // Generate predictions
    const expensePrediction = predictNextMonthExpenses(treasury);
    const attendancePrediction = predictAttendanceRate(users, attendance);

    // Calculate risk scores
    const financialRisk = efficiencyScore.status === 'excellent' ? 20 :
        efficiencyScore.status === 'good' ? 50 : 75;

    const complianceRisk = complianceMetrics.rate >= 80 ? 15 :
        complianceMetrics.rate >= 60 ? 40 : 70;

    const operationalRisk = anomalies.length === 0 ? 10 :
        anomalies.length <= 2 ? 35 : 65;

    // Calculate document risk
    const documentRiskData = calculateOverallDocumentRisk(documents);
    const documentRisk = documentRiskData.score;

    const overallRisk = Math.round((financialRisk + complianceRisk + operationalRisk + documentRisk) / 4);

    return {
        isLearning,
        efficiencyScore,
        anomalies,
        complianceMetrics,
        habitInsights,
        predictions: {
            expenses: expensePrediction,
            attendance: attendancePrediction
        },
        summary: {
            totalTransactions: treasury.length,
            suspiciousTransactions: anomalies.length,
            totalMembers: users.length,
            complianceRate: complianceMetrics.rate,
            financialTrend: efficiencyScore.status === 'excellent' ? 'positive' :
                efficiencyScore.status === 'good' ? 'stable' : 'negative'
        },
        riskScore: {
            overall: overallRisk,
            financial: financialRisk,
            compliance: complianceRisk,
            operational: operationalRisk,
            document: documentRisk,
            trend: overallRisk < 30 ? 'improving' : overallRisk < 60 ? 'stable' : 'worsening',
            details: {
                financial: efficiencyScore.status === 'excellent'
                    ? 'Rasio program sangat baik (>70%)'
                    : 'Perlu optimasi alokasi anggaran',
                compliance: complianceMetrics.rate >= 70
                    ? 'Tingkat kepatuhan anggota memuaskan'
                    : 'Perlu peningkatan partisipasi',
                operational: anomalies.length === 0
                    ? 'Tidak ada temuan audit kritis'
                    : `Ditemukan ${anomalies.length} anomali yang perlu ditindaklanjuti`,
                document: documentRiskData.details,
                overall: overallRisk < 30
                    ? 'Organisasi dalam kondisi sangat sehat'
                    : overallRisk < 60
                        ? 'Organisasi stabil dengan ruang perbaikan'
                        : 'Perlu perhatian segera pada beberapa area'
            }
        },
        actionPlan
    };
}
