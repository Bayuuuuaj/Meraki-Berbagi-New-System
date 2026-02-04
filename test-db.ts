import postgres from 'postgres';

console.log("🔌 Testing Supabase PostgreSQL connection...\n");

// Check if DATABASE_URL is loaded
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment variables!');
    console.error('   Please check your .env file\n');
    process.exit(1);
}

// Mask password for security
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📝 Connection string: ${maskedUrl}\n`);

// Supabase requires SSL connection
const sql = postgres(dbUrl, {
    ssl: 'require', // Required for Supabase
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
});

async function test() {
    try {
        console.log('📡 Connecting to database...');
        const result = await sql`SELECT 1 as connected, current_database() as db_name, version()`;

        console.log('\n✅ Connection successful!');
        console.log('📊 Database info:');
        console.log(`   Database: ${result[0].db_name}`);
        console.log(`   Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);

        // Test tables
        console.log('\n🔍 Checking tables...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;

        if (tables.length > 0) {
            console.log(`   Found ${tables.length} tables:`);
            tables.slice(0, 10).forEach((t: any) => {
                console.log(`   - ${t.table_name}`);
            });
            if (tables.length > 10) {
                console.log(`   ... and ${tables.length - 10} more`);
            }
        } else {
            console.log('   ⚠️  No tables found (database is empty)');
            console.log('   💡 Run migrations: npm run db:push');
        }

        await sql.end();
        console.log('\n✅ Database connection test passed!\n');
        process.exit(0);

    } catch (err: any) {
        console.error('\n❌ Connection failed:', err.message || err);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check if DATABASE_URL in .env is correct');
        console.error('   2. Verify Supabase project is active (not paused)');
        console.error('   3. Check network/firewall settings');
        console.error('   4. Ensure pooler connection is enabled');
        console.error(`\n   Error code: ${err.code || 'Unknown'}`);

        if (err.code === 'ECONNREFUSED') {
            console.error('\n   ⚠️  Connection refused - possible causes:');
            console.error('      - Supabase project is paused/inactive');
            console.error('      - Wrong host/port in connection string');
            console.error('      - Firewall/antivirus blocking connection');
            console.error('      - Network connectivity issues');
        }

        console.log('');
        await sql.end();
        process.exit(1);
    }
}

test();
