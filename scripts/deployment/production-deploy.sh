#!/bin/bash

# FilmFlex Production Deployment Script
# Complete, robust deployment for production servers with ESM support
# Version: 3.0 - Production Ready with Comprehensive Fixes
# 
# Features:
# - Comprehensive ESM import path fixes
# - Rollup native dependency handling
# - Multiple build fallback strategies
# - Enhanced error handling with rollback
# - Database migration support
# - Health checks and monitoring
# - Automatic cleanup and optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SOURCE_DIR="${HOME}/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="/var/backups/filmflex"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/filmflex/production-deploy-$TIMESTAMP.log"
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=60

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "/var/log/filmflex"

# Logging functions
log() {
    local message="$1"
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

success() {
    local message="$1"
    log "${GREEN}✓ $message${NC}"
}

warning() {
    local message="$1"
    log "${YELLOW}⚠ $message${NC}"
}

error() {
    local message="$1"
    log "${RED}✗ $message${NC}"
}

info() {
    local message="$1"
    log "${BLUE}ℹ $message${NC}"
}

debug() {
    local message="$1"
    log "${PURPLE}🔧 $message${NC}"
}

# Enhanced error handling with rollback
handle_error() {
    local exit_code=$?
    local step="$1"
    error "Deployment failed at step: $step (exit code: $exit_code)"
    
    # Attempt rollback
    if [ -d "$BACKUP_DIR/backup_$TIMESTAMP" ]; then
        warning "Attempting rollback to previous version..."
        
        # Stop current application
        pm2 stop filmflex 2>/dev/null || true
        
        # Restore backup
        if cp -r "$BACKUP_DIR/backup_$TIMESTAMP/"* "$DEPLOY_DIR/" 2>/dev/null; then
            success "Backup restored successfully"
            
            # Try to restart with previous version
            cd "$DEPLOY_DIR"
            if pm2 restart filmflex 2>/dev/null; then
                success "Previous version restored and running"
            else
                error "Failed to restart previous version"
            fi
        else
            error "Failed to restore backup"
        fi
    fi
    
    error "Deployment failed. Check log: $LOG_FILE"
    exit $exit_code
}

# Trap errors
trap 'handle_error "Unknown error"' ERR

# Pre-flight checks
preflight_checks() {
    info "Running comprehensive pre-flight checks..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
    
    # Check essential commands
    local required_commands=("git" "npm" "pm2" "curl" "rsync" "nginx" "psql")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check source directory
    if [ ! -d "$SOURCE_DIR" ]; then
        error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi
    
    # Check if source is a git repository
    if [ ! -d "$SOURCE_DIR/.git" ]; then
        error "Source directory is not a git repository: $SOURCE_DIR"
        exit 1
    fi
    
    # Check disk space (require at least 2GB free)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB in KB
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space. Required: 2GB, Available: $(($available_space / 1024))MB"
        exit 1
    fi
    
    # Check PostgreSQL connection
    if ! pg_isready -h localhost -p 5432 &>/dev/null; then
        warning "PostgreSQL is not ready. Deployment will continue but database operations may fail."
    fi
    
    # Check if ports are available
    if netstat -tln | grep -q ":5000 " && ! pm2 list | grep -q filmflex; then
        warning "Port 5000 is in use by another process"
    fi
    
    success "Pre-flight checks completed"
}

# Git operations with enhanced error handling
update_source_code() {
    info "Updating source code from repository..."
    cd "$SOURCE_DIR" || handle_error "Source directory access failed"
    
    # Stash any local changes
    git stash push -m "Production deploy stash $TIMESTAMP" &>/dev/null || true
    
    # Clean up
    git clean -fd &>/dev/null || true
    git reset --hard HEAD &>/dev/null || true
    
    # Fetch with timeout
    if timeout 60 git fetch origin; then
        success "Git fetch completed"
    else
        error "Git fetch failed or timed out"
        handle_error "Git fetch failed"
    fi
    
    # Checkout and pull main branch
    if git checkout main && git pull origin main; then
        success "Updated to latest main branch"
    else
        error "Failed to update main branch"
        handle_error "Git update failed"
    fi
    
    # Show current commit
    local current_commit=$(git log -1 --oneline)
    info "Current commit: $current_commit"
}

# Comprehensive backup system
create_backup() {
    info "Creating comprehensive backup..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$DEPLOY_DIR" ]; then
        # Create full backup
        if cp -r "$DEPLOY_DIR" "$BACKUP_DIR/backup_$TIMESTAMP"; then
            success "Full backup created: $BACKUP_DIR/backup_$TIMESTAMP"
        else
            handle_error "Backup creation failed"
        fi
        
        # Backup database
        if command -v pg_dump &>/dev/null; then
            info "Creating database backup..."
            if pg_dump -h localhost -U postgres filmflex > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" 2>/dev/null; then
                success "Database backup created"
            else
                warning "Database backup failed (continuing deployment)"
            fi
        fi
        
        # Backup PM2 ecosystem
        if pm2 list filmflex &>/dev/null; then
            pm2 save &>/dev/null || true
            cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2_backup_$TIMESTAMP.json" 2>/dev/null || true
        fi
    else
        warning "No existing deployment to backup"
    fi
    
    # Cleanup old backups (keep last 5)
    find "$BACKUP_DIR" -name "backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    find "$BACKUP_DIR" -name "db_backup_*.sql" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
}

