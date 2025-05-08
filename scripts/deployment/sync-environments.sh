#!/bin/bash

# FilmFlex Environment Synchronization Script
# This script aligns production and development environments for consistent operation

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define paths
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y%m%d%H%M%S')
LOG_FILE="${LOG_DIR}/sync-environments-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Environment Synchronization"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start
echo "Starting environment synchronization at $(date)" | tee -a "$LOG_FILE"

# Step 1: Ensure .env file exists with correct DATABASE_URL
echo -e "${BLUE}Step 1: Checking .env file...${NC}" | tee -a "$LOG_FILE"
if [ ! -f "${APP_DIR}/.env" ]; then
  echo -e "${YELLOW}Creating .env file${NC}" | tee -a "$LOG_FILE"
  cat > "${APP_DIR}/.env" << EOF
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
NODE_ENV=production
API_URL=https://phimapi.com
EOF
else
  echo -e "${GREEN}.env file already exists${NC}" | tee -a "$LOG_FILE"
  
  # Check if DATABASE_URL exists in .env
  if ! grep -q "DATABASE_URL" "${APP_DIR}/.env"; then
    echo -e "${YELLOW}Adding DATABASE_URL to .env file${NC}" | tee -a "$LOG_FILE"
    echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex" >> "${APP_DIR}/.env"
  fi
  
  # Check if API_URL exists in .env
  if ! grep -q "API_URL" "${APP_DIR}/.env"; then
    echo -e "${YELLOW}Adding API_URL to .env file${NC}" | tee -a "$LOG_FILE"
    echo "API_URL=https://phimapi.com" >> "${APP_DIR}/.env"
  fi
fi

# Step 2: Install global dependencies
echo -e "${BLUE}Step 2: Installing global dependencies...${NC}" | tee -a "$LOG_FILE"
npm install -g dotenv axios pg fs-extra | tee -a "$LOG_FILE"

# Step 3: Install local dependencies
echo -e "${BLUE}Step 3: Installing local dependencies...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
npm install dotenv axios pg fs-extra | tee -a "$LOG_FILE"
cd "${APP_DIR}/scripts/data"
npm init -y > /dev/null 2>&1
npm install dotenv axios pg fs-extra | tee -a "$LOG_FILE"

# Step 4: Synchronize database schema
echo -e "${BLUE}Step 4: Synchronizing database schema...${NC}" | tee -a "$LOG_FILE"

