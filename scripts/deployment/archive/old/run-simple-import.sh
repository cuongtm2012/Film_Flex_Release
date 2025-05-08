#!/bin/bash

# FilmFlex Simple Import Runner
# This script runs the simple import script without external dependencies

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define paths
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y%m%d%H%M%S')
LOG_FILE="${LOG_DIR}/simple-import-run-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Simple Import Runner"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start
echo "Starting simple import runner at $(date)" | tee -a "$LOG_FILE"

# Step 1: Ensure .env file exists with correct DATABASE_URL
echo -e "${BLUE}Step 1: Checking .env file...${NC}" | tee -a "$LOG_FILE"
if [ ! -f "${APP_DIR}/.env" ]; then
  echo -e "${YELLOW}Creating .env file${NC}" | tee -a "$LOG_FILE"
  cat > "${APP_DIR}/.env" << EOF
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
NODE_ENV=production
API_URL=https://phimapi.com
EOF
else
  echo -e "${GREEN}.env file already exists${NC}" | tee -a "$LOG_FILE"
  
  # Check if DATABASE_URL exists in .env
  if ! grep -q "DATABASE_URL" "${APP_DIR}/.env"; then
    echo -e "${YELLOW}Adding DATABASE_URL to .env file${NC}" | tee -a "$LOG_FILE"
    echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex" >> "${APP_DIR}/.env"
  fi
  
  # Check if API_URL exists in .env
  if ! grep -q "API_URL" "${APP_DIR}/.env"; then
    echo -e "${YELLOW}Adding API_URL to .env file${NC}" | tee -a "$LOG_FILE"
    echo "API_URL=https://phimapi.com" >> "${APP_DIR}/.env"
  fi
fi

# Step 2: Install only essential dependencies
echo -e "${BLUE}Step 2: Installing essential dependencies...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
npm install pg | tee -a "$LOG_FILE"

# Step 3: Copy the simple import script
echo -e "${BLUE}Step 3: Copying simple import script...${NC}" | tee -a "$LOG_FILE"
cp "${SOURCE_DIR}/simple-import.js" "${APP_DIR}/simple-import.js"
chmod +x "${APP_DIR}/simple-import.js"

# Parse command line arguments
START_PAGE=${1:-1}
NUM_PAGES=${2:-3}

# Step 4: Run the simple import script
echo -e "${BLUE}Step 4: Running simple import script...${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}Starting from page ${START_PAGE}, importing ${NUM_PAGES} pages${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
node simple-import.js ${START_PAGE} ${NUM_PAGES} | tee -a "$LOG_FILE"

# Check if script was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Simple import completed successfully at $(date)${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Simple import failed at $(date)${NC}" | tee -a "$LOG_FILE"
fi

echo ""
echo "For more information, check the log: $LOG_FILE"