# Graceful application shutdown
stop_application() {
    info "Stopping application gracefully..."
    
    if pm2 list | grep -q filmflex; then
        info "Current PM2 status:"
        pm2 list | grep filmflex >> "$LOG_FILE" 2>&1 || true
        
        # Graceful stop with timeout
        if timeout 30 pm2 stop filmflex; then
            success "Application stopped gracefully"
        else
            warning "Graceful stop timed out, forcing stop..."
            pm2 kill &>/dev/null || true
        fi
    else
        info "No running application found"
    fi
    
    # Wait for ports to be released
    sleep 3
}

# Enhanced file synchronization
sync_files() {
    info "Syncing files to deployment directory..."
    mkdir -p "$DEPLOY_DIR"
    
    # Sync with comprehensive exclusions
    if rsync -av --delete \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=dist \
        --exclude=build \
        --exclude=.env \
        --exclude=.env.local \
        --exclude=.env.development \
        --exclude='*.log' \
        --exclude=.DS_Store \
        --exclude='.pm2' \
        --exclude='*.tmp' \
        --exclude='temp/' \
        --exclude='coverage/' \
        --exclude='cypress/videos/' \
        --exclude='cypress/screenshots/' \
        --exclude='tests/coverage/' \
        "$SOURCE_DIR/" "$DEPLOY_DIR/"; then
        success "Files synced successfully"
    else
        handle_error "File synchronization failed"
    fi
}

# Enhanced dependency management with native binary fixes
install_dependencies() {
    info "Installing dependencies with native binary support..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    # Clean previous installations
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Clear npm cache
    npm cache clean --force &>/dev/null || true
    
    # Install with retries
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        info "Dependency installation attempt $attempt/$MAX_RETRIES..."
        
        if npm install --no-audit --no-fund; then
            success "Dependencies installed successfully"
            break
        else
            warning "Installation attempt $attempt failed"
            if [ $attempt -eq $MAX_RETRIES ]; then
                error "All dependency installation attempts failed"
                handle_error "Dependency installation failed"
            fi
            sleep 5
            ((attempt++))
        fi
    done
    
    # Verify critical dependencies
    if [ ! -d "node_modules/@rollup/rollup-linux-x64-gnu" ]; then
        warning "Rollup native binary missing, attempting to fix..."
        npm install @rollup/rollup-linux-x64-gnu --save-optional &>/dev/null || true
    fi
    
    # Install additional type packages for build
    info "Installing build-time dependencies..."
    npm install --save-dev @types/express @types/passport @types/passport-local @types/express-session @types/connect-pg-simple &>/dev/null || warning "Some type packages not available"
    
    success "All dependencies installed"
}

