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
    // Make sure DATABASE_URL is defined
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not defined");
    }

    // Handle special characters in password for direct connection strings
    if (dbUrl.includes('@')) {
      // Extract user, password, host, port, and database
      const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
      const match = dbUrl.match(regex);
      
      if (match) {
        const [_, user, password, host, port, database] = match;
        // Encode the password to handle special characters
        const encodedPassword = encodeURIComponent(password);
        return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
      }
    }
    
    // If the above parsing fails, try URL parsing
    try {
      const url = new URL(dbUrl);
      if (url.password) {
        // Ensure password is properly encoded
        url.password = encodeURIComponent(url.password);
        return url.toString();
      }
    } catch (urlError: any) {
      console.warn("Failed to parse DATABASE_URL as URL:", urlError.message);
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
  // Don't exit process on error - allow for reconnection attempts
  if (err.message.includes('SASL') || err.message.includes('password')) {
    console.error('Database authentication error - check DATABASE_URL format and credentials');
  }
});

// WebSocket connection configuration parameters
// NOTE: Custom properties may not exist in current type definitions,
// as these might be added in future versions or undocumented features
// We're removing these to avoid TypeScript errors while maintaining stability

// Initialize Drizzle with the pool
export const db = drizzle({ client: pool, schema });
