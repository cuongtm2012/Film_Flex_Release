#!/bin/bash

# PhimGG Complete Movie Import Script with Resume Capability
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
PROGRESS_FILE="${SCRIPT_DIR}/complete_import_progress.txt"
DETAILED_PROGRESS_FILE="${SCRIPT_DIR}/import_detailed_progress.txt"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "======================================================"
echo "  PhimGG Complete Database Import Script (Resumable)"
echo "======================================================"
echo -e "${NC}"

# Calculate the number of batches needed
TOTAL_BATCHES=$(( (TOTAL_PAGES + BATCH_SIZE - 1) / BATCH_SIZE ))
APPROX_MOVIES=$((TOTAL_PAGES * 10))

# ======= FUNCTIONS =======

# Function to initialize progress tracking
initialize_progress() {
  # Initialize the simple text-based progress file
  echo "TOTAL_BATCHES=$TOTAL_BATCHES" > "$PROGRESS_FILE"
  echo "COMPLETED_BATCHES=0" >> "$PROGRESS_FILE"
  echo "CURRENT_BATCH=1" >> "$PROGRESS_FILE"
  echo "CURRENT_PAGE=1" >> "$PROGRESS_FILE"
  echo "START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
  
  # Initialize the detailed progress file (which pages have been completed)
  echo "# Completed pages - one per line" > "$DETAILED_PROGRESS_FILE"
  
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$DATE] Starting new complete database import process" >> "$IMPORT_LOG"
}

# Function to load existing progress
load_progress() {
  if [[ -f "$PROGRESS_FILE" && -f "$DETAILED_PROGRESS_FILE" ]]; then
    # Source the progress file to load variables
    source "$PROGRESS_FILE"
    
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
  echo "TOTAL_BATCHES=$TOTAL_BATCHES" > "$PROGRESS_FILE"
  echo "COMPLETED_BATCHES=$COMPLETED_BATCHES" >> "$PROGRESS_FILE"
  echo "CURRENT_BATCH=$CURRENT_BATCH" >> "$PROGRESS_FILE"
  echo "CURRENT_PAGE=$CURRENT_PAGE" >> "$PROGRESS_FILE"
  echo "LAST_UPDATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
  
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$DATE] Progress saved: batch $CURRENT_BATCH, page $CURRENT_PAGE" >> "$IMPORT_LOG"
}

# Function to mark a page as completed
mark_page_completed() {
  local page=$1
  
  # Check if page is already in file
  if ! grep -q "^$page$" "$DETAILED_PROGRESS_FILE"; then
    # Add the page to the completed_pages file
    echo "$page" >> "$DETAILED_PROGRESS_FILE"
  fi
}

# Function to check if a page has been completed
is_page_completed() {
  local page=$1
  
  # Check if the page is in the completed_pages file
  grep -q "^$page$" "$DETAILED_PROGRESS_FILE"
  return $?
}

# Function to count completed pages
count_completed_pages() {
  # Count non-comment lines in the file
  grep -v "^#" "$DETAILED_PROGRESS_FILE" | wc -l | tr -d ' '
}

# Function to process a single page
process_page() {
  local page=$1
  local force_import=$2  # New parameter to control force import behavior
  
  # Check if this page has already been completed
  if is_page_completed $page && [ "$force_import" != "true" ]; then
    echo -e "${YELLOW}Page $page already processed, skipping...${NC}"
    echo "[$DATE] Page $page already processed (verified from detailed progress), skipping" >> "$IMPORT_LOG"
    return 0
  fi
    echo -e "${BLUE}Processing page $page${NC}"
  
  # Build the command using environment variables
  local cmd="node \"$APP_DIR/scripts/data/${SCRIPT_NAME}\" --single-page --page-num=$page --page-size=10"
  
  # Add force import flag if needed
  if [ "$force_import" = "true" ]; then
    cmd="$cmd --force-import"
    echo -e "${YELLOW}Force import enabled for page $page - will reimport episodes${NC}"
  fi
  
  # Execute the command
  eval $cmd
  
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

echo -e "${BLUE}Checking for required packages...${NC}"
cd "$APP_DIR"

# Install dependencies locally instead of globally
echo -e "${BLUE}Installing required packages locally...${NC}"
if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${YELLOW}Creating package.json for dependencies...${NC}"
  cat > "$APP_DIR/package.json" << EOF
{
  "name": "filmflex-importer",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3"
  }
}
EOF
fi

