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
BACKUP_DIR="/var/backups/filmflex"

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

# Error handling function
handle_error() {
    local exit_code=$?
    error "Deployment failed at step: $1"
    log "Attempting to restore previous version..."
    
    if [ -d "$BACKUP_DIR/dist-$DATE" ]; then
        cp -r "$BACKUP_DIR/dist-$DATE" "$DEPLOY_DIR/dist"
        warning "Previous version restored"
    fi
    
    log "Restarting application..."
    pm2 restart filmflex || pm2 start ecosystem.config.cjs
    exit $exit_code
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

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup of current build
log "Step 1: Creating backup..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/dist-$DATE"
    success "Backup created"
else
    warning "No existing build to backup"
fi

# Step 2: Stop the application
log "Step 2: Stopping application..."
pm2 stop filmflex || true
success "Application stopped"

# Step 3: Update code (preserve .env and database files)
log "Step 3: Updating application code..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.env \
    --exclude=database.db \
    --exclude='*.log' \
    "$SOURCE_DIR/" "$DEPLOY_DIR/" || handle_error "Code update"
success "Code updated"

# Step 4: Change to deployment directory
cd "$DEPLOY_DIR" || handle_error "Directory change"

# Step 5: Syntax check for TypeScript files
log "Step 4: Running syntax checks..."
if command -v npx >/dev/null 2>&1; then
    log "Checking TypeScript syntax..."
    if ! npx tsc --noEmit --skipLibCheck 2>/dev/null; then
        warning "TypeScript syntax check failed, but continuing..."
    else
        success "TypeScript syntax check passed"
    fi
fi

# Step 6: Check and install dependencies
log "Step 5: Checking dependencies..."
if [ "$SOURCE_DIR/package.json" -nt "$DEPLOY_DIR/package.json" ] || [ ! -d "$DEPLOY_DIR/node_modules" ]; then
    log "Installing/updating dependencies..."
    npm install || handle_error "Dependency installation"
    success "Dependencies updated"
else
    log "Dependencies are up to date"
fi

# Step 7: Ensure critical dependencies are installed
log "Step 6: Verifying critical dependencies..."
CRITICAL_DEPS=("react-helmet-async" "passport-google-oauth20" "@types/react" "vite")
for dep in "${CRITICAL_DEPS[@]}"; do
    if ! npm list "$dep" >/dev/null 2>&1; then
        warning "Installing missing critical dependency: $dep"
        npm install "$dep" || handle_error "Critical dependency installation"
    fi
done
success "Critical dependencies verified"

# Step 8: Build application with error handling
log "Step 7: Building application..."
# Clean previous builds to ensure fresh build
rm -rf dist client/dist

# Attempt build with detailed error reporting
if ! npm run build 2>&1 | tee /tmp/build-output.log; then
    error "Build failed! Error details:"
    tail -20 /tmp/build-output.log
    handle_error "Application build"
fi
success "Application built successfully"

# Step 9: Verify build outputs exist
log "Step 8: Verifying build outputs..."
if [ ! -d "$DEPLOY_DIR/dist" ] || [ ! "$(ls -A $DEPLOY_DIR/dist)" ]; then
    error "Build directory is empty or missing"
    handle_error "Build verification"
fi
success "Build outputs verified"

# Step 10: Set proper permissions
log "Step 9: Setting permissions..."
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
if [ -f "$DEPLOY_DIR/.env" ]; then
    chmod 600 "$DEPLOY_DIR/.env"
fi
success "Permissions set"

# Step 11: Start application
log "Step 10: Starting application..."
if ! pm2 start ecosystem.config.cjs; then
    error "Failed to start with ecosystem config, trying direct start..."
    pm2 start dist/index.js --name filmflex || handle_error "Application start"
fi
pm2 save
success "Application started"

# Step 12: Verify deployment
log "Step 11: Verifying deployment..."
sleep 10

# Check if application is running
if pm2 list | grep filmflex | grep -q online; then
    # Test API endpoint
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        success "🎉 Quick deployment completed successfully!"
        echo ""
        log "Application Status:"
        pm2 list | grep filmflex
        echo ""
        log "Recent logs:"
        pm2 logs filmflex --lines 5 --nostream
        echo ""
        success "Application is running at: http://$(hostname -I | awk '{print $1}')"
        
        # Clean up old backups (keep last 5)
        log "Cleaning up old backups..."
        ls -t $BACKUP_DIR/dist-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
        
    else
        warning "Application started but API health check failed"
        pm2 logs filmflex --lines 10 --nostream
    fi
else
    error "Application failed to start"
    echo ""
    error "Error logs:"
    pm2 logs filmflex --lines 20 --nostream
    handle_error "Application verification"
fi

warning "Note: This script does NOT run database migrations"
warning "If you need to apply database changes, use the full redeploy script"


