#!/bin/bash

# FilmFlex Database Schema Fix Tool
# This script adds missing columns to the database tables

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
LOG_DIR="${APP_DIR}/log"
LOG_FILE="${LOG_DIR}/db-fix-$(date '+%Y-%m-%d').log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Database Schema Fix"
echo "========================================"
echo -e "${NC}"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Check if running as root (recommended for DB operations)
if [ "$(id -u)" != "0" ]; then
  echo -e "${YELLOW}Warning: Not running as root. May have permission issues.${NC}"
  echo -e "${YELLOW}Consider running as: sudo $0${NC}"
fi

# Make sure the DATABASE_URL is defined
DB_URL="${DATABASE_URL:-postgresql://filmflex:filmflex2024@localhost:5432/filmflex}"

echo -e "${BLUE}[$DATE] Starting database schema fix...${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}Using database: ${DB_URL}${NC}" | tee -a "$LOG_FILE"

# Define SQL to check for and add the column
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

-- Show current structure of movies table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movies'
ORDER BY ordinal_position;
EOF

# Run the SQL file
echo -e "${BLUE}[$DATE] Executing SQL fixes...${NC}" | tee -a "$LOG_FILE"
export PGPASSWORD="${DB_URL#*:*@*:*\/}"
PGPASSWORD=$(echo "$DB_URL" | grep -o ':[^:]*@' | tr -d ':@')
PGUSER=$(echo "$DB_URL" | grep -o '//[^:]*:' | tr -d '//:')
PGHOST=$(echo "$DB_URL" | grep -o '@[^:]*:' | tr -d '@:')
PGPORT=$(echo "$DB_URL" | grep -o ':[0-9]*/' | tr -d ':/')
PGDATABASE=$(echo "$DB_URL" | grep -o '/[^/]*$' | tr -d '/')

echo -e "${BLUE}Database connection details:${NC}" | tee -a "$LOG_FILE"
echo -e "  Host: $PGHOST" | tee -a "$LOG_FILE"
echo -e "  Port: $PGPORT" | tee -a "$LOG_FILE"
echo -e "  Database: $PGDATABASE" | tee -a "$LOG_FILE"
echo -e "  User: $PGUSER" | tee -a "$LOG_FILE"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /tmp/db-fix.sql 2>&1 | tee -a "$LOG_FILE"

# Check if the command was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "${GREEN}[$DATE] Database schema fix completed successfully${NC}" | tee -a "$LOG_FILE"
  
  # Clean up
  rm /tmp/db-fix.sql
  
  echo -e "${GREEN}You can now run the import scripts with:${NC}"
  echo -e "${BLUE}cd $APP_DIR/scripts/data${NC}"
  echo -e "${BLUE}./import-all-movies-resumable.sh${NC}"
  
  exit 0
else
  echo -e "${RED}[$DATE] Database schema fix failed!${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}See the log for details: $LOG_FILE${NC}"
  exit 1
fi