# Install dependencies
npm install --save

# Make sure script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Check if there's existing progress and ask what to do
if [[ -f "$PROGRESS_FILE" && -f "$DETAILED_PROGRESS_FILE" ]]; then
  echo -e "${YELLOW}Existing import progress found.${NC}"
  echo -e "1) Resume from last position"
  echo -e "2) Start over from the beginning"
  echo -e "3) Start from a specific batch/page"
  echo -e "4) Force reimport episodes for existing movies"
  read -p "Select an option (1-4): " RESUME_OPTION
  
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
      echo "CURRENT_BATCH=$CURRENT_BATCH" > "$PROGRESS_FILE"
      echo "CURRENT_PAGE=$CURRENT_PAGE" >> "$PROGRESS_FILE"
      echo "COMPLETED_BATCHES=$COMPLETED_BATCHES" >> "$PROGRESS_FILE"
      ;;
    4)
      # Force reimport episodes for existing movies
      echo -e "${YELLOW}Force reimport episodes for existing movies selected.${NC}"
      echo -e "${YELLOW}This option will reimport all episodes for all movies that have already been imported.${NC}"
      echo -e "${YELLOW}This process is irreversible and will overwrite existing data.${NC}"
      read -p "Are you absolutely sure you want to continue? (yes/no) " -r
      echo
      if [[ ! $REPLY =~ ^yes$ ]]; then
        echo -e "${RED}Import cancelled.${NC}"
        exit 0
      fi
      
      # Ask how many pages to process
      read -p "How many pages to process for force reimport (1-$TOTAL_PAGES) or 'all': " FORCE_PAGES
      
      if [[ "$FORCE_PAGES" == "all" ]]; then
        FORCE_PAGES=$TOTAL_PAGES
      elif ! [[ "$FORCE_PAGES" =~ ^[0-9]+$ ]] || [ "$FORCE_PAGES" -le 0 ] || [ "$FORCE_PAGES" -gt "$TOTAL_PAGES" ]; then
        echo -e "${RED}Invalid number of pages. Using default of 10.${NC}"
        FORCE_PAGES=10
      fi
      
      echo -e "${YELLOW}Will force reimport episodes for $FORCE_PAGES pages${NC}"
      
      DATE=$(date '+%Y-%m-%d %H:%M:%S')
      echo "[$DATE] Starting force reimport of episodes for $FORCE_PAGES pages" >> "$IMPORT_LOG"
      
      # Initialize new progress
      initialize_progress
      CURRENT_BATCH=1
      CURRENT_PAGE=1
      COMPLETED_BATCHES=0
      FORCE_IMPORT=true
      
      # Process the specified number of pages with force import
      for (( p=1; p<=FORCE_PAGES; p++ )); do
        process_page $p true
        
        # Add a small delay between pages to avoid hammering the API
        if [ $p -lt $FORCE_PAGES ]; then
          countdown $DELAY_BETWEEN_PAGES "Waiting before next page:"
        fi
      done
      
      echo -e "${GREEN}Force reimport completed for $FORCE_PAGES pages.${NC}"
      DATE=$(date '+%Y-%m-%d %H:%M:%S')
      echo "[$DATE] Force reimport completed for $FORCE_PAGES pages" >> "$IMPORT_LOG"
      exit 0
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

# Set the force import flag if it's not already set
FORCE_IMPORT=${FORCE_IMPORT:-false}

# Tell the user what we're doing and how to interrupt safely
echo -e "${YELLOW}The import process will now begin. Press Ctrl+C at any time to safely pause the import.${NC}"
echo -e "${YELLOW}You can resume the import later by running this script again and selecting 'Resume'.${NC}"
echo -e "${GREEN}Starting import from batch ${CURRENT_BATCH}, page ${CURRENT_PAGE}${NC}"
echo

