#!/bin/bash

# FilmFlex Database Fix Script
# This script runs a database schema fix to add missing columns

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
LOG_FILE="${LOG_DIR}/db-fix-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Database Schema Fix"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start
echo "Starting database schema fix at $(date)" | tee -a "$LOG_FILE"

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

# Step 2: Install dependencies
echo -e "${BLUE}Step 2: Installing dependencies...${NC}" | tee -a "$LOG_FILE"
cd "${APP_DIR}"
npm install dotenv pg fs-extra | tee -a "$LOG_FILE"

# Step 3: Copy and run the fix database script
echo -e "${BLUE}Step 3: Running database fix script...${NC}" | tee -a "$LOG_FILE"
cp "${SOURCE_DIR}/fix-database.js" "${APP_DIR}/fix-database.js"

# Run the database fix
cd "${APP_DIR}"
node fix-database.js | tee -a "$LOG_FILE"

# Check if script was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Database schema fix completed successfully at $(date)${NC}" | tee -a "$LOG_FILE"
  
  # Clean up
  echo -e "${BLUE}Cleaning up...${NC}" | tee -a "$LOG_FILE"
  rm "${APP_DIR}/fix-database.js"
  
  echo ""
  echo "Your database schema has been fixed and should now match your development environment."
  echo "You can now run the import scripts:"
  echo "  cd ${APP_DIR}/scripts/data && ./import-all-movies-resumable.sh"
  echo ""
  echo "For more details, check the log: ${LOG_FILE}"
else
  echo -e "${RED}Database schema fix failed at $(date)${NC}" | tee -a "$LOG_FILE"
  echo ""
  echo "There was an error fixing your database schema. Please check the log for details:"
  echo "  ${LOG_FILE}"
fi