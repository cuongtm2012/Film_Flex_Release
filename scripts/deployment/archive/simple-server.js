// Simple Express server as a replacement for the main application
// This serves as an emergency fallback if TypeScript server fails
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure database connection if available
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
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running in fallback mode',
    time: new Date().toISOString(),
    node_version: process.version
  });
});

// Simple movie list endpoint
app.get('/api/movies', async (req, res) => {
  try {
    // Try to get movies from database
    if (pool) {
      const result = await pool.query('SELECT * FROM movies LIMIT 48');
      return res.json({ 
        status: true, 
        items: result.rows,
        message: "Movies loaded from database" 
      });
    }
    
    // Fallback to static movie list if no database or query fails
    res.json({ 
      status: true, 
      items: [],
      message: "No movies available in fallback mode"
    });
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error fetching movies: " + error.message
    });
  }
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emergency fallback server running on port ${PORT}`);
  console.log(`Server time: ${new Date().toISOString()}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Static files from: ${path.join(__dirname, '../../client/dist')}`);
  
  // Log environment (but hide sensitive values)
  console.log("Environment:");
  for (const key in process.env) {
    if (key.includes('DATABASE') || key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASS')) {
      console.log(`  ${key}: [HIDDEN]`);
    } else {
      console.log(`  ${key}: ${process.env[key]}`);
    }
  }
});