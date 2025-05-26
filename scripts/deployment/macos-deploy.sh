#!/bin/bash

# FilmFlex macOS Deployment Script
# This script is specifically optimized for macOS deployments
# It handles database setup and deployment of the FilmFlex application

# Exit on error but with better error handling
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="$HOME/Desktop/1.PROJECT/Film_Flex_Release"
DEPLOY_DIR="$HOME/filmflex_deploy"
LOG_DIR="$HOME/filmflex_logs"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/final-deploy-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Echo to console and log file
log() {
  echo -e "$@"
  echo "$@" | sed 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE"
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
log "${BLUE}===== FilmFlex Deployment Started at $(date) =====${NC}"
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"

# Step 0: Check for required tools
log "${BLUE}0. Checking for required tools...${NC}"

# Check for PostgreSQL
if command -v psql >/dev/null 2>&1 ; then
    PG_VERSION=$(psql --version | head -n 1)
    success "PostgreSQL is installed: $PG_VERSION"
else
    error "PostgreSQL is not installed. Please install it with: brew install postgresql"
    exit 1
fi

# Check for Node.js
if command -v node >/dev/null 2>&1 ; then
    NODE_VERSION=$(node --version)
    success "Node.js is installed: $NODE_VERSION"
else
    error "Node.js is not installed. Please install it with: brew install node"
    exit 1
fi

# Check for PM2
if command -v pm2 >/dev/null 2>&1 ; then
    PM2_VERSION=$(pm2 --version)
    success "PM2 is installed: $PM2_VERSION"
else
    warning "PM2 is not installed. Installing it now..."
    npm install -g pm2
    check_status "PM2 installation"
fi

# Step 1: Fix database schema
log "${BLUE}1. Setting up database...${NC}"

# First check if the PostgreSQL service is running
if pg_isready -q; then
    success "PostgreSQL service is running"
else
    warning "PostgreSQL service is not running. Starting it..."
    brew services start postgresql || {
        error "Could not start PostgreSQL service"
        exit 1
    }
    sleep 3 # Give it a moment to start up
fi

# Check if the filmflex database exists
if psql -l | grep -q filmflex; then
    success "Database 'filmflex' already exists"
else
    log "Creating database 'filmflex'..."
    createdb filmflex || {
        error "Failed to create database. Make sure you have the necessary permissions."
        exit 1
    }
    success "Database 'filmflex' created"
fi

# Check if the filmflex user exists
if psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='filmflex'" postgres | grep -q 1; then
    success "User 'filmflex' already exists"
else
    log "Creating user 'filmflex'..."
    createuser --createdb filmflex || {
        error "Failed to create user 'filmflex'"
        exit 1
    }
    
    # Set the password for the user
    psql -c "ALTER USER filmflex WITH PASSWORD 'filmflex2024'" postgres || {
        error "Failed to set password for user 'filmflex'"
        exit 1
    }
    
    success "User 'filmflex' created and password set"
fi

# Get database connection info from environment or use default
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
            slug TEXT UNIQUE,
            section TEXT,
            is_recommended BOOLEAN DEFAULT FALSE
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
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE IF EXISTS movies ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;

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
            name TEXT,
            slug TEXT,
            filename TEXT,
            link_embed TEXT,
            link_m3u8 TEXT,
            server_name TEXT,
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

-- Create users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP
        );
        -- Insert default admin user
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES ('admin', 'admin@filmflex.com', '$2b$10$6jR7vLxnfg1vKG1a0JU92.2MR3YmTXEuUwQMbNwDrH9yFZn.g2qri', 'FilmFlex Admin', 'admin');
        RAISE NOTICE 'Created users table with default admin user (password: admin2024)';
    END IF;
END$$;

-- Create more indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended);
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at);
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);
EOSQL

# Execute SQL fix
log "Executing SQL fixes..."
if psql filmflex -f /tmp/db-fix.sql; then
    success "Database schema fix completed successfully"
else
    error "Database schema fix failed"
    exit 1
fi

# 2. Stop any existing processes
log "${BLUE}2. Stopping any existing FilmFlex processes...${NC}"
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true

# 3. Create deployment directory if it doesn't exist
log "${BLUE}3. Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/client/dist"
mkdir -p "$DEPLOY_DIR/scripts/data"

# 4. Copy the source package.json and prepare it
log "${BLUE}4. Copying and preparing package.json...${NC}"
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
    "drizzle-orm": "^0.28.6",
    "dotenv": "^16.3.1"
  }
}
EOJSON
fi

# 5. Copy the source code
log "${BLUE}5. Copying server files...${NC}"
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

# 6. Create PM2 ecosystem config
log "${BLUE}6. Creating PM2 ecosystem config...${NC}"
cat > "$DEPLOY_DIR/ecosystem.config.cjs" << EOCONFIG
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
      error_file: "${HOME}/filmflex_logs/error.log",
      out_file: "${HOME}/filmflex_logs/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOCONFIG

# 7. Install dependencies and build
log "${BLUE}7. Installing dependencies...${NC}"
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
require('dotenv').config();

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

// Get movies - basic implementation
app.get('/api/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT * FROM movies ORDER BY modified_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await pool.query('SELECT COUNT(*) FROM movies');
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      status: true,
      items: result.rows,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch movies' });
  }
});

