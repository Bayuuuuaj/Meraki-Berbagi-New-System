/**
 * AI Risk Management Service
 * Handles fraud detection, compliance monitoring, and predictive analytics
 */

import {
    detectAnomalies,
    detectAnomaliesIQR,
    detectPatterns,
    predictMovingAverage,
    predictExponentialSmoothing,
    predictDoubleExponentialSmoothing,
    kMeansClustering,
    calculateStats,
    type DataPoint,
    type ClusterPoint
} from './ml-engine';
import { GeminiService } from './gemini-service';

// ==================== TYPES ====================

export interface Transaction {
    id: string;
    userId: string;
    userName?: string;
    amount: number;
    type: 'in' | 'out';
    category: string;
    date: Date;
    notes?: string;
    status?: string;
}

export interface AttendanceRecord {
    id: string;
    userId: string;
    userName?: string;
    date: Date;
    status: 'hadir' | 'izin' | 'sakit' | 'alpha';
}

export interface RiskAlert {
    id: string;
    type: 'fraud' | 'compliance' | 'prediction' | 'anomaly' | 'financial' | 'operational';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    relatedIds: string[];
    recommendations: string[];
    createdAt: Date;
    isResolved: boolean;
}

export interface RiskScore {
    overall: number; // 0-100, higher = more risk
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

export interface FraudIndicator {
    transactionId: string;
    riskScore: number;
    indicators: string[];
    explanation: string;
}

export interface ComplianceStatus {
    userId: string;
    userName?: string;
    attendanceRate: number;
    missedDays: number;
    status: 'compliant' | 'warning' | 'non_compliant';
    issues: string[];
}

export interface HabitInsight {
    category: 'meeting' | 'spending' | 'activity';
    title: string;
    description: string;
    metrics: string; // e.g., "Review on Fridays", "Peak: Week 4"
    confidence: number;
    recommendation: string;
    actionPlan?: string[]; // Step-by-step specific advice
}

export interface RiskReport {
    generatedAt: Date;
    riskScore: RiskScore;
    alerts: RiskAlert[];
    fraudAnalysis: {
        totalTransactions: number;
        suspiciousCount: number;
        highRiskCount: number;
        indicators: FraudIndicator[];
    };
    complianceAnalysis: {
        totalMembers: number;
        compliantCount: number;
        warningCount: number;
        nonCompliantCount: number;
        statuses: ComplianceStatus[];
    };
    financialForecast: FinancialPrediction;
    habits: HabitInsight[];
    recommendations: string[];
}

// ==================== FRAUD DETECTION ====================

/**
 * Detect potentially fraudulent transactions
 */
export function detectFraudulentTransactions(
    transactions: Transaction[],
    options: {
        amountThreshold?: number;
        zsThreshold?: number;
        enablePatternDetection?: boolean;
    } = {}
): FraudIndicator[] {
    const {
        amountThreshold = 1000000,
        zsThreshold = 3.0, // Increased for stronger certainty
        enablePatternDetection = true
    } = options;

    const fraudIndicators: FraudIndicator[] = [];

    if (transactions.length < 3) return fraudIndicators;

    // Group transactions by user
    const userTransactions = new Map<string, Transaction[]>();
    const allAmounts = transactions.map(t => t.amount);
    const globalStats = calculateStats(allAmounts);

    // Dynamic Threshold: Mean + 3 * Std (Robust statistical limit)
    // If Std is low (stable data), threshold tightens. If high volatility, it widens.
    const dynamicThreshold = globalStats.mean + (3 * globalStats.std);
    const effectiveThreshold = Math.max(amountThreshold, dynamicThreshold);

    for (const t of transactions) {
        const existing = userTransactions.get(t.userId) || [];
        existing.push(t);
        userTransactions.set(t.userId, existing);
    }

    // Convert to DataPoint format for analysis
    const dataPoints: DataPoint[] = transactions.map(t => ({
        value: t.amount,
        timestamp: new Date(t.date),
        id: t.id,
        metadata: { userId: t.userId, type: t.type }
    }));

    // 1. Statistical anomaly detection - Use IQR for robustness against outliers
    // Z-Score is good but can be skewed by the anomaly itself. IQR is safer.
    const { anomalies: iqrAnomalies } = detectAnomaliesIQR(dataPoints);
    const anomalyIds = new Set(iqrAnomalies.map(a => a.id));

    for (const transaction of transactions) {
        const indicators: string[] = [];
        let riskScore = 0;

        // Check if transaction is a statistical anomaly (IQR Method)
        if (anomalyIds.has(transaction.id)) {
            indicators.push(`Deteksi Outlier Statistik (IQR Method)`);
            riskScore += 35;
        }

        // Check effective dynamic threshold
        if (transaction.amount > effectiveThreshold) {
            const ratio = (transaction.amount / globalStats.mean).toFixed(1);
            indicators.push(`Nominal Rp ${transaction.amount.toLocaleString()} adalah ${ratio}x dari rata-rata global`);
            riskScore += 30;
        } else if (transaction.amount > amountThreshold && transaction.amount > globalStats.mean * 2) {
            // Fallback for hard limit if dynamic is too high
            indicators.push(`Nominal melebihi batas wajar manual (Rp ${amountThreshold.toLocaleString()})`);
            riskScore += 15;
        }

        // Check for unusual patterns per user
        if (enablePatternDetection) {
            const userTx = userTransactions.get(transaction.userId) || [];
            if (userTx.length > 2) {
                const userAmounts = userTx.map(t => t.amount);
                const stats = calculateStats(userAmounts);

                // Check if this transaction is unusual for this user (> 3 sigma)
                if (stats.std > 0) {
                    const userZScore = Math.abs((transaction.amount - stats.mean) / stats.std);
                    if (userZScore > 3) {
                        indicators.push(`Penyimpangan signifikan dari kebiasaan user (Z-Score: ${userZScore.toFixed(1)})`);
                        riskScore += 25;
                    }
                }
            }

            // Check for rapid successive transactions
            const recentTx = userTx.filter(t => {
                const timeDiff = Math.abs(new Date(t.date).getTime() - new Date(transaction.date).getTime());
                return timeDiff < 3600000 && t.id !== transaction.id; // Within 1 hour
            });

            if (recentTx.length >= 2) {
                indicators.push(`Pola Rapid Fire: ${recentTx.length + 1} transaksi dalam 1 jam`);
                riskScore += 20;
            }
        }

        // Check for round numbers (potential manipulation) - ONLY for large amounts
        if (transaction.amount >= 500000 && transaction.amount % 100000 === 0) {
            // Only flag if it's also relatively rare to have round numbers in this dataset? 
            // For now, keep it simple but lower score
            indicators.push('Nominal bulat besar (potensi entri manual)');
            riskScore += 10;
        }

        // Only add to results if there are indicators
        if (indicators.length > 0) {
            fraudIndicators.push({
                transactionId: transaction.id,
                riskScore: Math.min(riskScore, 100),
                indicators,
                explanation: generateFraudExplanation(transaction, indicators, riskScore)
            });
        }
    }

    // Sort by risk score
    fraudIndicators.sort((a, b) => b.riskScore - a.riskScore);

    return fraudIndicators;
}

function generateFraudExplanation(
    transaction: Transaction,
    indicators: string[],
    riskScore: number
): string {
    const severity = riskScore >= 75 ? 'KRITIKAL' : riskScore >= 50 ? 'TINGGI' : 'SEDANG';

    let explanation = `[RISIKO ${severity}] Skor: ${riskScore}/100\n`;
    explanation += `Fakta Temuan:\n`;
    indicators.forEach((ind, i) => {
        explanation += `- ${ind}\n`;
    });

    return explanation;
}

// ==================== COMPLIANCE MONITORING ====================

/**
 * Monitor attendance compliance
 */
export function monitorAttendanceCompliance(
    attendanceRecords: AttendanceRecord[],
    options: {
        minAttendanceRate?: number;
        warningThreshold?: number;
        periodDays?: number;
    } = {}
): ComplianceStatus[] {
    const {
        minAttendanceRate = 0.75, // 75% minimum attendance
        warningThreshold = 0.85, // 85% for warning
        periodDays = 30
    } = options;

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Filter records within period
    const recentRecords = attendanceRecords.filter(r =>
        new Date(r.date) >= periodStart
    );

    // Group by user
    const userRecords = new Map<string, AttendanceRecord[]>();
    for (const record of recentRecords) {
        const existing = userRecords.get(record.userId) || [];
        existing.push(record);
        userRecords.set(record.userId, existing);
    }

    const complianceStatuses: ComplianceStatus[] = [];

    for (const [userId, records] of userRecords) {
        const totalDays = records.length;
        const presentDays = records.filter(r => r.status === 'hadir').length;
        const excusedDays = records.filter(r => r.status === 'izin' || r.status === 'sakit').length;
        const absentDays = records.filter(r => r.status === 'alpha').length;

        // Calculate attendance rate (presence + excused)
        const attendanceRate = totalDays > 0
            ? (presentDays + excusedDays * 0.5) / totalDays
            : 0;

        const issues: string[] = [];
        let status: 'compliant' | 'warning' | 'non_compliant' = 'compliant';

        // Check attendance rate
        if (attendanceRate < minAttendanceRate) {
            status = 'non_compliant';
            issues.push(`Tingkat kehadiran (${(attendanceRate * 100).toFixed(1)}%) di bawah standar minimum (${minAttendanceRate * 100}%)`);
        } else if (attendanceRate < warningThreshold) {
            status = 'warning';
            issues.push(`Tingkat kehadiran (${(attendanceRate * 100).toFixed(1)}%) mendekati batas minimum`);
        }

        // Check consecutive absences
        const consecutiveAlpha = countConsecutiveAbsences(records);
        if (consecutiveAlpha >= 3) {
            if (status !== 'non_compliant') status = 'warning';
            issues.push(`Alpha berturut-turut: ${consecutiveAlpha} hari`);
        }

        // Check excessive excused absences
        if (excusedDays > totalDays * 0.3) {
            issues.push(`Izin/sakit berlebihan: ${excusedDays} dari ${totalDays} hari`);
        }

        complianceStatuses.push({
            userId,
            userName: records[0]?.userName,
            attendanceRate,
            missedDays: absentDays,
            status,
            issues
        });
    }

    // Sort by status severity
    const statusOrder = { 'non_compliant': 0, 'warning': 1, 'compliant': 2 };
    complianceStatuses.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return complianceStatuses;
}

function countConsecutiveAbsences(records: AttendanceRecord[]): number {
    // Sort by date
    const sorted = [...records].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const record of sorted) {
        if (record.status === 'alpha') {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
            currentConsecutive = 0;
        }
    }

