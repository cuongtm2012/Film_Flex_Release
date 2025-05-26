#!/usr/bin/env node
/**
 * Sample Movie Import Script
 * 
 * This script imports sample movie data from debug_page_1.json for testing purposes.
 * It sets some movies as recommended to test the /api/movies/recommended endpoint.
 */

const fs = require('fs');
const { Pool } = require('pg');

// Try to load dotenv
try {
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('Loaded environment variables from .env file');
} catch (error) {
  console.log('dotenv package not found, using existing environment variables');
}

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function importSampleMovies() {
  console.log('Starting sample movie import...');
  
  try {
    // Read sample data
    const sampleData = JSON.parse(fs.readFileSync('./debug_page_1.json', 'utf8'));
    const movies = sampleData.data.items;
    
    console.log(`Found ${movies.length} sample movies to import`);
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
        const movieData = {
        movie_id: `movie_${movie.slug}`,
        slug: movie.slug,
        name: movie.name,
        origin_name: movie.origin_name || movie.name,
        description: movie.content || '',
        type: movie.type || 'single',
        status: movie.status || 'completed',
        poster_url: movie.poster_url || movie.thumb_url || '',
        thumb_url: movie.thumb_url || movie.poster_url || '',
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
        episode_current: movie.episode_current || 'Full',
        episode_total: movie.episode_total || '1',
        // Mark first 3 movies as recommended for testing
        is_recommended: i < 3,
        section: 'movies',
        modified_at: new Date().toISOString()
      };
      
      const columns = Object.keys(movieData).join(', ');
      const placeholders = Object.keys(movieData).map((_, index) => `$${index + 1}`).join(', ');
      const values = Object.values(movieData);
      
      const insertQuery = {
        text: `INSERT INTO movies (${columns}) VALUES (${placeholders}) ON CONFLICT (slug) DO UPDATE SET modified_at = EXCLUDED.modified_at`,
        values: values
      };
      
      await pool.query(insertQuery);
      console.log(`Imported movie: ${movie.name} (recommended: ${i < 3})`);
    }
    
    console.log('Sample movie import completed successfully!');
    
    // Test the recommended movies query
    const result = await pool.query('SELECT COUNT(*) as count FROM movies WHERE is_recommended = true');
    console.log(`Total recommended movies: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing sample movies:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
if (require.main === module) {
  importSampleMovies();
}

module.exports = { importSampleMovies };
