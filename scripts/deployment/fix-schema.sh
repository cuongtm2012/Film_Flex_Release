#!/bin/bash

# FilmFlex Schema Fix Script
# This script runs the schema check and fix

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
LOG_FILE="${LOG_DIR}/schema-fix-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Schema Fix"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start
echo "Starting schema fix at $(date)" | tee -a "$LOG_FILE"

# Install required packages
echo -e "${BLUE}Installing required packages...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
npm install pg dotenv fs-extra path | tee -a "$LOG_FILE"

# Copy the schema check script to the app directory
echo -e "${BLUE}Copying schema check script...${NC}" | tee -a "$LOG_FILE"
cp "${SOURCE_DIR}/check-and-fix-schema.js" "${APP_DIR}/check-and-fix-schema.js"
chmod +x "${APP_DIR}/check-and-fix-schema.js"

# Run the schema check script
echo -e "${BLUE}Running schema check script...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
node check-and-fix-schema.js | tee -a "$LOG_FILE"

echo -e "${GREEN}Schema fix completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo 
echo "For more information, check the log: $LOG_FILE"