    return maxConsecutive;
}

// ==================== PREDICTIVE ANALYTICS ====================

export interface FinancialPrediction {
    predictions: number[];
    periods: string[];
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    insights: string[];
    actionPlan?: string[];
}

/**
 * Predict future financial trends
 */
export async function predictFinancialTrends(
    transactions: Transaction[],
    type: 'in' | 'out' | 'balance',
    periodsAhead: number = 3
): Promise<FinancialPrediction> {
    // Filter and aggregate by month
    const filteredTx = type === 'balance'
        ? transactions
        : transactions.filter(t => t.type === type);

    // Group by month
    const monthlyData = new Map<string, number>();
    for (const t of filteredTx) {
        const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
        const value = type === 'balance'
            ? (t.type === 'in' ? t.amount : -t.amount)
            : t.amount;
        monthlyData.set(month, (monthlyData.get(month) || 0) + value);
    }

    // Convert to DataPoint array
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const dataPoints: DataPoint[] = sortedMonths.map(month => ({
        value: monthlyData.get(month)!,
        timestamp: new Date(month + '-01')
    }));

    if (dataPoints.length < 3) {
        return {
            predictions: [],
            periods: [],
            trend: 'stable',
            confidence: 0,
            insights: ['Data tidak cukup untuk melakukan prediksi. Minimal 3 bulan data diperlukan.']
        };
    }

    // Get predictions: Weighted Average of Holt's (Trend) and MA (Smooth)
    const maPredictions = predictMovingAverage(dataPoints, 3, periodsAhead);
    // Use Holt's Linear Trend for better trending accuracy
    const holtPredictions = predictDoubleExponentialSmoothing(dataPoints, 0.5, 0.3, periodsAhead);

    // Weighted average: 70% Holt (better for trends), 30% MA (stability)
    const predictions = maPredictions.map((ma, i) =>
        Math.round((ma * 0.3 + holtPredictions[i] * 0.7))
    );

    // Detect pattern
    const pattern = detectPatterns(dataPoints);

    // Generate future period labels
    const lastMonth = new Date(sortedMonths[sortedMonths.length - 1] + '-01');
    const periods: string[] = [];
    for (let i = 1; i <= periodsAhead; i++) {
        const futureMonth = new Date(lastMonth);
        futureMonth.setMonth(futureMonth.getMonth() + i);
        periods.push(futureMonth.toISOString().slice(0, 7));
    }

    // Calculate confidence based on data consistency
    const stats = calculateStats(dataPoints.map(d => d.value));
    const cv = stats.std / (Math.abs(stats.mean) || 1);
    const confidence = Math.max(0.3, Math.min(0.95, 1 - cv));

    // Generate insights
    const insights = generateFinancialInsights(dataPoints, pattern, predictions, type);

    let actionPlan = generateFinancialActions(pattern.trend, type);

    // Gemini Enhancement: Get personalized strategy
    if (GeminiService.isAvailable()) {
        const prompt = `Analyze this financial trend for a non-profit organization.
        Trend: ${pattern.trend}, Type: ${type}, Predictions: ${predictions.join(', ')}.
        Provide 3 specific, actionable strategic steps in Indonesian to manage this situation.`;

        const geminiPlan = await GeminiService.generateJSON<{ steps: string[] }>(prompt);
        if (geminiPlan?.steps) {
            actionPlan = geminiPlan.steps;
        }
    }

    return {
        predictions,
        periods,
        trend: pattern.trend,
        confidence,
        insights,
        actionPlan
    };
}



