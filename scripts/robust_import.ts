/**
 * Robust Import Tool for FilmFlex
 * This script provides a more robust way to import movies with better error handling
 */
import { fetchMovieList, fetchMovieDetail, convertToMovieModel, convertToEpisodeModels } from '../server/api';
import { storage } from '../server/storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_PAGES = 2252;
const BATCH_SIZE = 1; // Process 1 page at a time
const PAGE_LIMIT = 20; // Movies per page
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches
const MAX_RETRIES = 3; // Maximum number of retries for failed requests
const RETRY_DELAY = 3000; // 3 seconds delay before retrying
const PROGRESS_FILE = path.join(__dirname, 'import_progress.json');

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Save the import progress to continue later
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

// Load the import progress
function loadProgress(): { lastCompletedPage: number } {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
  }
  return { lastCompletedPage: 0 };
}

// Process a single movie
async function processMovie(movieSlug: string): Promise<boolean> {
  try {
    console.log(`Processing movie: ${movieSlug}`);
    
    // Fetch movie details with retries
    let attempt = 0;
    let movieDetailData = null;
    
    while (attempt < MAX_RETRIES) {
      try {
        movieDetailData = await fetchMovieDetail(movieSlug);
        break; // Success, exit the retry loop
      } catch (error) {
        attempt++;
        console.error(`Attempt ${attempt}/${MAX_RETRIES} failed for ${movieSlug}:`, error);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
          await sleep(RETRY_DELAY);
        }
      }
    }
    
    if (!movieDetailData || !movieDetailData.status || !movieDetailData.movie) {
      console.error(`Failed to fetch valid details for ${movieSlug} after ${MAX_RETRIES} attempts`);
      return false;
    }
    
    // Convert to our model format
    const movieModel = convertToMovieModel(movieDetailData);
    const episodeModels = convertToEpisodeModels(movieDetailData);
    
    // Check if movie already exists
    const existingMovie = await storage.getMovieByMovieId(movieModel.movieId);
    
    if (existingMovie) {
      console.log(`Movie already exists: ${movieModel.name} (${movieModel.movieId})`);
      return false;
    }
    
    // Save the movie
    try {
      await storage.saveMovie(movieModel);
      console.log(`Saved movie: ${movieModel.name} (${movieModel.movieId})`);
      
      // Save each episode
      let episodeCount = 0;
      let skippedEpisodes = 0;
      
      for (const episode of episodeModels) {
        // Check if episode already exists
        const existingEpisode = await storage.getEpisodeBySlug(episode.slug);
        
        if (existingEpisode) {
          console.log(`Episode already exists: ${episode.slug}`);
          skippedEpisodes++;
          continue;
        }
        
        try {
          await storage.saveEpisode(episode);
          episodeCount++;
        } catch (error) {
          console.error(`Error saving episode ${episode.slug}:`, error);
          skippedEpisodes++;
        }
        
        // Small delay between saving episodes to reduce database load
        await sleep(300);
      }
      
      console.log(`Saved ${episodeCount} episodes for ${movieModel.name} (Skipped ${skippedEpisodes})`);
      return true;
    } catch (error) {
      console.error(`Error saving movie ${movieModel.name}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error processing movie ${movieSlug}:`, error);
    return false;
  }
}

// Process a single page
async function processPage(page: number): Promise<number> {
  console.log(`\n=== Processing page ${page} ===`);
  let savedCount = 0;
  
  try {
    // Fetch the movie list for this page
    console.log(`Fetching movie list for page ${page}`);
    const movieListData = await fetchMovieList(page, PAGE_LIMIT);
    
    if (!movieListData.status || !movieListData.items || movieListData.items.length === 0) {
      console.error(`Failed to fetch movies for page ${page} or no movies found`);
      return 0;
    }
    
    console.log(`Found ${movieListData.items.length} movies on page ${page}`);
    
    // Process each movie
    for (let i = 0; i < movieListData.items.length; i++) {
      const movie = movieListData.items[i];
      
      if (!movie || !movie.slug) {
        console.warn(`Invalid movie data at index ${i} on page ${page}`);
        continue;
      }
      
      const success = await processMovie(movie.slug);
      if (success) savedCount++;
      
      // Add delay between movie processing to avoid overloading the API
      if (i < movieListData.items.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    console.log(`Page ${page} completed: Saved ${savedCount} new movies`);
    return savedCount;
  } catch (error) {
    console.error(`Error processing page ${page}:`, error);
    return 0;
  }
}

// Main import function
async function runImport(startPage: number = 1, endPage: number = 50) {
  console.time('ImportTime');
  
  // Validate input
  startPage = Math.max(1, startPage);
  endPage = Math.min(TOTAL_PAGES, endPage);
  
  if (startPage > endPage) {
    console.error('Start page cannot be greater than end page');
    return;
  }
  
  console.log('\n=== FilmFlex Movie Import ===');
  console.log(`Importing movies from page ${startPage} to ${endPage}`);
  console.log(`Batch size: ${BATCH_SIZE} page(s)`);
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log('==============================\n');
  
  let totalSaved = 0;
  let currentPage = startPage;
  
  while (currentPage <= endPage) {
    const batchEnd = Math.min(currentPage + BATCH_SIZE - 1, endPage);
    console.log(`\n>>> Processing batch: Pages ${currentPage} to ${batchEnd} <<<`);
    
    // Process pages in this batch
    for (let page = currentPage; page <= batchEnd; page++) {
      const savedCount = await processPage(page);
      totalSaved += savedCount;
      
      // Save progress after each page
      saveProgress(page);
      
      // Add delay between pages
      if (page < batchEnd) {
        console.log(`Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds before next page...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    // Move to next batch
    currentPage = batchEnd + 1;
    
    // Add delay between batches
    if (currentPage <= endPage) {
      console.log(`\nBatch completed. Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log('\n=== Import Completed ===');
  console.log(`Processed pages ${startPage} to ${endPage}`);
  console.log(`Total new movies saved: ${totalSaved}`);
  console.timeEnd('ImportTime');
}

// Command line interface
async function main() {
  // Process command line arguments
  const args = process.argv.slice(2);
  let startPage = 1;
  let endPage = 50; // Default to 50 pages
  
  if (args.length >= 1 && /^\d+$/.test(args[0])) {
    startPage = parseInt(args[0]);
  }
  
  if (args.length >= 2 && /^\d+$/.test(args[1])) {
    endPage = parseInt(args[1]);
  }
  
  // Check for resume flag
  if (args.includes('--resume') || args.includes('-r')) {
    const progress = loadProgress();
    if (progress.lastCompletedPage > 0) {
      console.log(`Found saved progress. Last completed page: ${progress.lastCompletedPage}`);
      startPage = progress.lastCompletedPage + 1;
    }
  }
  
  // Run the import
  await runImport(startPage, endPage);
}

// Run the script
main().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});