#!/bin/bash

# PhimGG Unified Deployment Manager
# Consolidates all deployment, fixing, and status checking functionality
# Version: 1.0 - Unified Script
#
# Usage:
#   ./filmflex-deploy.sh status                    # Check current status
#   ./filmflex-deploy.sh deploy [quick|full]       # Deploy application  
#   ./filmflex-deploy.sh fix [cors|errors|all]     # Fix specific issues
#   ./filmflex-deploy.sh restart                   # Restart application
#   ./filmflex-deploy.sh logs [lines]              # View application logs
#   ./filmflex-deploy.sh health                    # Run health checks
#   ./filmflex-deploy.sh upload                    # Upload files from Windows (via WSL/Git Bash)

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="/var/backups/filmflex"
DATE=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/filmflex/unified-deploy-$DATE.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" "/var/log/filmflex"

# Logging functions
log() {
    local message="[$(date '+%H:%M:%S')] $1"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE"
}

success() { log "${GREEN}✅ $1${NC}"; }
warning() { log "${YELLOW}⚠️ $1${NC}"; }
error() { log "${RED}❌ $1${NC}"; }
info() { log "${BLUE}ℹ️ $1${NC}"; }

# Help function
show_help() {
    echo "PhimGG Unified Deployment Manager"
    echo "=================================="
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status                     Check application status"
    echo "  upload                     Upload files from Windows to server"
    echo "  deploy [quick|full]        Deploy application (default: quick)"
    echo "  fix [cors|errors|all]      Fix specific issues (default: all)"
    echo "  restart                    Restart application"
    echo "  logs [lines]               View logs (default: 20 lines)"
    echo "  health                     Run comprehensive health check"
    echo "  backup                     Create backup of current deployment"
    echo "  cleanup                    Clean old backups and logs"
    echo ""
    echo "Examples:"
    echo "  $0 status                  # Check if app is running"
    echo "  $0 deploy quick            # Quick code redeploy"
    echo "  $0 deploy full             # Full production deploy"
    echo "  $0 fix cors                # Fix CORS issues only"
    echo "  $0 fix errors              # Fix module/build errors"
    echo "  $0 logs 50                 # Show last 50 log lines"
    echo ""
}

# Status check function
check_status() {
    log "🔍 PhimGG Application Status Check"
    log "===================================="
    
    # PM2 Status
    info "📊 PM2 Process Status:"
    local pm2_status="OFFLINE"
    if pm2 list | grep -q filmflex; then
        if pm2 list | grep filmflex | grep -q online; then
            pm2_status="ONLINE"
            success "PhimGG is running in PM2"
        else
            warning "PhimGG process exists but not online"
        fi
    else
        warning "PhimGG process not found in PM2"
    fi
    
    # Port Status
    info "🔌 Port 5000 Status:"
    local port_status="NOT_LISTENING"
    if command -v ss >/dev/null 2>&1; then
        if ss -tln | grep -q ":5000 "; then
            port_status="LISTENING"
            success "Port 5000 is listening"
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i :5000 >/dev/null 2>&1; then
            port_status="LISTENING"
            success "Port 5000 is listening"
        fi
    fi
    
    if [ "$port_status" = "NOT_LISTENING" ]; then
        warning "Port 5000 is not listening"
    fi
    
    # HTTP Status
    info "🌐 HTTP Endpoint Status:"
    local http_status="NOT_RESPONDING"
    if curl -f -s --max-time 5 http://localhost:5000/ >/dev/null 2>&1; then
        http_status="RESPONDING"
        success "Application is responding to HTTP requests"
    else
        warning "Application is not responding to HTTP requests"
    fi
    
    # Summary
    log ""
    log "📊 Status Summary:"
    log "=================="
    log "PM2 Status: $pm2_status"
    log "Port Status: $port_status"
    log "HTTP Status: $http_status"
    log ""
    
    if [ "$pm2_status" = "ONLINE" ] && [ "$http_status" = "RESPONDING" ]; then
        success "🎉 Application is running successfully!"
        log ""
        local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
        log "🌍 Access your application at: http://$server_ip:5000"
    else
        warning "⚠️ Application has issues - see details above"
        log ""
        log "💡 Try: $0 fix all"
    fi
    
    return 0
}