// ==================== RISK SCORE CALCULATION ====================

/**
 * Calculate overall risk score
 */
/**
 * Calculate overall risk score (100% Data Driven)
 */
export function calculateRiskScore(
    fraudIndicators: FraudIndicator[],
    complianceStatuses: ComplianceStatus[],
    financialPrediction: FinancialPrediction,
    context: {
        totalMembers: number;
        pendingTreasuryCount?: number;
    } = { totalMembers: 1 }
): RiskScore {
    // 1. Financial Risk Calculation (0-100)
    let financial = 0;

    const maxFraudScore = fraudIndicators.length > 0
        ? Math.max(...fraudIndicators.map(f => f.riskScore))
        : 0;

    // Fraud Impact: High severity fraud immediately spikes risk
    if (maxFraudScore > 0) {
        financial += maxFraudScore * 0.6; // 60% weight of single highest fraud
        financial += (fraudIndicators.length * 5);
    }

    // Forecast Impact
    if (financialPrediction.insights.length > 0) {
        // If trend is decreasing significantly
        if (financialPrediction.trend === 'decreasing') financial += 30;

        // Volatility penalty
        if (financialPrediction.insights.some(i => i.toLowerCase().includes('volatilitas'))) {
            financial += 15;
        }
    }

    financial = Math.min(100, Math.round(financial));

    // 2. Compliance Risk Calculation (0-100)
    const nonCompliantCount = complianceStatuses.filter(s => s.status === 'non_compliant').length;
    const warningCount = complianceStatuses.filter(s => s.status === 'warning').length;
    const totalUsers = Math.max(context.totalMembers, 1); // Prevent division by zero

    // Weighted penalty per user
    const complianceRiskRaw = ((nonCompliantCount * 100) + (warningCount * 50)) / totalUsers;
    let compliance = Math.min(100, Math.round(complianceRiskRaw));

    // 3. Operational Risk Calculation (0-100)
    let operational = 0;
    const pendingTreasury = context.pendingTreasuryCount || 0;

    // Backlog Risk: 5 points per pending item, cap at 50
    operational += Math.min(50, pendingTreasury * 5);

    // Efficiency penalty: If non-compliance is high, operations are likely struggling
    if (compliance > 40) operational += 25;

    // If financial risk is high, operational stress increases
    if (financial > 60) operational += 25;

    operational = Math.min(100, Math.round(operational));

    // 4. Overall Risk - Weighted Average
    let overall = 0;
    if (financial > 0 || compliance > 0 || operational > 0) {
        overall = Math.round(
            financial * 0.45 +      // Financial is most critical
            compliance * 0.30 +     // People are second
            operational * 0.25      // Admin is third
        );
    }

    overall = Math.min(100, overall);

    // Determine trend based on data
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (overall < 20) {
        trend = 'stable';
    } else {
        if (financialPrediction.trend === 'increasing' && nonCompliantCount === 0) {
            trend = 'improving';
        } else if (financialPrediction.trend === 'decreasing' || compliance > 40) {
            trend = 'worsening';
        }
    }

    // Generate Data-Driven Details (Factual)
    const details = {
        financial: maxFraudScore > 0
            ? `Terdeteksi ${fraudIndicators.length} anomali (Max Risk: ${maxFraudScore})`
            : "Data keuangan stabil (0 Anomali)",
        compliance: nonCompliantCount > 0
            ? `${nonCompliantCount} anggota (${Math.round(nonCompliantCount / totalUsers * 100)}%) tidak patuh`
            : "Tingkat kepatuhan 100%",
        operational: pendingTreasury > 0
            ? `${pendingTreasury} tugas verifikasi tertunda`
            : "Semua tugas operasional selesai",
        overall: overall > 0
            ? `Skor Risiko Organisasi: ${overall}/100`
            : "Kondisi Organisasi: Optimal"
    };

    return {
        overall,
        financial,
        compliance,
        operational,
        trend,
        details
    };
}

