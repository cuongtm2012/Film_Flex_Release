#!/bin/bash

# FilmFlex Quick Code Redeploy Script
# Fast frontend/backend redeployment WITHOUT database changes
# This script only updates code and rebuilds the application

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
DATE=$(date '+%Y%m%d-%H%M%S')

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

# Print banner
echo -e "${BLUE}"
echo "============================================="
echo "    FilmFlex Quick Code Redeploy"
echo "    (Frontend + Backend Only - No DB)"
echo "============================================="
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   error "This script must be run as root"
   exit 1
fi

# Verify source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    error "Source directory not found: $SOURCE_DIR"
    error "Please upload the latest code to the server first"
    exit 1
fi

# Verify deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    error "Deployment directory not found: $DEPLOY_DIR"
    error "Please run the full deployment script first"
    exit 1
fi

log "Starting quick code redeployment..."
log "Source: $SOURCE_DIR"
log "Target: $DEPLOY_DIR"

# Step 1: Stop the application
log "Step 1: Stopping application..."
pm2 stop filmflex || true
success "Application stopped"

# Step 2: Update code (preserve .env and database files)
log "Step 2: Updating application code..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.env \
    --exclude=database.db \
    --exclude='*.log' \
    "$SOURCE_DIR/" "$DEPLOY_DIR/"
success "Code updated"

# Step 3: Change to deployment directory
cd "$DEPLOY_DIR" || exit 1

# Step 4: Check dependencies
log "Step 3: Checking dependencies..."
if [ "$SOURCE_DIR/package.json" -nt "$DEPLOY_DIR/package.json" ] || [ ! -d "$DEPLOY_DIR/node_modules" ]; then
    log "Installing/updating dependencies..."
    npm install --production
    success "Dependencies updated"
else
    log "Dependencies are up to date"
fi

# Step 5: Build application
log "Step 4: Building application..."
# Clean previous builds to ensure fresh build
rm -rf dist client/dist
npm run build
success "Application built successfully"

# Step 6: Set proper permissions
log "Step 5: Setting permissions..."
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
if [ -f "$DEPLOY_DIR/.env" ]; then
    chmod 600 "$DEPLOY_DIR/.env"
fi
success "Permissions set"

# Step 7: Start application
log "Step 6: Starting application..."
pm2 start ecosystem.config.cjs
pm2 save
success "Application started"

# Step 8: Verify deployment
log "Step 7: Verifying deployment..."
sleep 5

if pm2 list | grep filmflex | grep -q online; then
    success "🎉 Quick deployment completed successfully!"
    echo ""
    log "Application Status:"
    pm2 list | grep filmflex
    echo ""
    log "Recent logs:"
    pm2 logs filmflex --lines 5 --nostream
    echo ""
    success "Application is running at: http://$(hostname -I | awk '{print $1}')"
else
    error "Application failed to start"
    echo ""
    error "Error logs:"
    pm2 logs filmflex --lines 10 --nostream
    exit 1
fi

warning "Note: This script does NOT run database migrations"
warning "If you need to apply database changes, use the full redeploy script"


