#!/bin/bash

# Reimport Episodes Script
# This script reimports episodes for a specific movie using the import-movies-sql.cjs script
# Usage: ./reimport-episodes.sh [slug]

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
SCRIPT_NAME="import-movies-sql.cjs"
DB_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

# Get movie slug from command line or prompt for it
if [ -z "$1" ]; then
  read -p "Enter movie slug to reimport episodes for: " MOVIE_SLUG
else
  MOVIE_SLUG="$1"
fi

# Ensure slug is provided
if [ -z "$MOVIE_SLUG" ]; then
  echo -e "${RED}Error: No movie slug provided.${NC}"
  exit 1
fi

echo -e "${BLUE}======================================================"
echo "  FilmFlex Episode Reimport Tool"
echo "======================================================${NC}"
echo -e "${GREEN}Reimporting episodes for movie: ${MOVIE_SLUG}${NC}"

# Function to check if psql is available
check_psql() {
  if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Warning: psql command not found. Will use direct import method.${NC}"
    return 1
  fi
  
  # Try a simple psql command to see if it works
  psql -c "SELECT 1;" "$DB_URL" &> /dev/null
  return $?
}

# Verify that the movie exists in the database
echo -e "${BLUE}Checking if movie exists in database...${NC}"

if check_psql; then
  # psql is available and working
  MOVIE_COUNT=$(psql -t "$DB_URL" -c "SELECT COUNT(*) FROM movies WHERE slug='${MOVIE_SLUG}';" | xargs)
  
  if [ "$MOVIE_COUNT" -eq 0 ]; then
    echo -e "${RED}Error: Movie '${MOVIE_SLUG}' not found in database.${NC}"
    read -p "Do you want to import this movie and its episodes? (y/n): " IMPORT_NEW
    
    if [[ "$IMPORT_NEW" != "y" ]]; then
      echo -e "${YELLOW}Operation cancelled.${NC}"
      exit 0
    fi
    
    echo -e "${YELLOW}Will import movie '${MOVIE_SLUG}' and its episodes...${NC}"
  else
    echo -e "${GREEN}Movie '${MOVIE_SLUG}' found in database.${NC}"
    
    # Check for existing episodes
    EXISTING_COUNT=$(psql -t "$DB_URL" -c "SELECT COUNT(*) FROM episodes WHERE movie_slug='${MOVIE_SLUG}';" | xargs)
    
    if [ "$EXISTING_COUNT" -gt 0 ]; then
      echo -e "${YELLOW}Found $EXISTING_COUNT existing episodes for this movie.${NC}"
      read -p "Delete existing episodes first? (y/n): " DELETE_EXISTING
      
      if [[ "$DELETE_EXISTING" == "y" ]]; then
        echo -e "${YELLOW}Deleting existing episodes...${NC}"
        psql "$DB_URL" -c "DELETE FROM episodes WHERE movie_slug='${MOVIE_SLUG}';"
        echo -e "${GREEN}Existing episodes deleted.${NC}"
      fi
    fi
  fi
else
  # psql not available, skip database checks
  echo -e "${YELLOW}Unable to check database directly. Will proceed with import.${NC}"
fi

# Run import script with the specific movie slug and force import flag
echo -e "${BLUE}Reimporting episodes for movie: ${MOVIE_SLUG}${NC}"
DATABASE_URL="$DB_URL" NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" --movie-slug="${MOVIE_SLUG}" --force-import

# Get the import result
IMPORT_STATUS=$?

# Check if import was successful
if [ $IMPORT_STATUS -eq 0 ]; then
  # Check if episodes were imported
  echo -e "${BLUE}Checking if episodes were imported successfully...${NC}"
  
  if check_psql; then
    NEW_COUNT=$(psql -t "$DB_URL" -c "SELECT COUNT(*) FROM episodes WHERE movie_slug='${MOVIE_SLUG}';" | xargs)
    
    if [ "$NEW_COUNT" -gt 0 ]; then
      echo -e "${GREEN}SUCCESS! ${NEW_COUNT} episodes were imported for movie: ${MOVIE_SLUG}${NC}"
      echo -e "${BLUE}Episode details:${NC}"
      psql "$DB_URL" -c "SELECT id, server_name, name, link_embed, link_m3u8 FROM episodes WHERE movie_slug='${MOVIE_SLUG}';"
    else
      echo -e "${RED}ERROR: No episodes were imported for movie: ${MOVIE_SLUG}${NC}"
    fi
  else
    echo -e "${GREEN}Import process completed successfully.${NC}"
    echo -e "${YELLOW}Cannot verify episode count because psql is not available.${NC}"
  fi
else
  echo -e "${RED}ERROR: Import process failed with status code ${IMPORT_STATUS}${NC}"
fi

echo -e "${BLUE}======================================================"
echo "  Operation completed"
echo "======================================================${NC}"

exit 0 