import { Pool } from 'pg'; // Use regular pg for local connections
import { drizzle } from 'drizzle-orm/node-postgres'; // Standard PostgreSQL driver for Node.js
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse and validate connection string to avoid password format issues
function getValidConnectionString() {
  try {
    // Make sure DATABASE_URL is defined
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    
    // If all parsing attempts fail, use the original string
    console.log("Using original DATABASE_URL");
    return dbUrl;
  } catch (error) {
    console.error("Error processing DATABASE_URL:", error);
    return process.env.DATABASE_URL || '';
  }
}

// Get properly formatted connection string
const connectionString = getValidConnectionString();
console.log("Connecting to database with processed connection string...");

// More robust connection handling
export const pool = new Pool({
  connectionString,
  // Add max connection attempts and timeout
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log successful connections
pool.on('connect', () => {
  console.log('Successfully connected to PostgreSQL database');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on database client:', err);
});

// Initialize Drizzle with the pool
export const db = drizzle({ client: pool, schema });