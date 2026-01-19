import { storage } from "./storage";
import { generateComplianceReport } from "./utils/report-generator";
import * as fs from "fs";
import * as path from "path";

async function testExportRoutine() {
    console.log("🚀 Starting Compliance Export Test...");

    try {
        // 1. Create a dummy user
        const user = await storage.createUser({
            name: "Test Auditor",
            email: `auditor-${Date.now()}@meraki.org`,
            password: "password123",
            role: "admin",
            isActive: 1,
            isSuperAdmin: 0
        });

        // 2. Create a dummy transaction with AI metadata
        const aiMetadata = JSON.stringify({
            merchantName: "Kantin Meraki",
            amount: 50000,
            confidenceScore: 0.95,
            items: ["Nasi Goreng", "Teh Manis"]
        });

        const tx = await storage.createTreasury({
            userId: user.id,
            date: new Date().toISOString().split('T')[0],
            amount: 50000,
            type: "out",
            category: "Konsumsi",
            notes: "Pembelian makanan rapat",
            status: "pending",
            verificationStatus: "pending",
            createdBy: "AI_EXTRACTOR",
            aiMetadata: aiMetadata
        });

        console.log("✅ Dummy transaction created:", tx.id);

        // 3. Verify the transaction
        const verifierName = "Bendahara Utama";
        const updated = await storage.updateTreasury(tx.id, {
            verificationStatus: "verified",
            status: "verified",
            verifiedBy: verifierName,
            verifiedAt: new Date()
        });

        console.log("✅ Transaction verified by:", updated.verifiedBy);
        console.log("✅ Verified at:", updated.verifiedAt);

        // 4. Generate report
        const allTransactions = await storage.getAllTreasury();
        const report = generateComplianceReport(allTransactions);

        // Save to file for inspection
        const reportPath = path.join(process.cwd(), "compliance_report_test.md");
        fs.writeFileSync(reportPath, report);

        console.log("\n--- GENERATED REPORT SAVED TO: " + reportPath + " ---");

        // 5. Assertions
        if (!report.includes(verifierName)) throw new Error("Verifier name missing from report");
        if (!report.includes("95%")) throw new Error("AI Confidence score missing from report");
        if (!report.includes("verified")) throw new Error("Status missing from report");

        console.log("✨ Test successful! Compliance export logic is working as expected.");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testExportRoutine();
