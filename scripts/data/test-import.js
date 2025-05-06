/**
 * Test script for verifying the functionality of import-movies-sql.cjs
 * This script will execute the import script in dry-run mode (no database changes)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create log directory if it doesn't exist
const logDir = path.join(__dirname, '..', '..', 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Print banner
console.log('\n' + '='.repeat(60));
console.log('FilmFlex Import Script Test');
console.log('='.repeat(60) + '\n');

// Check if required environment variables are set
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.log('Please create a .env file with the necessary variables');
  process.exit(1);
}

console.log('Environment check passed ✓');
console.log('Database URL detected ✓');

// Verify the import script exists
const importScriptPath = path.join(__dirname, 'import-movies-sql.cjs');
if (!fs.existsSync(importScriptPath)) {
  console.error(`ERROR: Import script not found at ${importScriptPath}`);
  process.exit(1);
}

console.log('Import script found ✓');

// Run the script in test mode (just one page, no actual database changes)
console.log('\nRunning import script in test mode...\n');

// Use Node to execute the script directly rather than using the shell wrapper
// This allows us to capture the output more reliably
const command = `NODE_ENV=development node "${importScriptPath}" --test-mode`;

const child = exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`\nERROR: Import script execution failed: ${error.message}`);
    process.exit(1);
  }

  // Check for specific strings in the output to verify functionality
  if (stdout.includes('Fetching movie list')) {
    console.log('\n✓ API connection successful');
  } else {
    console.error('\n✗ API connection may have failed. Check the output for details.');
  }

  if (stdout.includes('Combined') && stdout.includes('items from')) {
    console.log('✓ Data parsing successful');
  } else {
    console.error('✗ Data parsing may have failed. Check the output for details.');
  }

  console.log('\nTest completed. See details above for results.');
});

// Stream output in real-time
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);