// Get movie by slug - basic implementation
app.get('/api/movies/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM movies WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: false, message: 'Movie not found' });
    }
    
    const movie = result.rows[0];
    
    // Get episodes for this movie
    const episodesResult = await pool.query(
      'SELECT * FROM episodes WHERE movie_slug = $1',
      [slug]
    );
    
    res.json({
      status: true,
      movie: {
        _id: movie.movie_id,
        name: movie.name,
        slug: movie.slug,
        origin_name: movie.origin_name || '',
        content: movie.description || '',
        type: movie.type || '',
        status: movie.status || '',
        thumb_url: movie.thumb_url || '',
        poster_url: movie.poster_url || '',
        trailer_url: movie.trailer_url || '',
        time: movie.time || '',
        quality: movie.quality || '',
        lang: movie.lang || '',
        episode_current: 'Full',
        episode_total: '1',
        view: movie.view || 0,
        actor: movie.actors ? movie.actors.split(', ') : [],
        director: movie.directors ? movie.directors.split(', ') : [],
        category: movie.categories || [],
        country: movie.countries || [],
        isRecommended: movie.is_recommended || false,
        section: movie.section || null
      },
      episodes: episodesResult.rows.map(ep => ({
        server_name: ep.server_name,
        server_data: [{
          name: ep.name,
          slug: ep.slug,
          filename: ep.filename || '',
          link_embed: ep.link_embed,
          link_m3u8: ep.link_m3u8 || ''
        }]
      }))
    });
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch movie' });
  }
});

// Get featured sections
app.get('/api/admin/featured-sections', (req, res) => {
  res.json({
    status: true,
    sections: [
      { 
        id: "trending_now",
        name: "Trending Now",
        description: "Movies that are currently trending"
      },
      {
        id: "latest_movies", 
        name: "Latest Movies",
        description: "Recently added movies"
      },
      {
        id: "top_rated",
        name: "Top Rated", 
        description: "Highest rated movies"
      },
      {
        id: "popular_tv",
        name: "Popular TV Shows",
        description: "Popular TV series and shows"
      }
    ]
  });
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
        npm install express pg dotenv --save
        check_status "Installing minimal server dependencies"
    fi
else
    error "Failed to install dependencies"
    exit 1
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
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
EOENV

# Create .env.local file as well for possible dotenv module usage
cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.local"

# 10. Check for processes using the port before killing them
log "${BLUE}10. Checking for processes using port 5000 before starting server...${NC}"
PROCESSES=$(lsof -i:5000 -t 2>/dev/null)
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

# 11. Create a direct PM2 config file with env variables explicitly set
log "${BLUE}11. Creating PM2 config file with environment variables...${NC}"
cat > "$DEPLOY_DIR/pm2.config.cjs" << EOPMCONFIG
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "${HOME}/filmflex_logs/error.log",
      out_file: "${HOME}/filmflex_logs/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOPMCONFIG

# 12. Start the application with PM2
log "${BLUE}12. Starting application with PM2...${NC}"
cd "$DEPLOY_DIR"

# Optimized for macOS - use fork mode instead of cluster
if pm2 list | grep -q "filmflex"; then
  log "Restarting application with PM2..."
  pm2 restart filmflex || { error "Failed to restart application"; exit 1; }
else
  log "Starting application with PM2..."
  # On macOS, use fork mode instead of cluster mode
  pm2 start "$DEPLOY_DIR/pm2.config.cjs" || { 
    error "Failed to start with pm2.config.cjs, attempting direct start"
    # Try direct start as fallback
    cd "$DEPLOY_DIR"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
    pm2 start dist/index.js --name filmflex || { error "All PM2 start methods failed"; exit 1; }
  }
fi

# 13. Save PM2 process list
pm2 save || warning "Failed to save PM2 process list"

# 14. Check API response
log "${BLUE}13. Checking API response...${NC}"
sleep 3
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"* ]]; then
  success "API is responding correctly: $API_RESPONSE"
else
  warning "API is not responding correctly: $API_RESPONSE"
  log "   - This might be a temporary issue, please try accessing the site manually"
fi

# Create a restart script for easy manual restarting
log "Creating restart script..."
cat > "$DEPLOY_DIR/restart.sh" << 'EORESTART'
#!/bin/bash
# FilmFlex Restart Script
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
export NODE_ENV="production"
export PORT="5000"

cd "$(dirname "$0")"

if pm2 list | grep -q "filmflex"; then
  echo "Restarting FilmFlex with PM2..."
  pm2 restart filmflex
else
  echo "Starting FilmFlex with PM2..."
  pm2 start pm2.config.cjs || pm2 start dist/index.js --name filmflex
fi

echo "Checking application status..."
sleep 2
curl -s http://localhost:5000/api/health
echo ""
echo "Done! Check logs with: pm2 logs filmflex"
EORESTART

chmod +x "$DEPLOY_DIR/restart.sh"

# End deployment
log "${GREEN}===== FilmFlex Deployment Completed at $(date) =====${NC}"
log ""
log "To check the status, use these commands:"
log "  - Server status: pm2 status filmflex"
log "  - Server logs: pm2 logs filmflex"
log "  - API check: curl http://localhost:5000/api/health"
log "  - Web access: Visit http://localhost:5000"
log ""
log "To restart the server:"
log "  - Use the restart script: cd $DEPLOY_DIR && ./restart.sh"
log ""
log "To stop the server:"
log "  - Use PM2: pm2 stop filmflex"
log ""
log "Manual server start (if needed):"
log "  DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex node $DEPLOY_DIR/dist/index.js"