function generateFinancialInsights(
    data: DataPoint[],
    pattern: ReturnType<typeof detectPatterns>,
    predictions: number[],
    type: 'in' | 'out' | 'balance'
): string[] {
    const insights: string[] = [];

    if (data.length < 2) return ["Data belum cukup untuk analisis tren."];

    const lastValue = data[data.length - 1].value;
    const avgPrediction = predictions.length > 0
        ? predictions.reduce((a, b) => a + b, 0) / predictions.length
        : lastValue;

    const typeStr = type === 'in' ? 'Pemasukan' : type === 'out' ? 'Pengeluaran' : 'Saldo';

    // Factual Trend Analysis
    const percentageChange = lastValue !== 0
        ? ((avgPrediction - lastValue) / Math.abs(lastValue)) * 100
        : 0;

    if (percentageChange > 2) {
        insights.push(`Proyeksi ${typeStr} NAIK rata-rata ${percentageChange.toFixed(1)}% untuk 3 periode ke depan.`);
    } else if (percentageChange < -2) {
        insights.push(`Proyeksi ${typeStr} TURUN rata-rata ${Math.abs(percentageChange).toFixed(1)}% untuk 3 periode ke depan.`);
    } else {
        insights.push(`Tren ${typeStr} terpantau STABIL (Perubahan < 2%).`);
    }

    // Volatility Fact
    if (pattern.volatility === 'high') {
        const stats = calculateStats(data.map(d => d.value));
        const cv = (stats.std / (Math.abs(stats.mean) || 1) * 100).toFixed(0);
        insights.push(`Volatilitas Tinggi: Variasi data mencapai ${cv}% dari rata-rata. Hati-hati risiko ketidakpastian.`);
    }

    // Historical Fact
    const stats = calculateStats(data.map(d => d.value));
    insights.push(`Rata-rata historis (6 bln): Rp ${Math.round(stats.mean).toLocaleString('id-ID')}`);

    return insights;
}
// ==================== RISK ALERTS GENERATION ====================

