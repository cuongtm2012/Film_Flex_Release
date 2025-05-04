/**
 * Fixed Import Tool - A simplified ESM-compatible script to import FilmFlex movies
 */
import { fetchMovieList, fetchMovieDetail, convertToMovieModel, convertToEpisodeModels } from '../server/api.js';
import { storage } from '../server/storage.js';

// Note: We may need to adjust the imports based on the project configuration
try {
  // Verify imports worked
  console.log("Imports successful");
} catch (err) {
  console.error("Import error:", err);
  // Try alternative imports if needed
  try {
    const apiModule = await import('../server/api.js');
    const storageModule = await import('../server/storage.js');
    
    fetchMovieList = apiModule.fetchMovieList;
    fetchMovieDetail = apiModule.fetchMovieDetail;
    convertToMovieModel = apiModule.convertToMovieModel;
    convertToEpisodeModels = apiModule.convertToEpisodeModels;
    storage = storageModule.storage;
    
    console.log("Alternative imports successful");
  } catch (altErr) {
    console.error("Alternative import error:", altErr);
    process.exit(1);
  }
}
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_PAGES = 2252;
const PAGE_LIMIT = 20; // Movies per page
const DELAY_BETWEEN_REQUESTS = 1000; // ms delay between requests
const PROGRESS_FILE = path.join(__dirname, 'import_progress.json');

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Save progress to a file
function saveProgress(page) {
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

// Load progress from file
function loadProgress() {
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

// Import a single page
async function importPage(page) {
  console.log(`\n=== Importing Page ${page} ===`);
  let newMoviesCount = 0;
  
  try {
    // Fetch movies for this page
    console.log(`Fetching movie list for page ${page}`);
    const movieData = await fetchMovieList(page, PAGE_LIMIT);
    
    if (!movieData.items || movieData.items.length === 0) {
      console.log(`No movies found on page ${page}`);
      return 0;
    }
    
    console.log(`Found ${movieData.items.length} movies on page ${page}`);
    
    // Process each movie
    for (let i = 0; i < movieData.items.length; i++) {
      const movie = movieData.items[i];
      if (!movie || !movie.slug) {
        console.warn(`Invalid movie data found at index ${i}`);
        continue;
      }
      
      try {
        console.log(`Processing movie: ${movie.slug} (${i+1}/${movieData.items.length})`);
        
        // Check if movie already exists
        const existingMovie = await storage.getMovieBySlug(movie.slug);
        if (existingMovie) {
          console.log(`Movie already exists: ${movie.slug}`);
          continue;
        }
        
        // Fetch details
        const movieDetail = await fetchMovieDetail(movie.slug);
        
        if (!movieDetail || !movieDetail.movie) {
          console.warn(`Failed to fetch details for ${movie.slug}`);
          continue;
        }
        
        // Convert to model
        const movieModel = convertToMovieModel(movieDetail);
        const episodeModels = convertToEpisodeModels(movieDetail);
        
        // Save movie
        await storage.saveMovie(movieModel);
        console.log(`Saved movie: ${movieModel.name}`);
        newMoviesCount++;
        
        // Save episodes
        let episodesSaved = 0;
        for (const episode of episodeModels) {
          try {
            const existingEpisode = await storage.getEpisodeBySlug(episode.slug);
            if (!existingEpisode) {
              await storage.saveEpisode(episode);
              episodesSaved++;
            }
          } catch (epError) {
            console.error(`Error saving episode ${episode.slug}:`, epError.message);
          }
        }
        
        console.log(`Saved ${episodesSaved} episodes for ${movieModel.name}`);
      } catch (movieError) {
        console.error(`Error processing movie ${movie.slug}:`, movieError.message);
      }
      
      // Add delay between movies
      if (i < movieData.items.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    console.log(`Page ${page} completed: Saved ${newMoviesCount} new movies`);
    return newMoviesCount;
  } catch (error) {
    console.error(`Error importing page ${page}:`, error.message);
    return 0;
  }
}

// Main import function
async function runImport(startPage, endPage) {
  // Validate input
  startPage = Math.max(1, parseInt(startPage) || 1);
  endPage = Math.min(TOTAL_PAGES, parseInt(endPage) || 10); // Default limit to 10 pages
  
  console.log('\n=== FilmFlex Easy Import ===');
  console.log(`Importing pages ${startPage} to ${endPage}`);
  console.log(`Movies per page: ${PAGE_LIMIT}`);
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
  console.log('============================\n');
  
  let totalMovies = 0;
  
  for (let page = startPage; page <= endPage; page++) {
    const newMovies = await importPage(page);
    totalMovies += newMovies;
    
    // Save progress after each page
    saveProgress(page);
    
    // Add delay between pages
    if (page < endPage) {
      const delaySeconds = 3;
      console.log(`Waiting ${delaySeconds} seconds before next page...`);
      await sleep(delaySeconds * 1000);
    }
  }
  
  console.log('\n=== Import Completed ===');
  console.log(`Processed pages ${startPage} to ${endPage}`);
  console.log(`Total new movies saved: ${totalMovies}`);
}

// Handle command line args
async function main() {
  const args = process.argv.slice(2);
  
  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  npx tsx fixed_import.js [startPage] [endPage]');
    console.log('  npx tsx fixed_import.js --resume');
    console.log('\nOptions:');
    console.log('  --resume, -r    Resume from last completed page');
    console.log('  --help, -h      Show this help message');
    return;
  }
  
  let startPage = 1;
  let endPage = 5; // Import just 5 pages by default
  
  // Check for resume flag
  if (args.includes('--resume') || args.includes('-r')) {
    const progress = loadProgress();
    if (progress.lastCompletedPage > 0) {
      startPage = progress.lastCompletedPage + 1;
      console.log(`Resuming from page ${startPage} (after last completed page ${progress.lastCompletedPage})`);
    }
  } else {
    // Parse page arguments
    if (args.length >= 1 && !isNaN(args[0])) {
      startPage = parseInt(args[0]);
    }
    
    if (args.length >= 2 && !isNaN(args[1])) {
      endPage = parseInt(args[1]);
    }
  }
  
  await runImport(startPage, endPage);
}

// Start the script
main().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});