# Create schema sync JavaScript file
cat > "${APP_DIR}/sync-schema.js" << EOF
/**
 * FilmFlex Database Schema Synchronization
 * Makes production database schema match development schema
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

async function syncSchema() {
  console.log('Starting database schema synchronization...');
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Check if movies table exists, create if not
    const moviesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'movies'
      );
    `);
    
    if (!moviesTableCheck.rows[0].exists) {
      console.log('Creating movies table...');
      await client.query(\`
        CREATE TABLE movies (
          id SERIAL PRIMARY KEY,
          movie_id TEXT,
          name TEXT NOT NULL,
          origin_name TEXT,
          slug TEXT UNIQUE NOT NULL,
          type TEXT,
          status TEXT,
          description TEXT,
          thumb_url TEXT,
          poster_url TEXT,
          trailer_url TEXT,
          time TEXT,
          quality TEXT,
          lang TEXT,
          year INTEGER,
          view INTEGER DEFAULT 0,
          actors TEXT,
          directors TEXT,
          categories JSONB,
          countries JSONB,
          modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);
    } else {
      console.log('Movies table already exists. Checking columns...');
      
      // Get existing columns from movies table
      const columnsResult = await client.query(\`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'movies'
      \`);
      
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      
      // Define required columns and their type
      const requiredColumns = {
        'movie_id': 'TEXT',
        'name': 'TEXT NOT NULL',
        'origin_name': 'TEXT',
        'slug': 'TEXT UNIQUE NOT NULL',
        'type': 'TEXT',
        'status': 'TEXT',
        'description': 'TEXT',
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
        'countries': 'JSONB',
        'modified_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      };
      
      // Add missing columns to movies table
      for (const [column, dataType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(column)) {
          console.log(\`Adding missing column: \${column}\`);
          await client.query(\`
            ALTER TABLE movies ADD COLUMN \${column} \${dataType}
          \`);
        }
      }
    }
    
    // 2. Check if episodes table exists, create if not
    const episodesTableCheck = await client.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'episodes'
      );
    \`);
    
    if (!episodesTableCheck.rows[0].exists) {
      console.log('Creating episodes table...');
      await client.query(\`
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
      \`);
    } else {
      console.log('Episodes table already exists. Checking columns...');
      
      // Get existing columns from episodes table
      const columnsResult = await client.query(\`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'episodes'
      \`);
      
      const existingColumns = columnsResult.rows.map(row => row.column_name);
      
      // Define required columns and their type
      const requiredColumns = {
        'movie_id': 'INTEGER REFERENCES movies(id)',
        'movie_slug': 'TEXT',
        'server_name': 'TEXT',
        'name': 'TEXT',
        'slug': 'TEXT',
        'filename': 'TEXT',
        'link_embed': 'TEXT',
        'link_m3u8': 'TEXT',
        'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      };
      
      // Add missing columns to episodes table
      for (const [column, dataType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(column)) {
          console.log(\`Adding missing column: \${column}\`);
          if (column === 'movie_id' && !dataType.includes('REFERENCES')) {
            // Skip constraint for existing table
            await client.query(\`
              ALTER TABLE episodes ADD COLUMN \${column} INTEGER
            \`);
          } else {
            await client.query(\`
              ALTER TABLE episodes ADD COLUMN \${column} \${dataType.replace('REFERENCES movies(id)', '')}
            \`);
          }
        }
      }
    }
    
    // 3. Create indexes
    console.log('Creating indexes...');
    
    try {
      await client.query('CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug)');
    } catch (err) {
      console.log('Index movies_slug_idx already exists or could not be created:', err.message);
    }
    
    try {
      await client.query('CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id)');
    } catch (err) {
      console.log('Index episodes_movie_id_idx already exists or could not be created:', err.message);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database schema synchronization completed successfully');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error synchronizing database schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run synchronization
syncSchema()
  .then(() => {
    console.log('Schema synchronization completed.');
    pool.end();
  })
  .catch(err => {
    console.error('Schema synchronization failed:', err);
    pool.end();
    process.exit(1);
  });
EOF

# Run schema sync script
cd "${APP_DIR}"
node sync-schema.js | tee -a "$LOG_FILE"

# Step 5: Copy our improved import scripts
echo -e "${BLUE}Step 5: Copying improved import scripts...${NC}" | tee -a "$LOG_FILE"
cp -f "${SOURCE_DIR}/improved-import.js" "${APP_DIR}/improved-import.js"
cp -f "${SOURCE_DIR}/run-improved-import.sh" "${APP_DIR}/run-improved-import.sh"
cp -f "${SOURCE_DIR}/check-and-fix-schema.js" "${APP_DIR}/check-and-fix-schema.js"
cp -f "${SOURCE_DIR}/adaptive-import.js" "${APP_DIR}/adaptive-import.js"
cp -f "${SOURCE_DIR}/run-adaptive-import.sh" "${APP_DIR}/run-adaptive-import.sh"
chmod +x "${APP_DIR}/run-improved-import.sh"
chmod +x "${APP_DIR}/run-adaptive-import.sh"

# Step 6: Update API URL in existing scripts
echo -e "${BLUE}Step 6: Updating API URL in existing scripts...${NC}" | tee -a "$LOG_FILE"
find "${APP_DIR}/scripts" -type f -name "*.sh" -exec sed -i 's#https://ophim1.com#https://phimapi.com#g' {} \;
find "${APP_DIR}/scripts" -type f -name "*.js" -exec sed -i 's#https://ophim1.com#https://phimapi.com#g' {} \;
find "${APP_DIR}/scripts" -type f -name "*.cjs" -exec sed -i 's#https://ophim1.com#https://phimapi.com#g' {} \;

find "${APP_DIR}/server" -type f -name "*.ts" -exec sed -i 's#https://ophim1.com#https://phimapi.com#g' {} \;
find "${APP_DIR}/server" -type f -name "*.js" -exec sed -i 's#https://ophim1.com#https://phimapi.com#g' {} \;

# Step 7: Fix permissions
echo -e "${BLUE}Step 7: Fixing permissions...${NC}" | tee -a "$LOG_FILE"
chown -R www-data:www-data "${APP_DIR}"
find "${APP_DIR}/scripts" -name "*.sh" -exec chmod +x {} \;

echo -e "${GREEN}Environment synchronization completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo ""
echo "Your development and production environments should now be synchronized."
echo "You can run the original import script with:"
echo "  cd ${APP_DIR}/scripts/data && ./import-all-movies-resumable.sh"
echo ""
echo "Or use our improved import script with:"
echo "  cd ${APP_DIR} && ./run-improved-import.sh 1 5"
echo ""
echo "For more details, check the log: ${LOG_FILE}"