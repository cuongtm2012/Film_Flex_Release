/**
 * FilmFlex Adaptive Import Script
 * This script adapts to the actual database schema for importing movies
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { checkAndFixSchema } = require('./check-and-fix-schema');

// Load environment variables from .env file
dotenv.config();

// Configuration
const API_BASE_URL = 'https://phimapi.com/api/v1';
const MOVIES_PER_PAGE = 10; // External API returns 10 movies per page
const PARALLEL_REQUESTS = 3; // Number of parallel API requests
const MAX_RETRIES = 3; // Maximum retry attempts for API requests
const PROGRESS_FILE = path.join(__dirname, '..', '..', 'log', 'adaptive-import-progress.json');
const LOG_DIR = path.join(__dirname, '..', '..', 'log');

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file path
const LOG_FILE = path.join(LOG_DIR, `adaptive-import-${new Date().toISOString().slice(0, 10)}.log`);

// Logging function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
};

// Configure database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

// Function to load or initialize progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    log(`Error loading progress: ${error.message}`);
  }
  
  return {
    lastProcessedPage: 0,
    processedMovies: {},
    stats: {
      saved: 0,
      existing: 0,
      failed: 0,
      lastRun: null
    }
  };
}

// Save progress
function saveProgress(progress) {
  try {
    progress.stats.lastRun = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    log(`Error saving progress: ${error.message}`);
  }
}

// Function to fetch a page of movies from API with retries
async function fetchMoviePage(page) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      log(`Fetching movies page ${page}... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      const response = await axios.get(`${API_BASE_URL}/list/movie`, {
        params: {
          page,
          sort: 'modified'
        }
      });
      
      if (!response.data || !response.data.items) {
        log(`Failed to fetch page ${page}: Invalid response`);
        retries++;
        continue;
      }
      
      log(`Successfully fetched ${response.data.items.length} movies from page ${page}`);
      return response.data;
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        log(`Error fetching movie page ${page} after ${MAX_RETRIES} attempts: ${error.message}`);
        return { items: [] };
      }
      log(`Error fetching movie page ${page} (Attempt ${retries}/${MAX_RETRIES}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
    }
  }
}

// Function to fetch movie details from API with retries
async function fetchMovieDetail(slug) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      log(`Fetching details for movie "${slug}"... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      const response = await axios.get(`${API_BASE_URL}/phim/${slug}`);
      
      if (!response.data || !response.data.movie) {
        log(`Failed to fetch details for movie "${slug}": Invalid response`);
        retries++;
        continue;
      }
      
      log(`Successfully fetched details for movie "${slug}"`);
      return response.data;
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        log(`Error fetching details for movie "${slug}" after ${MAX_RETRIES} attempts: ${error.message}`);
        return null;
      }
      log(`Error fetching details for movie "${slug}" (Attempt ${retries}/${MAX_RETRIES}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
    }
  }
}

// Function to check if a movie exists in the database
async function movieExists(slug, client) {
  try {
    const result = await client.query('SELECT id FROM movies WHERE slug = $1', [slug]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    log(`Error checking if movie exists: ${error.message}`);
    return null;
  }
}

// Map API data to database columns
function mapMovieData(movieData, columns) {
  const mappedData = {};
  
  // Map for common column name translations
  const columnMappings = {
    'title': 'name',
    'content': 'description',
    'poster': 'poster_url',
    'actor': 'actors',
    'director': 'directors',
    'category': 'categories',
    'country': 'countries'
  };
  
  // Process each column that exists in the database
  columns.forEach(column => {
    // Check for direct matches
    if (movieData[column]) {
      mappedData[column] = movieData[column];
    } 
    // Check for mapped column names
    else if (columnMappings[column] && movieData[columnMappings[column]]) {
      mappedData[column] = movieData[columnMappings[column]];
    }
    // Handle special cases
    else {
      switch (column) {
        case 'movie_id':
          mappedData[column] = movieData._id || null;
          break;
        case 'description':
          mappedData[column] = movieData.content || '';
          break;
        case 'actors':
          mappedData[column] = Array.isArray(movieData.actor) 
            ? movieData.actor.join(', ') 
            : (movieData.actor || '');
          break;
        case 'directors':
          mappedData[column] = Array.isArray(movieData.director) 
            ? movieData.director.join(', ') 
            : (movieData.director || '');
          break;
        case 'categories':
          mappedData[column] = JSON.stringify(movieData.category || []);
          break;
        case 'countries':
          mappedData[column] = JSON.stringify(movieData.country || []);
          break;
        case 'year':
          mappedData[column] = movieData.year ? parseInt(movieData.year) : null;
          break;
        case 'view':
          mappedData[column] = parseInt(movieData.view || '0');
          break;
        default:
          mappedData[column] = null;
      }
    }
  });
  
  return mappedData;
}

// Function to import a movie into the database
async function importMovie(movie, schemaInfo, client) {
  try {
    // Check if movie already exists
    const existingId = await movieExists(movie.slug, client);
    
    if (existingId) {
      log(`Movie "${movie.name}" already exists with ID ${existingId}, skipping`);
      return { status: 'existing', id: existingId };
    }
    
    // Fetch detailed movie information
    const movieDetail = await fetchMovieDetail(movie.slug);
    if (!movieDetail || !movieDetail.movie) {
      log(`No details found for movie "${movie.name}", skipping`);
      return { status: 'failed', error: 'No details found' };
    }
    
    const movieData = movieDetail.movie;
    
    // Map movie data to database columns
    const mappedData = mapMovieData(movieData, schemaInfo.movies.columns);
    
    // Create array of values in the correct order
    const values = schemaInfo.movies.columns.map(column => mappedData[column]);
    
    // Insert the movie
    const movieResult = await client.query(schemaInfo.movies.sql, values);
    
    const movieId = movieResult.rows[0].id;
    log(`Saved movie "${movieData.name}" with ID ${movieId}`);
    
    // Handle episodes if available
    if (movieDetail.episodes && Array.isArray(movieDetail.episodes)) {
      let episodeCount = 0;
      
      for (const server of movieDetail.episodes) {
        if (!server.server_data || !Array.isArray(server.server_data)) {
          continue;
        }
        
        for (const episode of server.server_data) {
          // Map episode data
          const episodeData = {
            movie_id: movieId,
            movie_slug: movieData.slug,
            server_name: server.server_name,
            name: episode.name,
            slug: episode.slug,
            filename: episode.filename,
            link_embed: episode.link_embed,
            link_m3u8: episode.link_m3u8
          };
          
          // Filter to only include columns that exist in the database
          const mappedEpisodeData = {};
          schemaInfo.episodes.columns.forEach(column => {
            mappedEpisodeData[column] = episodeData[column] !== undefined ? episodeData[column] : null;
          });
          
          // Create array of values in the correct order
          const episodeValues = schemaInfo.episodes.columns.map(column => mappedEpisodeData[column]);
          
          // Insert the episode
          await client.query(schemaInfo.episodes.sql, episodeValues);
          episodeCount++;
        }
      }
      
      log(`Saved ${episodeCount} episodes for movie "${movieData.name}"`);
    }
    
    return { status: 'saved', id: movieId };
  } catch (error) {
    log(`Error importing movie "${movie.name}": ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

// Process a batch of movies in parallel
async function processBatch(movies, schemaInfo, progress) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const movie of movies) {
      if (progress.processedMovies[movie.slug]) {
        log(`Movie "${movie.name}" already processed in a previous run, skipping`);
        continue;
      }
      
      const result = await importMovie(movie, schemaInfo, client);
      progress.processedMovies[movie.slug] = result.status;
      
      if (result.status === 'saved') {
        progress.stats.saved++;
      } else if (result.status === 'existing') {
        progress.stats.existing++;
      } else {
        progress.stats.failed++;
      }
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    log(`Error processing batch: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

// Main import function
async function importMovies(startPage = 1, numPages = 1) {
  log('Starting adaptive movie import...');
  
  try {
    // Check and fix schema
    log('Checking and fixing database schema...');
    const schemaInfo = await checkAndFixSchema();
    
    // Load progress from previous runs
    const progress = loadProgress();
    log(`Loaded progress from previous run. Last processed page: ${progress.lastProcessedPage}`);
    log(`Previous stats: ${progress.stats.saved} saved, ${progress.stats.existing} existing, ${progress.stats.failed} failed`);
    
    // Only restart from startPage if it's explicitly provided and greater than last processed page
    const actualStartPage = (startPage > progress.lastProcessedPage) ? startPage : (progress.lastProcessedPage + 1);
    
    log(`Starting import from page ${actualStartPage}, planning to import ${numPages} pages`);
    
    // Process pages
    for (let page = actualStartPage; page < actualStartPage + numPages; page++) {
      try {
        // Fetch page of movies
        const pageData = await fetchMoviePage(page);
        
        if (!pageData.items || pageData.items.length === 0) {
          log(`No items found on page ${page}, skipping`);
          continue;
        }
        
        // Process the page
        log(`Processing page ${page} with ${pageData.items.length} movies`);
        const success = await processBatch(pageData.items, schemaInfo, progress);
        
        if (success) {
          progress.lastProcessedPage = page;
          saveProgress(progress);
          log(`Completed page ${page}. Progress: ${progress.stats.saved} saved, ${progress.stats.existing} existing, ${progress.stats.failed} failed`);
        } else {
          log(`Failed to process page ${page}`);
        }
      } catch (error) {
        log(`Error processing page ${page}: ${error.message}`);
      }
    }
    
    log(`Import completed. Total: ${progress.stats.saved} saved, ${progress.stats.existing} existing, ${progress.stats.failed} failed`);
    saveProgress(progress);
    return true;
  } catch (error) {
    log(`Error during import: ${error.message}`);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const numPages = parseInt(args[1]) || 3;

// Start the import
log(`Adaptive import starting with page ${startPage}, importing ${numPages} pages`);
importMovies(startPage, numPages)
  .then(success => {
    if (success) {
      log('Import process finished successfully');
    } else {
      log('Import process completed with errors');
    }
    pool.end();
  })
  .catch(error => {
    log(`Import process failed: ${error.message}`);
    pool.end();
    process.exit(1);
  });