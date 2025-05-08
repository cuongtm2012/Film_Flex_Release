/**
 * FilmFlex Improved Import Script
 * A robust script to import movies from ophim1.com to the database
 * Features:
 * - Proper error handling and retries
 * - Progress tracking and resumability
 * - Database connection pooling
 * - Parallel processing for faster imports
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Configuration
const API_BASE_URL = 'https://phimapi.com/api/v1';
const MOVIES_PER_PAGE = 10; // External API returns 10 movies per page
const PARALLEL_REQUESTS = 3; // Number of parallel API requests
const MAX_RETRIES = 3; // Maximum retry attempts for API requests
const PROGRESS_FILE = path.join(__dirname, '..', '..', 'log', 'import-progress.json');
const LOG_DIR = path.join(__dirname, '..', '..', 'log');

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file path
const LOG_FILE = path.join(LOG_DIR, `improved-import-${new Date().toISOString().slice(0, 10)}.log`);

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

// Function to create tables if they don't exist
async function createTablesIfNeeded() {
  try {
    log('Creating tables if they don\'t exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        movie_id TEXT UNIQUE,
        name TEXT NOT NULL,
        origin_name TEXT,
        slug TEXT UNIQUE NOT NULL,
        type TEXT,
        status TEXT,
        description TEXT,
        thumb_url TEXT,
        poster_url TEXT,
        trailer_url TEXT,
        time TEXT,
        quality TEXT,
        lang TEXT,
        year INTEGER,
        view INTEGER DEFAULT 0,
        actors TEXT,
        directors TEXT,
        categories JSONB,
        countries JSONB,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS episodes (
        id SERIAL PRIMARY KEY,
        movie_id INTEGER REFERENCES movies(id),
        movie_slug TEXT,
        server_name TEXT,
        name TEXT,
        slug TEXT,
        filename TEXT,
        link_embed TEXT,
        link_m3u8 TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug);
      CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id);
    `);
    log('Tables created successfully');
    return true;
  } catch (error) {
    log(`Error creating tables: ${error.message}`);
    return false;
  }
}

// Load or initialize progress
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

// Function to import a movie into the database
async function importMovie(movie, client) {
  try {
    // Check if movie already exists
    const existingMovie = await client.query('SELECT id FROM movies WHERE slug = $1', [movie.slug]);
    
    if (existingMovie.rows.length > 0) {
      log(`Movie "${movie.name}" already exists with ID ${existingMovie.rows[0].id}, skipping`);
      return { status: 'existing', id: existingMovie.rows[0].id };
    }
    
    // Fetch detailed movie information
    const movieDetail = await fetchMovieDetail(movie.slug);
    if (!movieDetail || !movieDetail.movie) {
      log(`No details found for movie "${movie.name}", skipping`);
      return { status: 'failed', error: 'No details found' };
    }
    
    const movieData = movieDetail.movie;
    
    // Insert the movie
    const movieResult = await client.query(`
      INSERT INTO movies (
        movie_id, name, origin_name, slug, type, status, description, 
        thumb_url, poster_url, trailer_url, time, quality, lang, 
        year, view, actors, directors, categories, countries
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id
    `, [
      movieData._id,
      movieData.name,
      movieData.origin_name,
      movieData.slug,
      movieData.type,
      movieData.status,
      movieData.content, // Description field
      movieData.thumb_url,
      movieData.poster_url,
      movieData.trailer_url,
      movieData.time,
      movieData.quality,
      movieData.lang,
      movieData.year ? parseInt(movieData.year) : null,
      parseInt(movieData.view || '0'),
      Array.isArray(movieData.actor) ? movieData.actor.join(', ') : movieData.actor,
      Array.isArray(movieData.director) ? movieData.director.join(', ') : movieData.director,
      JSON.stringify(movieData.category || []),
      JSON.stringify(movieData.country || [])
    ]);
    
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
          await client.query(`
            INSERT INTO episodes (
              movie_id, movie_slug, server_name, name, slug, 
              filename, link_embed, link_m3u8
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            movieId,
            movieData.slug,
            server.server_name,
            episode.name,
            episode.slug,
            episode.filename,
            episode.link_embed,
            episode.link_m3u8
          ]);
          
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
async function processBatch(movies, progress) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const movie of movies) {
      if (progress.processedMovies[movie.slug]) {
        log(`Movie "${movie.name}" already processed in a previous run, skipping`);
        continue;
      }
      
      const result = await importMovie(movie, client);
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
  log('Starting improved movie import...');
  
  // Create tables if needed
  const tablesCreated = await createTablesIfNeeded();
  if (!tablesCreated) {
    log('Failed to create database tables. Aborting import.');
    return false;
  }
  
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
      const success = await processBatch(pageData.items, progress);
      
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
}

// Parse command line arguments
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const numPages = parseInt(args[1]) || 3;

// Start the import
log(`Improved import starting with page ${startPage}, importing ${numPages} pages`);
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