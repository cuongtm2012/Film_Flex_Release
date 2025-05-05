#!/bin/bash
# FilmFlex Status Check Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Checking status of ${APP_NAME} on ${REMOTE_HOST}...${NC}"

# Check server status
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  echo -e "\n${YELLOW}System Status:${NC}"
  uptime
  
  echo -e "\n${YELLOW}Memory Usage:${NC}"
  free -h
  
  echo -e "\n${YELLOW}Disk Usage:${NC}"
  df -h | grep /dev/
  
  echo -e "\n${YELLOW}Application Status:${NC}"
  systemctl status filmflex.service | head -n 5
  
  echo -e "\n${YELLOW}PM2 Process Status:${NC}"
  pm2 list
  
  echo -e "\n${YELLOW}Nginx Status:${NC}"
  systemctl status nginx | head -n 5
  
  echo -e "\n${YELLOW}Recent Application Logs:${NC}"
  tail -n 20 /var/log/filmflex.log
  
  echo -e "\n${YELLOW}Database Status:${NC}"
  systemctl status postgresql | head -n 5
  
  echo -e "\n${YELLOW}Database Size:${NC}"
  sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('filmflex'));"
  
  echo -e "\n${YELLOW}Recent Backups:${NC}"
  ls -lh /var/backups/filmflex/ | tail -n 5
EOF

echo -e "\n${GREEN}Status check completed.${NC}"