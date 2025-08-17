#!/usr/bin/env node

/**
 * FilmFlex Movie Data Import Script (Docker SQL Version)
 * 
 * This script fetches the latest movie data from the API and imports it into the Docker PostgreSQL database
 * using direct SQL queries.
 */

// Load dependencies
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Try to load axios with better error handling
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.error(`ERROR: axios module not found. Please run 'npm install axios' first.`);
  process.exit(1);
}

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
const logPrefix = `[${timestamp}] [DOCKER-IMPORT]`;

// Configuration
const API_BASE_URL = 'https://phimapi.com';
const MOVIE_LIST_ENDPOINT = '/danh-sach/phim-moi-cap-nhat';
let MOVIE_PAGE_SIZE = 50;
let MAX_PAGES = 1;

// Docker PostgreSQL connection settings
const DOCKER_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'filmflex',
  user: 'filmflex',
  password: 'filmflex2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false
};

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_DEEP_SCAN = args.includes('--deep-scan');
const TEST_MODE = args.includes('--test-mode');
const SINGLE_PAGE_MODE = args.includes('--single-page');
const FORCE_IMPORT = args.includes('--force-import');
const COMPREHENSIVE_MODE = args.includes('--comprehensive');

// Parse page number and size if in single page mode
let SINGLE_PAGE_NUM = 1;
let SINGLE_PAGE_SIZE = 10;
let SPECIFIC_MOVIE_SLUG = null;

// Enhanced settings for comprehensive import
if (COMPREHENSIVE_MODE) {
  console.log(`${logPrefix} Running in COMPREHENSIVE MODE - Will import all available movies`);
  MOVIE_PAGE_SIZE = 50; // Larger batches for efficiency
  MAX_PAGES = 100; // Start with 100 pages, will auto-detect more
}

if (SINGLE_PAGE_MODE) {
  // Find page number parameter
  const pageNumArg = args.find(arg => arg.startsWith('--page-num='));
  if (pageNumArg) {
    const parsedPageNum = parseInt(pageNumArg.split('=')[1], 10);
    if (parsedPageNum && parsedPageNum > 0) {
      SINGLE_PAGE_NUM = parsedPageNum;
    } else {
      console.log(`${logPrefix} WARNING: Invalid page number: ${pageNumArg.split('=')[1]}. Using default page 1.`);
      SINGLE_PAGE_NUM = 1;
    }
  }
  
  // Find page size parameter
  const pageSizeArg = args.find(arg => arg.startsWith('--page-size='));
  if (pageSizeArg) {
    const parsedPageSize = parseInt(pageSizeArg.split('=')[1], 10);
    if (parsedPageSize && parsedPageSize > 0) {
      SINGLE_PAGE_SIZE = parsedPageSize;
    } else {
      console.log(`${logPrefix} WARNING: Invalid page size: ${pageSizeArg.split('=')[1]}. Using default size 10.`);
      SINGLE_PAGE_SIZE = 10;
    }
  }
}

// Find movie slug parameter
const movieSlugArg = args.find(arg => arg.startsWith('--movie-slug='));
if (movieSlugArg) {
  SPECIFIC_MOVIE_SLUG = movieSlugArg.split('=')[1];
  console.log(`${logPrefix} Targeting specific movie by slug: ${SPECIFIC_MOVIE_SLUG}`);
}

// Find max pages parameter
let userMaxPages = 0;
const maxPagesArg = args.find(arg => arg.startsWith('--max-pages='));
if (maxPagesArg) {
  const parsedMaxPages = parseInt(maxPagesArg.split('=')[1], 10);
  if (parsedMaxPages && parsedMaxPages > 0) {
    userMaxPages = parsedMaxPages;
    console.log(`${logPrefix} User specified max pages: ${userMaxPages}`);
  } else {
    console.log(`${logPrefix} WARNING: Invalid max pages: ${maxPagesArg.split('=')[1]}. Using default value.`);
    userMaxPages = 0;
  }
}

const CHECK_DEEPER_PAGES = FORCE_DEEP_SCAN || false;
const DEEPER_PAGES_MAX = userMaxPages > 0 ? userMaxPages : 5;