# Wait for confirmation before starting
read -p "Press Enter to start the import process..." -r

# ======= MAIN IMPORT LOOP =======

# Main processing loop - by batch
while [ $CURRENT_BATCH -le $TOTAL_BATCHES ]; do
  batch_start=$(( (CURRENT_BATCH - 1) * BATCH_SIZE + 1 ))
  batch_end=$(( CURRENT_BATCH * BATCH_SIZE ))
  
  # Ensure batch_end doesn't exceed total pages
  if [ $batch_end -gt $TOTAL_PAGES ]; then
    batch_end=$TOTAL_PAGES
  fi
  
  echo -e "${BLUE}========== Processing Batch $CURRENT_BATCH/$TOTAL_BATCHES (Pages $batch_start-$batch_end) ==========${NC}"
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$DATE] Starting batch $CURRENT_BATCH (pages $batch_start-$batch_end)" >> "$IMPORT_LOG"
  
  # Process each page in the current batch
  for (( page=batch_start; page<=batch_end; page++ )); do
    # If we were resuming, start from the correct page
    if [ $page -lt $CURRENT_PAGE ]; then
      continue
    fi
    
    CURRENT_PAGE=$page
    process_page $page $FORCE_IMPORT
    
    # Save progress after each page
    save_progress
    
    # Add a small delay between pages to avoid hammering the API
    if [ $page -lt $batch_end ]; then
      countdown $DELAY_BETWEEN_PAGES "Waiting before next page:"
    fi
  done
  
  # Update completed batches
  COMPLETED_BATCHES=$CURRENT_BATCH
  save_progress
  
  # Check if we're at the last batch
  if [ $CURRENT_BATCH -eq $TOTAL_BATCHES ]; then
    COMPLETION_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed.${NC}"
    echo "[$COMPLETION_DATE] FULL IMPORT COMPLETED! All $TOTAL_BATCHES batches processed." >> "$IMPORT_LOG"
    
    # Update final timestamp
    echo "END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROGRESS_FILE"
    echo "COMPLETED=true" >> "$PROGRESS_FILE"
    
    break
  fi
  
  # Set up for the next batch
  CURRENT_BATCH=$((CURRENT_BATCH + 1))
  CURRENT_PAGE=$(( (CURRENT_BATCH - 1) * BATCH_SIZE + 1 ))
  save_progress
  
  # Take a break between batches
  BREAK_DATE=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${YELLOW}[$BREAK_DATE] Batch $CURRENT_BATCH completed. Taking a ${BREAK_MINUTES}-minute break before next batch...${NC}"
  echo "[$BREAK_DATE] Batch $CURRENT_BATCH completed. Taking a ${BREAK_MINUTES}-minute break before next batch..." >> "$IMPORT_LOG"
  
  # Display a countdown timer for the break
  for (( minutes=BREAK_MINUTES; minutes>0; minutes-- )); do
    echo -ne "${YELLOW}Break: $minutes minutes remaining...${NC}\r"
    sleep 60
  done
  echo -e "${GREEN}Break completed. Continuing to next batch...${NC}"
done

# Count completed pages
COMPLETED_PAGES=$(count_completed_pages)

echo
echo -e "${GREEN}==== Import Summary ====${NC}"
echo -e "${GREEN}Total batches: $TOTAL_BATCHES${NC}"
echo -e "${GREEN}Completed batches: $COMPLETED_BATCHES${NC}"
echo -e "${GREEN}Pages processed: $COMPLETED_PAGES/${TOTAL_PAGES}${NC}"
echo -e "${GREEN}Approximate movies: ${APPROX_MOVIES}${NC}"
echo -e "${BLUE}Full log file: $IMPORT_LOG${NC}"
echo -e "${BLUE}Progress tracking: $PROGRESS_FILE${NC}"
echo -e "${BLUE}Detailed progress: $DETAILED_PROGRESS_FILE${NC}"
echo

exit 0