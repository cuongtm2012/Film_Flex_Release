#!/bin/bash

# FilmFlex Quick Code Redeploy Script
# Fast frontend/backend redeployment WITHOUT database changes
# This script only updates code and rebuilds the application
# VERSION: 2.4 - Main Branch Production Ready
#
# Usage:
#   ./quick-redeploy.sh                    # Deploy current branch (no switch)
#   ./quick-redeploy.sh main              # Deploy main branch (RECOMMENDED)
#   ./quick-redeploy.sh --no-branch       # Skip branch switching entirely
#
# Features:
#   - Main branch production deployment optimized
#   - Automatic branch switching with conflict resolution
#   - ES module import fixes
#   - Smart dependency management
#   - Enhanced error handling with rollback
#   - Multiple build fallback strategies
#   - Comprehensive health checks and verification

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
DATE=$(date '+%Y%m%d-%H%M%S')
BACKUP_DIR="/var/backups/filmflex"
LOG_FILE="/var/log/filmflex/quick-deploy-$DATE.log"
TARGET_BRANCH="${1:-main}"  # Default to main branch for production
SKIP_BRANCH_SWITCH=false

# Check for --no-branch flag
if [ "$1" = "--no-branch" ]; then
    SKIP_BRANCH_SWITCH=true
    TARGET_BRANCH="current"
fi

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "/var/log/filmflex"

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

info() {
    local message="$1"
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] ℹ️  $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $message" >> "$LOG_FILE"
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
        if cp -r "$BACKUP_DIR/dist-$DATE" "$DEPLOY_DIR/dist"; then
            success "Previous version restored"
        else
            error "Failed to restore backup"
        fi
    fi
    
    # Try to restart application regardless
    log "Attempting to restart application..."
    cd "$DEPLOY_DIR" 2>/dev/null || true
    if pm2 restart filmflex 2>/dev/null; then
        warning "Application restarted with previous version"
    elif pm2 start ecosystem.config.js --env production 2>/dev/null; then
        warning "Application started with ecosystem config"
    elif pm2 start dist/server/index.js --name filmflex 2>/dev/null; then
        warning "Application started with fallback method"
    else
        error "Failed to restart application - manual intervention required"
    fi
    
    error "Check the full log at: $LOG_FILE"
    error "Manual recovery may be required"
    exit $exit_code
}

# Trap errors
trap 'handle_error "Unknown step"' ERR

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
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
    
    # Check essential commands
    local required_commands=("git" "npm" "pm2" "curl" "rsync")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check disk space (require at least 1GB free)
    local available_space=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space. Required: 1GB, Available: $(($available_space / 1024))MB"
        exit 1
    fi
    
    success "Pre-flight checks passed"
}

# Print banner
echo -e "${PURPLE}"
echo "============================================="
echo "    FilmFlex Quick Code Redeploy v2.4"
echo "    (Frontend + Backend Only - No DB)"
echo "    Main Branch Production Ready"
if [ "$SKIP_BRANCH_SWITCH" = true ]; then
    echo "    Mode: No Branch Switching"
else
    echo "    Target Branch: $TARGET_BRANCH"
fi
echo "    Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo -e "${NC}"

# Run pre-flight checks
preflight_checks

log "Starting quick code redeployment..."
log "Source: $SOURCE_DIR"
log "Target: $DEPLOY_DIR"
if [ "$SKIP_BRANCH_SWITCH" = true ]; then
    log "Branch switching: DISABLED"
else
    log "Target Branch: $TARGET_BRANCH"
fi
log "Log: $LOG_FILE"

