#!/bin/bash
# FilmFlex Deployment Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
REMOTE_ENV_FILE="${REMOTE_APP_PATH}/.env"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment of ${APP_NAME} to ${REMOTE_HOST}...${NC}"

# Step 1: Build the application locally
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Step 2: Create a tar archive of the application
echo -e "${YELLOW}Creating application archive...${NC}"
tar -czf filmflex-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='cypress' \
    --exclude='attached_assets' \
    --exclude='tests' \
    --exclude='reports' \
    --exclude='results' \
    --exclude='log' \
    .

# Step 3: Copy the archive to the server
echo -e "${YELLOW}Copying application to server...${NC}"
scp filmflex-deploy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:/tmp/

# Step 4: Deploy the application on the server
echo -e "${YELLOW}Deploying application on server...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
    # Create app directory if it doesn't exist
    mkdir -p /var/www/filmflex

    # Extract the application
    tar -xzf /tmp/filmflex-deploy.tar.gz -C /var/www/filmflex

    # Change to app directory
    cd /var/www/filmflex

    # Install dependencies
    npm ci --production

    # Apply database migrations
    npm run db:push

    # Restart the application service
    if systemctl is-active --quiet filmflex.service; then
        systemctl restart filmflex.service
    else
        echo "Service not running yet - it will be started during setup"
    fi

    # Clean up
    rm /tmp/filmflex-deploy.tar.gz
EOF

# Step 5: Clean up local archive
echo -e "${YELLOW}Cleaning up...${NC}"
rm filmflex-deploy.tar.gz

echo -e "${GREEN}Deployment completed successfully!${NC}"