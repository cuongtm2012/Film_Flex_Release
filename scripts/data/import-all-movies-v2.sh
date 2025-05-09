#!/bin/bash

# FilmFlex Complete Movie Import Script v2
# This script imports all movies from the API in batches

# Exit immediately if a command exits with a non-zero status
set -e

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
TOTAL_PAGES=2256
BATCH_SIZE=100
BREAK_MINUTES=60
DATABASE_URL=${DATABASE_URL:-"postgresql://filmflex:filmflex2024@localhost:5432/filmflex"}
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "=============================================="
echo "    FilmFlex Complete Database Import Script"
echo "=============================================="
echo -e "${NC}"

# Calculate the number of batches needed
TOTAL_BATCHES=$(( (TOTAL_PAGES + BATCH_SIZE - 1) / BATCH_SIZE ))

APPROX_MOVIES=$((TOTAL_PAGES * 10))
echo -e "${GREEN}Starting complete database import of ${TOTAL_PAGES} pages (approx. ${APPROX_MOVIES} movies)${NC}"
echo -e "${GREEN}Will process ${TOTAL_BATCHES} batches of ${BATCH_SIZE} pages each${NC}"
echo -e "${GREEN}Taking a ${BREAK_MINUTES}-minute break between batches${NC}"
echo

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$DATE] Starting complete database import process" >> "$IMPORT_LOG"

# Progress tracking file
PROGRESS_FILE="${SCRIPT_DIR}/complete_import_progress.json"
echo "{\"totalBatches\": $TOTAL_BATCHES, \"completedBatches\": 0, \"currentBatch\": 1, \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$PROGRESS_FILE"

# Ask for confirmation
echo -e "${YELLOW}WARNING: This will attempt to import ALL ${TOTAL_PAGES} pages (22,557+ movies).${NC}"
echo -e "${YELLOW}The process will take multiple days to complete and use significant resources.${NC}"
read -p "Are you absolutely sure you want to continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo -e "${RED}Import cancelled.${NC}"
  exit 0
fi

# Ask if starting from a specific batch
read -p "Start from batch number (1-${TOTAL_BATCHES}, default: 1): " START_BATCH
START_BATCH=${START_BATCH:-1}

if ! [[ "$START_BATCH" =~ ^[0-9]+$ ]] || [ "$START_BATCH" -lt 1 ] || [ "$START_BATCH" -gt "$TOTAL_BATCHES" ]; then
  echo -e "${RED}Invalid batch number. Starting from batch 1.${NC}"
  START_BATCH=1
fi

# Install required packages if needed
echo -e "${BLUE}Checking for required packages...${NC}"
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Installing jq for JSON processing...${NC}"
  apt-get update && apt-get install -y jq curl
fi

# Parse database connection parameters
parse_db_url() {
  # Extract components from DATABASE_URL
  local DB_URL="$DATABASE_URL"
  DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$DB_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  echo "[$DATE] DB parameters: host=$DB_HOST, port=$DB_PORT, user=$DB_USER, db=$DB_NAME" >> "$IMPORT_LOG"
}

# Parse database URL early
parse_db_url
echo -e "${GREEN}Database connection parameters parsed${NC}"

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}Database connection successful${NC}"
else
  echo -e "${RED}Failed to connect to database. Please check your DATABASE_URL${NC}"
  exit 1
fi

# Function to check if movie exists in database
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

# Function to fetch movie list from API
fetch_movie_list() {
  local page=$1
  local url="${API_BASE_URL}${MOVIE_LIST_ENDPOINT}?page=${page}"
  echo -e "${BLUE}Fetching movie list from ${url}${NC}"
  
  # Create a temporary file for response
  local response_file="${SCRIPT_DIR}/page_${page}.json"
  
  # Add user agent and other headers to mimic a browser - save to temp file
  curl -s "$url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" > "$response_file"
  
  # Check if the response is valid JSON
  if jq '.' "$response_file" > /dev/null 2>&1; then
    cat "$response_file"
  else
    echo -e "${RED}Invalid JSON response for page $page. API might be rate limiting or down${NC}"
    echo "[$DATE] Error: Invalid JSON response for page $page" >> "$IMPORT_LOG"
    echo "{\"items\":[]}" # Return empty array as fallback
  fi
  
  # Clean up
  rm -f "$response_file"
}

