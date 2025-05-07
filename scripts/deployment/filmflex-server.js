/**
 * FilmFlex Production Server
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
app.use(express.static(path.join(__dirname, '../client/dist')));

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
  if (!pool) {
    return res.status(503).json({
      status: false,
      message: 'Database connection not available'
    });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 48;
    const offset = (page - 1) * limit;

    const moviesQuery = `
      SELECT * FROM movies
      ORDER BY "modifiedAt" DESC
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
      message: `Error fetching movies: ${error.message}`
    });
  }
});

// Movie detail API
app.get('/api/movies/:slug', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: false,
      message: 'Database connection not available'
    });
  }

  try {
    const { slug } = req.params;
    
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
    res.status(500).json({
      status: false,
      message: `Error fetching movie: ${error.message}`
    });
  }
});

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FilmFlex production server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Database connection: ${pool ? 'ESTABLISHED' : 'FAILED'}`);
});