// Override settings based on mode
if (TEST_MODE) {
  console.log(`${logPrefix} Running in TEST MODE - No database changes will be made`);
  MAX_PAGES = 1;
}

if (SINGLE_PAGE_MODE) {
  console.log(`${logPrefix} Running in SINGLE PAGE MODE - Only importing page ${SINGLE_PAGE_NUM} with size ${SINGLE_PAGE_SIZE}`);
  MOVIE_PAGE_SIZE = SINGLE_PAGE_SIZE;
}

// Override MAX_PAGES if user specified a value
if (userMaxPages > 0) {
  MAX_PAGES = userMaxPages;
  console.log(`${logPrefix} Using user-specified MAX_PAGES = ${MAX_PAGES}`);
}

/**
 * Setup database connection for Docker PostgreSQL
 */
function setupDatabase() {
  console.log(`${logPrefix} Connecting to Docker PostgreSQL database...`);
  console.log(`${logPrefix} Host: ${DOCKER_DB_CONFIG.host}:${DOCKER_DB_CONFIG.port}`);
  console.log(`${logPrefix} Database: ${DOCKER_DB_CONFIG.database}`);
  console.log(`${logPrefix} User: ${DOCKER_DB_CONFIG.user}`);

  const pool = new Pool(DOCKER_DB_CONFIG);

  pool.on('error', (err) => {
    console.error(`${logPrefix} Unexpected error on database client:`, err);
  });

  return pool;
}

/**
 * Fetch movie list from API
 */
