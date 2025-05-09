#!/bin/bash

# FilmFlex Final Deployment Script
# This script handles the final deployment step including database fixes directly
# It handles CommonJS vs ESM conflicts and fixes database schema issues
# Everything is included in one script for simplicity and reliability

# Exit on error but with better error handling
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/final-deploy-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Echo to console and log file
log() {
  echo -e "$@"
  echo "$@" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" >> "$LOG_FILE"
}

# Log a success message
success() {
  log "${GREEN}✓ $@${NC}"
}

# Log a warning message
warning() {
  log "${YELLOW}! $@${NC}"
}

# Log an error message
error() {
  log "${RED}✗ $@${NC}"
}

# Function to check command status and exit if failed
check_status() {
  if [ $? -ne 0 ]; then
    error "$1 failed"
    exit 1
  else
    success "$1 successful"
  fi
}

# Start deployment
log "${BLUE}===== FilmFlex Final Deployment Started at $(date) =====${NC}"
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"

# Step 0: Fix database schema
log "${BLUE}0. Fixing database schema...${NC}"

# Get database connection info from environment or use default
if [ -n "$DATABASE_URL" ]; then
  # Use DATABASE_URL from environment if available
  log "Using DATABASE_URL from environment variable"
  DB_URL="$DATABASE_URL"
else
  # Use default connection string
  log "Using default DATABASE_URL"
  DB_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
fi

# Set PostgreSQL environment variables
export PGHOST="localhost"
export PGDATABASE="filmflex"
export PGUSER="filmflex"
export PGPASSWORD="filmflex2024"
export PGPORT="5432"

log "${BLUE}Database connection details:${NC}"
log "  Host: $PGHOST"
log "  Port: $PGPORT"
log "  Database: $PGDATABASE"
log "  User: $PGUSER"

# Create SQL fix file
cat > /tmp/db-fix.sql << 'EOSQL'
-- First check if tables exist and create them if they don't
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'movies') THEN
        CREATE TABLE movies (
            id SERIAL PRIMARY KEY,
            movie_id TEXT,
            name TEXT,
            title TEXT,
            origin_name TEXT,
            description TEXT,
            thumb_url TEXT,
            poster_url TEXT,
            trailer_url TEXT,
            time TEXT,
            quality TEXT,
            lang TEXT,
            year TEXT,
            view TEXT,
            actors TEXT,
            directors TEXT,
            categories TEXT[],
            countries TEXT[],
            modified_at TIMESTAMP DEFAULT NOW(),
            type TEXT,
            status TEXT,
            slug TEXT UNIQUE
        );
        RAISE NOTICE 'Created movies table';
    END IF;
END$$;

-- Now proceed with the regular schema fixes
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS movie_id TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS origin_name TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS thumb_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS view TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS actors TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS directors TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS countries TEXT[];
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT NOW();
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint to slug if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'movies_slug_key' AND conrelid = 'movies'::regclass
    ) THEN
        ALTER TABLE movies ADD CONSTRAINT movies_slug_key UNIQUE (slug);
        RAISE NOTICE 'Added unique constraint to slug column';
    END IF;
END$$;

-- Use a simpler approach to fix array columns
DO $$
BEGIN
    -- Fix categories column
    EXECUTE 'ALTER TABLE movies ALTER COLUMN categories TYPE TEXT[] USING 
        CASE 
            WHEN categories IS NULL THEN NULL::TEXT[] 
            WHEN categories::TEXT = ''{NULL}'' THEN NULL::TEXT[] 
            ELSE CASE 
                WHEN categories ~ E''^\\{.*\\}$'' THEN categories::TEXT[] 
                ELSE string_to_array(categories::TEXT, '','')
            END 
        END';
    RAISE NOTICE 'Fixed categories column';
    
    -- Fix countries column
    EXECUTE 'ALTER TABLE movies ALTER COLUMN countries TYPE TEXT[] USING 
        CASE 
            WHEN countries IS NULL THEN NULL::TEXT[] 
            WHEN countries::TEXT = ''{NULL}'' THEN NULL::TEXT[] 
            ELSE CASE 
                WHEN countries ~ E''^\\{.*\\}$'' THEN countries::TEXT[] 
                ELSE string_to_array(countries::TEXT, '','')
            END 
        END';
    RAISE NOTICE 'Fixed countries column';
END$$;

