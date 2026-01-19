
import { PredictiveService } from '../server/services/ai/predictive-service';

async function runDemo() {
    console.log("\n==============================================");
    console.log("   🤖 AI FINANCIAL STRATEGY SIMULATOR");
    console.log("==============================================\n");

    // Mock History: 6 months of steady growth
    // Starting 2.5M, ending 3.2M
    const history = [2500000, 2600000, 2550000, 2800000, 3000000, 3200000];

    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    console.log(`📊 Current Status (Last 6 Months):`);
    console.log(`   Trend: ${history.map(n => (n / 1000000).toFixed(1) + 'jt').join(' -> ')}`);
    console.log(`   Current Balance: ${fmt(3200000)}`);
    console.log("\n----------------------------------------------");

    // SCENARIO 1: Aggressive Fundraising
    console.log("\n🔮 SCENARIO 1: Program 'Galang Dana' (Income +25%)");
    const sim1 = PredictiveService.simulateScenario(history, { incomeChangePercent: 25 }, 6);
    console.log(`   Baseline Projection (6mo): ${fmt(sim1.baseline[5])}`);
    console.log(`   Simulated Projection:      ${fmt(sim1.projected[5])}`);
    console.log(`   💡 Impact: ${sim1.insights[0]}`);

    // SCENARIO 2: Major Purchase
    console.log("\n🔮 SCENARIO 2: Beli Inventaris Besar (Cost Rp 2.500.000)");
    const sim2 = PredictiveService.simulateScenario(history, { oneTimeCost: 2500000 }, 6);
    console.log(`   Baseline Projection (6mo): ${fmt(sim2.baseline[5])}`);
    console.log(`   Simulated Projection:      ${fmt(sim2.projected[5])}`);
    console.log(`   💡 Impact: ${sim2.insights.join(' ')}`);

    // SCENARIO 3: Efficiency Mode
    console.log("\n🔮 SCENARIO 3: Mode Hemat (Expense -15%)");
    // Note: In our logic, Expense -15% acts as a boost to net flow logic
    const sim3 = PredictiveService.simulateScenario(history, { expenseChangePercent: 15 }, 6);
    console.log(`   Baseline Projection (6mo): ${fmt(sim3.baseline[5])}`);
    console.log(`   Simulated Projection:      ${fmt(sim3.projected[5])}`);
    console.log(`   💡 Impact: ${sim3.insights[0]}`);

    console.log("\n==============================================");
}

runDemo().catch(console.error);
