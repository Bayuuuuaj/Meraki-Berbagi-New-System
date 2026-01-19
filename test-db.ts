import postgres from 'postgres';

console.log("Testing connection...");

const sql = postgres("postgresql://postgres:Bayukece%2C12@db.pzwqltctuubjmqydkluo.supabase.co:5432/postgres");

async function test() {
    try {
        const result = await sql`SELECT 1 as connected`;
        console.log("Success!", result);
        process.exit(0);
    } catch (err) {
        console.error("Connection failed:", err);
        process.exit(1);
    }
}

test();