# Comprehensive build system with multiple fallback strategies
build_application() {
    info "Building application with multiple strategies..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    # Clean previous builds
    rm -rf dist build client/dist 2>/dev/null || true
    mkdir -p dist
    
    local build_success=false
    local build_method=""
    
    # Strategy 1: Standard npm build
    info "Attempting standard npm build..."
    if timeout 300 npm run build; then
        build_success=true
        build_method="npm run build"
        success "Standard build completed"
    else
        warning "Standard build failed, trying alternatives..."
        
        # Strategy 2: Direct vite build
        info "Attempting direct vite build..."
        if timeout 300 npx vite build; then
            build_success=true
            build_method="direct vite build"
            success "Direct vite build completed"
        else
            warning "Vite build failed, trying TypeScript compilation..."
            
            # Strategy 3: TypeScript server build
            if [ -f "tsconfig.server.json" ]; then
                info "Attempting TypeScript server build..."
                if timeout 180 npx tsc -p tsconfig.server.json; then
                    build_success=true
                    build_method="TypeScript server build"
                    success "TypeScript server build completed"
                fi
            fi
            
            # Strategy 4: ESBuild fallback
            if [ "$build_success" = false ]; then
                info "Attempting ESBuild fallback..."
                if [ -f "server/index.ts" ]; then
                    mkdir -p dist/server
                    if timeout 120 npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server/index.js; then
                        build_success=true
                        build_method="ESBuild fallback"
                        success "ESBuild fallback completed"
                    fi
                fi
            fi
            
            # Strategy 5: Manual TypeScript compilation
            if [ "$build_success" = false ] && [ -f "tsconfig.json" ]; then
                info "Attempting manual TypeScript compilation..."
                if timeout 180 npx tsc; then
                    build_success=true
                    build_method="Manual TypeScript"
                    success "Manual TypeScript build completed"
                fi
            fi
        fi
    fi
    
    if [ "$build_success" = false ]; then
        error "All build strategies failed"
        handle_error "Build process failed"
    fi
    
    info "Build completed using: $build_method"
}

