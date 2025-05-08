/**
 * FilmFlex Database Schema Check & Fix
 * This script checks the actual database schema and adapts the import process accordingly
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Define paths
const LOG_DIR = path.join(__dirname, '..', '..', 'log');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file path
const LOG_FILE = path.join(LOG_DIR, `schema-check-${new Date().toISOString().slice(0, 10)}.log`);

// Logging function
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
};

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    log(`Error checking if table ${tableName} exists: ${error.message}`);
    return false;
  }
}

// Function to get table columns
async function getTableColumns(tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    return result.rows;
  } catch (error) {
    log(`Error getting columns for table ${tableName}: ${error.message}`);
    return [];
  }
}

// Function to add missing columns
async function addMissingColumns(tableName, requiredColumns) {
  try {
    const existingColumns = await getTableColumns(tableName);
    const existingColumnNames = existingColumns.map(col => col.column_name);
    
    for (const [columnName, definition] of Object.entries(requiredColumns)) {
      if (!existingColumnNames.includes(columnName)) {
        log(`Adding missing column ${columnName} to table ${tableName}`);
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
      }
    }
    
    return true;
  } catch (error) {
    log(`Error adding missing columns to table ${tableName}: ${error.message}`);
    return false;
  }
}

// Main function to check and fix schema
async function checkAndFixSchema() {
  log('Starting database schema check...');
  
  // Check if movies table exists
  const moviesExists = await tableExists('movies');
  if (!moviesExists) {
    log('Movies table does not exist. Creating it...');
    await pool.query(`
      CREATE TABLE movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        poster TEXT,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log('Movies table created successfully');
  } else {
    log('Movies table already exists');
  }
  
  // Check if episodes table exists
  const episodesExists = await tableExists('episodes');
  if (!episodesExists) {
    log('Episodes table does not exist. Creating it...');
    await pool.query(`
      CREATE TABLE episodes (
        id SERIAL PRIMARY KEY,
        movie_id INTEGER REFERENCES movies(id),
        title TEXT,
        server_name TEXT,
        server_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log('Episodes table created successfully');
  } else {
    log('Episodes table already exists');
  }
  
  // Get columns for movies table
  const moviesColumns = await getTableColumns('movies');
  log('Current movies table columns:');
  moviesColumns.forEach(col => {
    log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  // Get columns for episodes table
  const episodesColumns = await getTableColumns('episodes');
  log('Current episodes table columns:');
  episodesColumns.forEach(col => {
    log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  // Define required columns for movies table
  const requiredMoviesColumns = {
    'movie_id': 'TEXT',
    'name': 'TEXT',
    'origin_name': 'TEXT',
    'type': 'TEXT',
    'status': 'TEXT',
    'thumb_url': 'TEXT',
    'poster_url': 'TEXT',
    'trailer_url': 'TEXT',
    'time': 'TEXT',
    'quality': 'TEXT',
    'lang': 'TEXT',
    'year': 'INTEGER',
    'view': 'INTEGER DEFAULT 0',
    'actors': 'TEXT',
    'directors': 'TEXT',
    'categories': 'JSONB',
    'countries': 'JSONB'
  };
  
  // Define required columns for episodes table
  const requiredEpisodesColumns = {
    'movie_slug': 'TEXT',
    'name': 'TEXT',
    'slug': 'TEXT',
    'filename': 'TEXT',
    'link_embed': 'TEXT',
    'link_m3u8': 'TEXT'
  };
  
  // Add missing columns to movies table
  log('Checking for missing columns in movies table...');
  await addMissingColumns('movies', requiredMoviesColumns);
  
  // Add missing columns to episodes table
  log('Checking for missing columns in episodes table...');
  await addMissingColumns('episodes', requiredEpisodesColumns);
  
  // Create indexes if they don't exist
  log('Creating indexes if they don\'t exist...');
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE tablename = 'movies' AND indexname = 'movies_slug_idx'
        ) THEN
          CREATE INDEX movies_slug_idx ON movies(slug);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE tablename = 'episodes' AND indexname = 'episodes_movie_id_idx'
        ) THEN
          CREATE INDEX episodes_movie_id_idx ON episodes(movie_id);
        END IF;
      END
      $$;
    `);
    log('Indexes created successfully');
  } catch (error) {
    log(`Error creating indexes: ${error.message}`);
  }
  
  // Generate SQL required for import scripts to use
  // This accounts for the actual columns in the database
  log('Generating SQL for import scripts...');
  
  const updatedMoviesColumns = await getTableColumns('movies');
  const updatedEpisodesColumns = await getTableColumns('episodes');
  
  const moviesColumnNames = updatedMoviesColumns
    .filter(col => col.column_name !== 'id' && col.column_name !== 'modified_at')
    .map(col => col.column_name);
  
  const episodesColumnNames = updatedEpisodesColumns
    .filter(col => col.column_name !== 'id' && col.column_name !== 'created_at')
    .map(col => col.column_name);
  
  // Generate SQL for insert into movies
  const moviesInsertSQL = `
INSERT INTO movies (${moviesColumnNames.join(', ')})
VALUES (${moviesColumnNames.map((_, index) => `$${index + 1}`).join(', ')})
RETURNING id
  `.trim();
  
  // Generate SQL for insert into episodes
  const episodesInsertSQL = `
INSERT INTO episodes (${episodesColumnNames.join(', ')})
VALUES (${episodesColumnNames.map((_, index) => `$${index + 1}`).join(', ')})
  `.trim();
  
  // Save SQL to file for use by import scripts
  const sqlPath = path.join(__dirname, 'import-sql.json');
  fs.writeFileSync(sqlPath, JSON.stringify({
    movies: {
      columns: moviesColumnNames,
      sql: moviesInsertSQL
    },
    episodes: {
      columns: episodesColumnNames,
      sql: episodesInsertSQL
    }
  }, null, 2));
  
  log(`SQL statements saved to ${sqlPath}`);
  log('Schema check and fix completed');
  
  return {
    moviesColumns: updatedMoviesColumns,
    episodesColumns: updatedEpisodesColumns,
    moviesSQL: moviesInsertSQL,
    episodesSQL: episodesInsertSQL
  };
}

// Run the check and fix if this script is executed directly
if (require.main === module) {
  log('Running schema check and fix...');
  checkAndFixSchema()
    .then(result => {
      log('Schema check and fix completed successfully');
      pool.end();
    })
    .catch(error => {
      log(`Schema check and fix failed: ${error.message}`);
      pool.end();
      process.exit(1);
    });
} else {
  // Export for use by other scripts
  module.exports = {
    checkAndFixSchema
  };
}