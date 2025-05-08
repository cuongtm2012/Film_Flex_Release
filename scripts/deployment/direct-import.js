/**
 * FilmFlex Direct Import Script
 * A simple Node.js script to import movies directly from the API to the database
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

// API configuration
const API_BASE_URL = 'https://phimapi.com/api/v1';

// Create log directory if it doesn't exist
const logDir = path.join(__dirname, '..', '..', 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file path
const logFile = path.join(logDir, `direct-import-${new Date().toISOString().slice(0, 10)}.log`);
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
};

// Function to create tables if they don't exist
async function createTablesIfNeeded() {
  try {
    log('Creating tables if they don\'t exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        poster TEXT,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS episodes (
        id SERIAL PRIMARY KEY,
        movie_id INTEGER REFERENCES movies(id),
        title TEXT,
        server_name TEXT,
        server_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug);
      CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id);
    `);
    log('Tables created successfully');
  } catch (error) {
    log(`Error creating tables: ${error.message}`);
    throw error;
  }
}

// Function to fetch a page of movies from API
async function fetchMoviePage(page = 1) {
  try {
    log(`Fetching movies page ${page}...`);
    const response = await axios.get(`${API_BASE_URL}/list/movie`, {
      params: {
        page,
        sort: 'modified'
      }
    });
    
    if (!response.data || !response.data.items) {
      log(`Failed to fetch page ${page}: Invalid response`);
      return [];
    }
    
    log(`Successfully fetched ${response.data.items.length} movies from page ${page}`);
    return response.data.items;
  } catch (error) {
    log(`Error fetching movie page ${page}: ${error.message}`);
    return [];
  }
}

// Function to import a movie into the database
async function importMovie(movie) {
  try {
    // Check if movie already exists
    const existingMovie = await pool.query('SELECT id FROM movies WHERE slug = $1', [movie.slug]);
    
    if (existingMovie.rows.length > 0) {
      log(`Movie "${movie.title}" already exists, skipping`);
      return { status: 'existing', id: existingMovie.rows[0].id };
    }
    
    // Insert the movie
    const result = await pool.query(
      'INSERT INTO movies (title, slug, description, poster, modified_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [movie.title, movie.slug, movie.description, movie.poster]
    );
    
    log(`Saved movie "${movie.title}" with ID ${result.rows[0].id}`);
    return { status: 'saved', id: result.rows[0].id };
  } catch (error) {
    log(`Error importing movie "${movie.title}": ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

// Main function to import movies
async function importMovies(startPage = 1, numPages = 1) {
  try {
    log('Starting direct movie import...');
    
    // Create tables if they don't exist
    await createTablesIfNeeded();
    
    // Import movies
    let saved = 0;
    let existing = 0;
    let failed = 0;
    
    for (let page = startPage; page < startPage + numPages; page++) {
      const movies = await fetchMoviePage(page);
      
      for (const movie of movies) {
        const result = await importMovie(movie);
        if (result.status === 'saved') saved++;
        else if (result.status === 'existing') existing++;
        else failed++;
      }
      
      log(`Page ${page} completed. Progress: ${saved} saved, ${existing} existing, ${failed} failed`);
    }
    
    log(`Import completed. Total: ${saved} saved, ${existing} existing, ${failed} failed`);
  } catch (error) {
    log(`Fatal error during import: ${error.message}`);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const startPage = parseInt(args[0]) || 1;
const numPages = parseInt(args[1]) || 3;

// Start the import
log(`Direct import starting with page ${startPage}, importing ${numPages} pages`);
importMovies(startPage, numPages)
  .then(() => {
    log('Import process finished');
    process.exit(0);
  })
  .catch(error => {
    log(`Import process failed: ${error.message}`);
    process.exit(1);
  });