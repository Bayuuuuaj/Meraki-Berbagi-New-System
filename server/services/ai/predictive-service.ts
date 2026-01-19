
/**
 * Predictive Service
 * Handles "What-If" simulations and financial forecasting scenarios.
 * Pure deterministic logic, no black-box ML.
 */

import { MLEngine } from './ml-engine';
import { calculateStats } from './ml-engine';
import { GeminiService } from './gemini-service';

export interface SimulationModifiers {
    incomeChangePercent?: number;    // e.g. 10 means +10%, -5 means -5%
    expenseChangePercent?: number;   // e.g. -10 means cut costs by 10%
    oneTimeIncome?: number;          // e.g. Grant or big donation
    oneTimeCost?: number;            // e.g. Buying equipment
}

export interface SimulationResult {
    baseline: number[];       // Original projected trend
    projected: number[];      // Modified trend
    delta: number;            // Difference in final balance
    finalBalance: number;     // Projected final balance
    insights: string[];       // Human readable explanations
}

export class PredictiveService {

    /**
     * Simulate financial scenario
     * "What if we increase income by X% and cut costs by Y%?"
     */
    static simulateScenario(
        historicalBalance: number[],
        modifiers: SimulationModifiers,
        periodsAhead: number = 6
    ): SimulationResult {

        // 1. Generate Baseline Forecast (Holt's Linear Trend)
        // We use historical data to project the "status quo"
        const dataPoints = historicalBalance.map((val, i) => ({
            value: val,
            timestamp: new Date() // Dummy time, order matters 
        }));

        // Use Holt's for trend-sensitive baseline
        const baseline = MLEngine.predictDoubleExponentialSmoothing(
            dataPoints,
            0.5,
            0.3,
            periodsAhead
        );

        // 2. Apply Modifiers to Create Projection
        // We assume the baseline represents net balance evolution.
        // To apply income/expense modifiers accurately, we ideally need separate streams.
        // However, if we only have balance history, we approximate:
        // Trend = Income - Expense.

        // Simplified Logic for Balance-Only Input:
        // We apply the net percentage change to the *growth* (trend), not the absolute balance.

        const projected: number[] = [];
        const lastActual = historicalBalance[historicalBalance.length - 1] || 0;

        // Calculate average absolute growth per period to estimate "flow"
        let avgGrowth = 0;
        if (historicalBalance.length > 1) {
            avgGrowth = (lastActual - historicalBalance[0]) / historicalBalance.length;
        }

        // Process modifiers
        const incomeMod = 1 + ((modifiers.incomeChangePercent || 0) / 100);
        // Expense reduction means MORE money, so logic is inverted relative to cost
        // Actual Expense * (1 + change). If change is -10%, expense becomes 0.9x.
        // Since we don't have raw expense, we treat expense reduction as adding to growth.
        // This is an approximation. Ideally we split streams.

        /* 
           Better Approach: 
           Since scope asks for "Net Balance" simulation but modifiers are Income/Expense,
           we will assume a standard generic ratio if real breakdown isn't provided.
           Standard Non-Profit: In ~ Out (Balance often grows slowly).
           Let's apply the % change to the *Projected Delta* between months.
        */

        let currentSimulatedBalance = lastActual;

        // One-time events applied at start of simulation
        currentSimulatedBalance += (modifiers.oneTimeIncome || 0);
        currentSimulatedBalance -= (modifiers.oneTimeCost || 0);

        for (let i = 0; i < periodsAhead; i++) {
            // Get baseline step change
            const prevBaseline = i === 0 ? lastActual : baseline[i - 1];
            const currentBaseline = baseline[i];
            const baselineStep = currentBaseline - prevBaseline;

            // Apply modifiers to the "Step" (Flow)
            // If Income +10%, we assume the 'positive' part of flow grows.
            // If Expense -10%, we assume the 'negative' part shrinks.

            // Heuristic component separation
            // We estimate base Income/Expense from the step.
            // If step is +1M, maybe Income 11M, Expense 10M? Or Income 1M Expense 0?
            // Without separate streams, we act on the *Net Impact*.

            let simulatedStep = baselineStep;

            // Net Impact Logic:
            // Income Change applies to positive flow potential
            if (modifiers.incomeChangePercent) {
                // Assume a base turnover to make % meaningful. 
                // Let's assume Turnover approx 20% of Balance if unknown.
                const estimatedTurnover = Math.abs(currentSimulatedBalance) * 0.2;
                simulatedStep += estimatedTurnover * (modifiers.incomeChangePercent / 100);
            }

            // Expense Change applies to negative flow potential
            if (modifiers.expenseChangePercent) {
                const estimatedTurnover = Math.abs(currentSimulatedBalance) * 0.2;
                // Expense change needs to be inverted. +10% expense = -Money. -10% expense = +Money.
                simulatedStep -= estimatedTurnover * (modifiers.expenseChangePercent / 100);
            }

            currentSimulatedBalance += simulatedStep;
            projected.push(Math.round(currentSimulatedBalance));
        }

        // 3. Generate Insights
        const finalBaseline = baseline[periodsAhead - 1];
        const finalProjected = projected[periodsAhead - 1];
        const delta = finalProjected - finalBaseline;

        const insights: string[] = [];

        if (delta > 0) {
            insights.push(`Skenario ini menghasilkan surplus tambahan Rp ${delta.toLocaleString('id-ID')}.`);
        } else if (delta < 0) {
            insights.push(`Skenario ini mengurangi potensi saldo sebesar Rp ${Math.abs(delta).toLocaleString('id-ID')}.`);
        } else {
            insights.push("Tidak ada perubahan signifikan pada proyeksi saldo.");
        }

        if (modifiers.oneTimeCost && modifiers.oneTimeCost > 0) {
            // Check ROI (simple payback time check)
            const improvedFlow = (finalProjected - finalBaseline) / periodsAhead; // Avg improvement per month
            if (improvedFlow > 0) {
                const monthsToRecover = modifiers.oneTimeCost / improvedFlow;
                insights.push(`Biaya awal dapat tertutup kembali dalam estimasi ${Math.ceil(monthsToRecover)} bulan.`);
            }
        }

        return {
            baseline,
            projected,
            delta,
            finalBalance: finalProjected,
            insights
        };
    }

