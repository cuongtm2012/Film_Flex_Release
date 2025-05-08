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

-- Check for and add other possibly missing columns
DO \$\$
BEGIN
    -- List of columns to check in movies table 
    -- with their types and default values
    DECLARE
        columns_to_check RECORD[] := ARRAY[
            ROW('origin_name', 'TEXT')::RECORD,
            ROW('description', 'TEXT')::RECORD,
            ROW('thumb_url', 'TEXT')::RECORD,
            ROW('poster_url', 'TEXT')::RECORD,
            ROW('trailer_url', 'TEXT')::RECORD,
            ROW('time', 'TEXT')::RECORD,
            ROW('quality', 'TEXT')::RECORD,
            ROW('lang', 'TEXT')::RECORD,
            ROW('year', 'INTEGER')::RECORD,
            ROW('view', 'INTEGER', '0')::RECORD,
            ROW('actors', 'TEXT')::RECORD,
            ROW('directors', 'TEXT')::RECORD,
            ROW('categories', 'JSONB', '[]')::RECORD,
            ROW('countries', 'JSONB', '[]')::RECORD,
            ROW('modified_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP')::RECORD
        ];
    BEGIN
        FOR i IN 1..array_length(columns_to_check, 1) LOOP
            IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'movies' 
                AND column_name = columns_to_check[i].column_name
            ) THEN
                RAISE NOTICE 'Adding % column to movies table', columns_to_check[i].column_name;
                
                -- Use different SQL syntax depending on if there's a default value
                IF columns_to_check[i].default_value IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE movies ADD COLUMN %I %s DEFAULT %s', 
                        columns_to_check[i].column_name, 
                        columns_to_check[i].data_type,
                        columns_to_check[i].default_value);
                ELSE
                    EXECUTE format('ALTER TABLE movies ADD COLUMN %I %s', 
                        columns_to_check[i].column_name, 
                        columns_to_check[i].data_type);
                END IF;
            ELSE
                RAISE NOTICE '% column already exists', columns_to_check[i].column_name;
            END IF;
        END LOOP;
    END;
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