# Quick deployment function
deploy_quick() {
    log "🚀 Quick Deployment Started"
    log "=========================="
    
    # Run pre-deployment check
    info "🔍 Running pre-deployment checks..."
    if [ -f "pre-deploy-check.sh" ]; then
        chmod +x pre-deploy-check.sh
        ./pre-deploy-check.sh || warning "Pre-deployment check had issues"
    fi
    
    # Stop application
    info "🛑 Stopping application..."
    pm2 stop filmflex >/dev/null 2>&1 || pm2 stop all >/dev/null 2>&1 || true
    sleep 2
    
    # Create backup
    info "📦 Creating backup..."
    mkdir -p "$BACKUP_DIR"
    if [ -d "$DEPLOY_DIR/dist" ]; then
        cp -r "$DEPLOY_DIR/dist" "$BACKUP_DIR/dist-quick-$DATE" 2>/dev/null || true
        success "Backup created"
    fi
    
    # Navigate to source
    cd "$SOURCE_DIR" || { error "Source directory not found"; return 1; }
    
    # Ensure environment is correctly set
    info "🔧 Updating environment configuration..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=filmflex_dev_secret_2024
CLIENT_URL=http://38.54.14.154:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ENVEOF
    
    # Build application with multiple strategies
    info "🏗️ Building application..."
    if npm run build >/dev/null 2>&1; then
        success "Build completed"
    else
        warning "Standard build failed, trying alternatives..."
        
        # Install missing dependencies and retry
        npm install @vitejs/plugin-react --save-dev --silent >/dev/null 2>&1 || true
        
        if npm run build >/dev/null 2>&1; then
            success "Build completed after dependency fix"
        elif npx tsc -p tsconfig.server.json >/dev/null 2>&1; then
            success "TypeScript build completed"
        else
            warning "Using esbuild fallback..."
            npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist >/dev/null 2>&1 || {
                error "All build strategies failed"
                return 1
            }
            success "ESBuild fallback completed"
        fi
    fi
    
    # Sync to deployment directory
    info "📋 Syncing files..."
    rsync -av --exclude=node_modules --exclude=.git . "$DEPLOY_DIR/" >/dev/null 2>&1
    success "Files synced"
    
    # Install dependencies in deployment directory
    cd "$DEPLOY_DIR"
    info "📦 Installing dependencies..."
    npm install --production >/dev/null 2>&1 || npm install >/dev/null 2>&1 || true
    
    # Start application
    info "🚀 Starting application..."
    pm2 start ecosystem.config.cjs >/dev/null 2>&1 || pm2 start dist/index.js --name filmflex >/dev/null 2>&1
    sleep 5
    
    success "Quick deployment completed"
    check_status
}

# Full deployment function  
deploy_full() {
    log "🚀 Full Production Deployment Started"
    log "=================================="
    
    # Run the existing production deploy script
    if [ -f "$SOURCE_DIR/scripts/deployment/production-deploy.sh" ]; then
        info "Running comprehensive production deployment..."
        bash "$SOURCE_DIR/scripts/deployment/production-deploy.sh"
    else
        warning "Production deploy script not found, falling back to quick deploy"
        deploy_quick
    fi
}

