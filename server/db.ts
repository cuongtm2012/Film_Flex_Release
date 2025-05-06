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

// Parse and validate connection string to avoid password format issues
function getValidConnectionString() {
  try {
    // Handle special characters in password for direct connection strings
    if (process.env.DATABASE_URL.includes('@')) {
      // Extract user, password, host, port, and database
      const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
      const match = process.env.DATABASE_URL.match(regex);
      
      if (match) {
        const [_, user, password, host, port, database] = match;
        // Encode the password to handle special characters
        const encodedPassword = encodeURIComponent(password);
        return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
      }
    }
    
    // If the above parsing fails, try URL parsing
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) {
        // Ensure password is properly encoded
        url.password = encodeURIComponent(url.password);
        return url.toString();
      }
    } catch (urlError) {
      console.warn("Failed to parse DATABASE_URL as URL:", urlError.message);
    }
    
    // If all parsing attempts fail, use the original string
    console.log("Using original DATABASE_URL");
    return process.env.DATABASE_URL;
  } catch (error) {
    console.error("Error processing DATABASE_URL:", error);
    return process.env.DATABASE_URL;
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
  // Don't exit process on error - allow for reconnection attempts
  if (err.message.includes('SASL') || err.message.includes('password')) {
    console.error('Database authentication error - check DATABASE_URL format and credentials');
  }
});

// Handle WebSocket errors for Neon
neonConfig.wsConnectionTimeoutMillis = 10000;
neonConfig.wsConnectionRetryAttempts = 3;

// Initialize Drizzle with the pool
export const db = drizzle({ client: pool, schema });
