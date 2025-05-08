/**
 * FilmFlex Database Schema Fix
 * This script fixes the database schema by adding missing columns
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Check if DB connection string is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set!');
  process.exit(1);
}

// Initialize PG pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixSchema() {
  console.log('Starting database schema fix...');
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Check if movies table exists
    console.log('Checking if movies table exists...');
    const moviesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'movies'
      );
    `);
    
    if (!moviesTableExists.rows[0].exists) {
      console.log('Creating movies table...');
      await client.query(`
        CREATE TABLE movies (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          poster TEXT,
          modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // 2. Add missing columns to movies table
    console.log('Adding missing columns to movies table...');
    
    // Check for movie_id column
    const movieIdExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'movie_id'
      );
    `);
    
    if (!movieIdExists.rows[0].exists) {
      console.log('Adding movie_id column...');
      await client.query(`ALTER TABLE movies ADD COLUMN movie_id TEXT`);
    }
    
    // Check for name column (may be called title in some installs)
    const nameExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'name'
      );
    `);
    
    if (!nameExists.rows[0].exists) {
      console.log('Adding name column...');
      await client.query(`ALTER TABLE movies ADD COLUMN name TEXT`);
      
      // If title exists but name doesn't, copy title to name
      console.log('Copying title to name if needed...');
      await client.query(`
        UPDATE movies SET name = title WHERE name IS NULL
      `);
    }
    
    // Check for origin_name column
    const originNameExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'origin_name'
      );
    `);
    
    if (!originNameExists.rows[0].exists) {
      console.log('Adding origin_name column...');
      await client.query(`ALTER TABLE movies ADD COLUMN origin_name TEXT`);
    }
    
    // Check for type column
    const typeExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'type'
      );
    `);
    
    if (!typeExists.rows[0].exists) {
      console.log('Adding type column...');
      await client.query(`ALTER TABLE movies ADD COLUMN type TEXT`);
    }
    
    // Check for status column
    const statusExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'status'
      );
    `);
    
    if (!statusExists.rows[0].exists) {
      console.log('Adding status column...');
      await client.query(`ALTER TABLE movies ADD COLUMN status TEXT`);
    }
    
    // Check for thumb_url column
    const thumbUrlExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'thumb_url'
      );
    `);
    
    if (!thumbUrlExists.rows[0].exists) {
      console.log('Adding thumb_url column...');
      await client.query(`ALTER TABLE movies ADD COLUMN thumb_url TEXT`);
    }
    
    // Check for poster_url column
    const posterUrlExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'poster_url'
      );
    `);
    
    if (!posterUrlExists.rows[0].exists) {
      console.log('Adding poster_url column...');
      await client.query(`ALTER TABLE movies ADD COLUMN poster_url TEXT`);
    }
    
    // Check for trailer_url column
    const trailerUrlExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'trailer_url'
      );
    `);
    
    if (!trailerUrlExists.rows[0].exists) {
      console.log('Adding trailer_url column...');
      await client.query(`ALTER TABLE movies ADD COLUMN trailer_url TEXT`);
    }
    
    // Check for time column
    const timeExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'time'
      );
    `);
    
    if (!timeExists.rows[0].exists) {
      console.log('Adding time column...');
      await client.query(`ALTER TABLE movies ADD COLUMN time TEXT`);
    }
    
    // Check for quality column
    const qualityExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'quality'
      );
    `);
    
    if (!qualityExists.rows[0].exists) {
      console.log('Adding quality column...');
      await client.query(`ALTER TABLE movies ADD COLUMN quality TEXT`);
    }
    
    // Check for lang column
    const langExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'lang'
      );
    `);
    
    if (!langExists.rows[0].exists) {
      console.log('Adding lang column...');
      await client.query(`ALTER TABLE movies ADD COLUMN lang TEXT`);
    }
    
    // Check for year column
    const yearExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'year'
      );
    `);
    
    if (!yearExists.rows[0].exists) {
      console.log('Adding year column...');
      await client.query(`ALTER TABLE movies ADD COLUMN year INTEGER`);
    }
    
    // Check for view column
    const viewExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'view'
      );
    `);
    
    if (!viewExists.rows[0].exists) {
      console.log('Adding view column...');
      await client.query(`ALTER TABLE movies ADD COLUMN view INTEGER DEFAULT 0`);
    }
    
    // Check for actors column
    const actorsExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'actors'
      );
    `);
    
    if (!actorsExists.rows[0].exists) {
      console.log('Adding actors column...');
      await client.query(`ALTER TABLE movies ADD COLUMN actors TEXT`);
    }
    
    // Check for directors column
    const directorsExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'directors'
      );
    `);
    
    if (!directorsExists.rows[0].exists) {
      console.log('Adding directors column...');
      await client.query(`ALTER TABLE movies ADD COLUMN directors TEXT`);
    }
    
    // Check for categories column
    const categoriesExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'categories'
      );
    `);
    
    if (!categoriesExists.rows[0].exists) {
      console.log('Adding categories column...');
      await client.query(`ALTER TABLE movies ADD COLUMN categories JSONB`);
    }
    
    // Check for countries column
    const countriesExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'movies' AND column_name = 'countries'
      );
    `);
    
    if (!countriesExists.rows[0].exists) {
      console.log('Adding countries column...');
      await client.query(`ALTER TABLE movies ADD COLUMN countries JSONB`);
    }
    
    // 3. Check if episodes table exists
    console.log('Checking if episodes table exists...');
    const episodesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'episodes'
      );
    `);
    
    if (!episodesTableExists.rows[0].exists) {
      console.log('Creating episodes table...');
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
    } else {
      // Add missing columns to episodes table
      console.log('Adding missing columns to episodes table...');
      
      // Check for movie_slug column
      const movieSlugExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'movie_slug'
        );
      `);
      
      if (!movieSlugExists.rows[0].exists) {
        console.log('Adding movie_slug column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN movie_slug TEXT`);
      }
      
      // Check for name column
      const nameExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'name'
        );
      `);
      
      if (!nameExists.rows[0].exists) {
        console.log('Adding name column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN name TEXT`);
      }
      
      // Check for slug column
      const slugExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'slug'
        );
      `);
      
      if (!slugExists.rows[0].exists) {
        console.log('Adding slug column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN slug TEXT`);
      }
      
      // Check for filename column
      const filenameExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'filename'
        );
      `);
      
      if (!filenameExists.rows[0].exists) {
        console.log('Adding filename column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN filename TEXT`);
      }
      
      // Check for link_embed column
      const linkEmbedExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'link_embed'
        );
      `);
      
      if (!linkEmbedExists.rows[0].exists) {
        console.log('Adding link_embed column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN link_embed TEXT`);
      }
      
      // Check for link_m3u8 column
      const linkM3u8Exists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'episodes' AND column_name = 'link_m3u8'
        );
      `);
      
      if (!linkM3u8Exists.rows[0].exists) {
        console.log('Adding link_m3u8 column...');
        await client.query(`ALTER TABLE episodes ADD COLUMN link_m3u8 TEXT`);
      }
    }
    
    // 4. Create indexes if they don't exist
    console.log('Creating indexes...');
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug)`);
    } catch (err) {
      console.log('Note: movies_slug_idx creation skipped -', err.message);
    }
    
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id)`);
    } catch (err) {
      console.log('Note: episodes_movie_id_idx creation skipped -', err.message);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database schema fix completed successfully');
    return true;
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the fix
console.log('Running database schema fix...');
fixSchema()
  .then(() => {
    console.log('Schema fix completed successfully');
    pool.end();
  })
  .catch(err => {
    console.error('Schema fix failed:', err);
    pool.end();
    process.exit(1);
  });