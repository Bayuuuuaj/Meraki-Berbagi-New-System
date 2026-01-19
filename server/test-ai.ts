
import { MLEngine } from './services/ai/ml-engine';

async function runTests() {
    console.log("====================================");
    console.log("STARTING AI MANUAL TESTS");
    console.log("====================================\n");

    // ---------------------------------------------------------
    // TEST 1: Sentiment Analysis (Negation Handling)
    // ---------------------------------------------------------
    console.log("TEST 1: Sentiment Analysis (Negation Handling)");
    const sentimentTestCases = [
        { text: "Hasil kerja ini bagus", expected: "positive" },
        { text: "Hasil kerja ini tidak bagus", expected: "negative" },
        { text: "Saya tidak merasa ini buruk", expected: "positive" }, // "tidak buruk" -> positive
        { text: "Sangat mengecewakan dan gagal", expected: "negative" },
        { text: "Biasa saja", expected: "neutral" }
    ];

    sentimentTestCases.forEach(({ text, expected }) => {
        const result = MLEngine.analyzeSentiment(text);
        const pass = result.label === expected; // Simplified check
        // Note: My implementation returns "positive", "negative", "neutral"
        // But "tidak bagus" -> negative. "tidak buruk" -> positive.

        console.log(`Input: "${text}"`);
        console.log(`  -> Score: ${result.score}`);
        console.log(`  -> Label: ${result.label}`);
        console.log(`  -> Detected Positive: [${result.positiveWords.join(", ")}]`);
        console.log(`  -> Detected Negative: [${result.negativeWords.join(", ")}]`);
        console.log(`  -> RESULT: ${pass ? "PASS" : "FAIL"}`);
        console.log("-".repeat(20));
    });
    console.log("\n");

    // ---------------------------------------------------------
    // TEST 2: Forecasting (Holt's Linear Trend vs MA)
    // ---------------------------------------------------------
    console.log("TEST 2: Forecasting (Double Exponential Smoothing vs MA)");

    // Linear trend data: 10, 20, 30, 40, 50
    const trendData = [
        { value: 10, timestamp: new Date() },
        { value: 20, timestamp: new Date() },
        { value: 30, timestamp: new Date() },
        { value: 40, timestamp: new Date() },
        { value: 50, timestamp: new Date() }
    ];

    // Theoretical next values: 60, 70, 80
    const periodsAhead = 3;

    const maPred = MLEngine.predictMovingAverage(trendData, 3, periodsAhead);
    const holtPred = MLEngine.predictDoubleExponentialSmoothing(trendData, 0.5, 0.3, periodsAhead);

    console.log("Input Data: [10, 20, 30, 40, 50]");
    console.log("Expected Next: [60, 70, 80]");
    console.log(`MA Prediction: [${maPred.join(", ")}]`);
    console.log(`Holt Prediction: [${holtPred.join(", ")}]`);

    const lastHolt = holtPred[periodsAhead - 1];
    const lastMA = maPred[periodsAhead - 1];

    // Error calculation for last point (Expected 80)
    const errorMA = Math.abs(80 - lastMA);
    const errorHolt = Math.abs(80 - lastHolt);

    console.log(`MA Error (Last Point): ${errorMA}`);
    console.log(`Holt Error (Last Point): ${errorHolt}`);

    if (errorHolt < errorMA) {
        console.log("-> RESULT: PASS (Holt's is more accurate for linear trend)");
    } else {
        console.log("-> RESULT: FAIL (Holt's should be more accurate)");
    }
    console.log("\n");

    // ---------------------------------------------------------
    // TEST 3: Clustering (K-Means)
    // ---------------------------------------------------------
    console.log("TEST 3: K-Means Clustering");

    // 3 distinct groups
    // Group A (Low): (1,1), (1,2), (2,1)
    // Group B (Mid): (10,10), (10,11), (11,10)
    // Group C (High): (20,20), (20,21), (21,20)

    const clusterPoints = [
        { id: "A1", features: [1, 1] },
        { id: "A2", features: [1, 2] },
        { id: "A3", features: [2, 1] },

        { id: "B1", features: [10, 10] },
        { id: "B2", features: [10, 11] },

        { id: "C1", features: [20, 20] },
        { id: "C2", features: [21, 20] }
    ];

    const k = 3;
    const clusters = MLEngine.kMeansClustering(clusterPoints, k);

    const groups: Record<number, string[]> = {};
    clusters.forEach(p => {
        const c = p.cluster || 0;
        if (!groups[c]) groups[c] = [];
        groups[c].push(p.id);
    });

    console.log("Cluster Assignments:");
    Object.keys(groups).forEach(g => {
        console.log(`Cluster ${g}: [${groups[parseInt(g)].join(", ")}]`);
    });

    // Verify separation
    // Ideally A1, A2, A3 are in same cluster
    const clusterA = clusters.find(p => p.id === "A1")?.cluster;
    const clusterA_Ok = ["A2", "A3"].every(id => clusters.find(p => p.id === id)?.cluster === clusterA);

    const clusterB = clusters.find(p => p.id === "B1")?.cluster;
    const clusterB_Ok = ["B2"].every(id => clusters.find(p => p.id === id)?.cluster === clusterB);

    const clusterC = clusters.find(p => p.id === "C1")?.cluster;
    const clusterC_Ok = ["C2"].every(id => clusters.find(p => p.id === id)?.cluster === clusterC);

    if (clusterA_Ok && clusterB_Ok && clusterC_Ok && clusterA !== clusterB && clusterB !== clusterC) {
        console.log("-> RESULT: PASS (Clusters are distinct and grouped correctly)");
    } else {
        console.log("-> RESULT: FAIL (Clustering logic might be unstable or incorrect)");
    }

    console.log("\n====================================");
    console.log("TESTS COMPLETED");
    console.log("====================================");
}

runTests().catch(console.error);
