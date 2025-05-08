#!/bin/bash

# FilmFlex Cron Job Setup Script
# This script sets up scheduled tasks for automatic data import

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
APP_DIR="/var/www/filmflex"
DATA_DIR="$APP_DIR/scripts/data"
CRON_FILE="/etc/cron.d/filmflex-data-import"
USER="root"  # User to run the cron job as
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="/var/log/filmflex"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "  FilmFlex Automated Import Setup"
echo "========================================"
echo -e "${NC}"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
  echo -e "${RED}This script must be run as root${NC}"
  exit 1
fi

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x $SCRIPT_DIR/*.sh
chmod +x $SCRIPT_DIR/*.cjs 2>/dev/null || true

# Create cron job file
echo -e "${BLUE}Creating cron job entries...${NC}"
cat > $CRON_FILE << EOF
# FilmFlex Data Import Cron Jobs
# Run normal movie data import twice daily at 6 AM and 6 PM (first 3 pages)
0 6,18 * * 0-5 $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-movies.sh --max-pages=3 > $LOG_DIR/cron-import-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1

# Run a deep scan every Saturday at 6 AM
# This will automatically scan multiple pages to ensure all new content is captured
0 6 * * 6 $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-movies.sh --deep-scan --max-pages=10 > $LOG_DIR/cron-deep-import-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1

# Run a complete database refresh monthly using resumable script (first Sunday of month at 1 AM)
0 1 1-7 * 0 $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-all-movies-resumable.sh > $LOG_DIR/cron-full-import-\$(date +\%Y\%m\%d\%H\%M\%S).log 2>&1

# Cleanup old logs (keep last 30 days)
0 0 * * * $USER find $LOG_DIR -name "*.log" -type f -mtime +30 -delete

# Keep an empty line at the end of the file
EOF

# Set proper permissions
chmod 644 $CRON_FILE

# Restart cron service
if command -v systemctl &> /dev/null; then
  systemctl restart cron
elif command -v service &> /dev/null; then
  service cron restart
else
  echo -e "${YELLOW}Couldn't restart cron service automatically. Please restart it manually.${NC}"
fi

# Print completion message
echo -e "${GREEN}Cron jobs successfully created at $CRON_FILE${NC}"
echo -e "${GREEN}Schedule:${NC}"
echo -e "  - Daily import: 6:00 AM and 6:00 PM (3 pages)"
echo -e "  - Weekly deep scan: Saturday 6:00 AM (10 pages)"
echo -e "  - Monthly full database refresh: First Sunday of each month at 1:00 AM"

# Create a launcher script for the resumable import
echo -e "${BLUE}Creating launcher for resumable import...${NC}"
cat > $DATA_DIR/start-full-import.sh << EOF
#!/bin/bash
# Launcher for complete database import
cd $APP_DIR && bash $APP_DIR/scripts/data/import-all-movies-resumable.sh
EOF
chmod +x $DATA_DIR/start-full-import.sh

# Ask if user wants to run the import now
echo
echo -e "${YELLOW}Which import would you like to run now?${NC}"
echo -e "1) Daily import (3 pages)"
echo -e "2) Weekly deep scan (10 pages)"
echo -e "3) Monthly full database refresh (resumable)"
echo -e "4) Skip running imports now"
read -p "Select an option (1-4): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
  echo -e "${GREEN}Running daily import now...${NC}"
  cd $APP_DIR
  bash $SCRIPT_DIR/import-movies.sh --max-pages=3
elif [[ $REPLY =~ ^[2]$ ]]; then
  echo -e "${GREEN}Running deep scan now...${NC}"
  cd $APP_DIR
  bash $SCRIPT_DIR/import-movies.sh --deep-scan --max-pages=10
elif [[ $REPLY =~ ^[3]$ ]]; then
  echo -e "${GREEN}Running full database refresh now...${NC}"
  cd $APP_DIR
  bash $SCRIPT_DIR/import-all-movies-resumable.sh
else
  echo -e "${BLUE}Skipping import for now. You can run it manually later.${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
exit 0