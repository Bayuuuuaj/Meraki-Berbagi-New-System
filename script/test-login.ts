// Test login API
async function testLogin() {
    try {
        const res = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@demo.com", password: "admin123" })
        });

        const data = await res.json();
        console.log("Login Response Status:", res.status);
        console.log("Login Response:", JSON.stringify(data, null, 2));

        if (res.ok) {
            console.log("✅ Login SUCCESS!");
        } else {
            console.log("❌ Login FAILED:", data.message);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testLogin();
