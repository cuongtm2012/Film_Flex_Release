import { fetchMovieList, fetchMovieDetail, convertToMovieModel, convertToEpisodeModels } from '../server/api';
import { db } from '../server/db';
import { storage } from '../server/storage';
import { movies, episodes } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const TOTAL_PAGES = 2252;
const BATCH_SIZE = 1; // Number of pages to process in a batch (reduced to minimize issues)
const PAGE_LIMIT = 20; // Movies per page
const DELAY_BETWEEN_REQUESTS = 1000; // ms delay between movie detail requests (increased)
const DELAY_BETWEEN_BATCHES = 5000; // ms delay between batches
const MAX_RETRIES = 3; // Maximum number of retries for failed requests
const RETRY_DELAY = 3000; // ms delay before retrying a failed request
const PROGRESS_FILE = 'import_progress.json'; // File to track import progress

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Save movie and its episodes
async function saveMovieWithEpisodes(movieSlug: string) {
  try {
    console.log(`Fetching details for movie: ${movieSlug}`);
    
    // Fetch movie details
    const movieDetailData = await fetchMovieDetail(movieSlug);
    
    if (movieDetailData.status && movieDetailData.movie) {
      const movieModel = convertToMovieModel(movieDetailData);
      const episodeModels = convertToEpisodeModels(movieDetailData);
      
      // Check if movie already exists before saving
      const existingMovie = await storage.getMovieByMovieId(movieModel.movieId);
      
      if (!existingMovie) {
        console.log(`Saving new movie: ${movieModel.name} (${movieModel.movieId})`);
        await storage.saveMovie(movieModel);
        
        let episodeCount = 0;
        // Save episodes
        for (const episode of episodeModels) {
          await storage.saveEpisode(episode);
          episodeCount++;
        }
        console.log(`Saved ${episodeCount} episodes for ${movieModel.name}`);
        return true;
      } else {
        console.log(`Movie already exists: ${movieModel.name} (${movieModel.movieId})`);
        return false;
      }
    } else {
      console.error(`Failed to fetch details for ${movieSlug}`);
      return false;
    }
  } catch (error) {
    console.error(`Error saving movie ${movieSlug}:`, error);
    return false;
  }
}

// Fetch with retry mechanism
async function fetchWithRetry<T>(fetchFn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      console.error(`Fetch failed (attempt ${i + 1}/${retries}):`, error);
      lastError = error;
      
      if (i < retries - 1) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  throw lastError;
}

// Load progress from file
function loadProgress(): { lastCompletedPage: number } {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load progress file:', error);
  }
  
  return { lastCompletedPage: 0 };
}

// Save progress to file
function saveProgress(lastCompletedPage: number): void {
  try {
    fs.writeFileSync(
      PROGRESS_FILE,
      JSON.stringify({ lastCompletedPage, timestamp: new Date().toISOString() }),
      'utf8'
    );
    console.log(`Progress saved: completed up to page ${lastCompletedPage}`);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

// Process a single page
async function processPage(page: number) {
  try {
    console.log(`Processing page ${page}/${TOTAL_PAGES}`);
    
    // Use retry mechanism for fetching movie list
    const movieListResponse = await fetchWithRetry(() => fetchMovieList(page));
    
    if (movieListResponse.status && movieListResponse.items) {
      const movieList = movieListResponse.items;
      console.log(`Found ${movieList.length} movies on page ${page}`);
      
      let savedCount = 0;
      
      for (let i = 0; i < movieList.length; i++) {
        const movie = movieList[i];
        console.log(`Processing movie ${i + 1}/${movieList.length} on page ${page}: ${movie.slug}`);
        
        // Use try-catch for each movie to ensure one failure doesn't stop the entire page
        try {
          // Using retry mechanism for saving movies
          const saved = await fetchWithRetry(() => saveMovieWithEpisodes(movie.slug));
          if (saved) savedCount++;
        } catch (movieError) {
          console.error(`Failed to process movie ${movie.slug} after ${MAX_RETRIES} attempts:`, movieError);
        }
        
        // Add delay between movie detail requests
        if (i < movieList.length - 1) {
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }
      
      console.log(`Page ${page} completed. Saved ${savedCount} new movies.`);
      
      // Save progress after each page
      saveProgress(page);
      
      return savedCount;
    } else {
      console.error(`Failed to fetch movie list for page ${page}`);
      return 0;
    }
  } catch (error) {
    console.error(`Error processing page ${page}:`, error);
    return 0;
  }
}

// Process pages in batches
async function processBatches(startPage: number, endPage: number) {
  console.log(`Starting import process from page ${startPage} to ${endPage}`);
  let totalSaved = 0;
  
  for (let i = startPage; i <= endPage; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, endPage);
    console.log(`\n=== Processing batch: pages ${i} to ${batchEnd} ===`);
    
    // Process pages sequentially within a batch for better stability
    for (let page = i; page <= batchEnd; page++) {
      const savedCount = await processPage(page);
      totalSaved += savedCount;
      
      console.log(`=== Page ${page} completed. Total saved so far: ${totalSaved} movies ===`);
    }
    
    // Add delay between batches
    if (batchEnd < endPage) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log(`\n=== Import process completed ===`);
  console.log(`Total pages processed: ${endPage - startPage + 1}`);
  console.log(`Total new movies saved: ${totalSaved}`);
  return totalSaved;
}

// Main function to run the import with configurable range and resume capability
async function runImport(startPage: number = 1, endPage: number = TOTAL_PAGES, autoResume: boolean = true) {
  console.time('ImportTime');
  let actualStartPage = startPage;
  
  // Check if we should auto-resume from last saved point
  if (autoResume) {
    const progress = loadProgress();
    if (progress.lastCompletedPage > 0 && progress.lastCompletedPage < endPage) {
      const resumePage = progress.lastCompletedPage + 1;
      console.log(`Found saved progress. Last completed page: ${progress.lastCompletedPage}`);
      
      if (resumePage > startPage) {
        console.log(`Auto-resuming from page ${resumePage} instead of ${startPage}`);
        actualStartPage = resumePage;
      }
    }
  }
  
  // Validate input
  actualStartPage = Math.max(1, actualStartPage);
  endPage = Math.min(TOTAL_PAGES, endPage);
  
  if (actualStartPage > endPage) {
    console.error('Start page cannot be greater than end page');
    return;
  }
  
  // Print import summary before starting
  console.log('\n=== Import Summary ===');
  console.log(`Total pages to process: ${endPage - actualStartPage + 1} of ${TOTAL_PAGES}`);
  console.log(`Starting page: ${actualStartPage}`);
  console.log(`Ending page: ${endPage}`);
  console.log(`Batch size: ${BATCH_SIZE} page(s) at a time`);
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`Maximum retries: ${MAX_RETRIES}`);
  console.log('=====================\n');
  
  try {
    await processBatches(actualStartPage, endPage);
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Import failed with error:', error);
    console.log('\nYou can resume the import by running:');
    const lastProgress = loadProgress();
    const nextPage = lastProgress.lastCompletedPage + 1;
    console.log(`npx tsx import_movies.ts ${nextPage} ${endPage}`);
  } finally {
    console.timeEnd('ImportTime');
  }
}

// Process command line arguments
const args = process.argv.slice(2);
const startPage = args[0] ? parseInt(args[0]) : 1;
const endPage = args[1] ? parseInt(args[1]) : TOTAL_PAGES;
const autoResume = args[2] !== 'noresume'; // Third argument can disable auto-resume

// Run the import
runImport(startPage, endPage)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });