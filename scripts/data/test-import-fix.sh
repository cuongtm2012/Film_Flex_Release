#!/bin/bash

# Test script to verify the episode import fix
# Usage: ./test-import-fix.sh [slug]

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
SCRIPT_NAME="import-movies-sql.cjs"

# Set database URL
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

# Get movie slug from command line or use default
MOVIE_SLUG=${1:-"lop-kien-truc-101"}

echo -e "${BLUE}======================================================"
echo "  FilmFlex Episode Import Fix Test"
echo "======================================================${NC}"
echo -e "${GREEN}Testing episode import fix for movie: ${MOVIE_SLUG}${NC}"

# Check for existing episodes for this movie
echo -e "${BLUE}Checking for existing episodes...${NC}"
EXISTING_COUNT=$(psql -t "postgresql://filmflex:filmflex2024@localhost:5432/filmflex" -c "SELECT COUNT(*) FROM episodes WHERE movie_slug='${MOVIE_SLUG}';" | xargs)

if [ "$EXISTING_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}Found $EXISTING_COUNT existing episodes for this movie.${NC}"
  read -p "Delete existing episodes first? (y/n): " DELETE_EXISTING
  
  if [[ "$DELETE_EXISTING" == "y" ]]; then
    echo -e "${YELLOW}Deleting existing episodes...${NC}"
    psql "postgresql://filmflex:filmflex2024@localhost:5432/filmflex" -c "DELETE FROM episodes WHERE movie_slug='${MOVIE_SLUG}';"
    echo -e "${GREEN}Existing episodes deleted.${NC}"
  fi
fi

# Run import script with the specific movie slug
echo -e "${BLUE}Running import script for movie: ${MOVIE_SLUG}${NC}"
DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex" NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" --single-page --page-num=1 --page-size=1 --movie-slug="${MOVIE_SLUG}" --force-import

# Check if episodes were imported
echo -e "${BLUE}Checking if episodes were imported successfully...${NC}"
NEW_COUNT=$(psql -t "postgresql://filmflex:filmflex2024@localhost:5432/filmflex" -c "SELECT COUNT(*) FROM episodes WHERE movie_slug='${MOVIE_SLUG}';" | xargs)

if [ "$NEW_COUNT" -gt 0 ]; then
  echo -e "${GREEN}SUCCESS! ${NEW_COUNT} episodes were imported for movie: ${MOVIE_SLUG}${NC}"
  echo -e "${BLUE}Episode details:${NC}"
  psql "postgresql://filmflex:filmflex2024@localhost:5432/filmflex" -c "SELECT id, server_name, name, link_embed, link_m3u8 FROM episodes WHERE movie_slug='${MOVIE_SLUG}';"
else
  echo -e "${RED}ERROR: No episodes were imported for movie: ${MOVIE_SLUG}${NC}"
fi

echo -e "${BLUE}======================================================"
echo "  Test completed"
echo "======================================================${NC}"

exit 0 