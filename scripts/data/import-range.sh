#!/bin/bash

# PhimGG Movie Import Range Script
# This script imports movies from a specified range of pages

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
RANGE_LOG="${LOG_DIR}/range-import.log"
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"
DATABASE_URL=${DATABASE_URL:-"postgresql://filmflex:filmflex2024@localhost:5432/filmflex"}

# Make sure log directory exists
mkdir -p "$LOG_DIR"
echo "=== Range import started at $(date) ===" > "$RANGE_LOG"

# Parse database connection parameters
echo -e "${BLUE}Parsing database connection parameters...${NC}"
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
echo "DB parameters: host=$DB_HOST, port=$DB_PORT, user=$DB_USER, db=$DB_NAME" >> "$RANGE_LOG"

# Verify we have jq installed
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq is required but not installed.${NC}"; exit 1; }

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}Database connection successful${NC}"
else
  echo -e "${RED}Failed to connect to database. Please check your DATABASE_URL${NC}"
  exit 1
fi

# Function to check if a movie exists in database
movie_exists() {
  local slug=$1
  local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM movies WHERE slug = '$slug'" 2>/dev/null)
  count=$(echo "$count" | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    return 0
  else
    return 1
  fi
}

# Process a single page of movies
import_page() {
  local page=$1
  echo -e "${BLUE}Importing movies from page $page...${NC}"
  echo "Importing page $page at $(date)" >> "$RANGE_LOG"
  
  # Fetch the movie list for this page
  local api_url="${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${page}"
  echo -e "${BLUE}Fetching: $api_url${NC}"
  
  # Use curl to fetch movie list and save to a temporary file
  local response_file="${SCRIPT_DIR}/page_${page}.json"
  curl -s "$api_url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" > "$response_file"
  
  # Debugging: save a copy for inspection
  cp "$response_file" "${SCRIPT_DIR}/debug_page_${page}.json"
  
  # Check if the response is valid JSON
  if jq '.' "$response_file" > /dev/null 2>&1; then
    echo -e "${GREEN}Valid JSON response received${NC}"
    
    # Process the movies in this page
    local movie_count=$(jq '.items | length' "$response_file")
    echo -e "${GREEN}Found $movie_count movies on page $page${NC}"
    echo "Found $movie_count movies on page $page" >> "$RANGE_LOG"
    
    # Iterate through each movie
    for i in $(seq 0 $(($movie_count - 1))); do
      local slug=$(jq -r ".items[$i].slug" "$response_file")
      import_movie "$slug"
    done
    
    echo -e "${GREEN}Finished importing page $page${NC}"
  else
    echo -e "${RED}Invalid JSON response for page $page${NC}"
    echo "Invalid JSON response for page $page" >> "$RANGE_LOG"
    echo "First 200 bytes:" >> "$RANGE_LOG"
    head -c 200 "$response_file" >> "$RANGE_LOG"
  fi
  
  # Clean up
  rm -f "$response_file"
}

# Import a single movie
import_movie() {
  local slug=$1
  echo -e "${BLUE}Processing movie: $slug${NC}"
  
  # Check if movie already exists
  if movie_exists "$slug"; then
    echo -e "${YELLOW}Movie $slug already exists in database, skipping${NC}"
    return 0
  fi
  
  # Fetch movie details
  local detail_url="${API_BASE_URL}/phim/${slug}"
  local detail_file="${SCRIPT_DIR}/movie_${slug}.json"
  
  curl -s "$detail_url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" > "$detail_file"
  
  # Check if response is valid JSON
  if jq '.' "$detail_file" > /dev/null 2>&1; then
    echo -e "${GREEN}Valid movie detail response${NC}"
    
    # Extract movie data
    local movie_id=$(jq -r '.movie._id' "$detail_file")
    local name=$(jq -r '.movie.name' "$detail_file")
    local origin_name=$(jq -r '.movie.origin_name' "$detail_file")
    local content=$(jq -r '.movie.content' "$detail_file")
    local type=$(jq -r '.movie.type' "$detail_file")
    local status=$(jq -r '.movie.status' "$detail_file")
    local thumb_url=$(jq -r '.movie.thumb_url' "$detail_file")
    local poster_url=$(jq -r '.movie.poster_url' "$detail_file")
    local trailer_url=$(jq -r '.movie.trailer_url' "$detail_file")
    local time=$(jq -r '.movie.time' "$detail_file")
    local quality=$(jq -r '.movie.quality' "$detail_file")
    local lang=$(jq -r '.movie.lang' "$detail_file")
    local year=$(jq -r '.movie.year' "$detail_file")
    local view=$(jq -r '.movie.view' "$detail_file")
    local actors=$(jq -r '.movie.actor | join(", ")' "$detail_file" 2>/dev/null || echo "")
    local directors=$(jq -r '.movie.director | join(", ")' "$detail_file" 2>/dev/null || echo "")
    local categories=$(jq -r '.movie.category | tostring' "$detail_file" 2>/dev/null || echo "[]")
    local countries=$(jq -r '.movie.country | tostring' "$detail_file" 2>/dev/null || echo "[]")
    
    # Insert into database
    echo -e "${GREEN}Inserting movie: $name (${slug})${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
      INSERT INTO movies (
        movie_id, name, origin_name, description, type, status, 
        thumb_url, poster_url, trailer_url, time, quality, lang, 
        slug, year, view, actors, directors, categories, countries
      ) VALUES (
        '$movie_id', '$name', '$origin_name', '$content', '$type', '$status',
        '$thumb_url', '$poster_url', '$trailer_url', '$time', '$quality', '$lang',
        '$slug', '$year', '$view', '$actors', '$directors', '$categories', '$countries'
      ) ON CONFLICT (slug) DO NOTHING
    " 2>> "$RANGE_LOG"
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Successfully imported movie: $name${NC}"
      echo "Successfully imported movie: $slug ($name)" >> "$RANGE_LOG"
    else
      echo -e "${RED}Failed to insert movie into database${NC}"
      echo "Failed to insert movie: $slug" >> "$RANGE_LOG"
    fi
  else
    echo -e "${RED}Invalid JSON response for movie $slug${NC}"
    echo "Invalid JSON response for movie $slug" >> "$RANGE_LOG"
  fi
  
  # Clean up
  rm -f "$detail_file"
}

# Import a range of pages
import_range() {
  local start_page=$1
  local end_page=$2
  
  echo -e "${GREEN}Starting import of pages $start_page through $end_page${NC}"
  echo "Starting import of pages $start_page through $end_page" >> "$RANGE_LOG"
  
  for (( page=start_page; page<=end_page; page++ )); do
    import_page "$page"
    
    # Add a small delay between pages to avoid rate limiting
    if [ "$page" -lt "$end_page" ]; then
      echo -e "${YELLOW}Waiting 3 seconds before processing next page...${NC}"
      sleep 3
    fi
  done
  
  echo -e "${GREEN}Completed importing pages $start_page through $end_page${NC}"
  echo "Completed importing pages $start_page through $end_page at $(date)" >> "$RANGE_LOG"
}

# Ask for page range to import
read -p "Enter start page: " START_PAGE
read -p "Enter end page: " END_PAGE

# Validate input
if [[ ! "$START_PAGE" =~ ^[0-9]+$ ]] || [[ ! "$END_PAGE" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}Invalid input. Please enter numeric values for page range.${NC}"
  exit 1
fi

if [ "$START_PAGE" -gt "$END_PAGE" ]; then
  echo -e "${RED}Start page cannot be greater than end page.${NC}"
  exit 1
fi

# Start the import process
import_range "$START_PAGE" "$END_PAGE"

# Display summary
echo -e "${GREEN}==== Import Summary ====${NC}"
echo -e "${GREEN}Pages processed: $(($END_PAGE - $START_PAGE + 1))${NC}"
echo -e "${BLUE}Log file: $RANGE_LOG${NC}"
echo