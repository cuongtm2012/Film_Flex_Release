#!/bin/bash

# FilmFlex Full Database Import Script
# This script automates importing the entire movie database in batches of 100 pages
# with a 1-hour break between each batch to prevent API rate limiting

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
FULL_IMPORT_LOG="${LOG_DIR}/full-import.log"
BATCH_SCRIPT="${SCRIPT_DIR}/batch-import.sh"
TOTAL_PAGES=2256
BATCH_SIZE=100
BREAK_MINUTES=60

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Check if the batch import script exists and is executable
if [ ! -f "$BATCH_SCRIPT" ]; then
  echo -e "${RED}Error: Batch import script not found at ${BATCH_SCRIPT}${NC}"
  exit 1
fi
chmod +x "$BATCH_SCRIPT"

# Print banner
echo -e "${BLUE}"
echo "=============================================="
echo "    FilmFlex Full Database Import Script"
echo "=============================================="
echo -e "${NC}"

# Calculate the number of batches needed
TOTAL_BATCHES=$(( (TOTAL_PAGES + BATCH_SIZE - 1) / BATCH_SIZE ))

echo -e "${GREEN}Starting full database import of ${TOTAL_PAGES} pages (approx. ${TOTAL_PAGES * 10} movies)${NC}"
echo -e "${GREEN}Will process ${TOTAL_BATCHES} batches of ${BATCH_SIZE} pages each${NC}"
echo -e "${GREEN}Taking a ${BREAK_MINUTES}-minute break between batches${NC}"
echo

DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$DATE] Starting full database import process" >> "$FULL_IMPORT_LOG"

# Progress tracking file
PROGRESS_FILE="${SCRIPT_DIR}/full_import_progress.json"
echo "{\"totalBatches\": $TOTAL_BATCHES, \"completedBatches\": 0, \"currentBatch\": 1, \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$PROGRESS_FILE"

# Function to update progress
function update_progress {
  jq ".completedBatches = $1 | .currentBatch = $2" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
}

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

# Update progress file with start batch if not starting from beginning
if [ "$START_BATCH" -gt 1 ]; then
  update_progress $((START_BATCH - 1)) $START_BATCH
  echo -e "${YELLOW}Starting from batch $START_BATCH${NC}"
fi

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
  echo "[$BATCH_DATE] BATCH $batch/$TOTAL_BATCHES: Importing pages $START_PAGE to $END_PAGE" >> "$FULL_IMPORT_LOG"
  
  # Run the batch import script with a moderate delay between pages
  $BATCH_SCRIPT --start-page $START_PAGE --end-page $END_PAGE --delay 3 | tee -a "$FULL_IMPORT_LOG"
  
  # Update progress
  update_progress $batch $((batch + 1))
  
  # Check if we're at the last batch
  if [ "$batch" -eq "$TOTAL_BATCHES" ]; then
    COMPLETION_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed.${NC}"
    echo "[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed." >> "$FULL_IMPORT_LOG"
    
    # Update final timestamp
    jq ".endTime = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\" | .completed = true" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
    
    break
  fi
  
  # Take a break between batches
  BREAK_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${YELLOW}[$BREAK_DATE] Batch $batch completed. Taking a ${BREAK_MINUTES}-minute break before next batch...${NC}"
  echo "[$BREAK_DATE] Batch $batch completed. Taking a ${BREAK_MINUTES}-minute break before next batch..." >> "$FULL_IMPORT_LOG"
  
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
echo -e "${GREEN}Approximate movies: $((TOTAL_PAGES * 10))${NC}"
echo -e "${BLUE}Full log file: $FULL_IMPORT_LOG${NC}"
echo -e "${BLUE}Progress tracking: $PROGRESS_FILE${NC}"
echo

exit 0