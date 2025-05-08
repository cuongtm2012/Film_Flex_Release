#!/bin/bash

# FilmFlex Final Deployment Script
# This script handles the final deployment step including database fixes directly
# It handles CommonJS vs ESM conflicts and fixes database schema issues
# Everything is included in one script for simplicity and reliability

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

# Start logging
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BLUE}===== FilmFlex Final Deployment Started at $(date) =====${NC}"
echo "Source directory: $SOURCE_DIR"
echo "Deploy directory: $DEPLOY_DIR"

# Step 0: Fix database schema
echo -e "${BLUE}0. Fixing database schema...${NC}"

# Use default DB connection string if not provided
DB_URL="${DATABASE_URL:-postgresql://filmflex:filmflex2024@localhost:5432/filmflex}"

# Extract database connection details
PGPASSWORD=$(echo "$DB_URL" | grep -o ':[^:]*@' | tr -d ':@')
PGUSER=$(echo "$DB_URL" | grep -o '//[^:]*:' | tr -d '//:')
PGHOST=$(echo "$DB_URL" | grep -o '@[^:]*:' | tr -d '@:')
PGPORT=$(echo "$DB_URL" | grep -o ':[0-9]*/' | tr -d ':/')
PGDATABASE=$(echo "$DB_URL" | grep -o '/[^/]*$' | tr -d '/')

echo -e "${BLUE}Database connection details:${NC}"
echo -e "  Host: $PGHOST"
echo -e "  Port: $PGPORT"
echo -e "  Database: $PGDATABASE"
echo -e "  User: $PGUSER"

# Define SQL to fix database schema
cat > /tmp/db-fix.sql << EOF
-- Check for and add movie_id column
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'movie_id'
    ) THEN
        RAISE NOTICE 'Adding movie_id column to movies table';
        ALTER TABLE movies ADD COLUMN movie_id TEXT;
    ELSE
        RAISE NOTICE 'movie_id column already exists';
    END IF;
END \$\$;

-- Add individual columns one by one instead of using complex array structure
DO \$\$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'name'
    ) THEN
        RAISE NOTICE 'Adding name column to movies table';
        ALTER TABLE movies ADD COLUMN name TEXT;
    ELSE
        RAISE NOTICE 'name column already exists';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'title'
    ) THEN
        RAISE NOTICE 'Adding title column to movies table';
        ALTER TABLE movies ADD COLUMN title TEXT;
    ELSE
        RAISE NOTICE 'title column already exists';
    END IF;

    -- Add origin_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'origin_name'
    ) THEN
        RAISE NOTICE 'Adding origin_name column to movies table';
        ALTER TABLE movies ADD COLUMN origin_name TEXT;
    ELSE
        RAISE NOTICE 'origin_name column already exists';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'description'
    ) THEN
        RAISE NOTICE 'Adding description column to movies table';
        ALTER TABLE movies ADD COLUMN description TEXT;
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;

    -- Add thumb_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'thumb_url'
    ) THEN
        RAISE NOTICE 'Adding thumb_url column to movies table';
        ALTER TABLE movies ADD COLUMN thumb_url TEXT;
    ELSE
        RAISE NOTICE 'thumb_url column already exists';
    END IF;

    -- Add poster_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'poster_url'
    ) THEN
        RAISE NOTICE 'Adding poster_url column to movies table';
        ALTER TABLE movies ADD COLUMN poster_url TEXT;
    ELSE
        RAISE NOTICE 'poster_url column already exists';
    END IF;

    -- Add trailer_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'trailer_url'
    ) THEN
        RAISE NOTICE 'Adding trailer_url column to movies table';
        ALTER TABLE movies ADD COLUMN trailer_url TEXT;
    ELSE
        RAISE NOTICE 'trailer_url column already exists';
    END IF;

    -- Add time column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'time'
    ) THEN
        RAISE NOTICE 'Adding time column to movies table';
        ALTER TABLE movies ADD COLUMN time TEXT;
    ELSE
        RAISE NOTICE 'time column already exists';
    END IF;

    -- Add quality column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'quality'
    ) THEN
        RAISE NOTICE 'Adding quality column to movies table';
        ALTER TABLE movies ADD COLUMN quality TEXT;
    ELSE
        RAISE NOTICE 'quality column already exists';
    END IF;

    -- Add lang column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'lang'
    ) THEN
        RAISE NOTICE 'Adding lang column to movies table';
        ALTER TABLE movies ADD COLUMN lang TEXT;
    ELSE
        RAISE NOTICE 'lang column already exists';
    END IF;

    -- Add year column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'year'
    ) THEN
        RAISE NOTICE 'Adding year column to movies table';
        ALTER TABLE movies ADD COLUMN year INTEGER;
    ELSE
        RAISE NOTICE 'year column already exists';
    END IF;

    -- Add view column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'view'
    ) THEN
        RAISE NOTICE 'Adding view column to movies table';
        ALTER TABLE movies ADD COLUMN view INTEGER DEFAULT 0;
    ELSE
        RAISE NOTICE 'view column already exists';
    END IF;

    -- Add actors column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'actors'
    ) THEN
        RAISE NOTICE 'Adding actors column to movies table';
        ALTER TABLE movies ADD COLUMN actors TEXT;
    ELSE
        RAISE NOTICE 'actors column already exists';
    END IF;

    -- Add directors column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'directors'
    ) THEN
        RAISE NOTICE 'Adding directors column to movies table';
        ALTER TABLE movies ADD COLUMN directors TEXT;
    ELSE
        RAISE NOTICE 'directors column already exists';
    END IF;

    -- Add categories column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'categories'
    ) THEN
        RAISE NOTICE 'Adding categories column to movies table';
        ALTER TABLE movies ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;
    ELSE
        RAISE NOTICE 'categories column already exists';
    END IF;

    -- Add countries column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'countries'
    ) THEN
        RAISE NOTICE 'Adding countries column to movies table';
        ALTER TABLE movies ADD COLUMN countries JSONB DEFAULT '[]'::jsonb;
    ELSE
        RAISE NOTICE 'countries column already exists';
    END IF;

    -- Add modified_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'modified_at'
    ) THEN
        RAISE NOTICE 'Adding modified_at column to movies table';
        ALTER TABLE movies ADD COLUMN modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    ELSE
        RAISE NOTICE 'modified_at column already exists';
    END IF;