-- Create episodes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'episodes') THEN
        CREATE TABLE episodes (
            id SERIAL PRIMARY KEY,
            movie_slug TEXT,
            title TEXT,
            server_name TEXT,
            server_data JSONB,
            link_embed TEXT,
            link_m3u8 TEXT,
            episode_number INTEGER,
            season_number INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            modified_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created episodes table';
    ELSE
        RAISE NOTICE 'episodes table already exists';
    END IF;
    
    -- Add movie_slug column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'movie_slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN movie_slug TEXT;
        RAISE NOTICE 'Added movie_slug column to episodes table';
    ELSE
        RAISE NOTICE 'movie_slug column already exists in episodes table';
    END IF;
    
    -- Add foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'episodes_movie_slug_fkey' AND conrelid = 'episodes'::regclass
    ) THEN
        -- Make sure all existing movie_slug values exist in movies.slug
        DELETE FROM episodes WHERE movie_slug NOT IN (SELECT slug FROM movies WHERE slug IS NOT NULL);
        -- Add the foreign key constraint
        ALTER TABLE episodes ADD CONSTRAINT episodes_movie_slug_fkey 
            FOREIGN KEY (movie_slug) REFERENCES movies(slug) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to movie_slug column';
    END IF;
END$$;

-- Create more indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at);
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);
EOSQL

# Execute SQL fix
log "Executing SQL fixes..."
if psql -f /tmp/db-fix.sql; then
    success "Database schema fix completed successfully"
else
    error "Database schema fix failed"
    exit 1
fi

# 1. Stop any existing processes
log "${BLUE}1. Stopping any existing FilmFlex processes...${NC}"
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true

# 2. Create deployment directory if it doesn't exist
log "${BLUE}2. Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/client/dist"
mkdir -p "$DEPLOY_DIR/scripts/data"

# 3. Copy the source package.json and prepare it
log "${BLUE}3. Copying and preparing package.json...${NC}"
if [ -f "$SOURCE_DIR/package.json" ]; then
  cp "$SOURCE_DIR/package.json" "$DEPLOY_DIR/package.json"
  check_status "Package.json copy"
else
  # Fallback if package.json is not found
  log "Package.json not found in source, creating standard one..."
  cat > "$DEPLOY_DIR/package.json" << 'EOJSON'
{
  "name": "filmflex",
  "version": "1.0.0",
  "description": "FilmFlex Production Server",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "@neondatabase/serverless": "^0.7.2",
    "drizzle-orm": "^0.28.6"
  }
}
EOJSON
fi

