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
LOG_FILE="/var/log/filmflex/quick-deploy-$DATE.log"

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
echo "    FilmFlex Quick Code Redeploy v2.0"
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
log "Log: $LOG_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup of current build
log "Step 1: Creating backup..."
if [ -d "$DEPLOY_DIR/dist" ]; then
    cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/dist-$DATE" || handle_error "Backup creation"
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
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.env \
    --exclude=database.db \
    --exclude='*.log' \
    --exclude=.DS_Store \
    "$SOURCE_DIR/" "$DEPLOY_DIR/" >> "$LOG_FILE" 2>&1 || handle_error "Code update"
success "Code updated"

# Step 4: Change to deployment directory
cd "$DEPLOY_DIR" || handle_error "Directory change"

# Step 5: Enhanced TypeScript and ESM syntax check
log "Step 4: Running enhanced syntax checks..."
if command -v npx >/dev/null 2>&1; then
    log "Checking TypeScript syntax..."
    if npx tsc --noEmit --skipLibCheck >> "$LOG_FILE" 2>&1; then
        success "TypeScript syntax check passed"
    else
        warning "TypeScript syntax check failed, checking for critical errors..."
        if npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(error TS|Cannot find module)" >> "$LOG_FILE"; then
            handle_error "Critical TypeScript errors found"
        else
            warning "Non-critical TypeScript warnings found, continuing..."
        fi
    fi
    
    # Check for ES module compatibility
    log "Checking ES module compatibility..."
    if grep -q '"type": "module"' package.json; then
        log "ES module project detected, validating imports..."
        # Check for common ES module issues
        if find src server -name "*.ts" -o -name "*.js" 2>/dev/null | xargs grep -l "require(" | head -5 >> "$LOG_FILE" 2>&1; then
            warning "Found require() statements in ES module project - may cause issues"
        fi
    fi
fi

# Step 6: Smart dependency management
log "Step 5: Smart dependency management..."
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
    npm install >> "$LOG_FILE" 2>&1 || handle_error "Dependency installation"
    success "Dependencies installed"
else
    log "Dependencies are up to date"
fi

# Step 7: Verify and install critical dependencies for ES modules
log "Step 6: Verifying critical dependencies..."
CRITICAL_DEPS=("react-helmet-async" "passport-google-oauth20" "@types/react" "vite" "tsx" "typescript")
MISSING_DEPS=()

for dep in "${CRITICAL_DEPS[@]}"; do
    if ! npm list "$dep" >/dev/null 2>&1; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    warning "Installing missing critical dependencies: ${MISSING_DEPS[*]}"
    npm install "${MISSING_DEPS[@]}" >> "$LOG_FILE" 2>&1 || handle_error "Critical dependency installation"
    success "Critical dependencies installed"
fi

# Step 8: Enhanced build process with multiple fallbacks
log "Step 7: Building application with enhanced process..."
rm -rf dist client/dist 2>/dev/null || true

# Primary build attempt
log "Attempting primary build..."
if npm run build >> "$LOG_FILE" 2>&1; then
    success "Primary build successful"
else
    warning "Primary build failed, trying alternative build methods..."
    
    # Alternative build method 1: Build client and server separately
    log "Trying separate client/server build..."
    if npm run build:client >> "$LOG_FILE" 2>&1 && npm run build:server >> "$LOG_FILE" 2>&1; then
        success "Separate build successful"
    else
        # Alternative build method 2: Direct TypeScript compilation
        warning "Separate build failed, trying direct compilation..."
        if npx tsc -p tsconfig.server.json >> "$LOG_FILE" 2>&1 && npx vite build >> "$LOG_FILE" 2>&1; then
            success "Direct compilation successful"
        else
            # Final fallback: ESBuild
            warning "Direct compilation failed, trying ESBuild fallback..."
            mkdir -p dist
            if npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist >> "$LOG_FILE" 2>&1; then
                success "ESBuild fallback successful"
            else
                error "All build methods failed!"
                handle_error "Application build"
            fi
        fi
    fi
fi

# Step 9: Enhanced build verification
log "Step 8: Enhanced build verification..."
BUILD_VALID=true

# Check if dist directory exists and has content
if [ ! -d "$DEPLOY_DIR/dist" ] || [ ! "$(ls -A $DEPLOY_DIR/dist 2>/dev/null)" ]; then
    error "Build directory is empty or missing"
    BUILD_VALID=false
fi

# Check for essential server files
if [ ! -f "$DEPLOY_DIR/dist/index.js" ] && [ ! -f "$DEPLOY_DIR/dist/server.js" ]; then
    error "Server entry point not found in build"
    BUILD_VALID=false
fi

# Check client build
if [ ! -d "$DEPLOY_DIR/client/dist" ] || [ ! "$(ls -A $DEPLOY_DIR/client/dist 2>/dev/null)" ]; then
    warning "Client build directory missing or empty"
    # This might be OK for some setups, so don't fail
fi

# Validate ES module compatibility
if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
    if grep -q '"type": "module"' package.json; then
        if head -10 "$DEPLOY_DIR/dist/index.js" | grep -q "require(" >> "$LOG_FILE" 2>&1; then
            warning "ES module project but built file contains require() - may cause runtime issues"
        fi
    fi
fi

if [ "$BUILD_VALID" = false ]; then
    handle_error "Build verification"
fi

success "Build verification passed"

# Step 10: Set proper permissions
log "Step 9: Setting permissions..."
chown -R www-data:www-data "$DEPLOY_DIR" || handle_error "Permission setting"
chmod -R 755 "$DEPLOY_DIR"
if [ -f "$DEPLOY_DIR/.env" ]; then
    chmod 600 "$DEPLOY_DIR/.env"
fi
success "Permissions set"

# Step 11: Enhanced application startup
log "Step 10: Starting application with enhanced startup..."
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
    elif [ -f "dist/server.js" ]; then
        if pm2 start dist/server.js --name filmflex >> "$LOG_FILE" 2>&1; then
            START_SUCCESS=true
        fi
    fi
fi

if [ "$START_SUCCESS" = false ]; then
    handle_error "Application start"
fi

pm2 save >> "$LOG_FILE" 2>&1 || warning "Failed to save PM2 configuration"
success "Application started"

# Step 12: Enhanced verification with health checks
log "Step 11: Enhanced deployment verification..."
sleep 10

# Check PM2 status
if ! pm2 list | grep filmflex | grep -q online; then
    error "Application not showing as online in PM2"
    handle_error "Application verification"
fi

# Health check with multiple attempts
HEALTH_CHECK_SUCCESS=false
for i in {1..3}; do
    log "Health check attempt $i/3..."
    if curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        break
    elif curl -f -s http://localhost:5000/ >/dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        break
    fi
    sleep 5
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
    success "Application is running at: http://$(hostname -I | awk '{print $1}')"
    
    # Enhanced cleanup
    log "Cleaning up old backups (keeping last 5)..."
    find "$BACKUP_DIR" -name "dist-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    find "$BACKUP_DIR" -name "package-lock-*.json" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
    
else
    warning "Application started but health checks failed"
    log "Recent error logs:"
    pm2 logs filmflex --lines 20 --nostream 2>/dev/null || true
    warning "Application may still be starting up - check logs"
fi

# Final status summary
echo ""
success "Deployment Summary:"
log "• Code updated from: $SOURCE_DIR"
log "• Build completed successfully"
log "• Application restarted"
log "• Backup saved at: $BACKUP_DIR/dist-$DATE"
log "• Full log available at: $LOG_FILE"
echo ""
warning "Note: This script does NOT run database migrations"
warning "If you need to apply database changes, use the full deployment script"