END \$\$;

-- Check episodes table structure
DO \$\$
BEGIN
    -- First make sure episodes table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'episodes') THEN
        RAISE NOTICE 'Creating episodes table';
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
        );
    ELSE
        RAISE NOTICE 'episodes table already exists';

        -- Check for movie_slug column in episodes table
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'episodes' 
            AND column_name = 'movie_slug'
        ) THEN
            RAISE NOTICE 'Adding movie_slug column to episodes table';
            ALTER TABLE episodes ADD COLUMN movie_slug TEXT;
        ELSE
            RAISE NOTICE 'movie_slug column already exists in episodes table';
        END IF;
    END IF;
END \$\$;

-- Create indexes for better performance
DO \$\$
BEGIN
    -- Create index on movies slug if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'movies' AND indexname = 'movies_slug_idx'
    ) THEN
        RAISE NOTICE 'Creating index on movies(slug)';
        CREATE INDEX movies_slug_idx ON movies(slug);
    END IF;

    -- Create index on movie_id in movies table if not exists
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'movie_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'movies' AND indexname = 'movies_movie_id_idx'
    ) THEN
        RAISE NOTICE 'Creating index on movies(movie_id)';
        CREATE INDEX movies_movie_id_idx ON movies(movie_id);
    END IF;

    -- Create index on episodes movie_id if not exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'episodes' AND indexname = 'episodes_movie_id_idx'
    ) THEN
        RAISE NOTICE 'Creating index on episodes(movie_id)';
        CREATE INDEX episodes_movie_id_idx ON episodes(movie_id);
    END IF;

    -- Create index on episodes movie_slug if not exists
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'movie_slug'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'episodes' AND indexname = 'episodes_movie_slug_idx'
    ) THEN
        RAISE NOTICE 'Creating index on episodes(movie_slug)';
        CREATE INDEX episodes_movie_slug_idx ON episodes(movie_slug);
    END IF;
END \$\$;
EOF

# Run the SQL file
echo -e "${BLUE}Executing SQL fixes...${NC}"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /tmp/db-fix.sql

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Database schema fix completed successfully${NC}"
  # Clean up
  rm /tmp/db-fix.sql
