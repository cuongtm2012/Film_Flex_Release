#!/bin/bash

# FilmFlex Complete Fix Script
# This script fixes everything in one go:
# 1. Recreates the database
# 2. Performs a quick import of movies
# 3. Restarts the server in production mode

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
LOG_FILE="${LOG_DIR}/fix-everything-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Complete Fix Script"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start of process
echo "Starting complete fix process at $(date)" | tee -a "$LOG_FILE"

# Make scripts executable
chmod +x "${SOURCE_DIR}/recreate-database.sh"
chmod +x "${SOURCE_DIR}/quick-import.sh"
chmod +x "${SOURCE_DIR}/final-deploy.sh"

# Step 1: Recreate the database
echo -e "${BLUE}Step 1: Recreating the database...${NC}" | tee -a "$LOG_FILE"
"${SOURCE_DIR}/recreate-database.sh" | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}Database recreation failed. Please check the logs.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Step 2: Import movies
echo -e "${BLUE}Step 2: Importing movies...${NC}" | tee -a "$LOG_FILE"
"${SOURCE_DIR}/quick-import.sh" | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}Movie import failed. Please check the logs.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Step 3: Deploy the server properly
echo -e "${BLUE}Step 3: Deploying the server...${NC}" | tee -a "$LOG_FILE"
"${SOURCE_DIR}/final-deploy.sh" | tee -a "$LOG_FILE"
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}Deployment failed. Please check the logs.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# All done!
echo -e "${GREEN}Complete fix process finished successfully at $(date)${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}The FilmFlex website should now be fully operational at https://phimgg.com${NC}"
echo 
echo "For more information, check the log: $LOG_FILE"
echo
echo "If you want to import more movies later, run:"
echo "cd ~/Film_Flex_Release && sudo bash scripts/data/import-movies.sh"