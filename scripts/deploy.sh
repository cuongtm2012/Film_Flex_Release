#!/bin/bash
# FilmFlex Deployment Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
GITHUB_REPO="https://github.com/yourusername/filmflex.git"
BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment of ${APP_NAME} to ${REMOTE_HOST}...${NC}"

# Step 1: Deploy to the server
ssh ${REMOTE_USER}@${REMOTE_HOST} << EOF
  # Create app directory if it doesn't exist
  mkdir -p ${REMOTE_APP_PATH}
  cd ${REMOTE_APP_PATH}

  # Check if this is the first deployment
  if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    git remote add origin ${GITHUB_REPO}
  fi

  # Pull latest code
  echo -e "${YELLOW}Pulling latest code from ${BRANCH} branch...${NC}"
  git fetch --all
  git reset --hard origin/${BRANCH}

  # Install dependencies
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm ci

  # Build the application
  echo -e "${YELLOW}Building the application...${NC}"
  npm run build

  # Restart the application using PM2
  echo -e "${YELLOW}Restarting the application...${NC}"
  pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js

  # Save PM2 process list
  pm2 save

  # Restart Nginx if needed
  echo -e "${YELLOW}Checking Nginx configuration...${NC}"
  if [ -f "/etc/nginx/sites-available/filmflex" ] && [ ! -f "/etc/nginx/sites-enabled/filmflex" ]; then
    ln -s /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
    nginx -t && systemctl restart nginx
  elif [ -f "/etc/nginx/sites-enabled/filmflex" ]; then
    nginx -t && systemctl reload nginx
  fi
EOF

echo -e "${GREEN}Deployment completed successfully!${NC}"