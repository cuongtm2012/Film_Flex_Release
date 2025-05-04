/**
 * New Import Tool for FilmFlex - Uses tsx directly
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

// Main import function
export async function runImport(startPage: number = 1, endPage: number = 5) {
  console.time('ImportTime');
  
  console.log("\n======================================");
  console.log("==== FilmFlex Movie Import Tool =====");
  console.log("======================================\n");
  
  // Validate input
  startPage = Math.max(1, startPage);
  endPage = Math.min(TOTAL_PAGES, endPage);
  
  console.log(`Starting import from page ${startPage} to ${endPage}`);
  
  let totalSaved = 0;
  
  for (let page = startPage; page <= endPage; page++) {
    console.log(`\n=== Processing page ${page} ===`);
    let savedCount = 0;
    
    try {
      // Fetch the page data
      console.log(`Fetching movie list for page ${page}`);
      const movieListData = await fetchMovieList(page, PAGE_LIMIT);
      
      if (!movieListData || !movieListData.items || movieListData.items.length === 0) {
        console.log(`No movies found on page ${page}`);
        continue;
      }
      
      console.log(`Found ${movieListData.items.length} movies on page ${page}`);
      
      // Process each movie
      for (const movie of movieListData.items) {
        if (!movie || !movie.slug) {
          console.warn(`Invalid movie data found`);
          continue;
        }
        
        try {
          console.log(`Processing movie: ${movie.slug}`);
          
          // Check if movie already exists
          const existingMovie = await storage.getMovieBySlug(movie.slug);
          if (existingMovie) {
            console.log(`Movie already exists: ${movie.slug}`);
            continue;
          }
          
          // Get movie details
          const movieDetail = await fetchMovieDetail(movie.slug);
          
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
        }
        
        // Add delay between movies
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
      
      // Save progress after each page
      totalSaved += savedCount;
      saveProgress(page);
      console.log(`Page ${page} completed: Saved ${savedCount} new movies`);
      
      // Add a bit more delay between pages
      if (page < endPage) {
        console.log(`Waiting 3 seconds before next page...`);
        await sleep(3000);
      }
    } catch (pageError) {
      console.error(`Error processing page ${page}:`, pageError);
    }
  }
  
  console.log(`\n=== Import Completed ===`);
  console.log(`Processed pages ${startPage} to ${endPage}`);
  console.log(`Total new movies saved: ${totalSaved}`);
  console.timeEnd('ImportTime');
}

// Handle command line args
async function main() {
  try {
    // Get parameters
    const args = process.argv.slice(2);
    let startPage = 1;
    let endPage = 5;
    
    // Show help?
    if (args.includes('--help') || args.includes('-h')) {
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