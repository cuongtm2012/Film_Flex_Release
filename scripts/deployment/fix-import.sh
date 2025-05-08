#!/bin/bash

# FilmFlex Import Script Fix
# This script fixes the import script by installing the required dependencies

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
LOG_FILE="${LOG_DIR}/fix-import-${DATE}.log"
IMPORT_DIR="${APP_DIR}/scripts/data"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Import Script Fix"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start of fix
echo "Starting import script fix at $(date)" | tee -a "$LOG_FILE"

# Install required packages globally
echo -e "${BLUE}Installing required npm packages globally...${NC}" | tee -a "$LOG_FILE"
npm install -g axios dotenv pg fs-extra | tee -a "$LOG_FILE"

# Also install locally in the scripts directory
echo -e "${BLUE}Installing required npm packages locally in scripts directory...${NC}" | tee -a "$LOG_FILE"
mkdir -p "${IMPORT_DIR}/node_modules"
cd "${IMPORT_DIR}"
npm init -y > /dev/null 2>&1
npm install axios dotenv pg fs-extra | tee -a "$LOG_FILE"

# Create a simple package.json in the main app directory if it doesn't exist
if [ ! -f "${APP_DIR}/package.json" ]; then
  echo -e "${BLUE}Creating package.json in app directory...${NC}" | tee -a "$LOG_FILE"
  cd "${APP_DIR}"
  cat > package.json << EOF
{
  "name": "filmflex-server",
  "version": "1.0.0",
  "description": "FilmFlex Movie Streaming Platform",
  "main": "filmflex-server.cjs",
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.15.6",
    "axios": "^1.6.7",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node filmflex-server.cjs"
  }
}
EOF
  npm install | tee -a "$LOG_FILE"
fi

# Fix the import script to use local modules
echo -e "${BLUE}Checking import script...${NC}" | tee -a "$LOG_FILE"
IMPORT_SCRIPT="${IMPORT_DIR}/import-movies-sql.cjs"
if [ -f "$IMPORT_SCRIPT" ]; then
  echo -e "${BLUE}Fixing import script to use local modules...${NC}" | tee -a "$LOG_FILE"
  # Backup original script
  cp "${IMPORT_SCRIPT}" "${IMPORT_SCRIPT}.bak"
  
  # Add explicit path to modules
  sed -i "s/require('axios')/require(process.cwd() + '\/node_modules\/axios')/g" "${IMPORT_SCRIPT}"
  sed -i "s/require('dotenv')/require(process.cwd() + '\/node_modules\/dotenv')/g" "${IMPORT_SCRIPT}"
  sed -i "s/require('pg')/require(process.cwd() + '\/node_modules\/pg')/g" "${IMPORT_SCRIPT}"
  sed -i "s/require('fs-extra')/require(process.cwd() + '\/node_modules\/fs-extra')/g" "${IMPORT_SCRIPT}"
fi

# Test the import script
echo -e "${BLUE}Testing import script...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
node "${IMPORT_SCRIPT}" --test-mode --limit 1 | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "${GREEN}Import script test successful!${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Import script test failed. Please check the logs.${NC}" | tee -a "$LOG_FILE"
fi

echo -e "${GREEN}Import script fix completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo
echo "Now you can run the import script with:"
echo "cd ${APP_DIR} && node scripts/data/import-movies-sql.cjs"
echo
echo "For more information, check the log: $LOG_FILE"