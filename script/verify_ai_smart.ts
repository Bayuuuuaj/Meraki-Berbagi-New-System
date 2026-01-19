
import { NLPService } from '../server/services/ai/nlp-service';
import { PredictiveService } from '../server/services/ai/predictive-service';
import { MLEngine } from '../server/services/ai/ml-engine';

async function runSmartTests() {
    console.log("====================================");
    console.log("VERIFYING AI INTELLIGENCE & LOGIC");
    console.log("====================================\n");

    // -------------------------------------------------------------
    // TEST 1: NLP Intent Recognition (Bahasa Indonesia)
    // -------------------------------------------------------------
    console.log("[TEST 1] Natural Language Query (Ask AI)");
    const queries = [
        "Siapa anggota paling rajin bulan ini?",
        "Analisa tren keuangan tahun ini",
        "Prediksi saldo kas bulan depan",
        "Tampilkan daftar yang belum bayar iuran"
    ];

    queries.forEach(q => {
        const result = NLPService.processQuery(q);
        console.log(`Q: "${q}"`);
        console.log(`   -> Intent: ${result.intent}`);
        console.log(`   -> Entity: ${result.entity}`);
        if (result.sort) console.log(`   -> Sort: ${result.sort.field} (${result.sort.direction})`);
        if (Object.keys(result.filters).length > 0) console.log(`   -> Filters: ${JSON.stringify(result.filters)}`);
        console.log("-");
    });
    console.log("\n");

    // -------------------------------------------------------------
    // TEST 2: Financial What-If Simulation
    // -------------------------------------------------------------
    console.log("[TEST 2] Financial What-If Simulator");

    // History: 5M, 5.5M, 6M, 6.5M (Rising trend +500k/month)
    const history = [5000000, 5500000, 6000000, 6500000];
    console.log(`Baseline History: ${history.map(n => (n / 1000000).toFixed(1) + 'M').join(' -> ')}`);

    // Scenario: Income increases 20%, One-time cost 2M
    const scenario = {
        incomeChangePercent: 20, // Should boost the trend slope
        oneTimeCost: 2000000     // Should drop the starting point
    };

    const sim = PredictiveService.simulateScenario(history, scenario, 3);

    console.log("Scenario: Income +20%, Buy Equipment (2M)");
    console.log(`Baseline Forecast: ${sim.baseline.map(n => (n / 1000000).toFixed(2) + 'M').join(', ')}`);
    console.log(`Simulated Forecast: ${sim.projected.map(n => (n / 1000000).toFixed(2) + 'M').join(', ')}`);
    console.log(`Delta: Rp ${sim.delta.toLocaleString('id-ID')}`);
    console.log("Insights:");
    sim.insights.forEach(i => console.log(` - ${i}`));
    console.log("\n");

    // -------------------------------------------------------------
    // TEST 3: Topic Modeling
    // -------------------------------------------------------------
    console.log("[TEST 3] Meeting Topic Extraction");
    const notes = `
        Rapat evaluasi membahas dana anggaran untuk program kerja baksos minggu depan.
        Bendahara melaporkan ada surplus dari donasi. Perlu dibuat laporan pertanggungjawaban
        dan surat izin kegiatan.
    `;

    const topics = MLEngine.extractTopics(notes);
    console.log("Input Notes: '...dana anggaran... program kerja baksos... surat izin...'");
    console.log("Detected Topics:");
    topics.forEach(t => {
        console.log(` - ${t.topic} (Score: ${t.score.toFixed(2)}) [${t.keywords.join(', ')}]`);
    });

    console.log("\n====================================");
    console.log("VERIFICATION COMPLETE");
    console.log("====================================");
}

runSmartTests().catch(console.error);