/**
 * Generate risk alerts from analysis results
 */
export function generateRiskAlerts(
    fraudIndicators: FraudIndicator[],
    complianceStatuses: ComplianceStatus[],
    riskScore: RiskScore
): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const now = new Date();

    // Financial Alerts
    fraudIndicators.forEach(indicator => {
        if (indicator.riskScore >= 70) {
            alerts.push({
                id: `fraud-${Math.random().toString(36).substr(2, 9)}`,
                type: 'financial',
                severity: 'critical',
                title: 'Transaksi Mencurigakan Terdeteksi',
                description: indicator.indicators.join(', '),
                relatedIds: [indicator.transactionId],
                recommendations: [
                    'Verifikasi bukti transaksi',
                    'Hubungi anggota terkait',
                    'Bekukan sementara jika perlu'
                ],
                createdAt: now,
                isResolved: false
            });
        }
    });

    // High Financial Risk Alert
    if (riskScore.financial >= 70) {
        alerts.push({
            id: 'high-financial-risk',
            type: 'financial',
            severity: 'high',
            title: 'Risiko Keuangan Tinggi',
            description: 'Indikator keuangan menunjukkan tren negatif atau anomali signifikan.',
            relatedIds: [],
            recommendations: ['Audit arus kas bulan ini', 'Evaluasi pengeluaran operasional'],
            createdAt: now,
            isResolved: false
        });
    }

    // Compliance Alerts
    const nonCompliant = complianceStatuses.filter(s => s.status === 'non_compliant');
    if (nonCompliant.length > 0) {
        alerts.push({
            id: 'compliance-issue',
            type: 'compliance',
            severity: nonCompliant.length > 3 ? 'high' : 'medium',
            title: 'Pelanggaran Kepatuhan Anggota',
            description: `${nonCompliant.length} anggota terdeteksi tidak aktif tanpa keterangan.`,
            relatedIds: nonCompliant.map(s => s.userId),
            recommendations: ['Kirim notifikasi peringatan', 'Lakukan pendekatan personal'],
            createdAt: now,
            isResolved: false
        });
    }

    // Operational Alerts
    if (riskScore.operational >= 60) {
        alerts.push({
            id: 'ops-risk',
            type: 'operational',
            severity: 'medium',
            title: 'Hambatan Operasional',
            description: 'Terdeteksi penumpukan tugas administratif atau verifikasi.',
            relatedIds: [],
            recommendations: ['Selesaikan verifikasi tertunda', 'Delegasikan tugas rutin'],
            createdAt: now,
            isResolved: false
        });
    }

    return alerts;
}

// ==================== ORGANIZATIONAL HABITS ====================

/**
 * Detect most common meeting days and times
 */
