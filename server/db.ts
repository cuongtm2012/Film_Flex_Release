import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// More robust connection handling
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add max connection attempts and timeout
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Handle WebSocket errors for Neon
neonConfig.wsConnectionTimeoutMillis = 10000;

// Initialize Drizzle with the pool
export const db = drizzle({ client: pool, schema });