# 4. Copy the source code
log "${BLUE}4. Copying server files...${NC}"
if [ -d "$SOURCE_DIR/server" ]; then
  mkdir -p "$DEPLOY_DIR/server"
  cp -r "$SOURCE_DIR/server"/* "$DEPLOY_DIR/server/"
  check_status "Server code copy"
else
  warning "Server source directory not found"
fi

if [ -d "$SOURCE_DIR/shared" ]; then
  mkdir -p "$DEPLOY_DIR/shared"
  cp -r "$SOURCE_DIR/shared"/* "$DEPLOY_DIR/shared/"
  check_status "Shared code copy"
else
  warning "Shared source directory not found"
fi

# 5. Create PM2 ecosystem config
log "${BLUE}5. Creating PM2 ecosystem config...${NC}"
cat > "$DEPLOY_DIR/ecosystem.config.cjs" << 'EOCONFIG'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOCONFIG

# 6. Install dependencies and build
log "${BLUE}6. Installing dependencies...${NC}"
cd "$DEPLOY_DIR"
if npm install; then
    success "Dependencies installed successfully"
    
    log "Building application..."
    
    # Approach 1: Try to use the pre-built server directly from the source directory
    if [ -d "$SOURCE_DIR/dist" ] && [ -f "$SOURCE_DIR/dist/index.js" ]; then
        log "Found pre-built server code, using it directly..."
        mkdir -p "$DEPLOY_DIR/dist"
        cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/dist/"
        success "Server code copied successfully from pre-built source"
    else
        # Approach 2: Create a simple express server file as fallback
        log "Pre-built server not found, creating fallback server file..."
        mkdir -p "$DEPLOY_DIR/dist"
        
        # Create a simple Express server file that serves static files
        cat > "$DEPLOY_DIR/dist/index.js" << 'EOJS'
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex'
});

// Middleware to parse JSON
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files - serve the client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Database URL: ${process.env.DATABASE_URL || 'using default connection'}`);
});
EOJS
        success "Created fallback server file"
        
        # Install minimal dependencies needed for the fallback server
        cd "$DEPLOY_DIR"
        npm install express pg --save
        check_status "Installing minimal server dependencies"
    fi
else
    error "Failed to install dependencies"
    exit 1
fi

# 7. Copy scripts directory
log "${BLUE}7. Copying scripts directory...${NC}"
log "   - Copying import scripts..."
mkdir -p "$DEPLOY_DIR/scripts/data"
if [ -d "$SOURCE_DIR/scripts/data" ]; then
    cp -r "$SOURCE_DIR/scripts/data"/* "$DEPLOY_DIR/scripts/data/" || warning "Failed to copy some data scripts"
    chmod +x "$DEPLOY_DIR/scripts/data"/*.sh 2>/dev/null || warning "Failed to make scripts executable"
else
    warning "Source scripts/data directory not found"
fi

# 8. Copy client
if [ -d "$SOURCE_DIR/client/dist" ]; then
  log "${BLUE}8. Copying client dist files...${NC}"
  cp -r "$SOURCE_DIR/client/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files"
else
  warning "Client dist directory not found at $SOURCE_DIR/client/dist"
  # Try to find it elsewhere
  if [ -d "$SOURCE_DIR/dist" ]; then
    log "Found client files at $SOURCE_DIR/dist, copying..."
    cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files from alternate location"
  fi
fi

# 9. Set up environment
log "${BLUE}9. Setting up environment variables...${NC}"
cat > "$DEPLOY_DIR/.env" << 'EOENV'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
EOENV

# 10. Check for processes using the port before killing them
log "${BLUE}10. Checking for processes using port 5000 before starting server...${NC}"
PROCESSES=$(lsof -i:5000 -t 2>/dev/null || ss -tulpn 2>/dev/null | grep ':5000 ' | awk '{print $7}' | cut -d= -f2 | cut -d, -f1)
if [ -n "$PROCESSES" ]; then
  log "   - Found processes using port 5000: $PROCESSES"
  log "   - Stopping these processes safely..."
  for PID in $PROCESSES; do
    log "     - Sending SIGTERM to process $PID"
    kill $PID 2>/dev/null || true
    sleep 1
    # Only use SIGKILL if process still exists
    if kill -0 $PID 2>/dev/null; then
      log "     - Process $PID still running, sending SIGKILL"
      kill -9 $PID 2>/dev/null || true
    fi
  done
  sleep 2
fi

# 11. Setup systemd service for PM2 and start server
log "${BLUE}11. Setting up PM2 startup service...${NC}"
cd "$DEPLOY_DIR"
pm2 startup systemd || warning "Failed to set up PM2 startup hook"

# Start or restart the application with PM2
if pm2 list | grep -q "filmflex"; then
  log "Restarting application with PM2..."
  pm2 restart filmflex || { error "Failed to restart application"; exit 1; }
else
  log "Starting application with PM2..."
  pm2 start ecosystem.config.cjs || { error "Failed to start application"; exit 1; }
fi

# Save PM2 process list
pm2 save || warning "Failed to save PM2 process list"

# 12. Set proper permissions for the deploy directory
log "${BLUE}12. Setting proper permissions...${NC}"
chown -R www-data:www-data "$DEPLOY_DIR" || warning "Failed to set permissions"

# 13. Check API response
log "${BLUE}13. Checking API response...${NC}"
sleep 3
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"* ]]; then
  success "API is responding correctly: $API_RESPONSE"
else
  warning "API is not responding correctly: $API_RESPONSE"
  log "   - This might be a temporary issue, please try accessing the site manually"
fi

# 14. Reload Nginx
log "${BLUE}14. Reloading Nginx configuration...${NC}"
if nginx -t; then
  systemctl reload nginx
  success "Nginx configuration reloaded"
else
  error "Nginx configuration test failed"
fi

# End deployment
log "${GREEN}===== FilmFlex Final Deployment Completed at $(date) =====${NC}"
log ""
log "To check the status, use these commands:"
log "  - Server status: pm2 status filmflex"
log "  - Server logs: pm2 logs filmflex"
log "  - API check: curl http://localhost:5000/api/health"
log "  - Web check: Visit https://phimgg.com"
log ""
log "Movie import commands:"
log "  - Daily import: cd $DEPLOY_DIR/scripts/data && ./import-movies.sh"
log "  - Full import (resumable): cd $DEPLOY_DIR/scripts/data && ./import-all-movies-resumable.sh"
log "  - Set up cron jobs: cd $DEPLOY_DIR/scripts/data && sudo ./setup-cron.sh"
log ""
log "Need help or encountered issues?"
log "  The comprehensive database fix is now built directly into this script."
log "  This script can be run again at any time to fix both deployment and database issues."
log "  Manual server start: node $DEPLOY_DIR/dist/index.js"