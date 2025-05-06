#!/usr/bin/env node

/**
 * FilmFlex Movie Data Import Script (SQL Version)
 * 
 * This script fetches the latest movie data from the API and imports it into the database
 * using direct SQL queries instead of relying on the schema.
 */

// Load dependencies
const path = require('path');
const axios = require('axios');
const { Pool } = require('pg');

// Try to load dotenv, but don't fail if it's not installed
try {
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('Loaded environment variables from .env file');
} catch (error) {
  console.log('dotenv package not found, using existing environment variables');
  // Continue anyway, as environment variables might be set directly on the system
}

// Create timestamp for logging
const timestamp = new Date().toISOString();
const logPrefix = `[${timestamp}] [DATA-IMPORT]`;

// Configuration
const API_BASE_URL = 'https://phimapi.com';
const MOVIE_LIST_ENDPOINT = '/danh-sach/phim-moi-cap-nhat';
const MOVIE_PAGE_SIZE = 50;
const MAX_PAGES = 1; // Focus on page 1 for newest movies

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_DEEP_SCAN = args.includes('--deep-scan');
const TEST_MODE = args.includes('--test-mode');
const SINGLE_PAGE_MODE = args.includes('--single-page');

// Parse page number and size if in single page mode
let SINGLE_PAGE_NUM = 1;
let SINGLE_PAGE_SIZE = 10;

if (SINGLE_PAGE_MODE) {
  // Find page number parameter
  const pageNumArg = args.find(arg => arg.startsWith('--page-num='));
  if (pageNumArg) {
    SINGLE_PAGE_NUM = parseInt(pageNumArg.split('=')[1], 10) || 1;
  }
  
  // Find page size parameter
  const pageSizeArg = args.find(arg => arg.startsWith('--page-size='));
  if (pageSizeArg) {
    SINGLE_PAGE_SIZE = parseInt(pageSizeArg.split('=')[1], 10) || 10;
  }
}

// Set this to true on weekends or specific times to check deeper pages
const CHECK_DEEPER_PAGES = FORCE_DEEP_SCAN || false;
const DEEPER_PAGES_MAX = 5; // How many pages to check when doing a deep scan

// Override settings based on mode
if (TEST_MODE) {
  console.log(`${logPrefix} Running in TEST MODE - No database changes will be made`);
  MAX_PAGES = 1;
}

if (SINGLE_PAGE_MODE) {
  console.log(`${logPrefix} Running in SINGLE PAGE MODE - Only importing page ${SINGLE_PAGE_NUM} with size ${SINGLE_PAGE_SIZE}`);
  MOVIE_PAGE_SIZE = SINGLE_PAGE_SIZE;
}

/**
 * Setup database connection
 */
function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error(`${logPrefix} ERROR: DATABASE_URL environment variable is not set`);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: false // Disable SSL for local connections
  });

  pool.on('error', (err) => {
    console.error(`${logPrefix} Unexpected error on database client:`, err);
  });

  return pool;
}

/**
 * Fetch movie list from API
 */
async function fetchMovieList(page, limit) {
  console.log(`${logPrefix} Fetching movie list for page ${page} with limit ${limit}`);
  
  try {
    // Calculate the number of API pages needed
    // The external API might have a different page size than our internal pagination
    const pageSize = 10; // External API page size
    const startPage = Math.floor((page - 1) * limit / pageSize) + 1;
    const pagesNeeded = Math.ceil(limit / pageSize);
    
    console.log(`${logPrefix} Need to fetch ${pagesNeeded} pages starting from external API page ${startPage}`);
    
    // Fetch all required pages in parallel
    const promises = [];
    for (let i = 0; i < pagesNeeded; i++) {
      const apiPage = startPage + i;
      promises.push(fetchPage(apiPage));
    }
    
    const results = await Promise.all(promises);
    
    // Combine results from all pages
    let allItems = [];
    results.forEach((result, index) => {
      if (result.items && result.items.length > 0) {
        console.log(`${logPrefix} Successfully fetched page ${startPage + index} with ${result.items.length} items`);
        allItems = allItems.concat(result.items);
      } else {
        console.warn(`${logPrefix} Warning: No items found on page ${startPage + index}`);
      }
    });
    
    // Apply our own pagination
    const startIndex = (page - 1) * limit % pageSize;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);
    
    console.log(`${logPrefix} Combined ${allItems.length} items from ${results.length} pages`);
    console.log(`${logPrefix} Pagination: Total items: ${results[0]?.params?.pagination?.totalItems || 'unknown'}, Total pages: ${results[0]?.params?.pagination?.totalPages || 'unknown'}, Current page: ${page}`);
    console.log(`${logPrefix} Returning ${paginatedItems.length} items for page ${page}`);
    
    return {
      items: paginatedItems,
      totalItems: results[0]?.params?.pagination?.totalItems || paginatedItems.length,
      totalPages: results[0]?.params?.pagination?.totalPages || 1,
      currentPage: page
    };
  } catch (error) {
    console.error(`${logPrefix} Error fetching movie list:`, error);
    throw error;
  }
}

