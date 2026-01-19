
import { MLEngine } from '../server/services/ai/ml-engine';
import { RiskService, Transaction, AttendanceRecord } from '../server/services/ai/risk-service';

async function verifyAI() {
    console.log("=== Verifying AI Enhancements ===");

    // 1. Test Sentiment Analysis (Negation)
    console.log("\n1. Sentiment Analysis");
    const text1 = "Pelayanan sangat bagus";
    const text2 = "Pelayanan tidak bagus";

    console.log(`"${text1}" ->`, MLEngine.analyzeSentiment(text1));
    console.log(`"${text2}" ->`, MLEngine.analyzeSentiment(text2));

    // 2. Test Forecasting (Holt's)
    console.log("\n2. Forecasting");
    const data = [
        { value: 100, timestamp: new Date('2023-01-01') },
        { value: 110, timestamp: new Date('2023-02-01') },
        { value: 121, timestamp: new Date('2023-03-01') },
        { value: 135, timestamp: new Date('2023-04-01') }, // Increasing trend
    ];
    const holt = MLEngine.predictDoubleExponentialSmoothing(data, 0.5, 0.3, 3);
    console.log("Historical:", data.map(d => d.value));
    console.log("Holt's Forecast:", holt);

    // 3. Test Risk Service (Integration)
    console.log("\n3. Risk Service & Clustering");
    const transactions: Transaction[] = [
        { id: '1', userId: 'user1', amount: 5000000, type: 'out', category: 'ops', date: new Date(), status: 'verified' },
        { id: '2', userId: 'user1', amount: 100000, type: 'out', category: 'ops', date: new Date(), status: 'verified' },
        { id: '3', userId: 'user2', amount: 50000, type: 'out', category: 'ops', date: new Date(), status: 'verified' },
        { id: '4', userId: 'user3', amount: 50000, type: 'out', category: 'ops', date: new Date(), status: 'verified' },
    ];

    const attendance: AttendanceRecord[] = [
        { id: '1', userId: 'user1', date: new Date(), status: 'hadir' },
        { id: '2', userId: 'user1', date: new Date(), status: 'hadir' }, // User 1 high attendance
        { id: '3', userId: 'user2', date: new Date(), status: 'alpha' }, // User 2 low
        { id: '4', userId: 'user3', date: new Date(), status: 'hadir' },
        { id: '5', userId: 'user3', date: new Date(), status: 'hadir' },
        { id: '6', userId: 'user4', date: new Date(), status: 'hadir' }, // Extra users for clustering
        { id: '7', userId: 'user5', date: new Date(), status: 'alpha' },
    ];

    const report = await RiskService.generateRiskReport(transactions, attendance, { totalMembers: 5 });

    console.log("Risk Score:", report.riskScore.overall);
    console.log("Habits Found:", report.habits.length);
    report.habits.forEach(h => {
        console.log(`- [${h.category}] ${h.title}: ${h.description}`);
    });

    console.log("\n=== Verification Complete ===");
}

verifyAI().catch(console.error);
