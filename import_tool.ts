import { execSync } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const TOTAL_PAGES = 2252;
const PROGRESS_FILE = 'import_progress.json';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and get a response
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Check if the progress file exists and read it
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

// Estimate time for import based on pages
function estimateTime(pages: number): string {
  // Rough estimate: 10 seconds per movie, average 10 movies per page
  const totalSeconds = pages * 10 * 10;
  
  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else if (totalSeconds < 3600) {
    return `${Math.floor(totalSeconds / 60)} minutes`;
  } else if (totalSeconds < 86400) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} hours and ${minutes} minutes`;
  } else {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    return `${days} days and ${hours} hours`;
  }
}

async function main() {
  console.log('\n===============================');
  console.log('=== PhimAPI Movie Importer ===');
  console.log('===============================\n');
  console.log('This tool helps you import movies from PhimAPI into your database.');
  console.log('Total available pages: 2252 (approximately 22,520 movies)\n');
  
  // Check for previous progress
  const progress = getImportProgress();
  if (progress) {
    console.log(`Found previous import progress: Last completed page ${progress.lastCompletedPage} (${new Date(progress.timestamp).toLocaleString()})`);
    
    if (progress.lastCompletedPage >= TOTAL_PAGES) {
      console.log('It appears all pages have been imported already!');
      const restart = await askQuestion('Would you like to restart the import from scratch? (y/n): ');
      if (restart.toLowerCase() !== 'y') {
        console.log('Exiting import tool.');
        rl.close();
        return;
      }
    } else {
      const resumeOption = await askQuestion(`Do you want to resume from page ${progress.lastCompletedPage + 1}? (y/n): `);
      if (resumeOption.toLowerCase() === 'y') {
        console.log(`\nResuming import from page ${progress.lastCompletedPage + 1} to ${TOTAL_PAGES}...`);
        executeImport(progress.lastCompletedPage + 1, TOTAL_PAGES);
        rl.close();
        return;
      }
    }
  }
  
  console.log('\nChoose an import option:');
  console.log('1) Import all pages (1-2252) - Estimated time: several days');
  console.log('2) Import a specific range of pages');
  console.log('3) Import a single page (for testing)');
  console.log('4) Resume from last saved point');
  console.log('5) Exit');
  
  const options = await askQuestion('\nEnter your choice (1-5): ');
  
  switch (options.trim()) {
    case '1':
      console.log('\nPreparing to import all 2252 pages...');
      console.log(`Estimated time: ${estimateTime(TOTAL_PAGES)}`);
      const confirmAll = await askQuestion('This will take a very long time. Are you sure? (y/n): ');
      
      if (confirmAll.toLowerCase() === 'y') {
        console.log('\nStarting full import of 2252 pages...');
        console.log('You can safely cancel this process at any time with Ctrl+C.');
        console.log('Progress is saved after each page, so you can resume later.\n');
        executeImport(1, 2252);
      } else {
        console.log('Import cancelled.');
      }
      break;
      
    case '2':
      const startPage = await askQuestion('\nEnter start page (1-2252): ');
      const endPage = await askQuestion('Enter end page (1-2252): ');
      
      const start = parseInt(startPage);
      const end = parseInt(endPage);
      
      if (isNaN(start) || isNaN(end) || start < 1 || end > TOTAL_PAGES || start > end) {
        console.log(`Invalid page range. Start page must be >= 1, end page must be <= ${TOTAL_PAGES}, and start must be <= end.`);
      } else {
        const pageCount = end - start + 1;
        console.log(`\nImporting ${pageCount} pages (${start} to ${end})...`);
        console.log(`Estimated time: ${estimateTime(pageCount)}`);
        
        const confirm = await askQuestion('Do you want to proceed? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
          console.log('\nStarting import...');
          console.log('You can safely cancel this process at any time with Ctrl+C.');
          console.log('Progress is saved after each page, so you can resume later.\n');
          executeImport(start, end);
        } else {
          console.log('Import cancelled.');
        }
      }
      break;
      
    case '3':
      const page = await askQuestion(`\nEnter a single page to import (1-${TOTAL_PAGES}): `);
      const pageNum = parseInt(page);
      
      if (isNaN(pageNum) || pageNum < 1 || pageNum > TOTAL_PAGES) {
        console.log(`Invalid page number. Page must be between 1 and ${TOTAL_PAGES}.`);
      } else {
        console.log(`\nImporting page ${pageNum}...`);
        console.log('Estimated time: 1-2 minutes');
        executeImport(pageNum, pageNum);
      }
      break;
      
    case '4':
      const progressData = getImportProgress();
      if (progressData) {
        const lastPage = progressData.lastCompletedPage;
        if (lastPage >= TOTAL_PAGES) {
          console.log('It appears all pages have been imported already!');
          const restart = await askQuestion('Would you like to restart the import from scratch? (y/n): ');
          
          if (restart.toLowerCase() === 'y') {
            console.log('\nStarting fresh import of all pages...');
            executeImport(1, TOTAL_PAGES);
          } else {
            console.log('Import cancelled.');
          }
        } else {
          const nextPage = lastPage + 1;
          console.log(`\nResuming import from page ${nextPage} to ${TOTAL_PAGES}...`);
          console.log(`Estimated time: ${estimateTime(TOTAL_PAGES - lastPage)}`);
          
          const confirm = await askQuestion('Do you want to proceed? (y/n): ');
          if (confirm.toLowerCase() === 'y') {
            executeImport(nextPage, TOTAL_PAGES);
          } else {
            console.log('Import cancelled.');
          }
        }
      } else {
        console.log('\nNo previous import progress found.');
        const startNew = await askQuestion('Would you like to start a new import from page 1? (y/n): ');
        
        if (startNew.toLowerCase() === 'y') {
          console.log('\nStarting fresh import of all pages...');
          executeImport(1, TOTAL_PAGES);
        } else {
          console.log('Import cancelled.');
        }
      }
      break;
      
    case '5':
      console.log('\nExiting import tool.');
      rl.close();
      return;
      
    default:
      console.log('\nInvalid choice. Please run the tool again.');
      break;
  }
  
  rl.close();
}

function executeImport(startPage: number, endPage: number) {
  try {
    // Execute the import script with the specified page range
    console.log(`\nExecuting: npx tsx import_movies.ts ${startPage} ${endPage}`);
    console.log('\n=== Import logs will appear below ===\n');
    
    // Set maximum buffer to avoid issues with large outputs
    execSync(`npx tsx import_movies.ts ${startPage} ${endPage}`, { 
      stdio: 'inherit',
      maxBuffer: 1024 * 1024 * 10 // 10 MB buffer
    });
    
    console.log('\n=== Import completed successfully! ===');
    
    // Check how many more pages need to be imported
    const progress = getImportProgress();
    if (progress && progress.lastCompletedPage < TOTAL_PAGES) {
      const remaining = TOTAL_PAGES - progress.lastCompletedPage;
      console.log(`\nProgress: ${progress.lastCompletedPage}/${TOTAL_PAGES} pages imported (${Math.round((progress.lastCompletedPage/TOTAL_PAGES)*100)}%)`);
      console.log(`Remaining: ${remaining} pages`);
      console.log(`To continue importing the remaining pages, run this tool again and select option 4.`);
    } else if (progress && progress.lastCompletedPage >= TOTAL_PAGES) {
      console.log(`\nAll ${TOTAL_PAGES} pages have been successfully imported!`);
    }
  } catch (error) {
    console.error('\n=== Import failed with error ===');
    console.error('The import process was interrupted or encountered an error.');
    console.log('\nYou can resume the import by running this tool again and selecting option 4.');
  }
}

// Run the main function
main().catch(console.error);