# Fix CORS issues
fix_cors() {
    log "🔧 Fixing CORS Configuration"
    log "============================"
    
    # Stop application
    pm2 stop filmflex >/dev/null 2>&1 || true
    sleep 2
    
    cd "$DEPLOY_DIR" || return 1
    
    # Backup current file
    if [ -f "dist/index.js" ]; then
        cp dist/index.js "dist/index.js.backup.$DATE"
        info "Created backup of current build"
    fi
    
    # Apply CORS fix directly to built file using .cjs extension for CommonJS
    cat > cors-fix.cjs << 'EOF'
const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, 'dist', 'index.js');
if (fs.existsSync(distFile)) {
    let content = fs.readFileSync(distFile, 'utf8');
    
    // More comprehensive CORS fix patterns
    const corsPatterns = [
        /origin:\s*function\s*\([^}]+\}\s*\)/s,
        /origin:\s*\([^)]*\)\s*=>\s*\{[^}]*\}/s,
        /origin:\s*\([^)]*\)\s*=>\s*[^,}]*/s
    ];
    
    const simpleCorsFunction = `origin: function (origin, callback) {
        // Allow all origins for production deployment
        return callback(null, true);
    }`;
    
    let patternFound = false;
    for (const pattern of corsPatterns) {
        if (pattern.test(content)) {
            content = content.replace(pattern, simpleCorsFunction);
            patternFound = true;
            break;
        }
    }
    
    if (patternFound) {
        fs.writeFileSync(distFile, content);
        console.log('✅ CORS fixed successfully');
    } else {
        console.log('⚠️ CORS pattern not found, applying fallback fix');
        // Fallback: Add permissive CORS at the beginning of the file
        const fallbackCors = `// CORS Fallback Fix
if (typeof global !== 'undefined' && global.app) {
    global.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Range');
        res.header('Access-Control-Allow-Credentials', 'true');
        next();
    });
}
`;
        content = fallbackCors + content;
        fs.writeFileSync(distFile, content);
        console.log('✅ CORS fallback fix applied');
    }
} else {
    console.log('❌ Dist file not found');
}
EOF
    
    node cors-fix.cjs
    rm -f cors-fix.cjs
    
    # Restart
    pm2 start ecosystem.config.cjs >/dev/null 2>&1 || pm2 start dist/index.js --name filmflex >/dev/null 2>&1
    sleep 3
    
    success "CORS fix applied"
}

# Fix module/build errors
fix_errors() {
    log "🔧 Fixing Module and Build Errors"
    log "================================="
    
    cd "$SOURCE_DIR" || return 1
    
    # Check and install missing dependencies
    info "📦 Checking and installing missing dependencies..."
    
    # Install missing dependencies that were found in the logs
    npm install @vitejs/plugin-react --save-dev 2>/dev/null || true
    npm install @shared/schema 2>/dev/null || echo "⚠️ @shared/schema not available in npm, will handle with path mapping"
    
    # Update environment configuration
    info "🔧 Updating environment configuration..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=filmflex_dev_secret_2024
CLIENT_URL=http://38.54.14.154:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ENVEOF
    
    # Clean and rebuild
    info "🧹 Cleaning build artifacts..."
    rm -rf dist/ node_modules/.cache 2>/dev/null || true
    
    info "📦 Reinstalling all dependencies..."
    npm install >/dev/null 2>&1 || npm install --legacy-peer-deps >/dev/null 2>&1 || {
        warning "Standard npm install failed, trying alternative methods..."
        npm install --no-package-lock >/dev/null 2>&1 || true
    }
    
    # Try multiple build strategies
    info "🏗️ Building application with multiple strategies..."
    
    # Strategy 1: Standard build
    if npm run build >/dev/null 2>&1; then
        success "Standard build succeeded"
    else
        warning "Standard build failed, trying alternative builds..."
        
        # Strategy 2: Server-only build
        if npx tsc -p tsconfig.server.json >/dev/null 2>&1; then
            info "Server TypeScript compilation succeeded"
        else
            warning "TypeScript build failed, trying esbuild..."
            
            # Strategy 3: ESBuild fallback
            npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist >/dev/null 2>&1 || {
                error "All build strategies failed"
                return 1
            }
        fi
        
        # Build client separately if needed
        npm run build:client >/dev/null 2>&1 || npx vite build >/dev/null 2>&1 || true
    fi
    
    # Fix path mapping issues for @shared/schema
    info "🔧 Fixing module path mappings..."
    if [ -f "dist/index.js" ]; then
        # Replace @shared/schema imports with relative paths
        sed -i 's|@shared/schema|../shared/index.js|g' dist/index.js 2>/dev/null || true
        sed -i 's|from.*@shared/schema|from "../shared/index.js"|g' dist/index.js 2>/dev/null || true
    fi
    
    # Copy to deployment directory
    if [ -d "$DEPLOY_DIR" ]; then
        info "📁 Copying files to deployment directory..."
        cp -r . "$DEPLOY_DIR/" 2>/dev/null || true
    fi
    
    success "Module and build errors fixed"
}

