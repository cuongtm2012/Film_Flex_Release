#!/bin/bash

# FilmFlex Movie Import Tester
# This script tests importing a small range of pages

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
TEST_LOG="${LOG_DIR}/test-import.log"
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"
DATABASE_URL=${DATABASE_URL:-"postgresql://filmflex:filmflex2024@localhost:5432/filmflex"}

# Make sure log directory exists
mkdir -p "$LOG_DIR"
echo "=== Test import started at $(date) ===" > "$TEST_LOG"

# Parse database connection parameters
parse_db_url() {
  # Extract components from DATABASE_URL
  local DB_URL="$DATABASE_URL"
  DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DB_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  echo "DB parameters: host=$DB_HOST, port=$DB_PORT, user=$DB_USER, db=$DB_NAME" >> "$TEST_LOG"
}

# Call parse_db_url function to set up database parameters
parse_db_url

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}Database connection successful${NC}"
else
  echo -e "${RED}Failed to connect to database. Please check your DATABASE_URL${NC}"
  exit 1
fi

# Function to fetch movie list from API
fetch_movie_list() {
  local page=$1
  local url="${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${page}"
  echo -e "${BLUE}Fetching movie list from ${url}${NC}"
  
  # Create a temporary file for response
  local temp_file="${SCRIPT_DIR}/test_page_${page}.json"
  
  # Add user agent and other headers to mimic a browser - save to temp file
  curl -s "$url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" \
    -H "Referer: ${API_BASE_URL}" > "$temp_file"
  
  # Check file size for debugging
  local file_size=$(stat -c %s "$temp_file")
  echo -e "${BLUE}Received response of $file_size bytes${NC}"
  echo "Page $page response size: $file_size bytes" >> "$TEST_LOG"
  
  # Validate JSON before processing
  if jq -e . "$temp_file" >/dev/null 2>&1; then
    # Get the content and clean up
    cat "$temp_file"
    rm -f "$temp_file"
  else
    echo -e "${RED}Invalid JSON response. API might be rate limiting or down${NC}"
    echo "Error response for page $page:" >> "$TEST_LOG"
    head -c 300 "$temp_file" >> "$TEST_LOG"
    echo >> "$TEST_LOG"
    rm -f "$temp_file"
    echo "{\"items\":[]}" # Return empty array as fallback
  fi
}

# Function to fetch movie details from API
fetch_movie_detail() {
  local slug=$1
  local url="${API_BASE_URL}/phim/${slug}"
  echo -e "${BLUE}Fetching movie details from ${url}${NC}"
  
  # Create a temporary file for response
  local temp_file="${SCRIPT_DIR}/test_movie_${slug}.json"
  
  # Add user agent and other headers to mimic a browser - save to temp file
  curl -s "$url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" \
    -H "Referer: ${API_BASE_URL}" > "$temp_file"
  
  # Check file size for debugging
  local file_size=$(stat -c %s "$temp_file")
  echo -e "${BLUE}Received movie detail response of $file_size bytes${NC}"
  echo "Movie $slug response size: $file_size bytes" >> "$TEST_LOG"
  
  # Validate JSON before processing
  if jq -e . "$temp_file" >/dev/null 2>&1; then
    # Get the content and clean up
    cat "$temp_file"
    rm -f "$temp_file"
  else
    echo -e "${RED}Invalid JSON response for movie ${slug}. API might be rate limiting or down${NC}"
    echo "Error response for movie $slug:" >> "$TEST_LOG"
    head -c 300 "$temp_file" >> "$TEST_LOG"
    echo >> "$TEST_LOG"
    rm -f "$temp_file"
    echo "{\"movie\":{}}" # Return empty object as fallback
  fi
}

# Function to check if movie exists in database
movie_exists() {
  local slug=$1
  local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM movies WHERE slug = '$slug'" 2>/dev/null)
  
  # Check if command was successful
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to check database for movie $slug${NC}"
    return 1
  fi
  
  # Trim whitespace
  count=$(echo "$count" | tr -d ' ')
  
  if [ "$count" -gt 0 ]; then
    return 0
  else
    return 1
  fi
}

