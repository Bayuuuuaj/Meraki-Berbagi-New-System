
import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function checkColumns() {
    try {
        console.log("🔍 Checking columns for 'users' table...");
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND table_schema = 'public'
        `;

        console.table(columns);
        await sql.end();
    } catch (err) {
        console.error("❌ Error checking columns:", err);
        process.exit(1);
    }
}

checkColumns();
