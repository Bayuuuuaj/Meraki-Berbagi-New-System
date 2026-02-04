import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema.ts";

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL must be set. Did you forget to add it to .env?",
    );
}

// Configured for high performance with pooling
// ✅ DATABASE POOLING: Use ?sslmode=require for secure production connections
const connectionString = process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + "sslmode=require";

export const queryClient = postgres(connectionString, {
    max: 10, // Cap connections for free tier
    idle_timeout: 20,
    connect_timeout: 10,
    // Use SSL for production environments like Supabase/Neon
    ssl: "require",
});

export const db = drizzle(queryClient, { schema });

// Auto-migration helper for Railway Free Tier
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function runMigrations() {
    if (process.env.NODE_ENV === "production") {
        console.log("🚀 Starting automatic database migration...");
        try {
            // Create a temporary drizzle config if needed, or pass params directly
            // Since we can't easily use CLI with process.env in this context without a config file,
            // we will rely on the drizzle-kit CLI being present and configured via env vars.
            // Drizzle Kit automatically picks up DATABASE_URL from environment.

            await execAsync("npx drizzle-kit push:pg");
            console.log("✅ Database migration completed successfully!");
        } catch (error) {
            console.error("❌ Migration failed:", error);
            // Don't exit process, let the app try to run anyway
        }
    }
}
