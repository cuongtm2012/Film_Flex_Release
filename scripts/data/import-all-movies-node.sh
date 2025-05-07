#!/bin/bash

# FilmFlex Complete Movie Import Script (Node.js Version)
# This script starts a full import using the Node.js script

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
IMPORT_LOG="${LOG_DIR}/complete-node-import.log"
SCRIPT_NAME="import-movies-sql.cjs"
API_BASE_URL="https://phimapi.com"
MOVIE_LIST_ENDPOINT="/danh-sach/phim-moi-cap-nhat"
TOTAL_PAGES=2256
BATCH_SIZE=100
BREAK_MINUTES=60

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

# Make sure npm packages are installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

echo -e "${BLUE}Installing required packages...${NC}"
cd "$APP_DIR"
npm install -g axios dotenv pg

# Make sure script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Function to process a single page
process_page() {
  local page=$1
  echo -e "${BLUE}Processing page $page${NC}"
  
  # Use the node script to import a single page
  NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" --single-page --page-num=$page --page-size=10
  
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
    
    # Update progress in log file
    echo "[$BATCH_DATE] Successfully imported page $page (Page $page, Progress: $(( ($page - START_PAGE + 1) * 100 / (END_PAGE - START_PAGE + 1) ))%)" >> "$IMPORT_LOG"
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