async function fetchMovieList(page, limit) {
  // Ensure page is positive
  const safePage = Math.max(1, page);
  if (safePage !== page) {
    console.log(`${logPrefix} WARNING: Negative page number ${page} converted to ${safePage}`);
  }
  
  console.log(`${logPrefix} Fetching movie list for page ${safePage} with limit ${limit}`);
  
  try {
    // Calculate the number of API pages needed
    const pageSize = 10; // External API page size
    const startPage = Math.floor((safePage - 1) * limit / pageSize) + 1;
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
    const startIndex = (safePage - 1) * limit % pageSize;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);
    
    console.log(`${logPrefix} Combined ${allItems.length} items from ${results.length} pages`);
    console.log(`${logPrefix} Returning ${paginatedItems.length} items for page ${safePage}`);
    
    return {
      items: paginatedItems,
      totalItems: results[0]?.params?.pagination?.totalItems || paginatedItems.length,
      totalPages: results[0]?.params?.pagination?.totalPages || 1,
      currentPage: safePage
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
  const safePage = Math.max(1, page);
  if (safePage !== page) {
    console.log(`${logPrefix} WARNING: Negative page number ${page} converted to ${safePage}`);
  }

  try {
    const url = `${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${safePage}`;
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`${logPrefix} Error fetching page ${safePage}:`, error.message);
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
  let processedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const errors = [];
  
  // Create resume state file if it doesn't exist
  const resumeFile = path.join(__dirname, '.docker-import-resume-state.json');
  let processedSlugs;
  try {
    processedSlugs = new Set(JSON.parse(fs.readFileSync(resumeFile, 'utf8')));
    console.log(`${logPrefix} Found resume state with ${processedSlugs.size} processed movies`);
  } catch (err) {
    processedSlugs = new Set();
    console.log(`${logPrefix} Starting fresh import`);
  }

  for (const item of items) {
    try {
      // Skip if already processed unless FORCE_IMPORT is true
      if (processedSlugs.has(item.slug) && !FORCE_IMPORT) {
        console.log(`${logPrefix} Skipping already processed movie: ${item.slug}`);
        skippedCount++;
        continue;
      }

      // Check if movie already exists in database
      if (!TEST_MODE) {
        const existingMovie = await pool.query('SELECT slug FROM movies WHERE slug = $1', [item.slug]);
        
        if (existingMovie.rows.length > 0 && !FORCE_IMPORT) {
          // Update existing movie if needed
          const movieDetail = await fetchMovieDetail(item.slug);
          
          if (movieDetail && movieDetail.movie) {
            const movie = convertToMovieModel(movieDetail);
            
            // Update movie record
            try {
              const updateColumns = Object.keys(movie).map((key, index) => `${key} = $${index + 1}`).join(', ');
              const updateValues = Object.values(movie);
              
              const updateQuery = {
                text: `UPDATE movies SET ${updateColumns} WHERE slug = $${updateValues.length + 1}`,
                values: [...updateValues, item.slug]
              };
              
              await pool.query(updateQuery);
              console.log(`${logPrefix} Updated existing movie '${movieDetail.movie.name || item.slug}'`);
              
              // Update episodes if needed
              if (movieDetail.episodes && Array.isArray(movieDetail.episodes)) {
                try {
                  // Delete existing episodes
                  const deleteEpisodesQuery = {
                    text: 'DELETE FROM episodes WHERE movie_slug = $1',
                    values: [item.slug]
                  };
                  
                  await pool.query(deleteEpisodesQuery);
                  console.log(`${logPrefix} Deleted existing episodes for movie '${item.slug}'`);
                } catch (deleteError) {
                  console.error(`${logPrefix} Error deleting existing episodes for movie ${item.slug}:`, deleteError.message);
                  errors.push({ slug: item.slug, error: deleteError.message });
                }
                
                // Convert and save episodes
                const { episodes } = convertToEpisodeModels(movieDetail, null);
                let episodesCount = 0;
                
                for (const episode of episodes) {
                  try {
                    // Create columns and values for episode insert
                    const episodeColumns = Object.keys(episode).join(', ');
                    const episodePlaceholders = Object.keys(episode).map((_, index) => `$${index + 1}`).join(', ');
                    const episodeValues = Object.values(episode);
                    
                    const insertEpisodeQuery = {
                      text: `INSERT INTO episodes (${episodeColumns}) 
                             VALUES (${episodePlaceholders})
                             ON CONFLICT (slug) DO UPDATE SET
                             name = EXCLUDED.name,
                             link_embed = EXCLUDED.link_embed,
                             link_m3u8 = EXCLUDED.link_m3u8,
                             filename = EXCLUDED.filename`,
                      values: episodeValues
                    };
                    
                    await pool.query(insertEpisodeQuery);
                    episodesCount++;
                  } catch (episodeError) {
                    console.error(`${logPrefix} Error saving episode for movie ${item.slug}:`, episodeError.message);
                    errors.push({ slug: item.slug, error: episodeError.message });
                  }
                }
                
                console.log(`${logPrefix} Saved ${episodesCount} episodes for movie '${movieDetail.movie.name || item.slug}'`);
              }
            } catch (updateError) {
              console.error(`${logPrefix} Error updating movie ${item.slug}:`, updateError.message);
              errors.push({ slug: item.slug, error: updateError.message });
              failedCount++;
              continue;
            }
          }
          
          skippedCount++;
          processedSlugs.add(item.slug);
          continue;
        }
      }
      
      // Fetch and save new movie
      const movieDetail = await fetchMovieDetail(item.slug);
      
      if (!movieDetail || !movieDetail.movie) {
        console.warn(`${logPrefix} Warning: No details found for movie ${item.slug}`);
        errors.push({ slug: item.slug, error: 'No movie details found' });
        failedCount++;
        continue;
      }
      
      if (!TEST_MODE) {
        // Convert to model and save
        const movie = convertToMovieModel(movieDetail);
        
        try {
          // Create SQL insert query for movie
          const columns = Object.keys(movie).join(', ');
          const placeholders = Object.keys(movie).map((_, index) => `$${index + 1}`).join(', ');
          const values = Object.values(movie);
          
          const insertQuery = {
            text: `INSERT INTO movies (${columns}) VALUES (${placeholders})`,
            values: values
          };
          
          await pool.query(insertQuery);
          
          // Save episodes
          if (movieDetail.episodes && Array.isArray(movieDetail.episodes)) {
            console.log(`${logPrefix} Saving episodes for movie '${movie.name || movie.title || movie.slug}'`);
            
            const { episodes } = convertToEpisodeModels(movieDetail, null);
            let episodesCount = 0;
            
            for (const episode of episodes) {
              try {
                const episodeColumns = Object.keys(episode).join(', ');
                const episodePlaceholders = Object.keys(episode).map((_, index) => `$${index + 1}`).join(', ');
                const episodeValues = Object.values(episode);
                
                const insertEpisodeQuery = {
                  text: `INSERT INTO episodes (${episodeColumns}) VALUES (${episodePlaceholders})
                         ON CONFLICT (slug) DO NOTHING`,
                  values: episodeValues
                };
                
                await pool.query(insertEpisodeQuery);
                episodesCount++;
              } catch (episodeError) {
                console.error(`${logPrefix} Error saving episode for movie ${item.slug}:`, episodeError.message);
                errors.push({ slug: item.slug, error: episodeError.message });
              }
            }
            
            console.log(`${logPrefix} Saved ${episodesCount} episodes for movie '${movie.name || movie.title || movie.slug}'`);
          }
          
          processedCount++;
          processedSlugs.add(item.slug);
          
          // Save progress
          fs.writeFileSync(resumeFile, JSON.stringify(Array.from(processedSlugs)));
          
        } catch (dbError) {
          console.error(`${logPrefix} Database error when saving movie ${item.slug}:`, dbError.message);
          errors.push({ slug: item.slug, error: dbError.message });
          failedCount++;
          continue;
        }
      } else {
        // Test mode - just increment counter
        processedCount++;
        processedSlugs.add(item.slug);
      }
      
    } catch (error) {
      console.error(`${logPrefix} Error processing movie ${item.slug}:`, error.message);
      errors.push({ slug: item.slug, error: error.message });
      failedCount++;
    }
    
    // Add a small delay between requests to avoid overwhelming the API
    if (!TEST_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { processedCount, failedCount, skippedCount, errors };
}

/**
 * Convert API movie detail to movie database model
 */
function convertToMovieModel(movieDetail) {
  const movie = movieDetail.movie;
  
  // Return movie object with episode data directly from API
  return {
    movie_id: movie._id,
    name: movie.name || '',
    origin_name: movie.origin_name || '',
    slug: movie.slug,
    type: movie.type || 'movie',
    status: movie.status || 'ongoing',
    description: movie.content || '',
    thumb_url: movie.thumb_url || '',
    poster_url: movie.poster_url || '',
    trailer_url: movie.trailer_url || '',
    time: movie.time || '',
    quality: movie.quality || '',
    lang: movie.lang || '',
    year: movie.year ? parseInt(movie.year) : new Date().getFullYear(),
    view: movie.view || 0,
    directors: movie.director ? movie.director.join(',') : '',
    actors: movie.actor ? movie.actor.join(',') : '',
    categories: JSON.stringify(movie.category || []),
    countries: JSON.stringify(movie.country || []),
    // Use episode fields directly from API, exactly as provided
    episode_current: movie.episode_current || 'Full',
    episode_total: movie.episode_total || '1',
    modified_at: new Date().toISOString()
  };
}

/**
 * Convert API movie episodes to episode database models
 */
function convertToEpisodeModels(movieDetail, movieDbId) {
  const movie = movieDetail.movie;
  const episodes = [];
  
  if (!movieDetail.episodes || !Array.isArray(movieDetail.episodes)) {
    return { episodes };
  }

  for (const server of movieDetail.episodes) {
    if (!server.server_data || !Array.isArray(server.server_data)) {
      continue;
    }
    
    for (const episode of server.server_data) {
      // Create a unique slug for the episode by combining movie slug and episode slug
      const uniqueSlug = `${movie.slug}-${episode.slug}`;
      
      // Create episode object with unique slug
      const episodeObj = {
        movie_slug: movie.slug,
        server_name: server.server_name,
        name: episode.name,
        slug: uniqueSlug,
        filename: episode.filename || null,
        link_embed: episode.link_embed,
        link_m3u8: episode.link_m3u8 || null
      };
      
      episodes.push(episodeObj);
    }
  }

  return { episodes };
}

/**
 * Main function
 */
async function main() {
  console.log(`${logPrefix} Starting movie data import to Docker PostgreSQL...`);
  
  try {
    // Setup database connection to Docker container
    const pool = setupDatabase();
    
    // Test database connection
    try {
      const testResult = await pool.query('SELECT COUNT(*) as count FROM movies');
      const currentMovieCount = testResult.rows[0].count;
      console.log(`${logPrefix} ✅ Successfully connected to Docker PostgreSQL`);
      console.log(`${logPrefix} Current movies in database: ${currentMovieCount}`);
    } catch (error) {
      console.error(`${logPrefix} ❌ Failed to connect to Docker PostgreSQL:`, error.message);
      console.error(`${logPrefix} Make sure your Docker container is running:`);
      console.error(`${logPrefix} docker-compose ps`);
      process.exit(1);
    }
    
    // Handle specific movie slug case
    if (SPECIFIC_MOVIE_SLUG) {
      console.log(`${logPrefix} Processing specific movie with slug: ${SPECIFIC_MOVIE_SLUG}`);
      
      try {
        const movieDetail = await fetchMovieDetail(SPECIFIC_MOVIE_SLUG);
        
        if (movieDetail && movieDetail.movie) {
          console.log(`${logPrefix} Movie details fetched successfully for ${SPECIFIC_MOVIE_SLUG}`);
          await processAndSaveMovies([{ slug: SPECIFIC_MOVIE_SLUG }], pool);
          console.log(`${logPrefix} Completed processing movie: ${SPECIFIC_MOVIE_SLUG}`);
        } else {
          console.error(`${logPrefix} Failed to fetch movie details for ${SPECIFIC_MOVIE_SLUG}`);
        }
      } catch (movieError) {
        console.error(`${logPrefix} Error processing specific movie ${SPECIFIC_MOVIE_SLUG}:`, movieError.message);
      }
    }
    // Handle single page mode
    else if (SINGLE_PAGE_MODE) {
      console.log(`${logPrefix} Processing single page ${SINGLE_PAGE_NUM} with size ${SINGLE_PAGE_SIZE}`);
      
      const movieList = await fetchMovieList(SINGLE_PAGE_NUM, SINGLE_PAGE_SIZE);
      const result = await processAndSaveMovies(movieList.items, pool);
      
      console.log(`${logPrefix} ✅ Completed processing page ${SINGLE_PAGE_NUM}`);
      console.log(`${logPrefix} Results: ${result.processedCount} processed, ${result.skippedCount} skipped, ${result.failedCount} failed`);
    } else {
      // Regular mode (deep scan or quick scan)
      const today = new Date();
      const isWeekend = [0, 6].includes(today.getDay());
      const shouldCheckDeeperPages = CHECK_DEEPER_PAGES || isWeekend;
      const pagesToCheck = shouldCheckDeeperPages ? DEEPER_PAGES_MAX : MAX_PAGES;
      
      if (shouldCheckDeeperPages) {
        console.log(`${logPrefix} Performing deep scan of ${pagesToCheck} pages...`);
      } else {
        console.log(`${logPrefix} Performing quick scan of ${pagesToCheck} pages...`);
      }
      
      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      
      // Process multiple pages
      for (let page = 1; page <= pagesToCheck; page++) {
        console.log(`${logPrefix} 📄 Processing page ${page}/${pagesToCheck}...`);
        
        const movieList = await fetchMovieList(page, MOVIE_PAGE_SIZE);
        const result = await processAndSaveMovies(movieList.items, pool);
        
        totalProcessed += result.processedCount;
        totalSkipped += result.skippedCount;
        totalFailed += result.failedCount;
        
        console.log(`${logPrefix} Page ${page} results: ${result.processedCount} processed, ${result.skippedCount} skipped, ${result.failedCount} failed`);
        
        // Add delay between pages
        if (page < pagesToCheck && pagesToCheck > 1) {
          console.log(`${logPrefix} ⏳ Waiting 2 seconds before next page...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`${logPrefix} 🎉 Total results: ${totalProcessed} processed, ${totalSkipped} skipped, ${totalFailed} failed`);
    }
    
    // Final database count
    const finalResult = await pool.query('SELECT COUNT(*) as count FROM movies');
    const finalMovieCount = finalResult.rows[0].count;
    console.log(`${logPrefix} 📊 Final movies in Docker database: ${finalMovieCount}`);
    
    console.log(`${logPrefix} ✅ Movie data import to Docker PostgreSQL completed successfully`);
    await pool.end();
  } catch (error) {
    console.error(`${logPrefix} ❌ Error during movie data import:`, error.message);
    process.exit(1);
  }
}

// Run the main function
main();