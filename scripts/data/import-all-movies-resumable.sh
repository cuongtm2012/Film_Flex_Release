#!/bin/bash

# FilmFlex Complete Movie Import Script with Resume Capability
# This script starts a full import using the Node.js script and can resume from where it left off

# Set up trap to handle interruptions
trap 'save_progress; echo -e "\n${YELLOW}Import interrupted. To resume, run the script again and select 'resume'.${NC}"; exit 0' INT TERM

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
DELAY_BETWEEN_PAGES=3  # seconds

# Progress tracking files
PROGRESS_FILE="${SCRIPT_DIR}/complete_import_progress.json"
DETAILED_PROGRESS_FILE="${SCRIPT_DIR}/import_detailed_progress.json"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "======================================================"
echo "  FilmFlex Complete Database Import Script (Resumable)"
echo "======================================================"
echo -e "${NC}"

# Calculate the number of batches needed
TOTAL_BATCHES=$(( (TOTAL_PAGES + BATCH_SIZE - 1) / BATCH_SIZE ))
APPROX_MOVIES=$((TOTAL_PAGES * 10))

# ======= FUNCTIONS =======

# Function to initialize progress tracking
initialize_progress() {
  # Initialize the main progress file
  echo "{\"totalBatches\": $TOTAL_BATCHES, \"completedBatches\": 0, \"currentBatch\": 1, \"currentPage\": 1, \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$PROGRESS_FILE"
  
  # Initialize the detailed progress file (which pages have been completed)
  echo '{"completed_pages": []}' > "$DETAILED_PROGRESS_FILE"
  
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$DATE] Starting new complete database import process" >> "$IMPORT_LOG"
}

# Function to load existing progress
load_progress() {
  if [[ -f "$PROGRESS_FILE" && -f "$DETAILED_PROGRESS_FILE" ]]; then
    CURRENT_BATCH=$(jq -r '.currentBatch' "$PROGRESS_FILE")
    CURRENT_PAGE=$(jq -r '.currentPage' "$PROGRESS_FILE")
    COMPLETED_BATCHES=$(jq -r '.completedBatches' "$PROGRESS_FILE")
    
    # Check if data is valid
    if [[ "$CURRENT_BATCH" =~ ^[0-9]+$ && "$CURRENT_PAGE" =~ ^[0-9]+$ && "$COMPLETED_BATCHES" =~ ^[0-9]+$ ]]; then
      echo -e "${GREEN}Found existing progress: Completed ${COMPLETED_BATCHES}/${TOTAL_BATCHES} batches${NC}"
      echo -e "${GREEN}Ready to resume from batch ${CURRENT_BATCH}, page ${CURRENT_PAGE}${NC}"
      return 0
    fi
  fi
  
  echo -e "${YELLOW}No valid progress file found. Starting new import process.${NC}"
  initialize_progress
  return 1
}

# Function to save current progress
save_progress() {
  # Update progress file with current position
  jq ".currentBatch = $CURRENT_BATCH | .currentPage = $CURRENT_PAGE | .completedBatches = $COMPLETED_BATCHES | .lastUpdate = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
  
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$DATE] Progress saved: batch $CURRENT_BATCH, page $CURRENT_PAGE" >> "$IMPORT_LOG"
}

# Function to mark a page as completed
mark_page_completed() {
  local page=$1
  
  # Add the page to the completed_pages array if not already there
  if ! jq -e ".completed_pages | index($page)" "$DETAILED_PROGRESS_FILE" > /dev/null; then
    jq ".completed_pages += [$page]" "$DETAILED_PROGRESS_FILE" > "${DETAILED_PROGRESS_FILE}.tmp" && mv "${DETAILED_PROGRESS_FILE}.tmp" "$DETAILED_PROGRESS_FILE"
  fi
}

# Function to check if a page has been completed
is_page_completed() {
  local page=$1
  
  # Check if the page is in the completed_pages array
  jq -e ".completed_pages | index($page)" "$DETAILED_PROGRESS_FILE" > /dev/null
  return $?
}