# Fix all issues
fix_all() {
    log "🔧 Comprehensive Fix Process"
    log "==========================="
    
    fix_errors
    fix_cors
    check_status
}

# Restart application
restart_app() {
    log "🔄 Restarting PhimGG Application"
    log "================================="
    
    info "🛑 Stopping application..."
    pm2 stop filmflex >/dev/null 2>&1 || pm2 stop all >/dev/null 2>&1 || true
    sleep 3
    
    info "🚀 Starting application..."
    cd "$DEPLOY_DIR"
    pm2 start ecosystem.config.cjs >/dev/null 2>&1 || pm2 start dist/index.js --name filmflex >/dev/null 2>&1
    sleep 5
    
    success "Application restarted"
    check_status
}

# View logs
view_logs() {
    local lines=${1:-20}
    log "📋 Application Logs (last $lines lines)"
    log "======================================"
    
    pm2 logs filmflex --lines "$lines" --nostream 2>/dev/null || {
        warning "PM2 logs not available, checking log files..."
        tail -n "$lines" /var/log/filmflex/*.log 2>/dev/null || echo "No logs found"
    }
}

# Health check
health_check() {
    log "🏥 Comprehensive Health Check"
    log "============================"
    
    check_status
    
    info "🔍 Additional Diagnostics:"
    
    # Check for specific error patterns in logs
    info "🔍 Checking for known issues in logs..."
    if pm2 logs filmflex --lines 10 2>/dev/null | grep -q "Not allowed by CORS"; then
        warning "CORS errors detected in logs"
        info "💡 Run: ./filmflex-deploy.sh fix cors"
    fi
    
    if pm2 logs filmflex --lines 10 2>/dev/null | grep -q "Cannot find package.*@vitejs/plugin-react"; then
        warning "@vitejs/plugin-react missing from logs"
        info "💡 Run: ./filmflex-deploy.sh fix errors"
    fi
    
    if pm2 logs filmflex --lines 10 2>/dev/null | grep -q "Cannot find package.*@shared/schema"; then
        warning "@shared/schema import issues detected"
        info "💡 Run: ./filmflex-deploy.sh fix errors"
    fi
    
    # Check if client URL is correctly configured
    if grep -q "CLIENT_URL.*localhost" .env 2>/dev/null; then
        warning "Client URL still pointing to localhost"
        info "💡 Should be: CLIENT_URL=http://38.54.14.154:5000"
    fi
    
    # Check disk space
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        warning "Disk usage is high: ${disk_usage}%"
    else
        success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 90 ]; then
        warning "Memory usage is high: ${memory_usage}%"
    else
        success "Memory usage is normal: ${memory_usage}%"
    fi
    
    # Check Node.js version
    local node_version=$(node --version 2>/dev/null || echo "Not found")
    info "Node.js version: $node_version"
    
    # Check PM2 version
    local pm2_version=$(pm2 --version 2>/dev/null || echo "Not found")
    info "PM2 version: $pm2_version"
    
    # Check if dist directory exists and has content
    if [ -d "$DEPLOY_DIR/dist" ] && [ -f "$DEPLOY_DIR/dist/index.js" ]; then
        success "Build artifacts exist"
    else
        warning "Build artifacts missing or incomplete"
        info "💡 Run: ./filmflex-deploy.sh deploy full"
    fi
}

# Create backup
create_backup() {
    log "📦 Creating Backup"
    log "=================="
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="manual-backup-$DATE"
    
    if [ -d "$DEPLOY_DIR" ]; then
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$backup_name"
        success "Backup created: $BACKUP_DIR/$backup_name"
    else
        error "Deployment directory not found"
        return 1
    fi
}

# Cleanup old files
cleanup() {
    log "🧹 Cleaning Up Old Files"
    log "======================="
    
    # Keep last 5 backups
    info "Cleaning old backups..."
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "*backup*" | sort | head -n -5 | xargs rm -rf 2>/dev/null || true
    
    # Clean old logs (keep last 10)
    info "Cleaning old logs..."
    find "/var/log/filmflex" -name "*.log" -type f | sort | head -n -10 | xargs rm -f 2>/dev/null || true
    
    success "Cleanup completed"
}

# Upload files from Windows (via WSL/Git Bash)
upload_files() {
    log "📤 Upload Files from Windows to Ubuntu Server"
    log "============================================="
    
    # Check if we're in Windows environment
    if [[ -n "$WINDIR" || -n "$WSL_DISTRO_NAME" || $(uname -r | grep -i microsoft) ]]; then
        info "Windows/WSL environment detected"
        
        # Server configuration
        local SERVER="38.54.14.154"
        local USERNAME="root"
        local REMOTE_PATH="/root/Film_Flex_Release"
        local LOCAL_PATH="."
        
        # Check if scp is available
        if ! command -v scp >/dev/null 2>&1; then
            error "scp command not found. Please install OpenSSH or use WSL/Git Bash"
            return 1
        fi
        
        info "Uploading files to server..."
        
        # Upload main files
        local files_to_upload=(
            "server/index.ts"
            ".env"
            "package.json"
            "filmflex-deploy.sh"
        )
        
        for file in "${files_to_upload[@]}"; do
            if [ -f "$file" ]; then
                info "Uploading $file..."
                scp "$file" "$USERNAME@$SERVER:$REMOTE_PATH/$file" || warning "Failed to upload $file"
            else
                warning "File not found: $file"
            fi
        done
        
        # Make script executable on server
        info "Making deployment script executable on server..."
        ssh "$USERNAME@$SERVER" "chmod +x $REMOTE_PATH/filmflex-deploy.sh" || warning "Failed to set permissions"
        
        success "Upload completed"
        info "You can now run: ssh $USERNAME@$SERVER 'cd $REMOTE_PATH && ./filmflex-deploy.sh deploy'"
        
    else
        error "This upload function is for Windows/WSL environments only"
        info "On Ubuntu server, use the deploy commands directly"
        return 1
    fi
}

# Main execution
main() {
    local command=${1:-help}
    local option=${2:-}
    
    case $command in
        "status")
            check_status
            ;;
        "upload")
            upload_files
            ;;
        "deploy")
            case $option in
                "full")
                    deploy_full
                    ;;
                "quick"|"")
                    deploy_quick
                    ;;
                *)
                    error "Invalid deploy option. Use 'quick' or 'full'"
                    return 1
                    ;;
            esac
            ;;
        "fix")
            case $option in
                "cors")
                    fix_cors
                    ;;
                "errors")
                    fix_errors
                    ;;
                "all"|"")
                    fix_all
                    ;;
                *)
                    error "Invalid fix option. Use 'cors', 'errors', or 'all'"
                    return 1
                    ;;
            esac
            ;;
        "restart")
            restart_app
            ;;
        "logs")
            view_logs "$option"
            ;;
        "health")
            health_check
            ;;
        "backup")
            create_backup
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
