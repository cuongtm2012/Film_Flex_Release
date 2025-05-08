#!/bin/bash

# FilmFlex Adaptive Import Runner
# This script runs the adaptive import script, which adjusts to your database schema

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
LOG_FILE="${LOG_DIR}/adaptive-import-run-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Adaptive Import Runner"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start
echo "Starting adaptive import runner at $(date)" | tee -a "$LOG_FILE"

# Install dependencies
echo -e "${BLUE}Installing required packages...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
npm install axios dotenv pg fs-extra path | tee -a "$LOG_FILE"

# Copy the scripts to the app directory
echo -e "${BLUE}Copying import scripts...${NC}" | tee -a "$LOG_FILE"
cp "${SOURCE_DIR}/check-and-fix-schema.js" "${APP_DIR}/check-and-fix-schema.js"
cp "${SOURCE_DIR}/adaptive-import.js" "${APP_DIR}/adaptive-import.js"
chmod +x "${APP_DIR}/check-and-fix-schema.js"
chmod +x "${APP_DIR}/adaptive-import.js"

# Parse command line arguments
START_PAGE=${1:-1}
NUM_PAGES=${2:-3}

# Run the adaptive import script
echo -e "${BLUE}Running adaptive import script...${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}Starting from page ${START_PAGE}, importing ${NUM_PAGES} pages${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
node adaptive-import.js ${START_PAGE} ${NUM_PAGES} | tee -a "$LOG_FILE"

echo -e "${GREEN}Adaptive import completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo 
echo "For more information, check the log: $LOG_FILE"