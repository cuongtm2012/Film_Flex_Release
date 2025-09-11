import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';
import { config } from './config.js';

if (!config.databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize PostgreSQL pool
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false,
});

// Use a module-level flag to prevent repeated logging
let isDbConnected = false;

pool.on('connect', () => {
  // Only log once during initial connection, not for every query
  if (process.env.NODE_ENV !== 'production' && !isDbConnected) {
    console.log('✅ Successfully connected to PostgreSQL database');
    isDbConnected = true;
  }
});

pool.on('error', (err: any) => {
  console.error('❌ Unexpected error on database client:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Lost connection to the database. Attempting to reconnect...');
  }
});

// Create drizzle database instance with the schema
export const db = drizzle(pool, { schema });

// Export a helper to create prepared statements
export const prepareQuery = db.query;

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed.');
  } else {
    console.error('Unhandled exception:', err);
  }
});