# Function to process a single page
process_page() {
  local page=$1
  
  # Check if this page has already been completed
  if is_page_completed $page; then
    echo -e "${YELLOW}Page $page already processed, skipping...${NC}"
    echo "[$DATE] Page $page already processed (verified from detailed progress), skipping" >> "$IMPORT_LOG"
    return 0
  fi
  
  echo -e "${BLUE}Processing page $page${NC}"
  
  # Use the node script to import a single page
  NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" --single-page --page-num=$page --page-size=10
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully completed processing page $page${NC}"
    mark_page_completed $page
    DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$DATE] Successfully completed processing page $page" >> "$IMPORT_LOG"
    return 0
  else
    echo -e "${RED}Error processing page $page${NC}"
    DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$DATE] Error processing page $page" >> "$IMPORT_LOG"
    return 1
  fi
}

# Function to show a countdown
countdown() {
  local seconds=$1
  local message=$2
  
  for (( i=seconds; i>0; i-- )); do
    echo -ne "${YELLOW}$message $i seconds remaining...${NC}\r"
    sleep 1
  done
  echo -ne "                                                                                    \r"
}

# ======= MAIN SCRIPT =======

# Make sure npm packages are installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}jq is required for this script. Installing...${NC}"
  apt-get update && apt-get install -y jq
fi

echo -e "${BLUE}Checking for required packages...${NC}"
cd "$APP_DIR"
npm install -g axios dotenv pg

# Make sure script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Check if there's existing progress and ask what to do
if [[ -f "$PROGRESS_FILE" && -f "$DETAILED_PROGRESS_FILE" ]]; then
  echo -e "${YELLOW}Existing import progress found.${NC}"
  echo -e "1) Resume from last position"
  echo -e "2) Start over from the beginning"
  echo -e "3) Start from a specific batch/page"
  read -p "Select an option (1-3): " RESUME_OPTION
  
  case $RESUME_OPTION in
    1)
      # Resume from last saved position
      load_progress
      ;;
    2)
      # Start over
      echo -e "${YELLOW}Starting a new import process...${NC}"
      initialize_progress
      CURRENT_BATCH=1
      CURRENT_PAGE=1
      COMPLETED_BATCHES=0
      ;;
    3)
      # Let the user specify where to start
      read -p "Enter batch number (1-${TOTAL_BATCHES}): " START_BATCH
      if ! [[ "$START_BATCH" =~ ^[0-9]+$ ]] || [ "$START_BATCH" -lt 1 ] || [ "$START_BATCH" -gt "$TOTAL_BATCHES" ]; then
        echo -e "${RED}Invalid batch number. Starting from batch 1.${NC}"
        START_BATCH=1
      fi
      
      # Calculate the start page for this batch
      START_PAGE=$(( (START_BATCH - 1) * BATCH_SIZE + 1 ))
      
      read -p "Enter page number within batch (${START_PAGE}-$(( START_PAGE + BATCH_SIZE - 1 ))): " START_PAGE
      if ! [[ "$START_PAGE" =~ ^[0-9]+$ ]] || [ "$START_PAGE" -lt $(( (START_BATCH - 1) * BATCH_SIZE + 1 )) ] || [ "$START_PAGE" -gt $(( START_BATCH * BATCH_SIZE )) ]; then
        echo -e "${RED}Invalid page number. Starting from first page of batch.${NC}"
        START_PAGE=$(( (START_BATCH - 1) * BATCH_SIZE + 1 ))
      fi
      
      # Set current batch and page
      CURRENT_BATCH=$START_BATCH
      CURRENT_PAGE=$START_PAGE
      COMPLETED_BATCHES=$(( START_BATCH - 1 ))
      
      # Update progress files
      initialize_progress
      jq ".currentBatch = $CURRENT_BATCH | .currentPage = $CURRENT_PAGE | .completedBatches = $COMPLETED_BATCHES" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
      ;;
    *)
      echo -e "${RED}Invalid option. Exiting.${NC}"
      exit 1
      ;;
  esac
