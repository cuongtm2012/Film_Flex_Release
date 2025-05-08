#!/bin/bash

# FilmFlex Quick Movie Import Script
# This script quickly imports the first few pages of movies to get the site working

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
LOG_FILE="${LOG_DIR}/quick-import-${DATE}.log"
API_BASE_URL="https://phimapi.com/api/v1"
DB_USER="filmflex"
DB_PASSWORD="filmflex2024"
DB_HOST="localhost"
DB_NAME="filmflex"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Quick Movie Import"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start of import
echo "Starting quick movie import at $(date)" | tee -a "$LOG_FILE"

# Make sure curl is installed
echo -e "${BLUE}Checking for required packages...${NC}" | tee -a "$LOG_FILE"
apt-get update >/dev/null
apt-get install -y curl jq >/dev/null

# Test database connection
echo -e "${BLUE}Testing database connection...${NC}" | tee -a "$LOG_FILE"
if PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "SELECT 1;" >/dev/null 2>&1; then
  echo -e "${GREEN}Database connection successful${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Failed to connect to database. Please check your credentials.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Function to import a page of movies
import_page() {
  local page=$1
  echo -e "${BLUE}Importing page ${page}...${NC}" | tee -a "$LOG_FILE"
  
  # Fetch the movie list from API
  local response=$(curl -s "${API_BASE_URL}/list/movie?sort=modified&page=${page}")
  
  # Parse the response with jq
  if ! echo "$response" | jq -e '.items' >/dev/null 2>&1; then
    echo -e "${RED}Failed to fetch page ${page}${NC}" | tee -a "$LOG_FILE"
    return 1
  fi
  
  # Extract and process each movie
  local count=0
  local items=$(echo "$response" | jq -c '.items[]')
  
  echo "$items" | while read -r movie; do
    local title=$(echo "$movie" | jq -r '.title')
    local slug=$(echo "$movie" | jq -r '.slug')
    local description=$(echo "$movie" | jq -r '.description')
    local poster=$(echo "$movie" | jq -r '.poster')
    
    # Insert movie into database, skipping if it already exists
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -h $DB_HOST << EOF >/dev/null
    INSERT INTO movies (title, slug, description, poster)
    VALUES ('$(echo "$title" | sed "s/'/''/g")', '$slug', '$(echo "$description" | sed "s/'/''/g")', '$poster')
    ON CONFLICT (slug) DO NOTHING;
EOF
    
    count=$((count+1))
    echo -n "."
  done
  
  echo -e "\n${GREEN}Imported ${count} movies from page ${page}${NC}" | tee -a "$LOG_FILE"
  return 0
}

# Import first 3 pages
echo -e "${BLUE}Starting quick import of first 3 pages...${NC}" | tee -a "$LOG_FILE"
for page in {1..3}; do
  import_page $page
  sleep 1
done

echo -e "${GREEN}Quick import completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}The website should now be operational with some initial movies${NC}"
echo 
echo "For more information, check the log: $LOG_FILE"
echo
echo "Next step: Restart the server with the production mode"
echo "cd ~/Film_Flex_Release && sudo ./scripts/deployment/final-deploy.sh"