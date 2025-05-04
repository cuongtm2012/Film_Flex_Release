/**
 * FilmFlex Movie Importer
 * 
 * A robust script for importing movies from an external API into the FilmFlex database.
 * Features:
 * - Progress tracking with auto-resume capability
 * - Error handling with retries
 * - Estimated time remaining
 * - Detailed statistics
 * 
 * Usage:
 *   npx tsx import.ts [startPage] [endPage]
 *   npx tsx import.ts --resume
 */
import { fetchMovieList, fetchMovieDetail, convertToMovieModel, convertToEpisodeModels } from '../server/api';
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
const DELAY_BETWEEN_PAGES = 3000;
const MAX_RETRIES = 3;
const PROGRESS_FILE = path.join(__dirname, 'import_progress.json');

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility function to retry a function call if it fails
 */
async function fetchWithRetry<T>(fetchFn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      // Check for database constraint violations which shouldn't be retried
      if (error && error.code === '23505') { // PostgreSQL unique constraint violation
        console.log(`Database constraint violation (no retry needed): ${error.detail || error.message}`);
        throw error;
      }
      
      console.error(`Attempt ${i + 1}/${retries} failed:`, error);
      lastError = error;
      
      if (i < retries - 1) {
        const delay = 1000 * Math.pow(2, i); // Exponential backoff
        console.log(`Retrying in ${delay/1000} seconds...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Save the current import progress to a JSON file
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
 * Estimate remaining time based on progress
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
 * Process a single movie
 */
async function processMovie(movieSlug: string): Promise<{ status: 'saved' | 'existing' | 'failed', episodeCount?: number }> {
  try {
    // Check if movie already exists
    const existingMovie = await storage.getMovieBySlug(movieSlug);
    if (existingMovie) {
      return { status: 'existing' };
    }
    
    // Fetch and validate movie details
    const movieDetail = await fetchWithRetry(() => fetchMovieDetail(movieSlug));
    
    // Check for valid movie details with more detailed logging
    if (!movieDetail) {
      console.warn(`Failed to fetch any movie details for ${movieSlug}`);
      return { status: 'failed' };
    }
    
    if (!movieDetail._id) {
      console.warn(`Movie details missing _id for ${movieSlug}`);
      
      // Log the actual response for debugging
      console.log(`Response for ${movieSlug}:`, JSON.stringify(movieDetail).substring(0, 200) + '...');
      
      // Check if it's the common "not found" response
      if (movieDetail.status === false || movieDetail.msg === 'Movie not found') {
        console.warn(`Movie ${movieSlug} reported as not found by the API`);
      }
      
      return { status: 'failed' };
    }
    
    // Additional validation for required fields
    if (!movieDetail.name || !movieDetail.slug) {
      console.warn(`Movie details missing essential fields for ${movieSlug}`);
      return { status: 'failed' };
    }
    
    // Convert to our models
    const movieModel = convertToMovieModel(movieDetail);
    const episodeModels = convertToEpisodeModels(movieDetail);
    
    // Save movie
    await storage.saveMovie(movieModel);
    
    // Save episodes
    let episodeCount = 0;
    for (const episode of episodeModels) {
      try {
        // Check if episode exists
        const existingEpisode = await storage.getEpisodeBySlug(episode.slug);
        if (existingEpisode) continue;
        
        // Save episode
        await storage.saveEpisode(episode);
        episodeCount++;
      } catch (epError) {
        console.error(`Error saving episode ${episode.slug}:`, epError);
      }
      
      // Small delay between episodes
      await sleep(300);
    }
    
    console.log(`Saved movie ${movieModel.name} with ${episodeCount} episodes`);
    return { status: 'saved', episodeCount };
  } catch (error) {
    console.error(`Error processing movie ${movieSlug}:`, error);
    return { status: 'failed' };
  }
}

/**
 * Process a single page of movies
 */
async function processPage(page: number): Promise<{ saved: number, existing: number, failed: number }> {
  console.log(`\n=== Processing page ${page} ===`);
  let savedCount = 0;
  let existingCount = 0;
  let failedCount = 0;
  
  try {
    // Fetch the page data
    console.log(`Fetching movie list for page ${page}`);
    const movieListData = await fetchWithRetry(() => fetchMovieList(page, PAGE_LIMIT));
    
    if (!movieListData || !movieListData.items || movieListData.items.length === 0) {
      console.log(`No movies found on page ${page}`);
      return { saved: 0, existing: 0, failed: 0 };
    }
    
    console.log(`Found ${movieListData.items.length} movies on page ${page}`);
    
    // Process each movie
    for (const movie of movieListData.items) {
      if (!movie || !movie.slug) {
        console.warn(`Invalid movie data found, skipping`);
        failedCount++;
        continue;
      }
      
      console.log(`Processing movie: ${movie.slug}`);
      const result = await processMovie(movie.slug);
      
      if (result.status === 'saved') {
        savedCount++;
      } else if (result.status === 'existing') {
        existingCount++;
      } else {
        failedCount++;
      }
      
      // Add delay between movies
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
    
    return { saved: savedCount, existing: existingCount, failed: failedCount };
  } catch (pageError) {
    console.error(`Error processing page ${page}:`, pageError);
    return { saved: savedCount, existing: existingCount, failed: failedCount };
  }
}

/**
 * Main import function
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
    
    // Process current page
    const result = await processPage(page);
    
    // Update totals
    totalSaved += result.saved;
    totalExisting += result.existing;
    totalFailed += result.failed;
    
    // Save progress after each page
    saveProgress(page);
    console.log(`Page ${page} completed: Saved ${result.saved} new movies, ${result.existing} already existed, ${result.failed} failed`);
    
    // Add delay between pages
    if (page < endPage) {
      console.log(`Waiting ${DELAY_BETWEEN_PAGES/1000} seconds before next page...`);
      await sleep(DELAY_BETWEEN_PAGES);
    }
  }
  
  console.log(`\n=== Import Summary ===`);
  console.log(`Processed pages ${startPage} to ${endPage} (${endPage - startPage + 1} pages total)`);
  console.log(`Total results:`);
  console.log(` - New movies saved: ${totalSaved}`);
  console.log(` - Already existing: ${totalExisting}`);
  console.log(` - Failed to import: ${totalFailed}`);
  console.timeEnd('TotalImportTime');
  
  return { totalSaved, totalExisting, totalFailed };
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
      console.log('  npx tsx import.ts [startPage] [endPage]');
      console.log('  npx tsx import.ts --resume');
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