/**
 * Fetch a single page from the API
 */
async function fetchPage(page) {
  try {
    const url = `${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${page}`;
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`${logPrefix} Error fetching page ${page}:`, error.message);
    return { items: [] };
  }
}

/**
 * Fetch movie details from API
 */
async function fetchMovieDetail(slug) {
  try {
    const url = `${API_BASE_URL}/phim/${slug}`;
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`${logPrefix} Error fetching movie detail for ${slug}:`, error.message);
    throw error;
  }
}

/**
 * Process and save movies to database
 */
async function processAndSaveMovies(items, pool) {
  let savedCount = 0;
  let existingCount = 0;
  let failedCount = 0;
  
  console.log(`${logPrefix} Processing ${items.length} movies...`);
  
  // In test mode, only process the first item to verify API connectivity
  const itemsToProcess = TEST_MODE ? items.slice(0, 1) : items;
  
  if (TEST_MODE) {
    console.log(`${logPrefix} TEST MODE: Only processing first movie as a test`);
  }
  
  for (const item of itemsToProcess) {
    try {
      // Check if movie already exists using raw SQL
      if (!TEST_MODE) {
        const existingQuery = {
          text: 'SELECT COUNT(*) as count FROM movies WHERE slug = $1',
          values: [item.slug]
        };
        
        const existingResult = await pool.query(existingQuery);
        const count = parseInt(existingResult.rows[0].count, 10);
        
        if (count > 0) {
          existingCount++;
          continue;
        }
      } else {
        // In test mode, simulate checking for existing movie
        console.log(`${logPrefix} TEST MODE: Checking if movie '${item.slug}' exists (simulated)`);
      }
      
      // Fetch detailed movie information
      const movieDetail = await fetchMovieDetail(item.slug);
      
      if (!movieDetail || !movieDetail.movie) {
        console.warn(`${logPrefix} Warning: No details found for movie ${item.slug}`);
        failedCount++;
        continue;
      }
      
      // Convert to model and save to database using SQL
      const movie = convertToMovieModel(movieDetail);
      
      if (!TEST_MODE) {
        // Create SQL insert query for movie
        const columns = Object.keys(movie).join(', ');
        const placeholders = Object.keys(movie).map((_, index) => `$${index + 1}`).join(', ');
        const values = Object.values(movie);
        
        const insertQuery = {
          text: `INSERT INTO movies (${columns}) VALUES (${placeholders})`,
          values: values
        };
        
        await pool.query(insertQuery);
      } else {
        // In test mode, print what would have been inserted
        console.log(`${logPrefix} TEST MODE: Would insert movie '${movie.name}' (${movie.slug})`);
        // Print a sample of movie fields to verify data parsing
        console.log(`${logPrefix} TEST MODE: Sample data - ID: ${movie.movie_id}, Type: ${movie.type}, Year: ${movie.year}`);
      }
      
      // Log message for series
      if (movieDetail.movie?.type === 'series' && movieDetail.episodes) {
        console.log(`${logPrefix} Movie '${movie.name}' is a series with ${movieDetail.episodes.length} server(s) of episodes`);
        if (!TEST_MODE) {
          console.log(`${logPrefix} Episodes will be imported through the API routes`);
        } else {
          console.log(`${logPrefix} TEST MODE: Episodes would be imported through the API routes`);
        }
      }
      
      savedCount++;
    } catch (error) {
      console.error(`${logPrefix} Error processing movie ${item.slug}:`, error.message);
      failedCount++;
    }
  }
  
  if (TEST_MODE) {
    console.log(`${logPrefix} TEST MODE: Processed ${itemsToProcess.length} movies for testing`);
  } else {
    console.log(`${logPrefix} Processed ${items.length} movies: ${savedCount} saved, ${existingCount} existing, ${failedCount} failed`);
  }
}

