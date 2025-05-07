#!/bin/bash

# FilmFlex Maintenance Mode Deployment Script
# This script deploys the server in maintenance mode when database is unavailable

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
LOG_FILE="${LOG_DIR}/maintenance-deploy-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Maintenance Mode Deploy"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start of deployment
echo "Starting maintenance mode deployment at $(date)" | tee -a "$LOG_FILE"

# Stop any existing PM2 processes
echo -e "${BLUE}Stopping any existing FilmFlex processes...${NC}" | tee -a "$LOG_FILE"
pm2 delete filmflex 2>/dev/null || true

# Kill any processes on port 5000
echo -e "${BLUE}Ensuring port 5000 is available...${NC}" | tee -a "$LOG_FILE"
fuser -k 5000/tcp 2>/dev/null || true

# Copy the updated server file to production
echo -e "${BLUE}Copying maintenance mode server to production...${NC}" | tee -a "$LOG_FILE"
mkdir -p "$APP_DIR"
cp -f "$SOURCE_DIR/filmflex-server.cjs" "$APP_DIR/" | tee -a "$LOG_FILE"

# Set proper permissions
echo -e "${BLUE}Setting permissions...${NC}" | tee -a "$LOG_FILE"
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Make sure .env file exists
if [ ! -f "$APP_DIR/.env" ]; then
  echo -e "${YELLOW}Creating .env file...${NC}" | tee -a "$LOG_FILE"
  echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex" > "$APP_DIR/.env"
  chown www-data:www-data "$APP_DIR/.env"
fi

# Start the server with PM2
echo -e "${BLUE}Starting server in maintenance mode...${NC}" | tee -a "$LOG_FILE"
cd "$APP_DIR" && NODE_ENV=production pm2 start filmflex-server.cjs --name "filmflex" | tee -a "$LOG_FILE"

# Save PM2 configuration
echo -e "${BLUE}Saving PM2 configuration...${NC}" | tee -a "$LOG_FILE"
pm2 save | tee -a "$LOG_FILE"

# Reload Nginx to ensure it's working with the new server
echo -e "${BLUE}Reloading Nginx configuration...${NC}" | tee -a "$LOG_FILE"
systemctl reload nginx | tee -a "$LOG_FILE"

# Check if server is running
echo -e "${BLUE}Checking server status...${NC}" | tee -a "$LOG_FILE"
sleep 2
if curl -s "http://localhost:5000/api/health" | grep -q "status.*ok"; then
  echo -e "${GREEN}✓ FilmFlex server is running in maintenance mode${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}✗ FilmFlex server may not be running correctly${NC}" | tee -a "$LOG_FILE"
fi

echo -e "${GREEN}Deployment completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}You can now access your site at: https://phimgg.com${NC}"
echo -e "${YELLOW}NOTE: The site is running in maintenance mode until the database is properly configured${NC}"
echo
echo "For more information, check the deployment log: $LOG_FILE"