function detectMeetingPatterns(attendanceRecords: AttendanceRecord[]): HabitInsight | null {
    if (attendanceRecords.length < 1) return null;

    // Count days
    const dayCounts = new Map<number, number>();
    attendanceRecords.forEach(r => {
        const day = new Date(r.date).getDay();
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    // Find peak day
    let peakDay = 0;
    let maxCount = 0;
    dayCounts.forEach((count, day) => {
        if (count > maxCount) {
            maxCount = count;
            peakDay = day;
        }
    });

    // Map 0 (Sunday) to 6 (Saturday)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const peakDayName = days[peakDay];
    const confidence = maxCount / attendanceRecords.length;

    if (confidence > 0.3) {
        return {
            category: 'meeting',
            title: 'Pola Pertemuan',
            description: `Aktivitas pertemuan paling sering terjadi pada hari ${peakDayName}.`,
            metrics: `Peak: ${peakDayName}`,
            confidence: parseFloat(confidence.toFixed(2)),
            recommendation: `Jadwalkan rapat penting berikutnya di hari ${peakDayName} untuk kehadiran maksimal.`
        };
    }
    return null;
}

/**
 * Detect financial patterns (Spending or Income)
 */
function detectFinancialPatterns(transactions: Transaction[]): HabitInsight | null {
    // Try expenses first
    const expenses = transactions.filter(t => t.type === 'out');
    if (expenses.length >= 1) {
        // ... existing expense logic ...
        const weekCounts = new Map<number, number>();
        expenses.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDate();
            const week = Math.ceil(day / 7);
            weekCounts.set(week, (weekCounts.get(week) || 0) + t.amount);
        });

        let peakWeek = 1;
        let maxAmount = 0;
        weekCounts.forEach((amount, week) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                peakWeek = week;
            }
        });

        return {
            category: 'spending',
            title: 'Pola Pengeluaran',
            description: `Pengeluaran terbesar biasanya terjadi pada minggu ke-${peakWeek}.`,
            metrics: `Peak Expense: Week ${peakWeek}`,
            confidence: 0.8,
            recommendation: 'Siapkan likuiditas tunai menjelang minggu tersebut.'
        };
    }

    // Fallback to income
    const income = transactions.filter(t => t.type === 'in');
    if (income.length >= 1) {
        const weekCounts = new Map<number, number>();
        income.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDate();
            const week = Math.ceil(day / 7);
            weekCounts.set(week, (weekCounts.get(week) || 0) + t.amount);
        });

        let peakWeek = 1;
        let maxAmount = 0;
        weekCounts.forEach((amount, week) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                peakWeek = week;
            }
        });

        return {
            category: 'spending', // Keep category string for UI compatibility or change UI
            title: 'Pola Pemasukan',
            description: `Pemasukan kas paling aktif pada minggu ke-${peakWeek}.`,
            metrics: `Peak Income: Week ${peakWeek}`,
            confidence: 0.8,
            recommendation: 'Optimalkan alokasi dana segera setelah pemasukan diterima.'
        };
    }

    return null;
}

/**
 * Detect member churn/participation risk
 */
function detectMemberChurn(attendanceRecords: AttendanceRecord[]): HabitInsight | null {
    if (attendanceRecords.length < 1) return null;

    // Get unique users
    const uniqueUsers = new Set(attendanceRecords.map(r => r.userId));
    if (uniqueUsers.size < 2) return null; // Need more than 1 user for meaningful analysis

    // Find last attendance per user
    const lastAttendance = new Map<string, Date>();
    attendanceRecords.forEach(r => {
        const date = new Date(r.date);
        const currentLast = lastAttendance.get(r.userId);
        if (!currentLast || date > currentLast) {
            lastAttendance.set(r.userId, date);
        }
    });

    const now = new Date();
    let inactiveCount = 0;
    const inactiveThresholdDays = 30; // 1 month

    lastAttendance.forEach((date) => {
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > inactiveThresholdDays) {
            inactiveCount++;
        }
    });

    const churnRate = inactiveCount / uniqueUsers.size;

    if (churnRate > 0.2) { // > 20% inactive
        return {
            category: 'activity',
            title: 'Risiko Keaktifan Anggota',
            description: `${inactiveCount} dari ${uniqueUsers.size} anggota tidak aktif dalam 30 hari terakhir.`,
            metrics: `Inactive: ${(churnRate * 100).toFixed(0)}%`,
            confidence: 0.85,
            recommendation: 'Lakukan program re-engagement atau survei kepuasan anggota.'
        };
    } else if (churnRate < 0.1 && uniqueUsers.size > 5) {
        return {
            category: 'activity',
            title: 'Retensi Anggota Tinggi',
            description: `Mayoritas anggota (${((1 - churnRate) * 100).toFixed(0)}%) aktif berpartisipasi.`,
            metrics: `Active: ${((1 - churnRate) * 100).toFixed(0)}%`,
            confidence: 0.9,
            recommendation: 'Pertahankan momentum dengan memberikan apresiasi kepada anggota aktif.'
        };
    }

    return null;
}

/**
 * Segment members using K-Means Clustering
 */
/**
 * Segment members using K-Means Clustering
 */