    /**
     * Generate supportive narrative advice for financial simulation results
     * Specialized for Meraki-Berbagi with Circuit Breaker pattern.
     */
    static async generateFinancialAdvice(saldo: number, scenario: string, results: any): Promise<string | null> {
        if (!GeminiService.isAvailable()) {
            return "AI sedang berehat, logik standard organisasi tetap aktif.";
        }

        const prompt = `
            Anda adalah penasihat keuangan (Financial Advisor) profesional untuk NGO Meraki-Berbagi.
            Tujuan: Berikan ringkasan nasihat strategis (TEPAT 2-3 kalimat) berdasarkan hasil simulasi keuangan "What-If" berikut.
            
            Skenario: ${scenario}
            Saldo Saat Ini: Rp ${saldo.toLocaleString('id-ID')}
            Hasil Simulasi: ${JSON.stringify(results)}
            
            Gunakan Bahasa Indonesia yang suportif dan profesional. 
            Fokus pada keberlanjutan operasional panti asuhan.
        `;

        try {
            const advice = await GeminiService.generateText(prompt);
            return advice || "Analisis selesai, silakan tinjau data di bawah.";
        } catch (error) {
            return "AI sedang berehat, logik standard organisasi tetap aktif.";
        }
    }

    /**
     * AI-Powered Predictive Budgeting
     * Suggests allocations based on 3-month trends, efficiency scores, and risk profiles.
     */
    static async suggestBudget(transactions: any[], auditLogs: any[] = []): Promise<any> {
        if (!GeminiService.isAvailable()) {
            return { error: "AI Service Unavailable" };
        }

        // Prepare context
        const verifiedTransactions = transactions.filter(t => t.status === 'verified').slice(0, 50);
        const efficiencyContext = auditLogs.slice(0, 5).map(log => ({
            month: log.month,
            efficiency: log.efficiencyScore,
            anomaliesCount: log.anomalies ? JSON.parse(log.anomalies).length : 0
        }));

        const prompt = `
            Anda adalah pakar budgeting NGO Meraki-Berbagi. 
            Tugas: Rekomendasikan alokasi anggaran bulan depan.
            
            Konteks Strategis:
            1. Transaksi Terverifikasi Terakhir (Basis Data Bersih): ${JSON.stringify(verifiedTransactions)}
            2. Histori Efisiensi & Anomali (ai_audit_logs): ${JSON.stringify(efficiencyContext)}
            
            Instruksi Khusus:
            - Prioritaskan kategori yang memiliki 'Efficiency Score' tinggi.
            - Hindari atau perketat kontrol pada kategori dengan tingkat 'Risk Anomaly' tinggi.
            - Berikan alasan yang berdasarkan data (data-driven).
            
            Berikan saran alokasi anggaran dalam format JSON:
            {
                "suggestions": [
                    { "category": "Logistik", "suggestedAmount": number, "reason": "string" },
                    { "category": "Konsumsi", "suggestedAmount": number, "reason": "string" },
                    { "category": "Operasional", "suggestedAmount": number, "reason": "string" },
                    { "category": "Lainnya", "suggestedAmount": number, "reason": "string" }
                ],
                "totalBudget": number,
                "strategyNote": "string"
            }
        `;

        return await GeminiService.generateJSON(prompt);
    }
}

export default PredictiveService;
