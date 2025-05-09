import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false // Disable SSL for local connections
});

pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on database client:', err);
});

export const db = drizzle({ client: pool, schema });