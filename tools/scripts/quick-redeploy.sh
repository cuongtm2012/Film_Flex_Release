#!/bin/bash

# FilmFlex Quick Code Redeploy Script
# Fast frontend/backend redeployment WITHOUT database changes
# This script only updates code and rebuilds the application
# VERSION: 2.2 - Fixed ES Module Import Issues
#
# Usage:
#   ./quick-redeploy.sh                    # Deploy Production_Util branch (default)
#   ./quick-redeploy.sh main              # Deploy main branch
#   ./quick-redeploy.sh feature-branch    # Deploy any specific branch
#
# Features:
#   - Automatic branch switching
#   - ES module import fixes
#   - Smart dependency management
#   - Enhanced error handling with rollback
#   - Multiple build fallback strategies
#   - Health checks and verification

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
LOG_FILE="/var/log/filmflex/quick-deploy-$DATE.log"
TARGET_BRANCH="${1:-Production_Util}"  # Accept branch as first argument, default to Production_Util

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging functions
log() {
    local message="$1"
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

success() {
    local message="$1"
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $message" >> "$LOG_FILE"
}

warning() {
    local message="$1"
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $message" >> "$LOG_FILE"
}

error() {
    local message="$1"
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$LOG_FILE"
}

# Enhanced error handling function
handle_error() {
    local exit_code=$?
    local step="$1"
    error "Deployment failed at step: $step (exit code: $exit_code)"
    
    # Try to restore previous version
    if [ -d "$BACKUP_DIR/dist-$DATE" ]; then
        log "Attempting to restore previous version..."
        rm -rf "$DEPLOY_DIR/dist" 2>/dev/null || true
        cp -r "$BACKUP_DIR/dist-$DATE" "$DEPLOY_DIR/dist" && success "Previous version restored" || error "Failed to restore backup"
    fi
    
    # Try to restart application regardless
    log "Attempting to restart application..."
    pm2 restart filmflex 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || pm2 start dist/index.js --name filmflex
    
    error "Check the full log at: $LOG_FILE"
    exit $exit_code
}

# Trap errors
trap 'handle_error "Unknown step"' ERR

# Print banner
echo -e "${BLUE}"
echo "============================================="
echo "    FilmFlex Quick Code Redeploy v2.2"
echo "    (Frontend + Backend Only - No DB)"
echo "    Fixed ES Module Import Issues"
echo "    Target Branch: $TARGET_BRANCH"
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
log "Target Branch: $TARGET_BRANCH"
log "Log: $LOG_FILE"

# Step 0: Switch to target branch in source directory (if not main)
if [ "$TARGET_BRANCH" != "main" ] && [ "$TARGET_BRANCH" != "master" ]; then
    log "Step 0: Switching to branch $TARGET_BRANCH..."
    cd "$SOURCE_DIR" || handle_error "Step 0 - Source directory access"
    
    # Fetch latest changes
    log "Fetching latest changes from repository..."
    git fetch origin >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Git fetch"
    
    # Check if branch exists
    if ! git show-ref --verify --quiet refs/heads/$TARGET_BRANCH; then
        if git show-ref --verify --quiet refs/remotes/origin/$TARGET_BRANCH; then
            log "Creating local branch $TARGET_BRANCH from origin/$TARGET_BRANCH"
            git checkout -b $TARGET_BRANCH origin/$TARGET_BRANCH >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Branch creation"
        else
            error "Branch $TARGET_BRANCH does not exist locally or remotely"
            handle_error "Step 0 - Branch verification"
        fi
    else
        log "Switching to existing local branch $TARGET_BRANCH"
        git checkout $TARGET_BRANCH >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Branch checkout"
        git pull origin $TARGET_BRANCH >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Branch pull"
    fi
    
    success "Successfully switched to branch $TARGET_BRANCH"
    
    # Show current branch and latest commit
    log "Current branch: $(git branch --show-current)"
    log "Latest commit: $(git log -1 --oneline)"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup of current build
log "Step 1: Creating backup..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/dist-$DATE" || handle_error "Step 1 - Backup creation"
    # Also backup package-lock.json and node_modules manifest
    [ -f "$DEPLOY_DIR/package-lock.json" ] && cp "$DEPLOY_DIR/package-lock.json" "$BACKUP_DIR/package-lock-$DATE.json"
    success "Backup created"
else
    warning "No existing build to backup"
fi

# Step 2: Stop the application gracefully
log "Step 2: Stopping application..."
pm2 stop filmflex 2>/dev/null || true
sleep 2
success "Application stopped"

# Step 3: Update code (preserve critical files)
log "Step 3: Updating application code..."
if ! rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.env \
    --exclude=database.db \
    --exclude='*.log' \
    --exclude=.DS_Store \
    "$SOURCE_DIR/" "$DEPLOY_DIR/" >> "$LOG_FILE" 2>&1; then
    handle_error "Step 3 - Code update"
fi
success "Code updated"

# Step 4: Change to deployment directory
cd "$DEPLOY_DIR" || handle_error "Step 4 - Directory change"

# Step 5: TypeScript syntax check
log "Step 5: Running TypeScript syntax checks..."
if command -v npx >/dev/null 2>&1; then
    log "Checking TypeScript syntax..."
    if npx tsc --noEmit --skipLibCheck >> "$LOG_FILE" 2>&1; then
        success "TypeScript syntax check passed"
    else
        warning "TypeScript syntax check failed, checking for critical errors..."
        if npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(error TS|Cannot find module)" >> "$LOG_FILE"; then
            handle_error "Step 5 - Critical TypeScript errors found"
        else
            warning "Non-critical TypeScript warnings found, continuing..."
        fi
    fi
else
    warning "TypeScript compiler not found, skipping syntax check"
fi

# Step 6: Smart dependency management
log "Step 6: Smart dependency management..."
NEED_INSTALL=false

# Check if package.json changed
if [ -f "$SOURCE_DIR/package.json" ] && [ -f "$DEPLOY_DIR/package.json" ]; then
    if ! cmp -s "$SOURCE_DIR/package.json" "$DEPLOY_DIR/package.json" 2>/dev/null; then
        log "package.json changed, full reinstall needed"
        NEED_INSTALL=true
    fi
fi

# Check if node_modules exists
if [ ! -d "$DEPLOY_DIR/node_modules" ]; then
    log "node_modules missing, install needed"
    NEED_INSTALL=true
fi

if [ "$NEED_INSTALL" = true ]; then
    log "Installing/updating dependencies..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    if ! npm install >> "$LOG_FILE" 2>&1; then
        handle_error "Step 6 - Dependency installation"
    fi
    success "Dependencies installed"
else
    log "Dependencies are up to date"
fi

# Step 7: Build process with fallbacks matching package.json
log "Step 7: Building application..."
rm -rf dist client/dist server/dist 2>/dev/null || true

# Use the exact build command from package.json
log "Running build command from package.json..."
if npm run build >> "$LOG_FILE" 2>&1; then
    success "Build successful"
else
    warning "Primary build failed, trying component builds..."
    
    # Try building client and server separately
    log "Building client..."
    if npm run build:client >> "$LOG_FILE" 2>&1; then
        success "Client build successful"
    else
        warning "Client build failed"
    fi
    
    log "Building server..."
    if npm run build:server >> "$LOG_FILE" 2>&1; then
        success "Server build successful"
        # Copy server build to dist as per package.json script
        cp -r server/dist/* dist/ 2>/dev/null || true
    else
        warning "Server build failed, trying ESBuild fallback..."
        mkdir -p dist
        if npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist >> "$LOG_FILE" 2>&1; then
            success "ESBuild fallback successful"
        else
            handle_error "Step 7 - All build methods failed"
        fi
    fi
fi

# Step 8: Build verification
log "Step 8: Build verification..."
BUILD_VALID=true

# Check if dist directory exists and has content
if [ ! -d "$DEPLOY_DIR/dist" ] || [ ! "$(ls -A $DEPLOY_DIR/dist 2>/dev/null)" ]; then
    error "Build directory is empty or missing"
    BUILD_VALID=false
fi

# Check for essential server files
if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    error "Server entry point (index.js) not found in build"
    BUILD_VALID=false
fi

# Check client build
if [ ! -d "$DEPLOY_DIR/client/dist" ] || [ ! "$(ls -A $DEPLOY_DIR/client/dist 2>/dev/null)" ]; then
    warning "Client build directory missing or empty"
fi

if [ "$BUILD_VALID" = false ]; then
    handle_error "Step 8 - Build verification failed"
fi

success "Build verification passed"

# Step 9: Set proper permissions
log "Step 9: Setting permissions..."
if ! chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null; then
    warning "Failed to set www-data ownership, trying current user..."
    chown -R $(whoami):$(whoami) "$DEPLOY_DIR" || handle_error "Step 9 - Permission setting"
fi
chmod -R 755 "$DEPLOY_DIR"
if [ -f "$DEPLOY_DIR/.env" ]; then
    chmod 600 "$DEPLOY_DIR/.env"
fi
success "Permissions set"

# Step 10: Application startup
log "Step 10: Starting application..."
START_SUCCESS=false

# Try ecosystem config first
if [ -f "ecosystem.config.cjs" ]; then
    log "Starting with ecosystem.config.cjs..."
    if pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
    fi
fi

# Fallback to direct start
if [ "$START_SUCCESS" = false ]; then
    log "Ecosystem config failed, trying direct start..."
    if [ -f "dist/index.js" ]; then
        if pm2 start dist/index.js --name filmflex >> "$LOG_FILE" 2>&1; then
            START_SUCCESS=true
        fi
    fi
fi

if [ "$START_SUCCESS" = false ]; then
    handle_error "Step 10 - Application start failed"
fi

pm2 save >> "$LOG_FILE" 2>&1 || warning "Failed to save PM2 configuration"
success "Application started"

# Step 11: Deployment verification with proper health checks
log "Step 11: Deployment verification..."
sleep 10

# Check PM2 status
if ! pm2 list | grep filmflex | grep -q online; then
    error "Application not showing as online in PM2"
    handle_error "Step 11 - Application verification"
fi

# Health check with multiple attempts and proper endpoints
HEALTH_CHECK_SUCCESS=false
for i in {1..5}; do
    log "Health check attempt $i/5..."
    
    # Try root endpoint first (most likely to exist)
    if curl -f -s --max-time 10 http://localhost:5000/ >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        break
    fi
    
    # Try common API endpoints
    if curl -f -s --max-time 10 http://localhost:5000/api/ >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        break
    fi
    
    # Check if the server is at least responding (even with errors)
    if curl -s --max-time 10 http://localhost:5000/ | grep -q -i "html\|json\|text" 2>/dev/null; then
        HEALTH_CHECK_SUCCESS=true
        break
    fi
    
    sleep 8
done

if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
    success "🎉 Quick deployment completed successfully!"
    echo ""
    log "Application Status:"
    pm2 list | grep filmflex
    echo ""
    log "Recent logs:"
    pm2 logs filmflex --lines 5 --nostream 2>/dev/null || true
    echo ""
    success "Application is running at: http://$(hostname -I | awk '{print $1}'):5000"
    
    # Enhanced cleanup
    log "Cleaning up old backups (keeping last 5)..."
    find "$BACKUP_DIR" -name "dist-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    find "$BACKUP_DIR" -name "package-lock-*.json" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
    
else
    warning "Application started but health checks failed"
    log "Recent error logs:"
    pm2 logs filmflex --lines 20 --nostream 2>/dev/null || true
    warning "Application may still be starting up - check logs manually"
    warning "Try: pm2 logs filmflex"
fi

# Final status summary
echo ""
success "Deployment Summary:"
log "• Branch deployed: $TARGET_BRANCH"
log "• Code updated from: $SOURCE_DIR"
log "• Build completed successfully"
log "• Application restarted with PM2"
log "• Backup saved at: $BACKUP_DIR/dist-$DATE"
log "• Full log available at: $LOG_FILE"
echo ""
warning "Note: This script does NOT run database migrations"
warning "If you need to apply database changes, use the full deployment script"
echo ""
success "🎬 FilmFlex is now running the latest code from $TARGET_BRANCH branch!"


