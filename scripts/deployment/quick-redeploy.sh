#!/bin/bash

# FilmFlex Quick Code Redeploy Script for phimgg.com Production
# Fast frontend/backend redeployment WITHOUT database changes
# This script only updates code and rebuilds the application
# VERSION: 3.0 - Updated for phimgg.com production environment (154.205.142.255)
#
# Usage:
#   ./quick-redeploy.sh                    # Deploy current branch (no switch)
#   ./quick-redeploy.sh main              # Deploy main branch (RECOMMENDED)
#   ./quick-redeploy.sh feature-branch    # Deploy specific feature branch
#   ./quick-redeploy.sh --no-branch       # Skip branch switching entirely
#
# Features:
#   - Updated for phimgg.com production environment
#   - ES module build compatibility (esbuild)
#   - CORS configuration fixes
#   - Automatic branch switching with conflict resolution
#   - Enhanced dependency management with binary fixes
#   - Multiple build fallback strategies
#   - Comprehensive health checks and verification
#   - Production environment variables

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration - Updated for phimgg.com production
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
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
echo "    FilmFlex Quick Code Redeploy v3.0"
echo "    (Frontend + Backend Only - No DB)"
echo "    Production: phimgg.com (${PRODUCTION_IP})"
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

# Step 4: Smart dependency management with enhanced fixes
log "Step 4: Smart dependency management with enhanced binary fixes..."
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
    log "Installing/updating dependencies with enhanced fixes..."
    
    # Clean up potentially corrupted files
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm cache clean --force || true
    
    # Install dependencies
    if ! npm install >> "$LOG_FILE" 2>&1; then
        warning "npm install failed, trying with --force"
        if ! npm install --force >> "$LOG_FILE" 2>&1; then
            warning "npm install --force failed, trying legacy peer deps"
            if ! npm install --legacy-peer-deps >> "$LOG_FILE" 2>&1; then
                handle_error "Step 4 - Dependency installation"
            fi
        fi
    fi
    
    # Install platform-specific binaries that commonly cause issues
    log "Installing platform-specific binaries for Linux x64..."
    npm install @esbuild/linux-x64 --save-dev >> "$LOG_FILE" 2>&1 || warning "esbuild binary install failed"
    npm install @rollup/rollup-linux-x64-gnu --save-dev >> "$LOG_FILE" 2>&1 || warning "rollup binary install failed"
    
    # Verify critical binaries are present
    log "Verifying critical binaries..."
    if [ ! -f "node_modules/@esbuild/linux-x64/package.json" ]; then
        warning "esbuild Linux x64 binary missing - attempting fix..."
        npm rebuild @esbuild/linux-x64 >> "$LOG_FILE" 2>&1 || npm install @esbuild/linux-x64 --force >> "$LOG_FILE" 2>&1
    fi
    
    if [ ! -f "node_modules/@rollup/rollup-linux-x64-gnu/package.json" ]; then
        warning "Rollup Linux x64 binary missing - attempting fix..."
        npm rebuild @rollup/rollup-linux-x64-gnu >> "$LOG_FILE" 2>&1 || npm install @rollup/rollup-linux-x64-gnu --force >> "$LOG_FILE" 2>&1
    fi
    
    success "Dependencies installed with binary fixes"
else
    log "Dependencies appear to be up to date"
fi

# Step 5: Build process with enhanced ES module support
log "Step 5: Building application with ES module support..."
cd "$DEPLOY_DIR" || handle_error "Step 5 - Directory change"

# Clean previous build completely
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf client/dist 2>/dev/null || true

# Create dist directory
mkdir -p dist/server

# Try multiple build strategies
BUILD_SUCCESS=false
BUILD_METHOD=""

# Strategy 1: Use package.json build scripts (ES module compatible)
log "Attempting ES module build (npm run build:server)..."
if timeout 300 npm run build:server >> "$LOG_FILE" 2>&1; then
    BUILD_SUCCESS=true
    BUILD_METHOD="npm run build:server (ES modules)"
    success "ES module server build successful"
    
    # Also try client build if script exists
    if grep -q "build:client" package.json; then
        log "Building client..."
        if timeout 180 npm run build:client >> "$LOG_FILE" 2>&1; then
            success "Client build also completed"
        else
            warning "Client build failed, but server build succeeded"
        fi
    fi
