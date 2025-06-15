#!/bin/bash

# Quick Crontab Setup Script for FilmFlex
# This script sets up the cron jobs for automatic movie imports

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Setting up FilmFlex cron jobs...${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
  echo -e "${RED}This script must be run as root (use sudo)${NC}"
  exit 1
fi

# Create log directory
mkdir -p /var/log/filmflex

# Install the crontab
echo -e "${BLUE}Installing cron jobs...${NC}"
cp filmflex-crontab /etc/cron.d/filmflex-data-import
chmod 644 /etc/cron.d/filmflex-data-import

# Restart cron service
echo -e "${BLUE}Restarting cron service...${NC}"
if command -v systemctl &> /dev/null; then
  systemctl restart cron
elif command -v service &> /dev/null; then
  service cron restart
else
  echo -e "${YELLOW}Please restart cron service manually${NC}"
fi

echo -e "${GREEN}✅ Cron jobs installed successfully!${NC}"
echo -e "${GREEN}Schedule:${NC}"
echo -e "  📅 Daily imports: 6:00 AM & 6:00 PM (3 pages of newest movies)"
echo -e "  📅 Deep scan: Every Saturday 6:00 AM (10 pages)"
echo -e "  📅 Full refresh: First Sunday of month 2:00 AM"
echo -e "  📅 Log cleanup: Daily at midnight"
echo ""
echo -e "${BLUE}To check cron jobs status:${NC}"
echo -e "  crontab -l"
echo -e "  systemctl status cron"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo -e "  tail -f /var/log/filmflex/*.log"
echo ""
echo -e "${BLUE}To run imports manually:${NC}"
echo -e "  cd /root/Film_Flex_Release"
echo -e "  bash scripts/data/import-movies.sh --max-pages=3"