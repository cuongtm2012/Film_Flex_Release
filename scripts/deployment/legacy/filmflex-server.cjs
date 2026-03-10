/**
 * PhimGG Production Server (CommonJS version)
 */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database connection
let pool = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    console.log(`Database connection initialized with URL: ${process.env.DATABASE_URL.substring(0, 25)}...`);
  } catch (error) {
    console.error('Failed to initialize database connection:', error.message);
  }
}

// Test database connection
if (pool) {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.log('Database connection: FAILED');
      console.error('Error connecting to database:', err.message);
    } else {
      console.log('Database connection: ESTABLISHED');
      console.log('Database time:', res.rows[0].now);
    }
  });
}

// Middleware
app.use(express.json());

// Serve static files from the React build
const staticPath = path.join(__dirname, 'client/dist');
console.log(`Static files path: ${staticPath}`);
console.log(`Does path exist: ${fs.existsSync(staticPath)}`);

// Try alternate paths if standard path doesn't exist
const alternatePaths = [
  './client/dist',
  '../client/dist',
  '../dist',
  './dist'
];

let foundPath = staticPath;
if (!fs.existsSync(staticPath)) {
  for (const altPath of alternatePaths) {
    const fullPath = path.join(__dirname, altPath);
    console.log(`Trying alternate path: ${fullPath}`);
    if (fs.existsSync(fullPath)) {
      foundPath = fullPath;
      console.log(`Found valid path: ${foundPath}`);
      break;
    }
  }
}

// API Routes - define these BEFORE the static file middleware
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PhimGG API is running in production mode',
    time: new Date().toISOString(),
    node_version: process.version
  });
});

// Simple movie listing API
app.get('/api/movies', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 48;

  if (!pool) {
    return res.status(500).json({
      status: false,
      message: 'Database connection error'
    });
  }

  try {
    const offset = (page - 1) * limit;

    const moviesQuery = `
      SELECT * FROM movies
      ORDER BY modified_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = `SELECT COUNT(*) FROM movies`;
    
    const [moviesResult, countResult] = await Promise.all([
      pool.query(moviesQuery, [limit, offset]),
      pool.query(countQuery)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    res.json({
      status: true,
      items: moviesResult.rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      status: false, 
      message: 'Failed to fetch movies',
      error: error.message
    });
  }
});

// Movie detail API
app.get('/api/movies/:slug', async (req, res) => {
  const { slug } = req.params;

  if (!pool) {
    return res.status(500).json({
      status: false,
      message: 'Database connection error'
    });
  }

  try {
    const query = `
      SELECT * FROM movies
      WHERE slug = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Movie not found'
      });
    }
    
    res.json({
      status: true,
      msg: "",
      movie: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch movie details',
      error: error.message
    });
  }
});

// Episodes API
app.get('/api/movies/:slug/episodes', async (req, res) => {
  const { slug } = req.params;
  
  if (!pool) {
    return res.status(500).json({
      status: false,
      message: 'Database connection error'
    });
  }
  
  try {
    // First check if the movie exists
    const movieQuery = `
      SELECT * FROM movies
      WHERE slug = $1
      LIMIT 1
    `;
    
    const movieResult = await pool.query(movieQuery, [slug]);
    
    if (movieResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'Movie not found'
      });
    }
    
    // Then get the episodes
    const episodesQuery = `
      SELECT * FROM episodes
      WHERE movie_slug = $1
      ORDER BY season_number, episode_number
    `;
    
    const episodesResult = await pool.query(episodesQuery, [slug]);
    
    res.json({
      status: true,
      episodes: episodesResult.rows
    });
  } catch (error) {
    console.error(`Error fetching episodes for ${slug}:`, error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch episodes',
      error: error.message
    });
  }
});

// Recommendations API
app.get('/api/movies/:slug/recommendations', async (req, res) => {
  const { slug } = req.params;
  const limit = parseInt(req.query.limit) || 5;
  
  if (!pool) {
    return res.status(500).json({
      status: false,
      message: 'Database connection error'
    });
  }
  
  try {
    // Simple recommendation implementation - get recent movies
    const query = `
      SELECT * FROM movies
      WHERE slug != $1
      ORDER BY modified_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [slug, limit]);
    
    res.json({
      status: true,
      items: result.rows
    });
  } catch (error) {
    console.error(`Error fetching recommendations for ${slug}:`, error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  }
});

// Comments API
app.get('/api/movies/:slug/comments', async (req, res) => {
  res.json({
    data: [],
    total: "0"
  });
});

// Watchlist API
app.get('/api/users/:userId/watchlist/check/:slug', async (req, res) => {
  res.json({
    inWatchlist: false
  });
});

// Static files - serve AFTER API routes
app.use(express.static(foundPath));

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
  // For API routes that weren't matched above
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: false,
      message: 'API endpoint not found'
    });
  }
  
  // For all other routes, serve the React app
  const indexPath = path.join(foundPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.log(`Index file not found at ${indexPath}`);
    res.status(404).send('Frontend files not found');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PhimGG production server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Database connection: ${pool ? 'ESTABLISHED' : 'FAILED'}`);
});