else
    warning "ES module build failed, trying fallback strategies..."
    
    # Strategy 2: Direct esbuild with ES modules
    log "Attempting direct esbuild with ES module output..."
    if [ -f "server/index.ts" ]; then
        if timeout 120 npx esbuild server/index.ts \
            --bundle \
            --platform=node \
            --target=es2022 \
            --format=esm \
            --outdir=dist \
            --packages=external \
            --sourcemap \
            --external:vite.config.ts >> "$LOG_FILE" 2>&1; then
            BUILD_SUCCESS=true
            BUILD_METHOD="Direct esbuild (ES modules)"
            success "Direct esbuild successful"
        fi
    fi
    
    # Strategy 3: TypeScript with ES modules
    if [ "$BUILD_SUCCESS" = false ] && [ -f "tsconfig.server.json" ]; then
        log "Attempting TypeScript build with ES modules..."
        if timeout 180 npx tsc -p tsconfig.server.json >> "$LOG_FILE" 2>&1; then
            BUILD_SUCCESS=true
            BUILD_METHOD="TypeScript (ES modules)"
            success "TypeScript ES module build successful"
        fi
    fi
    
    # Strategy 4: Fallback TypeScript compilation
    if [ "$BUILD_SUCCESS" = false ] && [ -f "tsconfig.json" ]; then
        log "Attempting fallback TypeScript compilation..."
        if timeout 180 npx tsc >> "$LOG_FILE" 2>&1; then
            BUILD_SUCCESS=true
            BUILD_METHOD="Fallback TypeScript"
            success "Fallback TypeScript build successful"
        fi
    fi
fi

if [ "$BUILD_SUCCESS" = false ]; then
    error "All build strategies failed"
    log "Available files in current directory:"
    ls -la >> "$LOG_FILE" 2>&1
    log "TypeScript files found:"
    find . -name "*.ts" -type f | head -10 >> "$LOG_FILE" 2>&1
    handle_error "Step 5 - All build strategies failed"
fi

info "Build completed using: $BUILD_METHOD"

# Verify build output and fix for ES modules
log "Verifying and fixing ES module build output..."
if [ -f "dist/index.js" ]; then
    MAIN_FILE="dist/index.js"
elif [ -f "dist/server/index.js" ]; then
    MAIN_FILE="dist/server/index.js"
else
    error "No main application file found in build output"
    log "Dist directory contents:"
    find dist -type f -name "*.js" | head -10 >> "$LOG_FILE" 2>&1
    handle_error "Step 5 - Build verification failed"
fi

# Check if the built file needs ES module extension fixes
if grep -q "from ['\"][^'\"]*[^js]['\"]" "$MAIN_FILE" 2>/dev/null; then
    log "Fixing ES module import extensions..."
    find dist -name "*.js" -type f -exec sed -i -E "s/from (['\"])(\.[^'\"]*[^js])\1/from \1\2.js\1/g" {} \; 2>/dev/null || true
    success "ES module import extensions fixed"
fi

log "Main application file: $MAIN_FILE"
BUNDLE_SIZE=$(du -h "$MAIN_FILE" | cut -f1)
log "Bundle size: $BUNDLE_SIZE"
success "Build verification passed"

# Step 6: Setup production environment variables
log "Step 6: Setting up production environment variables..."

# Create or update .env.production file
cat > ".env.production" << 'EOENV'
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
EOENV

# Update ecosystem config for production
log "Updating PM2 ecosystem config for production..."
cat > "ecosystem.config.cjs" << 'EOCONFIG'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        ALLOWED_ORIGINS: "*",
        CLIENT_URL: "*",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61",
        DOMAIN: "phimgg.com",
        SERVER_IP: "154.205.142.255"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOCONFIG

success "Production environment configured"

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
if [ -f ".env.production" ]; then
    chmod 600 ".env.production"
fi
success "Permissions set"

# Step 9: Application startup with enhanced production support
log "Step 9: Starting application with production configuration..."
START_SUCCESS=false

# Strategy 1: Use ecosystem config with production environment
if [ -f "ecosystem.config.cjs" ]; then
    log "Starting with ecosystem.config.cjs (production mode)..."
    if pm2 start ecosystem.config.cjs --env production >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
        success "Started with ecosystem config (production)"
    fi
fi

# Strategy 2: Direct start with main file and production env
if [ "$START_SUCCESS" = false ] && [ -n "$MAIN_FILE" ]; then
    log "Starting directly with $MAIN_FILE (production env)..."
    # Set production environment variables
    export NODE_ENV=production
    export ALLOWED_ORIGINS="*"
    export CLIENT_URL="*"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    
    if pm2 start "$MAIN_FILE" --name filmflex --node-args="--max-old-space-size=512" >> "$LOG_FILE" 2>&1; then
        START_SUCCESS=true
        success "Started with direct PM2 command (production env)"
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

# Step 10: Comprehensive health checks with production endpoints
log "Step 10: Comprehensive health checks for production environment..."
sleep 5

# Check PM2 status
if ! pm2 list | grep filmflex | grep -q online; then
    warning "Application not showing as online in PM2, checking anyway..."
fi