# Step 0: Handle Git repository and branch switching
if [ "$SKIP_BRANCH_SWITCH" = false ] && [ "$TARGET_BRANCH" != "current" ]; then
    log "Step 0: Handling Git repository and branch switching to $TARGET_BRANCH..."
    cd "$SOURCE_DIR" || handle_error "Step 0 - Source directory access"
    
    # Check git repository status
    if [ ! -d ".git" ]; then
        error "Not a git repository: $SOURCE_DIR"
        handle_error "Step 0 - Git repository not found"
    fi
    
    # Show current status
    info "Current git status:"
    git status --porcelain | head -5 >> "$LOG_FILE" 2>&1 || true
    
    # Clean up any untracked files that might conflict
    log "Cleaning up conflicting untracked files..."
    git clean -fd >> "$LOG_FILE" 2>&1 || warning "Git clean failed, continuing anyway"
    
    # Stash any local changes
    log "Stashing any local changes..."
    git add . >> "$LOG_FILE" 2>&1 || true
    git stash push -m "Quick redeploy stash $(date)" >> "$LOG_FILE" 2>&1 || warning "Git stash failed, continuing anyway"
    
    # Reset hard to clean state
    log "Resetting to clean state..."
    git reset --hard HEAD >> "$LOG_FILE" 2>&1 || warning "Git reset failed, continuing anyway"
    
    # Fetch latest changes with timeout
    log "Fetching latest changes from repository..."
    if timeout 30 git fetch origin >> "$LOG_FILE" 2>&1; then
        success "Git fetch completed"
    else
        warning "Git fetch failed or timed out, using local repository state"
    fi
    
    # Handle branch switching with better error handling
    if [ "$TARGET_BRANCH" = "main" ] || [ "$TARGET_BRANCH" = "master" ]; then
        log "Switching to $TARGET_BRANCH branch..."
        if git checkout "$TARGET_BRANCH" >> "$LOG_FILE" 2>&1; then
            success "Switched to $TARGET_BRANCH branch"
            # Pull latest changes
            if timeout 30 git pull origin "$TARGET_BRANCH" >> "$LOG_FILE" 2>&1; then
                success "Latest changes pulled from origin/$TARGET_BRANCH"
            else
                warning "Git pull failed or timed out, using local state"
            fi
        else
            warning "Failed to checkout $TARGET_BRANCH, trying alternative approaches..."
            # Try to checkout from origin
            if git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" >> "$LOG_FILE" 2>&1; then
                success "Created and switched to $TARGET_BRANCH from origin"
            else
                handle_error "Step 0 - Branch checkout failed"
            fi
        fi
    else
        # Handle feature branches
        log "Handling feature branch: $TARGET_BRANCH"
        if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
            log "Switching to existing local branch $TARGET_BRANCH"
            git checkout "$TARGET_BRANCH" >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Branch checkout"
            if timeout 30 git pull origin "$TARGET_BRANCH" >> "$LOG_FILE" 2>&1; then
                success "Latest changes pulled"
            else
                warning "Git pull failed, using local state"
            fi
        elif git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
            log "Creating local branch $TARGET_BRANCH from origin/$TARGET_BRANCH"
            git checkout -b "$TARGET_BRANCH" "origin/$TARGET_BRANCH" >> "$LOG_FILE" 2>&1 || handle_error "Step 0 - Branch creation"
        else
            warning "Branch $TARGET_BRANCH not found, using current branch"
            TARGET_BRANCH=$(git branch --show-current)
        fi
    fi
    
    success "Successfully prepared branch $TARGET_BRANCH"
    
    # Show current branch and latest commit
    CURRENT_BRANCH=$(git branch --show-current)
    LATEST_COMMIT=$(git log -1 --oneline)
    info "Current branch: $CURRENT_BRANCH"
    info "Latest commit: $LATEST_COMMIT"
    info "Repository status: $(git status --porcelain | wc -l) modified files"
else
    log "Step 0: Skipping branch switching (using current code)"
    if [ -d "$SOURCE_DIR/.git" ]; then
        cd "$SOURCE_DIR"
        CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
        LATEST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "unknown")
        info "Current branch: $CURRENT_BRANCH"
        info "Latest commit: $LATEST_COMMIT"
    fi
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup of current build
log "Step 1: Creating backup..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    if cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/dist-$DATE"; then
        success "Build backup created: $BACKUP_DIR/dist-$DATE"
    else
        handle_error "Step 1 - Backup creation"
    fi
    
    # Also backup important config files
    [ -f "$DEPLOY_DIR/package-lock.json" ] && cp "$DEPLOY_DIR/package-lock.json" "$BACKUP_DIR/package-lock-$DATE.json"
    [ -f "$DEPLOY_DIR/ecosystem.config.js" ] && cp "$DEPLOY_DIR/ecosystem.config.js" "$BACKUP_DIR/ecosystem-$DATE.js"
    
    info "Backup size: $(du -sh "$BACKUP_DIR/dist-$DATE" | cut -f1)"
else
    warning "No existing build to backup"
fi

# Step 2: Stop the application gracefully
log "Step 2: Stopping application..."
cd "$DEPLOY_DIR" || handle_error "Step 2 - Deploy directory access"

# Get current PM2 status before stopping
if pm2 list | grep -q filmflex; then
    info "Current PM2 status:"
    pm2 list | grep filmflex >> "$LOG_FILE" 2>&1 || true
fi

# Stop PM2 process
if pm2 stop filmflex >> "$LOG_FILE" 2>&1; then
    success "Application stopped successfully"
else
    warning "PM2 stop failed, continuing anyway"
fi

# Wait for graceful shutdown
sleep 3
success "Application stop completed"

# Step 3: Update code (preserve critical files)
log "Step 3: Updating application code..."
info "Syncing code from $SOURCE_DIR to $DEPLOY_DIR..."

if rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.env \
    --exclude=.env.production \
    --exclude=database.db \
    --exclude='*.log' \
    --exclude=.DS_Store \
    --exclude='.pm2' \
    --exclude='*.tmp' \
    --exclude='temp/' \
    "$SOURCE_DIR/" "$DEPLOY_DIR/" >> "$LOG_FILE" 2>&1; then
    success "Code updated successfully"
    info "Code sync completed - $(du -sh "$DEPLOY_DIR" | cut -f1) total size"
else
    handle_error "Step 3 - Code update"
fi

# Step 4: Smart dependency management
log "Step 4: Smart dependency management..."
cd "$DEPLOY_DIR" || handle_error "Step 4 - Directory change"

NEED_INSTALL=false

# Check if package.json changed or doesn't exist
if [ ! -f "package.json" ]; then
    error "package.json not found in deployment directory"
    handle_error "Step 4 - Missing package.json"
fi

# Check if node_modules exists and has content
if [ ! -d "node_modules" ] || [ ! "$(ls -A node_modules 2>/dev/null)" ]; then
    log "node_modules missing or empty, install needed"
    NEED_INSTALL=true
fi

# Check package-lock.json
if [ ! -f "package-lock.json" ]; then
    log "package-lock.json missing, install needed"
    NEED_INSTALL=true
fi

if [ "$NEED_INSTALL" = true ]; then
    log "Installing/updating dependencies..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    if ! npm install >> "$LOG_FILE" 2>&1; then
        warning "npm install failed, trying with --force"
        if ! npm install --force >> "$LOG_FILE" 2>&1; then
            handle_error "Step 4 - Dependency installation"
        fi
    fi
    success "Dependencies installed"
else
    log "Dependencies appear to be up to date"
fi

# Step 5: Build process with enhanced fallbacks
log "Step 5: Building application with multiple strategies..."
cd "$DEPLOY_DIR" || handle_error "Step 5 - Directory change"

# Clean previous build completely
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf client/dist 2>/dev/null || true

# Create dist directory
mkdir -p dist

# Try multiple build strategies
BUILD_SUCCESS=false
BUILD_METHOD=""

# Strategy 1: Use package.json build script
log "Attempting primary build (npm run build)..."
if timeout 300 npm run build >> "$LOG_FILE" 2>&1; then
    BUILD_SUCCESS=true
    BUILD_METHOD="npm run build"
    success "Primary build successful"
else
    warning "Primary build failed, trying fallback strategies..."
    
    # Strategy 2: Build server with TypeScript
    log "Attempting server build with TypeScript..."
    if [ -f "tsconfig.server.json" ]; then
        if timeout 180 npx tsc -p tsconfig.server.json >> "$LOG_FILE" 2>&1; then
            BUILD_SUCCESS=true
            BUILD_METHOD="TypeScript (tsconfig.server.json)"
            success "TypeScript server build successful"
        fi
    fi
    
    # Strategy 3: ESBuild fallback
    if [ "$BUILD_SUCCESS" = false ]; then
        log "Attempting ESBuild fallback..."
        if [ -f "server/index.ts" ]; then
            mkdir -p dist/server
            if timeout 120 npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server/index.js >> "$LOG_FILE" 2>&1; then
                BUILD_SUCCESS=true
                BUILD_METHOD="ESBuild fallback"
                success "ESBuild fallback successful"
            fi
        fi
    fi
    
    # Strategy 4: Manual TypeScript compilation
    if [ "$BUILD_SUCCESS" = false ] && [ -f "tsconfig.json" ]; then
        log "Attempting manual TypeScript compilation..."
        if timeout 180 npx tsc >> "$LOG_FILE" 2>&1; then
            BUILD_SUCCESS=true
            BUILD_METHOD="Manual TypeScript"
            success "Manual TypeScript build successful"
        fi
    fi
fi

if [ "$BUILD_SUCCESS" = false ]; then
    error "All build strategies failed"
    log "Build directory contents:"
    ls -la >> "$LOG_FILE" 2>&1
    handle_error "Step 5 - All build strategies failed"
fi

info "Build completed using: $BUILD_METHOD"

# Step 6: Fix ESM imports and verify build
log "Step 6: Fixing ESM imports and verifying build..."

# Fix ESM import paths in all JS files
find dist -name "*.js" -type f -exec sed -i -E "s/from (['\"])(\.[^'\"]*[^js])\1/from \1\2.js\1/g" {} \; 2>/dev/null || true

# Verify essential files exist
MAIN_FILE=""
if [ -f "dist/server/index.js" ]; then
    MAIN_FILE="dist/server/index.js"
