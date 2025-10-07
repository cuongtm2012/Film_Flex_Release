/**
 * PhimGG Database Existence Check
 * This script ensures the database exists before running reset operations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Extract database connection info from DATABASE_URL
let databaseUrl = process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex';
const matches = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!matches) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, dbName] = matches;

// Connect to PostgreSQL without specifying a database
const pgClient = new Client({
  host,
  port,
  user,
  password,
  database: 'postgres' // Connect to default postgres database
});

async function ensureDatabase() {
  try {
    await pgClient.connect();
    
    // Check if database exists
    const res = await pgClient.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [dbName]);
    
    if (res.rows.length === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      
      // Create database
      await pgClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
      
      // Grant privileges
      try {
        await pgClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO ${user}`);
        console.log(`Granted privileges on "${dbName}" to ${user}.`);
      } catch (err) {
        console.warn(`Note: Could not grant privileges: ${err.message}`);
        console.warn('This is not critical if you are using the same user that created the database.');
      }
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring database exists:', error.message);
    return false;
  } finally {
    await pgClient.end();
  }
}

// Run the check
ensureDatabase()
  .then(success => {
    if (success) {
      console.log('Database check completed successfully.');
      process.exit(0);
    } else {
      console.error('Database check failed.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 