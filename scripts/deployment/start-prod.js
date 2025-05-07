// Production server startup script (CommonJS)
// This script provides a simple server for production without Vite dependencies

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure database connection
let pool = null;
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    console.log("Database connection configured");
  } else {
    console.log("No DATABASE_URL found, running without database");
  }
} catch (error) {
  console.error("Failed to connect to database:", error.message);
}

// Middleware
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running in production mode',
    time: new Date().toISOString(),
    node_version: process.version
  });
});

// Movies endpoint - directly query database
apiRouter.get('/movies', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ 
        status: false,
        message: "Database connection not available" 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 48;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM movies 
      ORDER BY "modifiedAt" DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = `SELECT COUNT(*) FROM movies`;
    
    const [moviesResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    return res.json({
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
      message: "Error fetching movies: " + error.message
    });
  }
});

// Movie detail endpoint - directly query database
apiRouter.get('/movies/:slug', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ 
        status: false,
        message: "Database connection not available" 
      });
    }
    
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
        message: "Movie not found"
      });
    }
    
    return res.json({
      status: true,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ 
      status: false,
      message: "Error fetching movie details: " + error.message
    });
  }
});

// Use API router
app.use('/api', apiRouter);

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
});