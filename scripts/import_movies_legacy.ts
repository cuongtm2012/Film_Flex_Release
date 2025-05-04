/**
 * FilmFlex Movie Import Tool (Legacy Script)
 * 
 * This script is kept for reference but we recommend using import_new.ts instead.
 * Please see IMPORT_GUIDE.md for more information.
 */

import { runImport } from './import_new';

// Display warning when using this script
console.log("\n⚠️  WARNING: This script is deprecated ⚠️");
console.log("Please use the new import tool instead:");
console.log("  npx tsx import_new.ts [startPage] [endPage]");
console.log("  ./import-movies.sh [startPage] [endPage]");
console.log("\nSee IMPORT_GUIDE.md for more details.\n");

// Process command line arguments
const args = process.argv.slice(2);
const startPage = args[0] ? parseInt(args[0]) : 1;
const endPage = args[1] ? parseInt(args[1]) : 5; // Default to importing 5 pages

// Run the import using the new implementation
runImport(startPage, endPage)
  .then(() => {
    console.log("Import completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });