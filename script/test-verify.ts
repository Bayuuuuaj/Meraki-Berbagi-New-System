// Test treasury verification
async function testTreasuryVerification() {
    const baseUrl = "http://localhost:3000";

    // 1. Get all users first
    console.log("1. Getting users...");
    const usersRes = await fetch(`${baseUrl}/api/users`);
    const users = await usersRes.json();
    console.log("Found", users.length, "users");

    // 2. Create a test treasury entry with pending status
    console.log("\n2. Creating test treasury entry...");
    const createRes = await fetch(`${baseUrl}/api/treasury`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: users[0].id,
            date: new Date().toISOString().split('T')[0],
            amount: 50000,
            type: "in",
            category: "iuran_wajib",
            status: "pending",
            notes: "Test payment"
        })
    });

    if (!createRes.ok) {
        console.error("Failed to create treasury:", await createRes.text());
        return;
    }

    const created = await createRes.json();
    console.log("Created treasury:", created.id, "Status:", created.status);

    // 3. Now verify it using PATCH
    console.log("\n3. Verifying treasury...");
    const patchRes = await fetch(`${baseUrl}/api/treasury/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verified" })
    });

    if (!patchRes.ok) {
        console.error("❌ PATCH failed:", patchRes.status, await patchRes.text());
        return;
    }

    const updated = await patchRes.json();
    console.log("✅ Treasury verified! New status:", updated.status);

    // 4. Verify by fetching all treasury
    console.log("\n4. Fetching all treasury to confirm...");
    const allRes = await fetch(`${baseUrl}/api/treasury`);
    const allTreasury = await allRes.json();
    const found = allTreasury.find((t: any) => t.id === created.id);
    console.log("Found treasury status:", found?.status);

    if (found?.status === "verified") {
        console.log("\n🎉 SUCCESS: Treasury verification works!");
    } else {
        console.log("\n❌ FAILED: Status was not updated");
    }
}

testTreasuryVerification();
