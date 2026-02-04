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