else
  echo -e "${RED}Database schema fix failed! But continuing with deployment...${NC}"
  echo -e "${YELLOW}You may need to fix database issues manually after deployment.${NC}"
fi

# Step 1: Stop existing PM2 process
echo -e "${BLUE}1. Stopping any existing FilmFlex processes...${NC}"
if pm2 list | grep -q "filmflex"; then
  echo -e "   - Stopping and deleting existing filmflex process"
  pm2 stop filmflex
  pm2 delete filmflex
fi

# Step 2: Prepare deployment directory
echo -e "${BLUE}2. Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
chown -R www-data:www-data "$DEPLOY_DIR"

# Step 3: Create proper package.json without "type": "module"
echo -e "${BLUE}3. Creating proper package.json without ESM type...${NC}"
cat << 'EOL' > "$DEPLOY_DIR/package.json"
{
  "name": "filmflex-server",
  "version": "1.0.0",
  "description": "FilmFlex Production Server",
  "main": "filmflex-server.cjs",
  "scripts": {
    "start": "node filmflex-server.cjs"
  },
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.15.0",
    "axios": "^1.6.7"
  }
}
EOL

# Step 4: Copy CommonJS server file to deployment directory
echo -e "${BLUE}4. Copying CommonJS server file...${NC}"
cp "$SOURCE_DIR/scripts/deployment/filmflex-server.cjs" "$DEPLOY_DIR/filmflex-server.cjs"
chmod +x "$DEPLOY_DIR/filmflex-server.cjs"

# Step 5: Create start script for the application
echo -e "${BLUE}5. Creating start script...${NC}"
cat << 'EOL' > "$DEPLOY_DIR/start.sh"
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node filmflex-server.cjs
EOL
chmod +x "$DEPLOY_DIR/start.sh"

# Step 6: Install dependencies
echo -e "${BLUE}6. Installing dependencies...${NC}"
cd "$DEPLOY_DIR"
npm install

# Step 7: Copy scripts directory and fix permissions
echo -e "${BLUE}7. Copying scripts directory...${NC}"
mkdir -p "$DEPLOY_DIR/scripts/data"
mkdir -p "$DEPLOY_DIR/scripts/deployment"

# Copy important import scripts
echo -e "   - Copying import scripts..."
cp -R "$SOURCE_DIR/scripts/data/import-all-movies-resumable.sh" "$DEPLOY_DIR/scripts/data/"
cp -R "$SOURCE_DIR/scripts/data/import-movies.sh" "$DEPLOY_DIR/scripts/data/"
cp -R "$SOURCE_DIR/scripts/data/import-movies-sql.cjs" "$DEPLOY_DIR/scripts/data/"
cp -R "$SOURCE_DIR/scripts/data/setup-cron.sh" "$DEPLOY_DIR/scripts/data/"
cp -R "$SOURCE_DIR/scripts/deployment/filmflex-server.cjs" "$DEPLOY_DIR/scripts/deployment/"
cp -R "$SOURCE_DIR/scripts/deployment/final-deploy.sh" "$DEPLOY_DIR/scripts/deployment/"

# Create a README file explaining the scripts
cat << 'EOL' > "$DEPLOY_DIR/scripts/README.md"
# FilmFlex Scripts

This directory contains essential scripts for managing the FilmFlex application.

## Data Import Scripts

These scripts are located in the `data` directory:

- `import-movies.sh`: Daily import of new movies
- `import-all-movies-resumable.sh`: Full import with resume capability
- `setup-cron.sh`: Configure automatic daily imports

## Deployment Scripts

These scripts are located in the `deployment` directory:

- `final-deploy.sh`: Comprehensive deployment script that also fixes database schema
- `filmflex-server.cjs`: Production server file

For more information, see the README files in each directory.
EOL

# Make scripts executable
chmod +x "$DEPLOY_DIR/scripts/data/"*.sh
chmod +x "$DEPLOY_DIR/scripts/deployment/"*.sh

# Step 8: Setup environment variables
echo -e "${BLUE}8. Setting up environment variables...${NC}"
if [ -f "$SOURCE_DIR/.env" ]; then
  cp "$SOURCE_DIR/.env" "$DEPLOY_DIR/.env"
else
  cat << 'EOL' > "$DEPLOY_DIR/.env"
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
EOL
fi

# Step 9: Start the server with PM2
echo -e "${BLUE}9. Starting server with PM2...${NC}"

