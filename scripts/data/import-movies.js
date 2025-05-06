#!/usr/bin/env node

/**
 * FilmFlex Movie Data Import Script
 * 
 * This script fetches the latest movie data from the API and imports it into the database.
 * It's designed to be run as a scheduled task via cron or similar.
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Get the directory name of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve('/var/www/filmflex/.env') });

// Create timestamp for logging
const timestamp = new Date().toISOString();
const logPrefix = `[${timestamp}] [DATA-IMPORT]`;

// Configuration
const API_BASE_URL = 'https://ophim1.com';
const MOVIE_LIST_ENDPOINT = '/danh-sach/phim-moi-cap-nhat';
const MOVIE_PAGE_SIZE = 50;
const MAX_PAGES = 5; // Adjust as needed

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
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`${logPrefix} Error fetching page ${page}:`, error);
    return { items: [] };
  }
}

/**
 * Fetch movie details from API
 */
async function fetchMovieDetail(slug) {
  try {
    const url = `${API_BASE_URL}/phim/${slug}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`${logPrefix} Error fetching movie detail for ${slug}:`, error);
    throw error;
  }
}

/**
 * Process and save movies to database
 */
async function processAndSaveMovies(items, db) {
  let savedCount = 0;
  let existingCount = 0;
  let failedCount = 0;
  
  console.log(`${logPrefix} Processing ${items.length} movies...`);
  
  for (const item of items) {
    try {
      // Check if movie already exists
      const existingMovies = await db.query.movies.findMany({
        where: (movies, { eq }) => eq(movies.slug, item.slug)
      });
      
      if (existingMovies.length > 0) {
        existingCount++;
        continue;
      }
      
      // Fetch detailed movie information
      const movieDetail = await fetchMovieDetail(item.slug);
      
      if (!movieDetail || !movieDetail.movie) {
        console.warn(`${logPrefix} Warning: No details found for movie ${item.slug}`);
        failedCount++;
        continue;
      }
      
      // Convert to model and save to database
      const movie = convertToMovieModel(movieDetail);
      await db.insert(movies).values(movie);
      
      // If it's a series, process episodes
      if (movieDetail.movie?.type === 'series' && movieDetail.episodes) {
        const episodeModels = convertToEpisodeModels(movieDetail);
        for (const episode of episodeModels) {
          await db.insert(episodes).values(episode);
        }
      }
      
      savedCount++;
    } catch (error) {
      console.error(`${logPrefix} Error processing movie ${item.slug}:`, error);
      failedCount++;
    }
  }
  
  console.log(`${logPrefix} Processed ${items.length} movies: ${savedCount} saved, ${existingCount} existing, ${failedCount} failed`);
}

/**
 * Convert API movie detail to database model
 */
function convertToMovieModel(movieDetail) {
  const movie = movieDetail.movie;
  
  return {
    movieId: movie._id,
    name: movie.name,
    origin_name: movie.origin_name,
    content: movie.content,
    type: movie.type,
    status: movie.status,
    thumb_url: movie.thumb_url,
    poster_url: movie.poster_url,
    is_copyright: movie.is_copyright === 'true',
    sub_docquyen: movie.sub_docquyen === 'true',
    chieurap: movie.chieurap === 'true',
    trailer_url: movie.trailer_url,
    time: movie.time,
    episode_current: movie.episode_current,
    episode_total: movie.episode_total,
    quality: movie.quality,
    lang: movie.lang,
    notify: movie.notify,
    showtimes: movie.showtimes,
    slug: movie.slug,
    year: movie.year,
    view: parseInt(movie.view || '0', 10),
    actor: Array.isArray(movie.actor) ? movie.actor.join(', ') : movie.actor,
    director: Array.isArray(movie.director) ? movie.director.join(', ') : movie.director,
    category: movie.category ? JSON.stringify(movie.category) : null,
    country: movie.country ? JSON.stringify(movie.country) : null
  };
}

/**
 * Convert API movie detail to episode database models
 */
function convertToEpisodeModels(movieDetail) {
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
        movieId: movie._id,
        movie_slug: movie.slug,
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
    
    // Import schema
    const schema = await import('/var/www/filmflex/dist/schema.js');
    
    // Create drizzle instance
    const db = drizzle({ client: pool, schema });
    
    // We'll fetch first 5 pages of movies (adjust as needed)
    for (let page = 1; page <= MAX_PAGES; page++) {
      // Fetch movie list
      const movieList = await fetchMovieList(page, MOVIE_PAGE_SIZE);
      
      // Process and save movies
      await processAndSaveMovies(movieList.items, db);
    }
    
    console.log(`${logPrefix} Movie data import completed successfully`);
    await pool.end();
  } catch (error) {
    console.error(`${logPrefix} Error during movie data import:`, error);
    process.exit(1);
  }
}

// Run the main function
main();