else
  # No existing progress, start new
  echo -e "${GREEN}Starting complete database import of ${TOTAL_PAGES} pages (approx. ${APPROX_MOVIES} movies)${NC}"
  echo -e "${GREEN}Will process ${TOTAL_BATCHES} batches of ${BATCH_SIZE} pages each${NC}"
  echo -e "${GREEN}Taking a ${BREAK_MINUTES}-minute break between batches${NC}"
  echo
  
  # Ask for confirmation
  echo -e "${YELLOW}WARNING: This will attempt to import ALL ${TOTAL_PAGES} pages (22,557+ movies).${NC}"
  echo -e "${YELLOW}The process will take multiple days to complete and use significant resources.${NC}"
  read -p "Are you absolutely sure you want to continue? (yes/no) " -r
  echo
  if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Import cancelled.${NC}"
    exit 0
  fi
  
  # Initialize new progress
  initialize_progress
  CURRENT_BATCH=1
  CURRENT_PAGE=1
  COMPLETED_BATCHES=0
fi

# Tell the user what we're doing and how to interrupt safely
echo -e "${YELLOW}The import process will now begin. Press Ctrl+C at any time to safely pause the import.${NC}"
echo -e "${YELLOW}You can resume the import later by running this script again and selecting 'Resume'.${NC}"
echo -e "${GREEN}Starting import from batch ${CURRENT_BATCH}, page ${CURRENT_PAGE}${NC}"
echo

# Wait for confirmation before starting
read -p "Press Enter to start the import process..." -r

# ======= MAIN IMPORT LOOP =======

# Start from the current batch
for (( batch=CURRENT_BATCH; batch<=TOTAL_BATCHES; batch++ )); do
  # Set current batch in global variable for trap handler
  CURRENT_BATCH=$batch
  
  # Calculate start and end page for this batch
  BATCH_START_PAGE=$(( (batch - 1) * BATCH_SIZE + 1 ))
  BATCH_END_PAGE=$(( batch * BATCH_SIZE ))
  
  # Make sure we don't exceed the total number of pages
  if [ "$BATCH_END_PAGE" -gt "$TOTAL_PAGES" ]; then
    BATCH_END_PAGE=$TOTAL_PAGES
  fi
  
  # If we're resuming in the middle of a batch, start from the current page
  if [ "$batch" -eq "$CURRENT_BATCH" ] && [ "$CURRENT_PAGE" -gt "$BATCH_START_PAGE" ]; then
    START_PAGE=$CURRENT_PAGE
  else
    START_PAGE=$BATCH_START_PAGE
  fi
  
  BATCH_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${GREEN}[$BATCH_DATE] BATCH $batch/$TOTAL_BATCHES: Importing pages $START_PAGE to $BATCH_END_PAGE${NC}"
  echo "[$BATCH_DATE] BATCH $batch/$TOTAL_BATCHES: Importing pages $START_PAGE to $BATCH_END_PAGE" >> "$IMPORT_LOG"
  
  # Process each page in this batch
  for (( page=START_PAGE; page<=BATCH_END_PAGE; page++ )); do
    # Set current page in global variable for trap handler
    CURRENT_PAGE=$page
    
    # Process the page
    process_page "$page"
    
    # Save progress after each page
    save_progress
    
    # Add a small delay between pages
    if [ "$page" -lt "$BATCH_END_PAGE" ]; then
      countdown $DELAY_BETWEEN_PAGES "Waiting before next page..."
    fi
  done
  
  # Update completed batches
  COMPLETED_BATCHES=$batch
  save_progress
  
  # Check if we're at the last batch
  if [ "$batch" -eq "$TOTAL_BATCHES" ]; then
    COMPLETION_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed.${NC}"
    echo "[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed." >> "$IMPORT_LOG"
    
    # Update final timestamp
    jq ".endTime = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\" | .completed = true" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
    
    break
  fi
  
  # Set up for the next batch
  CURRENT_BATCH=$((batch + 1))
  CURRENT_PAGE=$(( (CURRENT_BATCH - 1) * BATCH_SIZE + 1 ))
  save_progress
  
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
echo -e "${GREEN}Completed batches: $COMPLETED_BATCHES${NC}"
echo -e "${GREEN}Pages processed: $(jq '.completed_pages | length' "$DETAILED_PROGRESS_FILE")/${TOTAL_PAGES}${NC}"
echo -e "${GREEN}Approximate movies: ${APPROX_MOVIES}${NC}"
echo -e "${BLUE}Full log file: $IMPORT_LOG${NC}"
echo -e "${BLUE}Progress tracking: $PROGRESS_FILE${NC}"
echo -e "${BLUE}Detailed progress: $DETAILED_PROGRESS_FILE${NC}"
echo

exit 0