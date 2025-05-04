// A simple version of the import tool for testing
import { exec } from 'child_process';

console.log("Testing import tool functionality...");
console.log("Importing a single page (page 1) for testing...");

// Run the direct import without the interactive tool
exec('npx tsx import_movies.ts 1 1', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`Output: ${stdout}`);
});