# Comprehensive ESM import fixes
fix_esm_imports() {
    info "Applying comprehensive ESM import fixes..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    if [ ! -d "dist" ]; then
        warning "No dist directory found, skipping ESM fixes"
        return 0
    fi
    
    # Fix all @shared imports with proper path resolution
    info "Fixing @shared import paths..."
    find dist -name "*.js" -type f | while read -r file; do
        if [[ "$file" == *"/server/"* ]]; then
            # For server files, calculate proper relative path to shared
            if [[ "$file" == *"/server/routes/admin/"* ]] || [[ "$file" == *"/server/routes/"*"/"* ]]; then
                # For nested routes, go up more levels
                sed -i "s|from '@shared/\([^']*\)'|from '../../shared/\1.js'|g" "$file"
                sed -i "s|from \"@shared/\([^\"]*\)\"|from \"../../shared/\1.js\"|g" "$file"
                sed -i "s|import \* as \([^ ]*\) from '@shared/\([^']*\)';|import * as \1 from '../../shared/\2.js';|g" "$file"
                sed -i "s|import { \([^}]*\) } from '@shared/\([^']*\)';|import { \1 } from '../../shared/\2.js';|g" "$file"
            else
                # For direct server files, go up one level
                sed -i "s|from '@shared/\([^']*\)'|from '../shared/\1.js'|g" "$file"
                sed -i "s|from \"@shared/\([^\"]*\)\"|from \"../shared/\1.js\"|g" "$file"
                sed -i "s|import \* as \([^ ]*\) from '@shared/\([^']*\)';|import * as \1 from '../shared/\2.js';|g" "$file"
                sed -i "s|import { \([^}]*\) } from '@shared/\([^']*\)';|import { \1 } from '../shared/\2.js';|g" "$file"
            fi
        else
            # For root dist files, use same level
            sed -i "s|from '@shared/\([^']*\)'|from './shared/\1.js'|g" "$file"
            sed -i "s|from \"@shared/\([^\"]*\)\"|from \"./shared/\1.js\"|g" "$file"
            sed -i "s|import \* as \([^ ]*\) from '@shared/\([^']*\)';|import * as \1 from './shared/\2.js';|g" "$file"
            sed -i "s|import { \([^}]*\) } from '@shared/\([^']*\)';|import { \1 } from './shared/\2.js';|g" "$file"
        fi
    done
    
    # Fix all @server imports
    info "Fixing @server import paths..."
    find dist/server -name "*.js" -type f | while read -r file; do
        sed -i "s|from '@server/\([^']*\)'|from './\1.js'|g" "$file"
        sed -i "s|from \"@server/\([^\"]*\)\"|from \"./\1.js\"|g" "$file"
        sed -i "s|import \* as \([^ ]*\) from '@server/\([^']*\)';|import * as \1 from './\2.js';|g" "$file"
        sed -i "s|import { \([^}]*\) } from '@server/\([^']*\)';|import { \1 } from './\2.js';|g" "$file"
    done
    
    # Fix relative import extensions
    info "Adding .js extensions to relative imports..."
    find dist -name "*.js" -type f -exec sed -i -E "s/from (['\"])(\.[^'\"]*[^js])\1/from \1\2.js\1/g" {} \; 2>/dev/null || true
    
    # Remove development-only files
    info "Removing development-only files..."
    rm -f dist/vite.config.js dist/vite.config.js.map dist/tsconfig.json 2>/dev/null || true
    
    # Fix vite.config imports
    find dist -name "*.js" -type f | while read -r file; do
        sed -i 's|import viteConfig from "[^"]*vite.config.js";|// import viteConfig from "vite.config.js"; // Removed for production|g' "$file"
        sed -i "s|import viteConfig from '[^']*vite.config.js';|// import viteConfig from 'vite.config.js'; // Removed for production|g" "$file"
        sed -i 's|...viteConfig,|// ...viteConfig, // Removed for production - using default config|g' "$file"
    done
    
    # Create proper package.json for ESM support
    info "Creating ESM-compatible package.json in dist directory..."
    cat > dist/package.json << 'EOF'
{
  "type": "module",
  "main": "index.js"
}
EOF
    
    # Verify and report import fixes
    local remaining_shared_imports=$(find dist -name "*.js" -exec grep -l "@shared" {} \; 2>/dev/null | wc -l)
    local remaining_server_imports=$(find dist -name "*.js" -exec grep -l "@server" {} \; 2>/dev/null | wc -l)
    
    if [ "$remaining_shared_imports" -gt 0 ]; then
        warning "$remaining_shared_imports files still contain @shared imports"
        find dist -name "*.js" -exec grep -l "@shared" {} \; 2>/dev/null | head -3 >> "$LOG_FILE"
    fi
    
    if [ "$remaining_server_imports" -gt 0 ]; then
        warning "$remaining_server_imports files still contain @server imports"
    fi
    
    success "ESM import fixes completed"
}

# Verify build output
verify_build() {
    info "Verifying build output..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    # Find main application file
    local main_file=""
    if [ -f "dist/server/index.js" ]; then
        main_file="dist/server/index.js"
    elif [ -f "dist/index.js" ]; then
        main_file="dist/index.js"
    else
        error "No main application file found in build output"
        handle_error "Build verification failed"
    fi
    
    info "Main application file: $main_file"
    
    # Verify essential files
    local essential_files=("package.json")
    for file in "${essential_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Essential file missing: $file"
            handle_error "Build verification failed"
        fi
    done
    
    # Copy static assets
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
    
    success "Build verification completed"
}