function segmentMembers(
    attendanceRecords: AttendanceRecord[],
    transactions: Transaction[]
): HabitInsight | null {
    if (attendanceRecords.length < 5) return null;

    // 1. Feature Extraction per User
    const userFeatures = new Map<string, { attendance: number; transactionVol: number }>();
    const uniqueUsers = new Set<string>();

    // Attendance Rate Feature
    const userAttendance = new Map<string, { present: number; total: number }>();
    attendanceRecords.forEach(r => {
        uniqueUsers.add(r.userId);
        const curr = userAttendance.get(r.userId) || { present: 0, total: 0 };
        curr.total++;
        if (r.status === 'hadir') curr.present++;
        userAttendance.set(r.userId, curr);
    });

    // Transaction Volume Feature (Normalized 0-1 approximate)
    const userTxVolume = new Map<string, number>();
    let maxTx = 1;
    transactions.forEach(t => {
        uniqueUsers.add(t.userId);
        const curr = userTxVolume.get(t.userId) || 0;
        userTxVolume.set(t.userId, curr + t.amount);
        maxTx = Math.max(maxTx, curr + t.amount);
    });

    // Build Cluster Points
    const points: ClusterPoint[] = [];
    uniqueUsers.forEach(userId => {
        const att = userAttendance.get(userId);
        const rate = att && att.total > 0 ? att.present / att.total : 0;

        const vol = userTxVolume.get(userId) || 0;
        const normVol = maxTx > 0 ? vol / maxTx : 0;

        points.push({
            id: userId,
            features: [rate, normVol] // [Activity, Contribution]
        });
    });

    if (points.length < 3) return null;

    // 2. Perform K-Means (k=3)
    const k = 3;
    // Increased iterations for better convergence
    const clusters = kMeansClustering(points, k, 20);

    // 3. Analyze Clusters and Assign Personas
    const clusterGroups = new Map<number, ClusterPoint[]>();
    clusters.forEach(p => {
        const c = p.cluster || 0;
        const group = clusterGroups.get(c) || [];
        group.push(p);
        clusterGroups.set(c, group);
    });

    const clusterStats: { id: number; avgAtt: number; avgTx: number; count: number }[] = [];
    clusterGroups.forEach((group, id) => {
        if (group.length === 0) return;
        const avgAtt = group.reduce((sum, p) => sum + p.features[0], 0) / group.length;
        const avgTx = group.reduce((sum, p) => sum + p.features[1], 0) / group.length;
        clusterStats.push({ id, avgAtt, avgTx, count: group.length });
    });

    // Labeling Logic based on centroids
    // We have 3 clusters. Let's find the best fit for specific archetypes.

    // Archetypes:
    // 1. "Pilar Organisasi" (High Att, High Tx)
    // 2. "Donatur Setia" (High Tx, Low-Med Att)
    // 3. "Aktivis Lapangan" (High Att, Low Tx)
    // 4. "Anggota Pasif" (Low Att, Low Tx)

    const labels = new Map<number, string>();
    let pilarCount = 0;

    clusterStats.forEach(stat => {
        let label = "Anggota Pasif";
        if (stat.avgAtt > 0.6 && stat.avgTx > 0.4) {
            label = "Pilar Organisasi"; // High commitment
            pilarCount += stat.count;
        } else if (stat.avgTx > 0.6) {
            label = "Donatur Setia"; // Money focus
        } else if (stat.avgAtt > 0.6) {
            label = "Aktivis Lapangan"; // Time focus
        } else if (stat.avgAtt > 0.3 || stat.avgTx > 0.2) {
            label = "Anggota Partisipan"; // Moderate
        }
        labels.set(stat.id, label);
    });

    // Generate readable description
    const labelCounts = new Map<string, number>();
    clusterStats.forEach(stat => {
        const lbl = labels.get(stat.id) || "Unknown";
        labelCounts.set(lbl, (labelCounts.get(lbl) || 0) + stat.count);
    });

    const breakdown = Array.from(labelCounts.entries())
        .map(([lbl, count]) => `${lbl} (${count})`)
        .join(", ");

    return {
        category: 'activity',
        title: 'Persona & Segmentasi',
        description: `AI mengidentifikasi ${uniqueUsers.size} anggota ke dalam persona: ${breakdown}.`,
        metrics: `${pilarCount} Key Players`,
        confidence: 0.95,
        recommendation: `Optimalkan potensi 'Donatur Setia' dengan laporan transparan, dan libatkan 'Aktivis Lapangan' dalam kepanitiaan teknis.`,
        actionPlan: [
            `Pilar Organisasi: Berikan akses strategis/VIP.`,
            `Donatur Setia: Kirim laporan dampak donasi eksklusif.`,
            `Aktivis Lapangan: Berikan mandat atau peran koordinator.`,
            `Anggota Pasif: Lakukan re-engagement campaign.`
        ]
    };
}

/**
 * Generate Prescriptive Actions for Financial Trends
 */
function generateFinancialActions(trend: 'increasing' | 'decreasing' | 'stable', type: 'in' | 'out' | 'balance'): string[] {
    if (type === 'balance' && trend === 'decreasing') {
        return [
            "Lakukan audit pengeluaran operasional minggu ini.",
            "Tunda pembelian aset non-esensial.",
            "Genjot penagihan iuran anggota."
        ];
    }
    if (type === 'balance' && trend === 'increasing') {
        return [
            "Allokasikan surplus ke dana cadangan.",
            "Pertimbangkan ekspansi program.",
            "Investasi pada tools produktivitas."
        ];
    }
    return ["Pertahankan monitoring rutin.", "Evaluasi efisiensi anggaran bulanan."];
}

/**
 * Analyze organizational habits
 */
