
// No imports needed for Node 18+ fetch

async function testUserCreation() {
    const baseUrl = 'http://localhost:3000';

    console.log("1. Fetching initial users...");
    try {
        const initialRes = await fetch(`${baseUrl}/api/users`);
        const initialUsers = await initialRes.json();
        console.log("Initial users count:", initialUsers.length);
    } catch (e) {
        console.error("Failed to fetch initial users:", e);
    }

    console.log("\n2. Creating a new user...");
    const newUser = {
        name: "Test Member",
        email: `test${Date.now()}@example.com`,
        password: "password123",
        role: "anggota"
    };

    try {
        const createRes = await fetch(`${baseUrl}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser)
        });

        if (createRes.ok) {
            const createdUser = await createRes.json();
            console.log("User created successfully:", createdUser);
        } else {
            const error = await createRes.text();
            console.error("Failed to create user. Status:", createRes.status, "Body:", error);
            return;
        }
    } catch (e) {
        console.error("Error creating user:", e);
        return;
    }

    console.log("\n3. Fetching users again...");
    try {
        const finalRes = await fetch(`${baseUrl}/api/users`);
        const finalUsers = await finalRes.json();
        console.log("Final users count:", finalUsers.length);
        // @ts-ignore
        const found = finalUsers.find((u: any) => u.email === newUser.email);
        if (found) {
            console.log("SUCCESS: New user found in the list!");
        } else {
            console.error("FAILURE: New user NOT found in the list.");
        }
    } catch (e) {
        console.error("Failed to fetch final users:", e);
    }
}

testUserCreation();