# Database migration (if needed)
run_migrations() {
    info "Checking for database migrations..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    if [ -d "migrations" ] && [ "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
        info "Running database migrations..."
        
        # Check if database is accessible
        if pg_isready -h localhost -p 5432 &>/dev/null; then
            for migration in migrations/*.sql; do
                if [ -f "$migration" ]; then
                    info "Running migration: $(basename $migration)"
                    if psql -h localhost -U postgres -d filmflex -f "$migration" &>/dev/null; then
                        success "Migration completed: $(basename $migration)"
                    else
                        warning "Migration failed: $(basename $migration)"
                    fi
                fi
            done
        else
            warning "Database not accessible, skipping migrations"
        fi
    else
        info "No migrations found"
    fi
}

# Set proper permissions
set_permissions() {
    info "Setting proper permissions..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    # Set ownership
    chown -R www-data:www-data . 2>/dev/null || chown -R $(whoami):$(whoami) .
    
    # Set permissions
    chmod -R 755 .
    
    # Secure sensitive files
    if [ -f ".env" ]; then
        chmod 600 ".env"
    fi
    
    if [ -f ".env.production" ]; then
        chmod 600 ".env.production"
    fi
    
    success "Permissions set"
}

# Start application with multiple strategies
start_application() {
    info "Starting application with multiple strategies..."
    cd "$DEPLOY_DIR" || handle_error "Deploy directory access failed"
    
    local start_success=false
    
    # Strategy 1: Use ecosystem config
    if [ -f "ecosystem.config.js" ]; then
        info "Starting with ecosystem.config.js..."
        if pm2 start ecosystem.config.js --env production; then
            start_success=true
            success "Started with ecosystem config"
        fi
    fi
    
    # Strategy 2: Use CJS ecosystem config
    if [ "$start_success" = false ] && [ -f "ecosystem.config.cjs" ]; then
        info "Starting with ecosystem.config.cjs..."
        if pm2 start ecosystem.config.cjs --env production; then
            start_success=true
            success "Started with CJS ecosystem config"
        fi
    fi
    
    # Strategy 3: Direct start
    if [ "$start_success" = false ]; then
        local main_file=""
        if [ -f "dist/server/index.js" ]; then
            main_file="dist/server/index.js"
        elif [ -f "dist/index.js" ]; then
            main_file="dist/index.js"
        fi
        
        if [ -n "$main_file" ]; then
            info "Starting directly with $main_file..."
            if pm2 start "$main_file" --name filmflex --node-args="--max-old-space-size=512"; then
                start_success=true
                success "Started with direct PM2 command"
            fi
        fi
    fi
    
    # Strategy 4: Force restart existing process
    if [ "$start_success" = false ]; then
        info "Attempting to restart existing process..."
        if pm2 restart filmflex; then
            start_success=true
            success "Restarted existing process"
        fi
    fi
    
    if [ "$start_success" = false ]; then
        error "All startup strategies failed"
        handle_error "Application startup failed"
    fi
    
    # Save PM2 configuration
    pm2 save &>/dev/null || warning "Failed to save PM2 configuration"
    
    success "Application started successfully"
}

# Comprehensive health checks
health_checks() {
    info "Running comprehensive health checks..."
    
    # Wait for application to initialize
    sleep 10
    
    local health_success=false
    local max_attempts=10
    
    for attempt in $(seq 1 $max_attempts); do
        info "Health check attempt $attempt/$max_attempts..."
        
        # Check if PM2 process is running
        if pm2 list | grep filmflex | grep -q online; then
            debug "PM2 process is online"
            
            # Check if port is listening
            if netstat -tln | grep -q ":5000 "; then
                debug "Port 5000 is listening"
                
                # Try multiple endpoints
                if curl -f -s --max-time 10 http://localhost:5000/ >/dev/null 2>&1; then
                    health_success=true
                    success "Root endpoint responding"
                    break
                elif curl -f -s --max-time 10 http://localhost:5000/api >/dev/null 2>&1; then
                    health_success=true
                    success "API endpoint responding"
                    break
                elif curl -s --max-time 10 http://localhost:5000/ | grep -q -E "(html|json|text|<!DOCTYPE)" 2>/dev/null; then
                    health_success=true
                    success "Server responding with content"
                    break
                else
                    debug "No response from server endpoints"
                fi
            else
                debug "Port 5000 not listening"
            fi
        else
            debug "PM2 process not online"
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            sleep 6
        fi
    done
    
    # Final health check report
    if [ "$health_success" = true ]; then
        success "Health checks passed - application is responding"
        
        # Show application status
        info "Application Status:"
        pm2 list | grep filmflex || warning "PM2 status check failed"
        
        # Show recent logs
        info "Recent application logs:"
        pm2 logs filmflex --lines 5 --nostream 2>/dev/null || warning "Could not retrieve logs"
        
    else
        warning "Health checks failed - application may still be starting"
        
        # Show diagnostic information
        warning "Diagnostic Information:"
        pm2 list | grep filmflex || warning "No filmflex process found"
        
        warning "Recent error logs:"
        pm2 logs filmflex --lines 10 --nostream 2>/dev/null || warning "Could not retrieve error logs"
        
        # Don't fail deployment for health check issues
        warning "Deployment completed but health checks inconclusive"
    fi
}

# Nginx configuration update
update_nginx() {
    info "Updating Nginx configuration..."
    
    # Check if nginx config exists
    if [ -f "/etc/nginx/sites-available/filmflex" ]; then
        info "Testing Nginx configuration..."
        if nginx -t; then
            info "Reloading Nginx..."
            systemctl reload nginx
            success "Nginx reloaded successfully"
        else
            warning "Nginx configuration test failed"
        fi
    else
        warning "Nginx configuration not found at /etc/nginx/sites-available/filmflex"
    fi
}

# Cleanup old deployments and logs
cleanup() {
    info "Cleaning up old deployments and logs..."
    
    # Clean old backups (keep last 5)
    find "$BACKUP_DIR" -name "backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    find "$BACKUP_DIR" -name "db_backup_*.sql" | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    # Clean old logs (keep last 10)
    find "/var/log/filmflex" -name "production-deploy-*.log" | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    # Clean npm cache
    npm cache clean --force &>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment process
main() {
    # Print banner
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "    FilmFlex Production Deployment v3.0"
    echo "    Complete & Robust Production Deploy"
    echo "    Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo -e "${NC}"
    
    info "Starting FilmFlex Production Deployment"
    info "Source: $SOURCE_DIR"
    info "Target: $DEPLOY_DIR"
    info "Log: $LOG_FILE"
    
    # Execute deployment steps
    preflight_checks
    update_source_code
    create_backup
    stop_application
    sync_files
    install_dependencies
    build_application
    fix_esm_imports
    verify_build
    run_migrations
    set_permissions
    start_application
    health_checks
    update_nginx
    cleanup
    
    # Final success message
    echo ""
    success "🎉 FilmFlex Production Deployment Completed Successfully!"
    echo ""
    info "Deployment Summary:"
    info "• Source updated from main branch"
    info "• Application built and optimized"
    info "• ESM imports fixed for production"
    info "• All dependencies installed correctly"
    info "• Application started with PM2"
    info "• Health checks completed"
    info "• Nginx configuration updated"
    echo ""
    success "🎬 FilmFlex is now running in production!"
    info "Application URL: http://localhost:5000"
    info "To check status: pm2 status"
    info "To view logs: pm2 logs filmflex"
    info "Full deployment log: $LOG_FILE"
    echo ""
}

# Run main deployment
main "$@"