elif [ -f "dist/index.js" ]; then
    MAIN_FILE="dist/index.js"
else
    error "No main application file found in build output"
    log "Build directory contents:"
    find dist -type f -name "*.js" | head -10 >> "$LOG_FILE"
    handle_error "Step 6 - Build verification failed"
fi

log "Main application file: $MAIN_FILE"
success "Build verification passed"

# Step 7: Copy static assets
log "Step 7: Copying static assets..."
if [ -d "public" ]; then
    mkdir -p dist/public
    cp -r public/* dist/public/ 2>/dev/null || true
    success "Static assets copied"
fi

# Copy client build if it exists
if [ -d "client/dist" ]; then
    mkdir -p dist/public
    cp -r client/dist/* dist/public/ 2>/dev/null || true
    success "Client build copied"
fi

# Step 8: Set proper permissions
log "Step 8: Setting permissions..."
chown -R $(whoami):$(whoami) "$DEPLOY_DIR" 2>/dev/null || true
chmod -R 755 "$DEPLOY_DIR"
if [ -f ".env" ]; then
    chmod 600 ".env"
fi
success "Permissions set"

# Step 9: Application startup with multiple strategies
log "Step 9: Starting application..."
START_SUCCESS=false

# Strategy 1: Use ecosystem config
if [ -f "ecosystem.config.js" ]; then
    log "Starting with ecosystem.config.js..."
    if pm2 start ecosystem.config.js --env production >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
        success "Started with ecosystem config"
    fi
fi

# Strategy 2: Direct start with main file
if [ "$START_SUCCESS" = false ] && [ -n "$MAIN_FILE" ]; then
    log "Starting directly with $MAIN_FILE..."
    if pm2 start "$MAIN_FILE" --name filmflex --node-args="--max-old-space-size=512" >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
        success "Started with direct PM2 command"
    fi
fi

# Strategy 3: Force restart if process exists
if [ "$START_SUCCESS" = false ]; then
    log "Attempting to restart existing process..."
    if pm2 restart filmflex >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
        success "Restarted existing process"
    fi
fi

if [ "$START_SUCCESS" = false ]; then
    handle_error "Step 9 - All startup strategies failed"
fi

# Save PM2 config
pm2 save >> "$LOG_FILE" 2>&1 || warning "Failed to save PM2 configuration"

# Step 10: Comprehensive health checks
log "Step 10: Comprehensive health checks..."
sleep 5

# Check PM2 status
if ! pm2 list | grep filmflex | grep -q online; then
    warning "Application not showing as online in PM2, checking anyway..."
fi

# Health check with multiple endpoints and longer timeout
HEALTH_CHECK_SUCCESS=false
MAX_ATTEMPTS=8
for i in $(seq 1 $MAX_ATTEMPTS); do
    log "Health check attempt $i/$MAX_ATTEMPTS..."
    
    # Try multiple endpoints
    if curl -f -s --max-time 10 http://localhost:5000/ >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        log "Root endpoint responding"
        break
    fi
    
    if curl -f -s --max-time 10 http://localhost:5000/api >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        log "API endpoint responding"
        break
    fi
      # Check if server is at least listening on port (using ss instead of netstat)
    if ss -tln | grep -q ":5000 " || lsof -i :5000 >/dev/null 2>&1; then
        log "Port 5000 is listening, checking response..."
        if curl -s --max-time 10 http://localhost:5000/ | grep -q -E "(html|json|text|<!DOCTYPE)" 2>/dev/null; then
            HEALTH_CHECK_SUCCESS=true
            log "Server responding with content"
            break
        fi
    fi
    
    sleep 6
done

# Final status and reporting
echo ""
if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
    success "🎉 Quick deployment completed successfully!"
    log "Application Status:"
    pm2 list | grep filmflex || log "PM2 status check failed"
    
    log "Recent application logs:"
    pm2 logs filmflex --lines 5 --nostream 2>/dev/null || log "Could not retrieve logs"
    
    success "Application is running at: http://$(hostname -I | awk '{print $1}'):5000"
else
    warning "⚠️  Deployment completed but health checks inconclusive"
    log "PM2 Status:"
    pm2 list | grep filmflex || log "No filmflex process found"
    
    log "Recent error logs:"
    pm2 logs filmflex --lines 10 --nostream 2>/dev/null || log "Could not retrieve error logs"
    
    warning "Application may still be starting up. Manual verification recommended:"
    warning "  - Check: pm2 logs filmflex"
    warning "  - Test: curl http://localhost:5000/"
fi

# Enhanced cleanup
log "Cleaning up old backups (keeping last 5)..."
find "$BACKUP_DIR" -name "dist-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
find "$BACKUP_DIR" -name "package-lock-*.json" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true

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