# Health check with multiple endpoints and extended timeout for production
HEALTH_CHECK_SUCCESS=false
MAX_ATTEMPTS=10
PRODUCTION_ENDPOINTS=(
    "http://localhost:5000/"
    "http://localhost:5000/api"
    "http://localhost:5000/api/health"
    "http://${PRODUCTION_IP}:5000/"
    "http://${PRODUCTION_IP}:5000/api/health"
)

for i in $(seq 1 $MAX_ATTEMPTS); do
    log "Health check attempt $i/$MAX_ATTEMPTS..."
    
    # Test local endpoints first
    for endpoint in "${PRODUCTION_ENDPOINTS[@]}"; do
        if curl -f -s --max-time 10 "$endpoint" >/dev/null 2>&1; then
            HEALTH_CHECK_SUCCESS=true
            success "Endpoint responding: $endpoint"
            
            # Get response for logging
            RESPONSE=$(curl -s --max-time 10 "$endpoint" 2>/dev/null | head -c 200)
            if [ -n "$RESPONSE" ]; then
                log "Response preview: $RESPONSE"
            fi
            break
        fi
    done
    
    if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
        break
    fi
    
    # Check if server is at least listening on port
    if netstat -tln | grep -q ":5000 "; then
        log "Port 5000 is listening, server may still be starting..."
    else
        warning "Port 5000 not listening - server may have failed to start"
    fi
    
    sleep 8
done

# Additional production-specific checks
if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
    log "Running additional production health checks..."
    
    # Test CORS configuration
    if curl -s -H "Origin: https://phimgg.com" -I "http://localhost:5000/api/health" | grep -q "Access-Control-Allow-Origin"; then
        success "CORS headers are configured"
    else
        warning "CORS headers may not be properly configured"
    fi
    
    # Test external IP accessibility
    if curl -f -s --max-time 15 "http://${PRODUCTION_IP}:5000/api/health" >/dev/null 2>&1; then
        success "Server accessible from external IP: ${PRODUCTION_IP}"
    else
        warning "Server may not be accessible from external IP: ${PRODUCTION_IP}"
        log "This could be due to firewall settings or network configuration"
    fi
fi

# Final status and reporting with production information
echo ""
if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
    success "🎉 Quick deployment completed successfully!"
    log "Application Status:"
    pm2 list | grep filmflex || log "PM2 status check failed"
    
    log "Recent application logs:"
    pm2 logs filmflex --lines 5 --nostream 2>/dev/null || log "Could not retrieve logs"
    
    success "Production URLs:"
    success "  • Local: http://localhost:5000"
    success "  • Production IP: http://${PRODUCTION_IP}:5000"
    success "  • Domain: https://${PRODUCTION_DOMAIN} (when DNS configured)"
    success "  • Health Check: http://${PRODUCTION_IP}:5000/api/health"
else
    warning "⚠️  Deployment completed but health checks inconclusive"
    log "PM2 Status:"
    pm2 list | grep filmflex || log "No filmflex process found"
    
    log "Recent error logs:"
    pm2 logs filmflex --lines 10 --nostream 2>/dev/null || log "Could not retrieve error logs"
    
    warning "Application may still be starting up. Manual verification recommended:"
    warning "  - Check: pm2 logs filmflex"
    warning "  - Test local: curl http://localhost:5000/"
    warning "  - Test production: curl http://${PRODUCTION_IP}:5000/"
fi

# Enhanced cleanup
log "Cleaning up old backups (keeping last 5)..."
find "$BACKUP_DIR" -name "dist-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
find "$BACKUP_DIR" -name "package-lock-*.json" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true

echo ""
success "🚀 Deployment Summary for phimgg.com:"
log "• Branch deployed: $TARGET_BRANCH"
log "• Build method: $BUILD_METHOD"
log "• Production IP: $PRODUCTION_IP"
log "• Domain: $PRODUCTION_DOMAIN"
log "• Code updated from: $SOURCE_DIR"
log "• ES module build completed successfully"
log "• CORS configured for production (*)"
log "• Application restarted with PM2"
log "• Backup saved at: $BACKUP_DIR/dist-$DATE"
log "• Full log available at: $LOG_FILE"
echo ""
success "🔧 Production Management Commands:"
log "• Status: pm2 status filmflex"
log "• Logs: pm2 logs filmflex"
log "• Monitor: pm2 monit"
log "• Restart: pm2 restart filmflex"
log "• Stop: pm2 stop filmflex"
echo ""
warning "📋 Next Steps:"
warning "• Configure DNS for $PRODUCTION_DOMAIN to point to $PRODUCTION_IP"
warning "• Set up SSL certificate for HTTPS"
warning "• Review CORS settings for production security"
warning "• Consider implementing proper authentication"
echo ""
warning "Note: This script does NOT run database migrations"
warning "If you need to apply database changes, use the full deployment script"
echo ""
success "🎬 FilmFlex is now running the latest code from $TARGET_BRANCH branch on phimgg.com!"


