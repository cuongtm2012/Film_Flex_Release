#!/bin/bash

# FilmFlex Daily Movie Data Import Script
# This script runs a daily import of the newest movies from phimapi.com

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Figure out if we're in development or production
if [ -f "/var/www/filmflex/.env" ]; then
  # Production environment
  APP_DIR="/var/www/filmflex"
  LOG_DIR="/var/log/filmflex"
  ENV="production"
else
  # Development environment
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
  LOG_DIR="$APP_DIR/log"
  ENV="development"
fi

SCRIPT_NAME="import-movies-sql.cjs"
LOG_FILE="${LOG_DIR}/daily-import-$(date '+%Y-%m-%d').log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Daily Movie Import"
echo "========================================"
echo -e "${NC}"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print start message
echo -e "${BLUE}[$DATE] Starting FilmFlex daily movie import...${NC}" | tee -a "$LOG_FILE"

# Change to application directory
cd "$APP_DIR"

# Install dependencies locally instead of globally
echo -e "${BLUE}[$DATE] Installing required packages locally...${NC}" | tee -a "$LOG_FILE"
if [ ! -f "$APP_DIR/package.json" ]; then
  echo -e "${YELLOW}[$DATE] Creating package.json for dependencies...${NC}" | tee -a "$LOG_FILE"
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
npm install --save >> "$LOG_FILE" 2>&1

# Make sure script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Check if deep scan is requested
DEEP_SCAN_FLAG=""
MAX_PAGES="3"  # Default to 3 pages for regular import

if [[ "$*" == *"--deep-scan"* ]]; then
  echo -e "${YELLOW}[$DATE] Deep scan requested...${NC}" | tee -a "$LOG_FILE"
  DEEP_SCAN_FLAG="--deep-scan"
  MAX_PAGES="10"  # Use 10 pages for deep scan
elif [[ $(date +%u) -eq 6 ]]; then
  # Automatically do deep scan on Saturdays (day 6)
  echo -e "${YELLOW}[$DATE] Saturday detected, performing automatic deep scan...${NC}" | tee -a "$LOG_FILE"
  DEEP_SCAN_FLAG="--deep-scan"
  MAX_PAGES="10"  # Use 10 pages for deep scan
fi

# Add additional flags to specify max pages explicitly
if [[ "$*" == *"--max-pages="* ]]; then
  # Extract the value after --max-pages=
  for arg in "$@"; do
    if [[ $arg == --max-pages=* ]]; then
      MAX_PAGES="${arg#*=}"
      break
    fi
  done
  echo -e "${YELLOW}[$DATE] Using custom max pages: $MAX_PAGES${NC}" | tee -a "$LOG_FILE"
fi

# API configuration
API_CHECK_RESULT="OK"
API_URL="https://phimapi.com"

# Check API connectivity before starting
echo -e "${BLUE}[$DATE] Checking API connectivity...${NC}" | tee -a "$LOG_FILE"
curl -s --head "$API_URL" > /dev/null
if [ $? -ne 0 ]; then
  echo -e "${RED}[$DATE] ERROR: Cannot connect to $API_URL${NC}" | tee -a "$LOG_FILE"
  API_CHECK_RESULT="FAIL"
else
  echo -e "${GREEN}[$DATE] API connection successful${NC}" | tee -a "$LOG_FILE"
fi

# Only proceed if API is available
if [ "$API_CHECK_RESULT" = "OK" ]; then
  # Run the import script
  echo -e "${BLUE}[$DATE] Running import script for $MAX_PAGES pages...${NC}" | tee -a "$LOG_FILE"
  NODE_ENV=$ENV node "$APP_DIR/scripts/data/${SCRIPT_NAME}" $DEEP_SCAN_FLAG --max-pages=$MAX_PAGES 2>&1 | tee -a "$LOG_FILE"
  
  # Check if the script executed successfully
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}[$DATE] FilmFlex daily movie import completed successfully${NC}" | tee -a "$LOG_FILE"
    
    # Count how many movies were imported
    SAVED_COUNT=$(grep -c "Processed.*movies:.*saved" "$LOG_FILE")
    EXISTING_COUNT=$(grep "Processed.*movies:" "$LOG_FILE" | grep -Eo "existing, [0-9]+" | grep -Eo "[0-9]+" | awk '{s+=$1} END {print s}')
    FAILED_COUNT=$(grep "Processed.*movies:" "$LOG_FILE" | grep -Eo "[0-9]+ failed" | grep -Eo "[0-9]+" | awk '{s+=$1} END {print s}')
    
    echo -e "${GREEN}[$DATE] Import summary: $SAVED_COUNT new movies, $EXISTING_COUNT existing, $FAILED_COUNT failed${NC}" | tee -a "$LOG_FILE"
  else
    echo -e "${RED}[$DATE] FilmFlex daily movie import failed${NC}" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  echo -e "${RED}[$DATE] Skipping import due to API connectivity issues${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

echo -e "${BLUE}[$DATE] Daily import process complete${NC}"
echo -e "${BLUE}Log file: $LOG_FILE${NC}"

# Exit with success
exit 0