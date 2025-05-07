/**
 * FilmFlex Production Server (CommonJS version)
 * 
 * A simple Express server that serves the static React app and provides 
 * minimal API endpoints for basic functionality.
 * 
 * This server is designed to run without any dependencies on Vite or TypeScript
 * to avoid issues in production environments.
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

// Middleware
app.use(express.json());

// Serve static files from the React build
const staticPath = path.join(__dirname, '../client/dist');
console.log(`Static files path: ${staticPath}`);
console.log(`Does path exist: ${fs.existsSync(staticPath)}`);

// Try alternate paths if standard path doesn't exist
const alternatePaths = [
  '../client/dist',
  './client/dist',
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

app.use(express.static(foundPath));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'FilmFlex API is running in production mode',
    time: new Date().toISOString(),
    node_version: process.version
  });
});

// Simple movie listing API
app.get('/api/movies', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 48;

  if (!pool) {
    console.log('Database not available, returning maintenance message');
    return res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: page,
        limit
      }
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
    // Instead of returning error, return empty results in maintenance mode
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      error: error.message,
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: page,
        limit
      }
    });
  }
});

// Movie detail API
app.get('/api/movies/:slug', async (req, res) => {
  const { slug } = req.params;

  if (!pool) {
    console.log(`Database not available, returning maintenance message for movie: ${slug}`);
    return res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      item: {
        id: 0,
        title: 'Maintenance Mode',
        slug: slug,
        description: 'The movie database is currently undergoing maintenance. Please check back soon.',
        poster: '',
        modified_at: new Date().toISOString()
      }
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
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching movie detail:', error);
    // Return maintenance mode response instead of error
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      error: error.message,
      item: {
        id: 0,
        title: 'Maintenance Mode',
        slug: slug,
        description: 'The movie database is currently undergoing maintenance. Please check back soon.',
        poster: '',
        modified_at: new Date().toISOString()
      }
    });
  }
});

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
  const indexPath = path.join(foundPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Generate a simple fallback page if index.html doesn't exist
    console.log(`Index file not found at ${indexPath}, serving fallback page`);
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>FilmFlex</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #1a1a1a;
              color: #fff;
            }
            h1 { color: #e50914; }
            .message {
              background: rgba(0,0,0,0.5);
              padding: 20px;
              border-radius: 5px;
              max-width: 600px;
              margin: 0 auto;
            }
            .api-status {
              margin-top: 30px;
              padding: 10px;
              background: #333;
              border-radius: 4px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <h1>FilmFlex</h1>
          <div class="message">
            <h2>Backend API is running</h2>
            <p>The FilmFlex API server is running successfully, but we couldn't find the frontend files.</p>
            <p>Please check the deployment process to ensure the frontend was built correctly.</p>
          </div>
          <div class="api-status">
            API Status: Online | Server Time: ${new Date().toISOString()}
          </div>
        </body>
      </html>
    `);
  }
});

// Episodes API
app.get('/api/movies/:slug/episodes', async (req, res) => {
  const { slug } = req.params;
  
  if (!pool) {
    console.log(`Database not available, returning maintenance message for episodes of movie: ${slug}`);
    return res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      episodes: []
    });
  }
  
  try {
    // Return empty episodes list during maintenance
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      episodes: []
    });
  } catch (error) {
    console.error(`Error fetching episodes for ${slug}:`, error);
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      episodes: []
    });
  }
});

// Categories API
app.get('/api/categories/:slug', async (req, res) => {
  const { slug } = req.params;
  
  if (!pool) {
    console.log(`Database not available, returning maintenance message for category: ${slug}`);
    return res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 48
      }
    });
  }
  
  try {
    // Return empty category during maintenance
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 48
      }
    });
  } catch (error) {
    console.error(`Error fetching category ${slug}:`, error);
    res.json({
      status: true,
      maintenance: true,
      message: 'Site is under maintenance. Please check back soon.',
      items: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 48
      }
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FilmFlex production server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Database connection: ${pool ? 'ESTABLISHED' : 'FAILED'}`);
});