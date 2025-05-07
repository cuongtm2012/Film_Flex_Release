#!/bin/bash

# FilmFlex Complete Movie Import Script With Debug
# This is a fixed version of the import script with additional debugging

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
IMPORT_LOG="${LOG_DIR}/complete-import.log"
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"
DATABASE_URL=${DATABASE_URL:-"postgresql://filmflex:filmflex2024@localhost:5432/filmflex"}

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Create or clear debug log
DEBUG_LOG="${LOG_DIR}/api-debug.log"
echo "Debug log started at $(date)" > "$DEBUG_LOG"

# Parse database connection parameters
parse_db_url() {
  # Extract components from DATABASE_URL
  local DB_URL="$DATABASE_URL"
  DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DB_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  echo "DB parameters: host=$DB_HOST, port=$DB_PORT, user=$DB_USER, db=$DB_NAME" >> "$DEBUG_LOG"
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

# Function to import a single page of movies
import_page() {
  local page=$1
  echo -e "${BLUE}Processing page $page${NC}"
  
  # Use curl to fetch the movie list
  local temp_file="${SCRIPT_DIR}/page_${page}.json"
  curl -s "${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${page}" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" \
    -H "Referer: ${API_BASE_URL}" > "$temp_file"
  
  # Log debug information
  echo "Page $page response size: $(stat -c %s "$temp_file") bytes" >> "$DEBUG_LOG"
  head -c 100 "$temp_file" >> "$DEBUG_LOG"
  echo >> "$DEBUG_LOG"
  
  # Check if the response is valid JSON
  if jq -e . "$temp_file" > /dev/null 2>&1; then
    echo -e "${GREEN}Page $page response is valid JSON${NC}"
    
    # Extract movie slugs from the response
    local slugs=$(jq -r '.items[].slug' "$temp_file")
    local count=$(echo "$slugs" | grep -v '^$' | wc -l)
    echo -e "${GREEN}Found $count movies on page $page${NC}"
    
    # Process each movie
    for slug in $slugs; do
      echo -e "${BLUE}Importing movie: $slug${NC}"
      import_movie "$slug"
    done
    
    echo -e "${GREEN}Completed page $page${NC}"
  else
    echo -e "${RED}Invalid JSON response for page $page${NC}"
    echo "Invalid JSON response for page $page" >> "$DEBUG_LOG"
    head -c 300 "$temp_file" >> "$DEBUG_LOG"
    echo >> "$DEBUG_LOG"
  fi
  
  # Clean up
  rm -f "$temp_file"
}

# Function to import a single movie
import_movie() {
  local slug=$1
  
  # Check if movie already exists
  if movie_exists "$slug"; then
    echo -e "${YELLOW}Movie $slug already exists in database, skipping${NC}"
    return 0
  fi
  
  # Fetch movie details
  local temp_file="${SCRIPT_DIR}/movie_${slug}.json"
  curl -s "${API_BASE_URL}/phim/${slug}" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" \
    -H "Referer: ${API_BASE_URL}" > "$temp_file"
  
  # Log debug information
  echo "Movie $slug response size: $(stat -c %s "$temp_file") bytes" >> "$DEBUG_LOG"
  head -c 100 "$temp_file" >> "$DEBUG_LOG"
  echo >> "$DEBUG_LOG"
  
  # Check if the response is valid JSON
  if jq -e . "$temp_file" > /dev/null 2>&1; then
    echo -e "${GREEN}Movie $slug response is valid JSON${NC}"
    
    # Extract movie fields
    local movie_id=$(jq -r '.movie._id' "$temp_file")
    local name=$(jq -r '.movie.name' "$temp_file")
    local origin_name=$(jq -r '.movie.origin_name' "$temp_file")
    local description=$(jq -r '.movie.content' "$temp_file")
    local type=$(jq -r '.movie.type' "$temp_file")
    local status=$(jq -r '.movie.status' "$temp_file")
    local thumb_url=$(jq -r '.movie.thumb_url' "$temp_file")
    local poster_url=$(jq -r '.movie.poster_url' "$temp_file")
    local trailer_url=$(jq -r '.movie.trailer_url' "$temp_file")
    local time=$(jq -r '.movie.time' "$temp_file")
    local quality=$(jq -r '.movie.quality' "$temp_file")
    local lang=$(jq -r '.movie.lang' "$temp_file")
    local year=$(jq -r '.movie.year' "$temp_file")
    local view=$(jq -r '.movie.view' "$temp_file")
    local actors=$(jq -r '.movie.actor | join(", ")' "$temp_file")
    local directors=$(jq -r '.movie.director | join(", ")' "$temp_file")
    local categories=$(jq -r '.movie.category' "$temp_file")
    local countries=$(jq -r '.movie.country' "$temp_file")
    
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
    " 2>> "$DEBUG_LOG"
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Successfully imported movie: $name${NC}"
    else
      echo -e "${RED}Failed to insert movie $slug into database${NC}"
    fi
  else
    echo -e "${RED}Invalid JSON response for movie $slug${NC}"
    echo "Invalid JSON response for movie $slug" >> "$DEBUG_LOG"
    head -c 300 "$temp_file" >> "$DEBUG_LOG"
    echo >> "$DEBUG_LOG"
  fi
  
  # Clean up
  rm -f "$temp_file"
}

# Function to check if a movie exists in the database
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

# Main function to process a range of pages
import_range() {
  local start_page=$1
  local end_page=$2
  
  echo -e "${GREEN}Importing pages $start_page to $end_page${NC}"
  echo "Importing pages $start_page to $end_page" >> "$DEBUG_LOG"
  
  for ((page=start_page; page<=end_page; page++)); do
    import_page "$page"
    
    # Add a small delay between pages
    if [ "$page" -lt "$end_page" ]; then
      echo -e "${YELLOW}Waiting 3 seconds before next page...${NC}"
      sleep 3
    fi
  done
  
  echo -e "${GREEN}Completed importing pages $start_page to $end_page${NC}"
  echo "Completed importing pages $start_page to $end_page" >> "$DEBUG_LOG"
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

echo -e "${GREEN}Import completed. Check $DEBUG_LOG for details.${NC}"