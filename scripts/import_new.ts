/**
 * FilmFlex Movie Import Tool
 * 
 * This script imports movies from an external API into the FilmFlex database.
 * It handles errors, saves progress, and can be resumed if interrupted.
 * 
 * Usage:
 *   npx tsx import_new.ts [startPage] [endPage]
 *   npx tsx import_new.ts --resume
 */
import { fetchMovieList, fetchMovieDetail, convertToMovieModel, convertToEpisodeModels } from '../server/api';
import { db } from '../server/db';
import { storage } from '../server/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_PAGES = 2252;
const PAGE_LIMIT = 20; 
const DELAY_BETWEEN_REQUESTS = 1000;
const PROGRESS_FILE = path.join(__dirname, 'import_progress.json');

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Save the current import progress to a JSON file
 * @param page The page number that was just completed
 */
function saveProgress(page: number): void {
  try {
    const data = JSON.stringify({
      lastCompletedPage: page,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(PROGRESS_FILE, data);
    console.log(`Progress saved: completed page ${page}`);
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

/**
 * Load the last saved import progress
 * @returns Object containing the last completed page
 */
function loadProgress(): { lastCompletedPage: number } {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      const progress = JSON.parse(data);
      return { lastCompletedPage: progress.lastCompletedPage || 0 };
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
  }
  return { lastCompletedPage: 0 };
}

/**
 * Format a time duration in seconds to a human-readable string
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g., "2h 30m 15s")
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result;
}

/**
 * Estimate remaining time based on progress and average processing time
 * @param currentPage Current page number
 * @param totalPages Total number of pages
 * @param startTime Import start time
 * @returns Estimated remaining time as a formatted string
 */
function estimateRemainingTime(currentPage: number, totalPages: number, startTime: number): string {
  const elapsed = (Date.now() - startTime) / 1000;
  const pagesCompleted = currentPage - 1;
  
  if (pagesCompleted <= 0) return "Calculating...";
  
  const timePerPage = elapsed / pagesCompleted;
  const pagesRemaining = totalPages - currentPage + 1;
  const secondsRemaining = timePerPage * pagesRemaining;
  
  return formatTime(secondsRemaining);
}

/**
 * Main import function
 * @param startPage First page to import (default: 1)
 * @param endPage Last page to import (default: 5)
 * @returns Promise that resolves when import is complete
 */
export async function runImport(startPage: number = 1, endPage: number = 5) {
  const startTime = Date.now();
  console.time('TotalImportTime');
  
  console.log("\n======================================");
  console.log("==== FilmFlex Movie Import Tool =====");
  console.log("======================================\n");
  
  // Validate input
  startPage = Math.max(1, Math.min(startPage, TOTAL_PAGES));
  endPage = Math.max(startPage, Math.min(endPage, TOTAL_PAGES));
  
  console.log(`Starting import from page ${startPage} to ${endPage} (${endPage - startPage + 1} pages total)`);
  
  let totalSaved = 0;
  let totalExisting = 0;
  let totalFailed = 0;
  
  for (let page = startPage; page <= endPage; page++) {
    const progress = Math.round(((page - startPage) / (endPage - startPage + 1)) * 100);
    const estRemaining = estimateRemainingTime(page, endPage, startTime);
    
    console.log(`\n=== Processing page ${page}/${endPage} (${progress}% complete, Est. remaining: ${estRemaining}) ===`);
    let savedCount = 0;
    let existingCount = 0;
    let failedCount = 0;
    
    try {
      // Fetch the page data
      console.log(`Fetching movie list for page ${page}`);
      const movieListData = await fetchMovieList(page, PAGE_LIMIT);
      
      if (!movieListData || !movieListData.items || movieListData.items.length === 0) {
        console.log(`No movies found on page ${page}`);
        saveProgress(page); // Save progress even for empty pages
        continue;
      }
      
      console.log(`Found ${movieListData.items.length} movies on page ${page}`);
      
      // Process each movie
      for (const movie of movieListData.items) {
        if (!movie || !movie.slug) {
          console.warn(`Invalid movie data found, skipping`);
          failedCount++;
          continue;
        }
        
        try {
          console.log(`Processing movie: ${movie.slug}`);
          
          // Check if movie already exists
          const existingMovie = await storage.getMovieBySlug(movie.slug);
          if (existingMovie) {
            console.log(`Movie already exists: ${movie.slug} (ID: ${existingMovie.id})`);
            existingCount++;
            continue;
          }
          
          // Get movie details
          const movieDetail = await fetchMovieDetail(movie.slug);
          
          // Validate movie details
          if (!movieDetail || !movieDetail._id) {
            console.warn(`Failed to fetch movie details for ${movie.slug}, skipping`);
            failedCount++;
            continue;
          }
          
          // Convert to our models
          const movieModel = convertToMovieModel(movieDetail);
          const episodeModels = convertToEpisodeModels(movieDetail);
          
          // Save movie
          await storage.saveMovie(movieModel);
          console.log(`Saved new movie: ${movieModel.name}`);
          savedCount++;
          
          // Save episodes
          let episodeCount = 0;
          for (const episode of episodeModels) {
            try {
              // Check if episode exists
              const existingEpisode = await storage.getEpisodeBySlug(episode.slug);
              if (existingEpisode) {
                continue;
              }
              
              // Save episode
              await storage.saveEpisode(episode);
              episodeCount++;
            } catch (epError) {
              console.error(`Error saving episode ${episode.slug}:`, epError);
            }
            
            // Small delay between episodes
            await sleep(300);
          }
          
          console.log(`Saved ${episodeCount} episodes for ${movieModel.name}`);
        } catch (movieError) {
          console.error(`Error processing movie ${movie.slug}:`, movieError);
          failedCount++;
        }
        
        // Add delay between movies
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
      
      // Save progress after each page
      totalSaved += savedCount;
      totalExisting += existingCount;
      totalFailed += failedCount;
      saveProgress(page);
      console.log(`Page ${page} completed: Saved ${savedCount} new movies, ${existingCount} already existed, ${failedCount} failed`);
      
      // Add a bit more delay between pages
      if (page < endPage) {
        console.log(`Waiting 3 seconds before next page...`);
        await sleep(3000);
      }
    } catch (pageError) {
      console.error(`Error processing page ${page}:`, pageError);
      // Still save progress even if the page had errors
      saveProgress(page);
    }
  }
  
  console.log(`\n=== Import Summary ===`);
  console.log(`Processed pages ${startPage} to ${endPage} (${endPage - startPage + 1} pages total)`);
  console.log(`Total results:`);
  console.log(` - New movies saved: ${totalSaved}`);
  console.log(` - Already existing: ${totalExisting}`);
  console.log(` - Failed to import: ${totalFailed}`);
  console.timeEnd('TotalImportTime');
}

/**
 * Command-line entry point
 */
async function main() {
  try {
    // Get parameters
    const args = process.argv.slice(2);
    let startPage = 1;
    let endPage = 5;
    
    // Show help?
    if (args.includes('--help') || args.includes('-h')) {
      console.log('FilmFlex Movie Import Tool');
      console.log('=========================');
      console.log('Usage:');
      console.log('  npx tsx import_new.ts [startPage] [endPage]');
      console.log('  npx tsx import_new.ts --resume');
      console.log('\nOptions:');
      console.log('  --resume, -r    Resume from last completed page');
      console.log('  --help, -h      Show this help message');
      return;
    }
    
    // Check for resume
    if (args.includes('--resume') || args.includes('-r')) {
      const progress = loadProgress();
      if (progress.lastCompletedPage > 0) {
        startPage = progress.lastCompletedPage + 1;
        console.log(`Resuming from page ${startPage} (last completed: ${progress.lastCompletedPage})`);
      } else {
        console.log('No previous progress found. Starting from page 1.');
      }
    } else {
      // Parse page numbers
      if (args.length >= 1 && /^\d+$/.test(args[0])) {
        startPage = parseInt(args[0]);
      }
      
      if (args.length >= 2 && /^\d+$/.test(args[1])) {
        endPage = parseInt(args[1]);
      }
    }
    
    await runImport(startPage, endPage);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

// Run the script
main();