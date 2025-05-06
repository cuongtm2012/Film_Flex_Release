#!/bin/bash

# FilmFlex Force Deep Scan Script
# This script forces a deep scan of multiple pages of the movie API

# Set up colorized output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print banner
echo -e "${YELLOW}"
echo "====================================================="
echo "= FilmFlex Force Deep Scan                         ="
echo "= This will scan multiple pages for new content    ="
echo "====================================================="
echo -e "${NC}"

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

# Get number of pages to scan
read -p "How many pages would you like to scan? [default: 5]: " PAGES
PAGES=${PAGES:-5}

echo
echo -e "${YELLOW}This will scan ${PAGES} pages from the API for new movies.${NC}"
echo -e "${YELLOW}This may take several minutes depending on the number of pages.${NC}"
echo

# Ask for confirmation
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Operation cancelled.${NC}"
  exit 0
fi

echo
echo -e "${GREEN}Starting deep scan of ${PAGES} pages...${NC}"
echo

# Execute the import script with the deep scan flag
bash "$APP_DIR/scripts/data/import-movies.sh" --deep-scan

echo
echo -e "${GREEN}Deep scan completed!${NC}"
echo
echo -e "${YELLOW}To view the import log, run:${NC}"
echo "tail -f $LOG_DIR/data-import.log"
echo

exit 0