# Function to import a movie
import_movie() {
  local slug=$1
  echo -e "${GREEN}Importing movie: $slug${NC}"
  
  # Check if movie already exists
  if movie_exists "$slug"; then
    echo -e "${YELLOW}Movie $slug already exists in database, skipping${NC}"
    return 0
  fi
  
  # Fetch movie details
  local movie_data=$(fetch_movie_detail "$slug")
  
  # Extract movie fields
  local movie_id=$(echo "$movie_data" | jq -r '.movie._id')
  local name=$(echo "$movie_data" | jq -r '.movie.name')
  local origin_name=$(echo "$movie_data" | jq -r '.movie.origin_name')
  local description=$(echo "$movie_data" | jq -r '.movie.content')
  local type=$(echo "$movie_data" | jq -r '.movie.type')
  local status=$(echo "$movie_data" | jq -r '.movie.status')
  local thumb_url=$(echo "$movie_data" | jq -r '.movie.thumb_url')
  local poster_url=$(echo "$movie_data" | jq -r '.movie.poster_url')
  local trailer_url=$(echo "$movie_data" | jq -r '.movie.trailer_url')
  local time=$(echo "$movie_data" | jq -r '.movie.time')
  local quality=$(echo "$movie_data" | jq -r '.movie.quality')
  local lang=$(echo "$movie_data" | jq -r '.movie.lang')
  local year=$(echo "$movie_data" | jq -r '.movie.year')
  local view=$(echo "$movie_data" | jq -r '.movie.view')
  local actors=$(echo "$movie_data" | jq -r '.movie.actor | join(", ")')
  local directors=$(echo "$movie_data" | jq -r '.movie.director | join(", ")')
  local categories=$(echo "$movie_data" | jq -r '.movie.category')
  local countries=$(echo "$movie_data" | jq -r '.movie.country')
  
  # Insert into database
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO movies (
      movie_id, name, origin_name, description, type, status, 
      thumb_url, poster_url, trailer_url, time, quality, lang, 
      slug, year, view, actors, directors, categories, countries
    ) VALUES (
      '$movie_id', '$name', '$origin_name', '$description', '$type', '$status',
      '$thumb_url', '$poster_url', '$trailer_url', '$time', '$quality', '$lang',
      '$slug', '$year', '$view', '$actors', '$directors', '$categories', '$countries'
    ) ON CONFLICT (slug) DO NOTHING
  " 2>/dev/null
  
  # Check if insertion was successful
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully imported movie: $name${NC}"
  else
    echo -e "${RED}Failed to insert movie $slug into database${NC}"
  fi
}

# Function to process a single page
process_page() {
  local page=$1
  echo -e "${BLUE}Processing page $page${NC}"
  
  # Fetch movie list for this page
  local movie_list=$(fetch_movie_list "$page")
  
  # Extract movie items
  local movie_items=$(echo "$movie_list" | jq -r '.items')
  local count=$(echo "$movie_items" | jq -r 'length')
  
  echo -e "${GREEN}Found $count movies on page $page${NC}"
  
  # Process each movie
  for i in $(seq 0 $(($count-1))); do
    local slug=$(echo "$movie_items" | jq -r ".[$i].slug")
    echo "Processing movie $i: $slug" >> "$TEST_LOG"
    import_movie "$slug"
  done
  
  echo -e "${GREEN}Completed processing page $page${NC}"
}

# Main function to process a range of pages
import_range() {
  local start_page=$1
  local end_page=$2
  
  echo -e "${GREEN}Importing pages $start_page to $end_page${NC}"
  echo "Importing pages $start_page to $end_page" >> "$TEST_LOG"
  
  for ((page=start_page; page<=end_page; page++)); do
    process_page "$page"
    
    # Add a small delay between pages
    if [ "$page" -lt "$end_page" ]; then
      echo -e "${YELLOW}Waiting 3 seconds before next page...${NC}"
      sleep 3
    fi
  done
  
  echo -e "${GREEN}Completed importing pages $start_page to $end_page${NC}"
  echo "Completed importing pages $start_page to $end_page" >> "$TEST_LOG"
}

# Ask for page range
read -p "Enter start page: " START_PAGE
read -p "Enter end page: " END_PAGE

# Validate input
if ! [[ "$START_PAGE" =~ ^[0-9]+$ ]] || ! [[ "$END_PAGE" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}Invalid page numbers. Please enter numeric values.${NC}"
  exit 1
fi

# Import the specified range
import_range "$START_PAGE" "$END_PAGE"

echo -e "${GREEN}Import test completed. Check $TEST_LOG for details.${NC}"