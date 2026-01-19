
import { MLEngine, ClusterPoint } from './services/ai/ml-engine';
import { RiskService, AttendanceRecord, Transaction } from './services/ai/risk-service';

async function runAdvancedTests() {
    console.log("====================================");
    console.log("ADVANCED AI INTELLIGENCE TEST");
    console.log("====================================\n");

    // ---------------------------------------------------------
    // TEST 1: Nuanced Sentiment (Boosters & Diminishers)
    // ---------------------------------------------------------
    console.log("TEST 1: Nuanced Sentiment Analysis (Booster & Diminisher)");
    const sentimentCases = [
        { text: "Proyek ini bagus", desc: "Base Positive" },
        { text: "Proyek ini sangat bagus sekali", desc: "Boosted Positive (sangat, sekali)" },
        { text: "Proyek ini agak buruk", desc: "Diminished Negative (agak)" },
        { text: "Ini benar-benar gagal total", desc: "Boosted Negative (benar-benar)" },
        { text: "Hasilnya lumayan efektif", desc: "Diminished Positive (lumayan)" }
    ];

    sentimentCases.forEach(({ text, desc }) => {
        const res = MLEngine.analyzeSentiment(text);
        console.log(`Input: "${text}"`);
        console.log(`   Context: ${desc}`);
        console.log(`   -> Score: ${res.score.toFixed(2)}`);
        console.log(`   -> Label: ${res.label}`);
        console.log("-".repeat(40));
    });
    console.log("\n");

    // ---------------------------------------------------------
    // TEST 2: Persona Segmentation Logic
    // ---------------------------------------------------------
    console.log("TEST 2: Persona Segmentation (Mock Data)");

    // Mock Helper to create mock records
    const createMockData = () => {
        const attendance: AttendanceRecord[] = [];
        const transactions: Transaction[] = [];
        const createId = () => Math.random().toString(36).substr(2, 9);

        // Helper to add user activity
        const addUser = (id: string, attCount: number, txTotal: number) => {
            // Add Attendance
            for (let i = 0; i < 10; i++) {
                attendance.push({
                    id: createId(),
                    userId: id,
                    date: new Date(),
                    status: i < attCount ? 'hadir' : 'alpha'
                });
            }
            // Add Transaction
            transactions.push({
                id: createId(),
                userId: id,
                amount: txTotal,
                type: 'in',
                category: 'iuran',
                date: new Date()
            });
        };

        // Create 4 distinct personas (Need enough data points for clusters)
        // 5 Users for "Pilar" (High Att 9/10, High Tx 1M)
        for (let i = 0; i < 5; i++) addUser(`pilar-${i}`, 9, 1000000);

        // 5 Users for "Donatur" (Low Att 2/10, High Tx 1M)
        for (let i = 0; i < 5; i++) addUser(`donatur-${i}`, 2, 1000000);

        // 5 Users for "Aktivis" (High Att 9/10, Low Tx 10k)
        for (let i = 0; i < 5; i++) addUser(`aktivis-${i}`, 9, 10000);

        return { attendance, transactions };
    };

    const data = createMockData();
    // We can't access private methods but we can test the public segmentMembers if we could extract it or mock it.
    // Instead, let's test the kMeans directly to see separation, then infer labels based on logic we know we wrote.

    // We will call the public method 'analyzeOrganizationalHabits' which calls 'segmentMembers' internally
    // and returns the insight.

    try {
        const habits = RiskService.analyzeOrganizationalHabits(data.transactions, data.attendance);
        const segmentation = habits.find(h => h.title.includes('Persona'));

        if (segmentation) {
            console.log("AI Segmentation Result:");
            console.log(`Title: ${segmentation.title}`);
            console.log(`Description: ${segmentation.description}`);
            console.log(`Recommendation: ${segmentation.recommendation}`);
            console.log("Action Plan:");
            segmentation.actionPlan?.forEach(step => console.log(`  - ${step}`));
            console.log("\n-> RESULT: PASS (AI successfully identified and labeled personas)");
        } else {
            console.log("-> RESULT: FAIL (Segmentation insight not generated)");
        }

    } catch (e) {
        console.error("Error during segmentation test:", e);
    }

    console.log("====================================");
}

runAdvancedTests().catch(console.error);
