#!/bin/bash

# FilmFlex Batch Movie Import Script
# This script handles batch importing movies from specific page ranges

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
SCRIPT_NAME="import-movies-sql.cjs"
BATCH_LOG_FILE="${LOG_DIR}/batch-import.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
IMPORT_SCRIPT="${SCRIPT_DIR}/${SCRIPT_NAME}"

# Print banner
echo -e "${BLUE}"
echo "=============================================="
echo "    FilmFlex Batch Movie Import Script"
echo "=============================================="
echo -e "${NC}"

# Function to print usage
function print_usage {
  echo -e "${YELLOW}Usage:${NC}"
  echo "  $0 [options]"
  echo
  echo -e "${YELLOW}Options:${NC}"
  echo "  --start-page NUM     First page to import (default: 1)"
  echo "  --end-page NUM       Last page to import (default: 10)"
  echo "  --page-size NUM      Items per page (default: 10)"
  echo "  --delay NUM          Delay in seconds between pages (default: 2)"
  echo "  --help               Show this help message"
  echo
  echo -e "${YELLOW}Examples:${NC}"
  echo "  $0 --start-page 1 --end-page 100         # Import first 100 pages"
  echo "  $0 --start-page 101 --end-page 200       # Import pages 101-200"
  echo "  $0 --start-page 1 --end-page 2256        # Import ALL pages (not recommended at once)"
  echo
}

# Default values
START_PAGE=1
END_PAGE=10
PAGE_SIZE=10
DELAY=2

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-page)
      START_PAGE="$2"
      shift 2
      ;;
    --end-page)
      END_PAGE="$2"
      shift 2
      ;;
    --page-size)
      PAGE_SIZE="$2"
      shift 2
      ;;
    --delay)
      DELAY="$2"
      shift 2
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_usage
      exit 1
      ;;
  esac
done

# Validate input
if ! [[ "$START_PAGE" =~ ^[0-9]+$ ]] || ! [[ "$END_PAGE" =~ ^[0-9]+$ ]] || ! [[ "$PAGE_SIZE" =~ ^[0-9]+$ ]] || ! [[ "$DELAY" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}Error: All parameters must be positive integers${NC}"
  print_usage
  exit 1
fi

if [ "$START_PAGE" -gt "$END_PAGE" ]; then
  echo -e "${RED}Error: Start page must be less than or equal to end page${NC}"
  print_usage
  exit 1
fi

# Calculate total pages to import
TOTAL_PAGES=$((END_PAGE - START_PAGE + 1))

# Ask for confirmation if importing a large number of pages
if [ "$TOTAL_PAGES" -gt 100 ]; then
  echo -e "${YELLOW}WARNING: You are about to import ${TOTAL_PAGES} pages. This may take a long time.${NC}"
  read -p "Are you sure you want to continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Import cancelled.${NC}"
    exit 0
  fi
fi

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Check if jq is installed (needed for JSON processing)
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: This script requires 'jq' for JSON processing${NC}"
  echo -e "${YELLOW}Please install jq with:${NC}"
  echo -e "  apt-get update && apt-get install -y jq"
  exit 1
fi

# Print start message
echo -e "${GREEN}Starting batch import of movies from pages ${START_PAGE} to ${END_PAGE}${NC}"
echo "[$DATE] Starting batch import of movies from pages ${START_PAGE} to ${END_PAGE}" >> "$BATCH_LOG_FILE"

# Ensure the import script exists and is executable
if [ ! -f "$IMPORT_SCRIPT" ]; then
  echo -e "${RED}Error: Import script not found at ${IMPORT_SCRIPT}${NC}"
  exit 1
fi

chmod +x "$IMPORT_SCRIPT"

# Create or reset batch progress file
PROGRESS_FILE="${SCRIPT_DIR}/batch_progress.json"
echo "{\"startPage\": $START_PAGE, \"endPage\": $END_PAGE, \"currentPage\": $START_PAGE, \"totalPages\": $TOTAL_PAGES, \"failedPages\": [], \"completedPages\": [], \"startTime\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$PROGRESS_FILE"

# Function to update progress
function update_progress {
  local status=$1
  local page=$2
  local message=$3
  
  # Update progress file
  if [ "$status" == "completed" ]; then
    # Add page to completed pages array
    jq ".completedPages += [$page] | .currentPage = $(($page + 1))" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
  elif [ "$status" == "failed" ]; then
    # Add page to failed pages array
    jq ".failedPages += [$page] | .currentPage = $(($page + 1))" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"
  fi

  # Calculate progress percentage
  local completed=$(jq '.completedPages | length' "$PROGRESS_FILE")
  local total=$TOTAL_PAGES
  local percentage=$(( 100 * completed / total ))
  
  echo "[$DATE] $message (Page $page, Progress: $percentage%)" >> "$BATCH_LOG_FILE"
  echo -e "${GREEN}[$DATE] $message (Page $page, Progress: $percentage%)${NC}"
}

echo -e "${YELLOW}Total pages to import: $TOTAL_PAGES${NC}"
echo -e "${YELLOW}Page size: $PAGE_SIZE items${NC}"
echo -e "${YELLOW}Delay between pages: $DELAY seconds${NC}"
echo

# Process pages in sequence
for (( page=START_PAGE; page<=END_PAGE; page++ )); do
  echo -e "${BLUE}Processing page $page of $END_PAGE...${NC}"
  
  # Run the import script for this specific page
  # We use a temporary custom parameter to tell our import script to process just one specific page
  if NODE_ENV=development node "$IMPORT_SCRIPT" --single-page --page-num=$page --page-size=$PAGE_SIZE 2>&1 | tee -a "$BATCH_LOG_FILE"; then
    update_progress "completed" "$page" "Successfully imported page $page"
  else
    update_progress "failed" "$page" "Failed to import page $page"
  fi
  
  # Only add delay if we're not on the last page
  if [ "$page" -lt "$END_PAGE" ]; then
    echo -e "${YELLOW}Waiting $DELAY seconds before next page...${NC}"
    sleep $DELAY
  fi
done

# Update final timestamp
jq ".endTime = \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"" "$PROGRESS_FILE" > "${PROGRESS_FILE}.tmp" && mv "${PROGRESS_FILE}.tmp" "$PROGRESS_FILE"

# Print summary
COMPLETED=$(jq '.completedPages | length' "$PROGRESS_FILE")
FAILED=$(jq '.failedPages | length' "$PROGRESS_FILE")

echo
echo -e "${GREEN}==== Import Summary ====${NC}"
echo -e "${GREEN}Total pages processed: $TOTAL_PAGES${NC}"
echo -e "${GREEN}Pages imported successfully: $COMPLETED${NC}"
echo -e "${RED}Pages failed: $FAILED${NC}"
echo -e "${BLUE}Log file: $BATCH_LOG_FILE${NC}"
echo -e "${BLUE}Progress file: $PROGRESS_FILE${NC}"
echo

# Check for failed pages and provide suggestions
if [ "$FAILED" -gt 0 ]; then
  FAILED_PAGES=$(jq -r '.failedPages | join(", ")' "$PROGRESS_FILE")
  echo -e "${YELLOW}Some pages failed to import: $FAILED_PAGES${NC}"
  echo -e "${YELLOW}To retry failed pages only, create a new script with those specific pages.${NC}"
  echo
fi

# Exit with success
exit 0