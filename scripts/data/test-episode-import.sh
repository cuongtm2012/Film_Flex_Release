#!/bin/bash

# Test script to import episodes for a specific movie
# Usage: ./test-episode-import.sh [slug]

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
SCRIPT_NAME="import-movies-sql.cjs"

# Get movie slug from command line or use default
MOVIE_SLUG=${1:-"lop-kien-truc-101"}

echo -e "${BLUE}======================================================"
echo "  FilmFlex Episode Import Test Script"
echo "======================================================${NC}"
echo -e "${GREEN}Testing episode import for movie: ${MOVIE_SLUG}${NC}"

# Make sure Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

# Install dependencies if needed
cd "$APP_DIR"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Make sure script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Run import script in single page mode with the specific movie slug
echo -e "${BLUE}Running import script for movie: ${MOVIE_SLUG}${NC}"
NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" --single-page --page-num=1 --page-size=1 --movie-slug="${MOVIE_SLUG}"

# Check if episodes were imported
echo -e "${BLUE}Checking if episodes were imported...${NC}"
EPISODES_COUNT=$(psql -t -U filmflex -d filmflex -c "SELECT COUNT(*) FROM episodes WHERE movie_slug='${MOVIE_SLUG}';" | xargs)

if [ "$EPISODES_COUNT" -gt 0 ]; then
  echo -e "${GREEN}Success! ${EPISODES_COUNT} episodes were imported for movie: ${MOVIE_SLUG}${NC}"
  echo -e "${BLUE}Episode details:${NC}"
  psql -U filmflex -d filmflex -c "SELECT server_name, name, link_embed, link_m3u8 FROM episodes WHERE movie_slug='${MOVIE_SLUG}';"
else
  echo -e "${RED}No episodes were imported for movie: ${MOVIE_SLUG}${NC}"
fi

exit 0 