# Function to fetch movie details from API
fetch_movie_detail() {
  local slug=$1
  local url="${API_BASE_URL}/phim/${slug}"
  echo -e "${BLUE}Fetching movie details from ${url}${NC}"
  
  # Create a temporary file for response
  local response_file="${SCRIPT_DIR}/movie_${slug}.json"
  
  # Add user agent and other headers to mimic a browser - save to temp file
  curl -s "$url" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
    -H "Accept: application/json" > "$response_file"
  
  # Check if the response is valid JSON
  if jq '.' "$response_file" > /dev/null 2>&1; then
    cat "$response_file"
  else
    echo -e "${RED}Invalid JSON response for movie ${slug}. API might be rate limiting or down${NC}"
    echo "[$DATE] Error: Invalid JSON response for movie $slug" >> "$IMPORT_LOG"
    echo "{\"movie\":{}}" # Return empty object as fallback
  fi
  
  # Clean up
  rm -f "$response_file"
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
  local actors=$(echo "$movie_data" | jq -r '.movie.actor | join(", ")' 2>/dev/null || echo "")
  local directors=$(echo "$movie_data" | jq -r '.movie.director | join(", ")' 2>/dev/null || echo "")
  local categories=$(echo "$movie_data" | jq -r '.movie.category | tostring' 2>/dev/null || echo "[]")
  local countries=$(echo "$movie_data" | jq -r '.movie.country | tostring' 2>/dev/null || echo "[]")
  
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
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully imported movie: $name${NC}"
  else
    echo -e "${RED}Failed to insert movie $slug into database${NC}"
    echo "[$DATE] Error: Failed to insert movie $slug" >> "$IMPORT_LOG"
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
    import_movie "$slug"
  done
  
  echo -e "${GREEN}Completed processing page $page${NC}"
  echo "[$DATE] Completed processing page $page" >> "$IMPORT_LOG"
}

# Loop through all batches
for (( batch=START_BATCH; batch<=TOTAL_BATCHES; batch++ )); do
  # Calculate start and end page for this batch
  START_PAGE=$(( (batch - 1) * BATCH_SIZE + 1 ))
  END_PAGE=$(( batch * BATCH_SIZE ))
  
  # Make sure we don't exceed the total number of pages
  if [ "$END_PAGE" -gt "$TOTAL_PAGES" ]; then
    END_PAGE=$TOTAL_PAGES
  fi
  
  BATCH_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${GREEN}[$BATCH_DATE] BATCH $batch/$TOTAL_BATCHES: Importing pages $START_PAGE to $END_PAGE${NC}"
  echo "[$BATCH_DATE] BATCH $batch/$TOTAL_BATCHES: Importing pages $START_PAGE to $END_PAGE" >> "$IMPORT_LOG"
  
  # Process each page in this batch
  for (( page=START_PAGE; page<=END_PAGE; page++ )); do
    process_page "$page"
    
    # Add a small delay between pages
    if [ "$page" -lt "$END_PAGE" ]; then
      echo -e "${YELLOW}Waiting 3 seconds before next page...${NC}"
      sleep 3
    fi
  done
  
  # Update progress file
  jq ".completedBatches = $batch | .currentBatch = $(($batch + 1))" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
  
  # Check if we're at the last batch
  if [ "$batch" -eq "$TOTAL_BATCHES" ]; then
    COMPLETION_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed.${NC}"
    echo "[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed." >> "$IMPORT_LOG"
    
    # Update final timestamp
    jq ".endTime = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\" | .completed = true" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
    
    break
  fi
  
  # Take a break between batches
  BREAK_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${YELLOW}[$BREAK_DATE] Batch $batch completed. Taking a ${BREAK_MINUTES}-minute break before next batch...${NC}"
  echo "[$BREAK_DATE] Batch $batch completed. Taking a ${BREAK_MINUTES}-minute break before next batch..." >> "$IMPORT_LOG"
  
  # Display a countdown timer for the break
  for (( minutes=BREAK_MINUTES; minutes>0; minutes-- )); do
    echo -ne "${YELLOW}Break: $minutes minutes remaining...${NC}\r"
    sleep 60
  done
  echo -e "${GREEN}Break completed. Continuing to next batch...${NC}"
done

echo
echo -e "${GREEN}==== Import Summary ====${NC}"
echo -e "${GREEN}Total batches: $TOTAL_BATCHES${NC}"
echo -e "${GREEN}Pages processed: $TOTAL_PAGES${NC}"
echo -e "${GREEN}Approximate movies: ${APPROX_MOVIES}${NC}"
echo -e "${BLUE}Full log file: $IMPORT_LOG${NC}"
echo -e "${BLUE}Progress tracking: $PROGRESS_FILE${NC}"
echo

exit 0