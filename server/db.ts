import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema.ts";

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL must be set. Did you forget to add it to .env?",
    );
}

// Configured for high performance with pooling
export const queryClient = postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Use SSL for production environments like Supabase/Neon
    ssl: process.env.NODE_ENV === "production" ? "require" : false,
});

export const db = drizzle(queryClient, { schema });