# Check for existing processes using port 5000
echo -e "   - Checking for processes using port 5000..."
PORT_CHECK=$(netstat -tulpn 2>/dev/null | grep ':5000 ' || ss -tulpn 2>/dev/null | grep ':5000 ')

if [ ! -z "$PORT_CHECK" ]; then
  echo -e "   ${YELLOW}! Port 5000 is already in use${NC}"
  echo -e "$PORT_CHECK"
  
  # Check if it's a PM2 process
  if pm2 list | grep -q "filmflex"; then
    echo -e "   - Found existing filmflex PM2 process. Stopping and deleting..."
    pm2 stop filmflex
    pm2 delete filmflex
  else
    echo -e "   - Found non-PM2 process using port 5000. Attempting to kill..."
    PID=$(echo "$PORT_CHECK" | grep -oP '(?<=LISTEN\s+)[0-9]+' || echo "$PORT_CHECK" | grep -oP '(?<=pid=)[0-9]+')
    if [ ! -z "$PID" ]; then
      echo -e "   - Killing process with PID: $PID"
      kill -9 $PID 2>/dev/null || true
      sleep 2
    fi
  fi
fi

# Now start the server
cd "$DEPLOY_DIR"
pm2 start filmflex-server.cjs --name filmflex
pm2 save

# Step 10: Check if server is running
echo -e "${BLUE}10. Verifying server status...${NC}"
sleep 5
if pm2 list | grep -q "online" | grep -q "filmflex"; then
  echo -e "   ${GREEN}✓ Server started successfully!${NC}"
  pm2 status filmflex
else
  echo -e "   ${YELLOW}! Server failed to start properly${NC}"
  echo -e "   - Starting with direct method..."
  pm2 stop filmflex
  pm2 delete filmflex
  pm2 start "$DEPLOY_DIR/start.sh" --name filmflex
  pm2 save
  
  sleep 5
  if pm2 list | grep -q "online" | grep -q "filmflex"; then
    echo -e "   ${GREEN}✓ Server started successfully with start.sh!${NC}"
  else
    echo -e "   ${RED}! All automatic methods failed${NC}"
    echo -e "   - Please try manually running: node $DEPLOY_DIR/filmflex-server.cjs"
  fi
fi

# Step 11: Check server response
echo -e "${BLUE}11. Checking API response...${NC}"
RESPONSE=$(curl -s http://localhost:5000/api/health || echo "Failed to connect")
if [[ "$RESPONSE" == *"status"*"ok"* ]]; then
  echo -e "   ${GREEN}✓ API is responding correctly: $RESPONSE${NC}"
else
  echo -e "   ${RED}! API is not responding correctly: $RESPONSE${NC}"
fi

# Step 12: Reload Nginx
echo -e "${BLUE}12. Reloading Nginx configuration...${NC}"
nginx -t && systemctl reload nginx

echo -e "${GREEN}===== FilmFlex Final Deployment Completed at $(date) =====${NC}"
echo
echo -e "${BLUE}To check the status, use these commands:${NC}"
echo -e "  - Server status: ${YELLOW}pm2 status filmflex${NC}"
echo -e "  - Server logs: ${YELLOW}pm2 logs filmflex${NC}"
echo -e "  - API check: ${YELLOW}curl http://localhost:5000/api/health${NC}"
echo -e "  - Web check: ${YELLOW}Visit https://phimgg.com${NC}"
echo
echo -e "${BLUE}Movie import commands:${NC}"
echo -e "  - Daily import: ${YELLOW}cd $DEPLOY_DIR/scripts/data && ./import-movies.sh${NC}"
echo -e "  - Full import (resumable): ${YELLOW}cd $DEPLOY_DIR/scripts/data && ./import-all-movies-resumable.sh${NC}"
echo -e "  - Set up cron jobs: ${YELLOW}cd $DEPLOY_DIR/scripts/data && sudo ./setup-cron.sh${NC}"
echo
echo -e "${BLUE}Need help or encountered issues?${NC}"
echo -e "  The comprehensive database fix is now ${GREEN}built directly into this script${NC}."
echo -e "  This script can be run again at any time to fix both deployment and database issues."
echo -e "  Manual server start: ${YELLOW}node $DEPLOY_DIR/filmflex-server.cjs${NC}"