/**
 * Convert API movie detail to database model
 */
function convertToMovieModel(movieDetail) {
  const movie = movieDetail.movie;
  
  return {
    movie_id: movie._id,
    name: movie.name,
    origin_name: movie.origin_name,
    description: movie.content, // Column in DB is "description" not "content"
    type: movie.type,
    status: movie.status,
    thumb_url: movie.thumb_url,
    poster_url: movie.poster_url,
    trailer_url: movie.trailer_url,
    time: movie.time,
    quality: movie.quality,
    lang: movie.lang,
    slug: movie.slug,
    year: movie.year ? parseInt(movie.year, 10) : null,
    view: parseInt(movie.view || '0', 10),
    actors: Array.isArray(movie.actor) ? movie.actor.join(', ') : movie.actor, // Column in DB is "actors"
    directors: Array.isArray(movie.director) ? movie.director.join(', ') : movie.director, // Column in DB is "directors"
    categories: JSON.stringify(movie.category || []), // Column in DB is "categories"
    countries: JSON.stringify(movie.country || []) // Column in DB is "countries"
  };
}

/**
 * Convert API movie detail to episode database models
 */
function convertToEpisodeModels(movieDetail, movieDbId) {
  const movie = movieDetail.movie;
  const episodes = [];
  
  if (!movieDetail.episodes || !Array.isArray(movieDetail.episodes)) {
    return episodes;
  }
  
  for (const server of movieDetail.episodes) {
    if (!server.server_data || !Array.isArray(server.server_data)) {
      continue;
    }
    
    for (const episode of server.server_data) {
      episodes.push({
        movie_id: movieDbId, // Using the database ID, not the external ID
        movie_slug: movie.slug, // Add movie_slug explicitly
        server_name: server.server_name,
        name: episode.name,
        slug: episode.slug,
        filename: episode.filename,
        link_embed: episode.link_embed,
        link_m3u8: episode.link_m3u8
      });
    }
  }
  
  return episodes;
}

/**
 * Main function
 */
async function main() {
  console.log(`${logPrefix} Starting movie data import...`);
  
  try {
    // Setup database
    const pool = setupDatabase();
    
    // Check if movies table exists, if not, create it
    try {
      await pool.query(`
        SELECT 1 FROM movies LIMIT 1
      `);
      console.log(`${logPrefix} Movies table exists`);
    } catch (error) {
      console.warn(`${logPrefix} Movies table might not exist, continuing anyway`);
    }
    
    // Handle single page mode
    if (SINGLE_PAGE_MODE) {
      console.log(`${logPrefix} Processing single page ${SINGLE_PAGE_NUM} with size ${SINGLE_PAGE_SIZE}`);
      
      // Fetch and process just the one page
      const movieList = await fetchMovieList(SINGLE_PAGE_NUM, SINGLE_PAGE_SIZE);
      await processAndSaveMovies(movieList.items, pool);
      
      console.log(`${logPrefix} Completed processing page ${SINGLE_PAGE_NUM}`);
    } else {
      // Regular mode (deep scan or quick scan)
      const today = new Date();
      const isWeekend = [0, 6].includes(today.getDay()); // 0 = Sunday, 6 = Saturday
      const shouldCheckDeeperPages = CHECK_DEEPER_PAGES || isWeekend;
      const pagesToCheck = shouldCheckDeeperPages ? DEEPER_PAGES_MAX : MAX_PAGES;
      
      if (shouldCheckDeeperPages) {
        console.log(`${logPrefix} Performing deep scan of ${pagesToCheck} pages...`);
      } else {
        console.log(`${logPrefix} Performing quick scan of ${pagesToCheck} pages...`);
      }
      
      // Process multiple pages
      for (let page = 1; page <= pagesToCheck; page++) {
        // Fetch movie list
        const movieList = await fetchMovieList(page, MOVIE_PAGE_SIZE);
        
        // Process and save movies
        await processAndSaveMovies(movieList.items, pool);
        
        // If we're checking multiple pages, add a small delay to avoid hammering the API
        if (page < pagesToCheck && pagesToCheck > 1) {
          console.log(`${logPrefix} Waiting 2 seconds before fetching next page...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.log(`${logPrefix} Movie data import completed successfully`);
    await pool.end();
  } catch (error) {
    console.error(`${logPrefix} Error during movie data import:`, error.message);
    process.exit(1);
  }
}

// Run the main function
main();