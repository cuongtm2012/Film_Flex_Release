/**
 * FilmFlex Simple Import Script
 * This script uses built-in Node.js modules instead of external dependencies
 */

const http = require('http');
const https = require('https');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if available
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error('Error loading .env file:', err.message);
}

// Configuration
const API_BASE_URL = 'https://phimapi.com';
const API_ENDPOINT = '/danh-sach/phim-moi-cap-nhat';
const LOG_DIR = path.join(__dirname, '..', '..', 'log');

// Create log directory if it doesn't exist
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Error creating log directory:', err.message);
}

// Log file path
const LOG_FILE = path.join(LOG_DIR, `simple-import-${new Date().toISOString().slice(0, 10)}.log`);

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (err) {
    console.error('Error writing to log file:', err.message);
  }
}

// Configure database connection
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
};

// Initialize PG pool
const pool = new Pool(dbConfig);

// Function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`API responded with status: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString());
          resolve(result);
        } catch (error) {
          reject(new Error(`Error parsing JSON response: ${error.message}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    request.end();
  });
}

// Function to fetch a page of movies
async function fetchMoviePage(page) {
  try {
    log(`Fetching movies page ${page}...`);
    const url = `${API_BASE_URL}${API_ENDPOINT}?page=${page}`;
    const data = await makeRequest(url);
    
    if (!data || !data.items) {
      log(`Failed to fetch page ${page}: Invalid response`);
      return { items: [] };
    }
    
    log(`Successfully fetched ${data.items.length} movies from page ${page}`);
    return data;
  } catch (error) {
    log(`Error fetching movie page ${page}: ${error.message}`);
    return { items: [] };
  }
}

// Function to fetch movie details
async function fetchMovieDetail(slug) {
  try {
    log(`Fetching details for movie "${slug}"...`);
    const url = `${API_BASE_URL}/phim/${slug}`;
    const data = await makeRequest(url);
    
    if (!data || !data.movie) {
      log(`Failed to fetch details for movie "${slug}": Invalid response`);
      return null;
    }
    
    log(`Successfully fetched details for movie "${slug}"`);
    return data;
  } catch (error) {
    log(`Error fetching details for movie "${slug}": ${error.message}`);
    return null;
  }
}

// Function to check if tables exist and columns are present
async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    log('Checking database tables and columns...');
    
    // Check if movies table exists
    const moviesExistResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'movies'
      );
    `);
    
    const moviesExist = moviesExistResult.rows[0].exists;
    
    if (!moviesExist) {
      log('Movies table does not exist. Creating it...');
      await client.query(`
        CREATE TABLE movies (
          id SERIAL PRIMARY KEY,
          movie_id TEXT,
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
        )
      `);
      log('Movies table created successfully');
    } else {
      log('Movies table already exists. Checking columns...');
      
      // Get all columns from movies table
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'movies'
      `);
      
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      log(`Existing columns: ${existingColumns.join(', ')}`);
      
      // Check for required columns
      const requiredColumns = [
        { name: 'movie_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'origin_name', type: 'TEXT' },
        { name: 'slug', type: 'TEXT' },
        { name: 'type', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'thumb_url', type: 'TEXT' },
        { name: 'poster_url', type: 'TEXT' },
        { name: 'trailer_url', type: 'TEXT' },
        { name: 'time', type: 'TEXT' },
        { name: 'quality', type: 'TEXT' },
        { name: 'lang', type: 'TEXT' },
        { name: 'year', type: 'INTEGER' },
        { name: 'view', type: 'INTEGER DEFAULT 0' },
        { name: 'actors', type: 'TEXT' },
        { name: 'directors', type: 'TEXT' },
        { name: 'categories', type: 'JSONB' },
        { name: 'countries', type: 'JSONB' }
      ];
      
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          log(`Adding missing column: ${column.name}`);
          await client.query(`
            ALTER TABLE movies ADD COLUMN ${column.name} ${column.type}
          `);
        }
      }
    }
    
    // Check if episodes table exists
    const episodesExistResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'episodes'
      );
    `);
    
    const episodesExist = episodesExistResult.rows[0].exists;
    
    if (!episodesExist) {
      log('Episodes table does not exist. Creating it...');
      await client.query(`
        CREATE TABLE episodes (
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
        )
      `);
      log('Episodes table created successfully');
    } else {
      log('Episodes table already exists. Checking columns...');
      
      // Get all columns from episodes table
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'episodes'
      `);
      
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      log(`Existing columns: ${existingColumns.join(', ')}`);
      
      // Check for required columns
      const requiredColumns = [
        { name: 'movie_slug', type: 'TEXT' },
        { name: 'server_name', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'slug', type: 'TEXT' },
        { name: 'filename', type: 'TEXT' },
        { name: 'link_embed', type: 'TEXT' },
        { name: 'link_m3u8', type: 'TEXT' }
      ];
      
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column.name)) {
          log(`Adding missing column: ${column.name}`);
          await client.query(`
            ALTER TABLE episodes ADD COLUMN ${column.name} ${column.type}
          `);
        }
      }
    }
    
    // Create indexes
    log('Creating indexes...');
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug)`);
      await client.query(`CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id)`);
    } catch (error) {
      log(`Error creating indexes: ${error.message}`);
    }
    
    log('Database check completed successfully');
    return true;
  } catch (error) {
    log(`Error checking database: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

// Function to import a movie
async function importMovie(movie, client) {
  try {
    // Check if movie already exists
    const existingResult = await client.query('SELECT id FROM movies WHERE slug = $1', [movie.slug]);
    
    if (existingResult.rows.length > 0) {
      log(`Movie "${movie.name}" already exists with ID ${existingResult.rows[0].id}, skipping`);
      return { status: 'existing', id: existingResult.rows[0].id };
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
      movieData._id || null,
      movieData.name,
      movieData.origin_name || null,
      movieData.slug,
      movieData.type || null,
      movieData.status || null,
      movieData.content || null, // Description
      movieData.thumb_url || null,
      movieData.poster_url || null,
      movieData.trailer_url || null,
      movieData.time || null,
      movieData.quality || null,
      movieData.lang || null,
      movieData.year ? parseInt(movieData.year) : null,
      parseInt(movieData.view || '0'),
      Array.isArray(movieData.actor) ? movieData.actor.join(', ') : (movieData.actor || null),
      Array.isArray(movieData.director) ? movieData.director.join(', ') : (movieData.director || null),
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
            server.server_name || null,
            episode.name || null,
            episode.slug || null,
            episode.filename || null,
            episode.link_embed || null,
            episode.link_m3u8 || null
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

// Function to process a page of movies
async function processMoviePage(page) {
  const client = await pool.connect();
  
  try {
    log(`Processing page ${page}...`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Fetch page of movies
    const data = await fetchMoviePage(page);
    
    if (!data.items || data.items.length === 0) {
      log(`No movies found on page ${page}, skipping`);
      await client.query('ROLLBACK');
      return { saved: 0, existing: 0, failed: 0 };
    }
    
    // Import each movie
    let saved = 0;
    let existing = 0;
    let failed = 0;
    
    for (const movie of data.items) {
      const result = await importMovie(movie, client);
      
      if (result.status === 'saved') {
        saved++;
      } else if (result.status === 'existing') {
        existing++;
      } else {
        failed++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    log(`Processed ${data.items.length} movies: ${saved} saved, ${existing} existing, ${failed} failed`);
    return { saved, existing, failed };
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    log(`Error processing page ${page}: ${error.message}`);
    return { saved: 0, existing: 0, failed: 0 };
  } finally {
    client.release();
  }
}

// Main function
async function main() {
  log('Starting simple movie import...');
  
  try {
    // Check database
    const dbCheck = await checkDatabase();
    if (!dbCheck) {
      log('Database check failed. Exiting.');
      return false;
    }
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const startPage = parseInt(args[0]) || 1;
    const numPages = parseInt(args[1]) || 3;
    
    log(`Starting import from page ${startPage}, planning to import ${numPages} pages`);
    
    // Process pages
    let totalSaved = 0;
    let totalExisting = 0;
    let totalFailed = 0;
    
    for (let page = startPage; page < startPage + numPages; page++) {
      const { saved, existing, failed } = await processMoviePage(page);
      totalSaved += saved;
      totalExisting += existing;
      totalFailed += failed;
      
      log(`Page ${page} completed. Total progress: ${totalSaved} saved, ${totalExisting} existing, ${totalFailed} failed`);
      
      // Sleep between pages to avoid overloading the API
      if (page < startPage + numPages - 1) {
        log(`Waiting 3 seconds before next page...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    log(`Import completed. Total: ${totalSaved} saved, ${totalExisting} existing, ${totalFailed} failed`);
    return true;
  } catch (error) {
    log(`Error during import: ${error.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

// Run main function
main()
  .then(success => {
    if (success) {
      log('Import process finished successfully');
      process.exit(0);
    } else {
      log('Import process completed with errors');
      process.exit(1);
    }
  })
  .catch(err => {
    log(`Import process failed: ${err.message}`);
    process.exit(1);
  });