
import { NLPService } from "./services/ai/nlp-service.ts";
import { PredictiveService } from "./services/ai/predictive-service.ts";
import { RiskService } from "./services/ai/risk-service.ts";
import type { Transaction } from "./services/ai/risk-service.ts";

async function runTests() {
    console.log("🚀 Starting Advanced AI Features Verification...\n");

    // 1. Test AI Classifier
    console.log("--- Testing AI Classifier ---");
    const testQueries = [
        "Siapa anggota paling rajin bulan ini?",
        "Berapa total iuran masuk minggu lalu?",
        "Prediksi saldo untuk 3 bulan ke depan.",
        "Halo AI, apa kabar?" // Edge case: Greeting
    ];

    for (const query of testQueries) {
        console.log(`Query: "${query}"`);
        try {
            const result = await NLPService.classifyIndonesianQuery(query);
            console.log(`Result:`, JSON.stringify(result, null, 2));
        } catch (e) {
            console.log(`Error: ${e}`);
        }
        console.log("");
    }

    // 2. Test Financial Simulator Narrative
    console.log("--- Testing Financial Simulator Narrative ---");
    const dummyHistory = [1000000, 1200000, 1500000, 1400000, 1800000];
    const dummyModifiers = { incomeChangePercent: 20, oneTimeCost: 2000000 }; // Extreme cost case
    const simResult = PredictiveService.simulateScenario(dummyHistory, dummyModifiers, 6);

    try {
        const advice = await PredictiveService.generateFinancialAdvice(1800000, "Kenaikan iuran 20% & Pembelian Inventaris 2jt", simResult);
        console.log("Skenario: Kenaikan iuran 20% & Pembelian Inventaris 2jt");
        console.log("Advice:", advice);
    } catch (e) {
        console.log("Error generating advice:", e);
    }
    console.log("");

    // 3. Test Automated Treasury Reporting
    console.log("--- Testing Automated Treasury Reporting ---");
    const dummyTransactions: Transaction[] = [
        { id: "1", userId: "u1", amount: 500000, type: 'in', category: 'Iuran', date: new Date(), notes: 'Iuran Januari' },
        { id: "2", userId: "u2", amount: 3000000, type: 'out', category: 'Operasional', date: new Date(), notes: 'Sewa kantor mahal' }, // Potential anomaly
        { id: "3", userId: "u3", amount: 100000, type: 'out', category: 'Program Kerja', date: new Date(), notes: 'Beli ATK' }
    ];

    try {
        const treasuryAnalysis = await RiskService.analyzeTreasuryReport(dummyTransactions);
        console.log("Treasury Analysis:", JSON.stringify(treasuryAnalysis, null, 2));
    } catch (e) {
        console.log("Error analyzing treasury:", e);
    }

    console.log("\n✅ Verification Completed.");
}

runTests().catch(console.error);
