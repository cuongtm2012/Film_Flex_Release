#!/bin/bash
# FilmFlex Rollback Script
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

# Determine the version to roll back to
if [ -z "$1" ]; then
  echo -e "${RED}Error: No rollback version specified.${NC}"
  echo -e "Usage: ./rollback.sh <commit-hash>"
  echo -e "Example: ./rollback.sh abc1234"
  exit 1
fi

ROLLBACK_VERSION=$1

echo -e "${GREEN}Starting rollback of ${APP_NAME} to version ${ROLLBACK_VERSION}...${NC}"

# Step 1: Roll back on the server
ssh ${REMOTE_USER}@${REMOTE_HOST} << EOF
  # Create backup of current database
  echo -e "${YELLOW}Creating database backup before rollback...${NC}"
  /etc/filmflex/scripts/backup-db.sh

  # Go to app directory
  cd ${REMOTE_APP_PATH}

  # Checkout specific version
  echo -e "${YELLOW}Rolling back to version ${ROLLBACK_VERSION}...${NC}"
  git fetch --all
  git checkout ${ROLLBACK_VERSION}

  # Install dependencies
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm ci

  # Build the application
  echo -e "${YELLOW}Building the application...${NC}"
  npm run build

  # Restart the application
  echo -e "${YELLOW}Restarting the application...${NC}"
  pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js

  # Save PM2 process list
  pm2 save
EOF

echo -e "${GREEN}Rollback completed successfully!${NC}"
echo -e "${YELLOW}Remember to test the application to ensure it's working correctly.${NC}"