export function analyzeOrganizationalHabits(
    transactions: Transaction[],
    attendanceRecords: AttendanceRecord[]
): HabitInsight[] {
    const insights: HabitInsight[] = [];

    try {
        const meetingPattern = detectMeetingPatterns(attendanceRecords);
        if (meetingPattern) insights.push(meetingPattern);
    } catch (e) {
        console.error("Error analyzing meeting patterns:", e);
    }

    try {
        const financialPattern = detectFinancialPatterns(transactions);
        if (financialPattern) insights.push(financialPattern);
    } catch (e) {
        console.error("Error analyzing financial patterns:", e);
    }

    try {
        const churnPattern = detectMemberChurn(attendanceRecords);
        if (churnPattern) insights.push(churnPattern);
    } catch (e) {
        console.error("Error analyzing churn patterns:", e);
    }

    try {
        const segmentation = segmentMembers(attendanceRecords, transactions);
        if (segmentation) insights.push(segmentation);
    } catch (e) {
        console.error("Error clustering members:", e);
    }

    return insights;
}

// ==================== MAIN REPORT GENERATION ====================

/**
 * Generate comprehensive risk report
 */
export async function generateRiskReport(
    transactions: Transaction[],
    attendanceRecords: AttendanceRecord[],
    context: {
        totalMembers: number;
    } = { totalMembers: 1 }
): Promise<RiskReport> {
    // Run all analyses
    const fraudIndicators = detectFraudulentTransactions(transactions);
    const complianceStatuses = monitorAttendanceCompliance(attendanceRecords);
    const financialForecast = await predictFinancialTrends(transactions, 'balance');
    const habits = analyzeOrganizationalHabits(transactions, attendanceRecords);

    // Calculate Pending Treasury
    // Note: pending is status 'pending', not 'verified'
    const pendingTreasuryCount = transactions.filter(t => (t as any).status !== 'verified').length;

    const riskScore = calculateRiskScore(
        fraudIndicators,
        complianceStatuses,
        financialForecast,
        {
            totalMembers: context.totalMembers,
            pendingTreasuryCount
        }
    );

    const alerts = generateRiskAlerts(fraudIndicators, complianceStatuses, riskScore);

    // Generate high-level recommendations
    const recommendations: string[] = [];

    if (riskScore.financial >= 50) {
        recommendations.push('Implementasikan kontrol keuangan yang lebih ketat');
    }
    if (riskScore.compliance >= 50) {
        recommendations.push('Review dan perkuat kebijakan kehadiran');
    }
    if (riskScore.operational >= 50) {
        recommendations.push('Diversifikasi sumber pendapatan untuk mengurangi risiko');
    }
    if (riskScore.trend === 'worsening') {
        recommendations.push('Bentuk tim khusus untuk menangani risk management');
    }

    return {
        generatedAt: new Date(),
        riskScore,
        alerts,
        fraudAnalysis: {
            totalTransactions: transactions.length,
            suspiciousCount: fraudIndicators.length,
            highRiskCount: fraudIndicators.filter(f => f.riskScore >= 70).length,
            indicators: fraudIndicators
        },
        complianceAnalysis: {
            totalMembers: complianceStatuses.length,
            compliantCount: complianceStatuses.filter(s => s.status === 'compliant').length,
            warningCount: complianceStatuses.filter(s => s.status === 'warning').length,
            nonCompliantCount: complianceStatuses.filter(s => s.status === 'non_compliant').length,
            statuses: complianceStatuses
        },
        financialForecast,
        habits,
        recommendations
    };
}

// ==================== TREASURY ANALYSIS ====================

/**
 * AI-powered automated treasury report analysis
 */
export async function analyzeTreasuryReport(transactions: Transaction[]): Promise<any> {
    const prompt = `
      Analisis data kas volunteer berikut untuk bulan ini: ${JSON.stringify(transactions)}
      
      Instruksi:
      1. Deteksi Anomali: Identifikasi pengeluaran yang tidak biasa atau jauh di atas rata-rata kategori biasanya.
      2. Efficiency Score (1-10): Berikan skor 1-10 untuk efisiensi penggunaan dana berdasarkan kategori 'Program Kerja' vs 'Operasional'.
      3. Draft Laporan: Tuliskan 3 poin ringkasan dalam format Markdown (gunakan bullet points, bold, dll) untuk dibacakan saat rapat evaluasi bulanan agar transparan kepada seluruh anggota. Ini akan digunakan untuk fitur 'Copy-to-Clipboard'.
      
      Hasilkan JSON dengan format (JSON ONLY):
      {
        "anomalies": [{ "id": "string", "reason": "string" }],
        "efficiencyScore": number,
        "efficiencyExplanation": "string",
        "meetingSummary": ["string", "string", "string"]
      }
    `;

    return await GeminiService.generateJSON(prompt);
}

// ==================== EXPORT ====================

export const RiskService = {
    detectFraudulentTransactions,
    monitorAttendanceCompliance,
    predictFinancialTrends,
    calculateRiskScore,
    generateRiskAlerts,
    generateRiskReport,
    analyzeOrganizationalHabits,
    analyzeTreasuryReport
};

export default RiskService;
