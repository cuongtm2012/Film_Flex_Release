/**
 * Simple Import Tool for FilmFlex
 * This script provides a simplified way to import movies without complex interactive prompts
 */
import { execSync } from 'child_process';
import * as fs from 'fs';

// Constants
const TOTAL_PAGES = 2252;
const PROGRESS_FILE = 'import_progress.json';

// Helper function to get import progress
function getImportProgress(): { lastCompletedPage: number, timestamp: string } | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
  }
  return null;
}

// Main function
function main() {
  console.log('\n===============================');
  console.log('=== FilmFlex Import Helper ===');
  console.log('===============================\n');
  
  // Get command line args
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  if (!command || command === 'help') {
    // Display help/usage information
    console.log('Usage:');
    console.log('  npx tsx simple_import.ts single <page_number> - Import a single page');
    console.log('  npx tsx simple_import.ts range <start_page> <end_page> - Import a range of pages');
    console.log('  npx tsx simple_import.ts resume - Resume from last saved point');
    console.log('  npx tsx simple_import.ts status - Check import status');
    console.log('  npx tsx simple_import.ts help - Show this help message\n');
    return;
  }
  
  // Check status
  if (command === 'status') {
    const progress = getImportProgress();
    if (progress) {
      console.log(`Current import status:`);
      console.log(`- Last completed page: ${progress.lastCompletedPage} of ${TOTAL_PAGES}`);
      console.log(`- Progress: ${Math.round((progress.lastCompletedPage/TOTAL_PAGES)*100)}%`);
      console.log(`- Last updated: ${new Date(progress.timestamp).toLocaleString()}`);
      console.log(`\nTo resume, run: npx tsx simple_import.ts resume`);
    } else {
      console.log('No import progress found. Start a new import with:');
      console.log('npx tsx simple_import.ts single 1');
    }
    return;
  }
  
  // Import a single page
  if (command === 'single') {
    const page = parseInt(args[1]);
    if (isNaN(page) || page < 1 || page > TOTAL_PAGES) {
      console.log(`Error: Please provide a valid page number (1-${TOTAL_PAGES})`);
      return;
    }
    
    console.log(`Starting import of page ${page}...`);
    runImport(page, page);
    return;
  }
  
  // Import a range of pages
  if (command === 'range') {
    const startPage = parseInt(args[1]);
    const endPage = parseInt(args[2]);
    
    if (isNaN(startPage) || isNaN(endPage) || 
        startPage < 1 || endPage > TOTAL_PAGES || startPage > endPage) {
      console.log(`Error: Please provide valid start and end page numbers (1-${TOTAL_PAGES})`);
      return;
    }
    
    console.log(`Starting import of pages ${startPage} to ${endPage}...`);
    runImport(startPage, endPage);
    return;
  }
  
  // Resume from last point
  if (command === 'resume') {
    const progress = getImportProgress();
    if (!progress) {
      console.log('No previous import progress found. Starting from page 1...');
      runImport(1, TOTAL_PAGES);
      return;
    }
    
    const lastPage = progress.lastCompletedPage;
    if (lastPage >= TOTAL_PAGES) {
      console.log('All pages have been imported already!');
      return;
    }
    
    const nextPage = lastPage + 1;
    console.log(`Resuming import from page ${nextPage} to ${TOTAL_PAGES}...`);
    runImport(nextPage, TOTAL_PAGES);
    return;
  }
  
  console.log(`Unknown command: ${command}`);
  console.log('Run "npx tsx simple_import.ts help" for usage information');
}

// Run the import process
function runImport(startPage: number, endPage: number) {
  try {
    console.log(`\n=== Import Session ===`);
    console.log(`- Importing pages ${startPage} to ${endPage}`);
    console.log(`- Date: ${new Date().toLocaleString()}`);
    console.log(`\nStarting import process... (This may take a while)\n`);
    
    // Execute the import_movies.ts script with the specified page range
    execSync(`npx tsx import_movies.ts ${startPage} ${endPage}`, { 
      stdio: 'inherit',
      maxBuffer: 1024 * 1024 * 10 // 10 MB buffer
    });
    
    console.log(`\n=== Import completed successfully! ===`);
    
    // Check progress after import
    const progress = getImportProgress();
    if (progress) {
      console.log(`Current progress: ${progress.lastCompletedPage}/${TOTAL_PAGES} pages imported (${Math.round((progress.lastCompletedPage/TOTAL_PAGES)*100)}%)`);
    }
  } catch (error) {
    console.error('\n=== Import failed with error ===');
    console.error('The import process was interrupted or encountered an error.');
    console.log('You can resume later by running: npx tsx simple_import.ts resume');
  }
}

// Execute the main function
main();