#!/bin/bash

# FilmFlex Simple Database Fix Tool
# This script adds the missing movie_id column to the movies table

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "  FilmFlex Quick Database Column Fix"
echo "========================================"
echo -e "${NC}"

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

echo -e "${YELLOW}Adding movie_id column to movies table...${NC}"

# Simple SQL to add the movie_id column
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" << EOF
-- Add movie_id column to movies table if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'movie_id'
    ) THEN
        ALTER TABLE movies ADD COLUMN movie_id TEXT;
        RAISE NOTICE 'Added movie_id column to movies table';
    ELSE
        RAISE NOTICE 'movie_id column already exists';
    END IF;
END \$\$;

-- Show current structure of movies table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'movies'
ORDER BY ordinal_position;
EOF

# Check if the command was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully added movie_id column to movies table${NC}"
  echo -e "${GREEN}You can now run the import scripts with:${NC}"
  echo -e "${BLUE}cd ~/Film_Flex_Release/scripts/data${NC}"
  echo -e "${BLUE}./import-all-movies-resumable.sh${NC}"
  exit 0
else
  echo -e "${RED}Failed to add movie_id column to movies table${NC}"
  echo -e "${RED}For a more comprehensive fix, try running fix-db-columns.sh${NC}"
  exit 1
fi