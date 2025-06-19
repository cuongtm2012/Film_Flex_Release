#!/bin/bash

# FilmFlex Troubleshooting Script
# Diagnoses current deployment issues

set +e  # Don't exit on errors

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
success() { log "${GREEN}✓ $1${NC}"; }
info() { log "${BLUE}ℹ $1${NC}"; }
warning() { log "${YELLOW}⚠ $1${NC}"; }
error() { log "${RED}✗ $1${NC}"; }

echo "🔍 FilmFlex Deployment Troubleshooting"
echo "======================================"

# Check PM2 status
info "Checking PM2 status..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 status
    echo ""
    
    info "Recent PM2 logs..."
    pm2 logs filmflex --lines 20 2>/dev/null || warning "No PM2 logs available"
    echo ""
else
    error "PM2 not installed"
fi

# Check application files
DEPLOY_DIR="/var/www/filmflex"
SOURCE_DIR="${HOME}/Film_Flex_Release"

info "Checking deployment directory: $DEPLOY_DIR"
if [ -d "$DEPLOY_DIR" ]; then
    success "Deployment directory exists"
    
    if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
        success "Server entry point exists"
    else
        error "Server entry point missing: $DEPLOY_DIR/dist/index.js"
        
        info "Available files in dist:"
        ls -la "$DEPLOY_DIR/dist/" 2>/dev/null || warning "No dist directory"
    fi
    
    if [ -f "$DEPLOY_DIR/ecosystem.config.cjs" ]; then
        success "PM2 config file exists (.cjs)"
    elif [ -f "$DEPLOY_DIR/ecosystem.config.js" ]; then
        warning "Using .js PM2 config (may cause ES module issues)"
    else
        error "No PM2 config file found"
    fi
    
    if [ -f "$DEPLOY_DIR/package.json" ]; then
        success "package.json exists"
        
        # Check if it's ESM
        if grep -q '"type": "module"' "$DEPLOY_DIR/package.json"; then
            info "Project is configured as ES module"
        else
            info "Project is using CommonJS"
        fi
    else
        error "package.json missing"
    fi
    
else
    error "Deployment directory not found: $DEPLOY_DIR"
fi

# Check source directory
info "Checking source directory: $SOURCE_DIR"
if [ -d "$SOURCE_DIR" ]; then
    success "Source directory exists"
    
    cd "$SOURCE_DIR"
    
    # Check TypeScript config
    if [ -f "tsconfig.server.json" ]; then
        success "Server TypeScript config exists"
    else
        warning "Server TypeScript config missing"
    fi
    
    # Check build dependencies
    info "Checking build dependencies..."
    
    if npm list typescript >/dev/null 2>&1; then
        success "TypeScript available"
    else
        warning "TypeScript not installed"
    fi
    
    if npm list @types/express >/dev/null 2>&1; then
        success "@types/express available"
    else
        warning "@types/express missing"
    fi
    
    if npm list @types/passport >/dev/null 2>&1; then
        success "@types/passport available"
    else
        warning "@types/passport missing"
    fi
    
else
    error "Source directory not found: $SOURCE_DIR"
fi

# Check network connectivity
info "Checking application connectivity..."

if curl -f -s --max-time 5 http://localhost:5000/api/health >/dev/null 2>&1; then
    success "Health endpoint responding"
else
    warning "Health endpoint not responding"
fi

if curl -f -s --max-time 5 http://localhost:5000 >/dev/null 2>&1; then
    success "Main application responding"
else
    warning "Main application not responding"
fi

# Check system resources
info "Checking system resources..."

# Memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -lt 80 ]; then
    success "Memory usage: ${MEM_USAGE}% (OK)"
else
    warning "Memory usage: ${MEM_USAGE}% (High)"
fi

# Disk usage
DISK_USAGE=$(df /var | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    success "Disk usage: ${DISK_USAGE}% (OK)"
else
    warning "Disk usage: ${DISK_USAGE}% (High)"
fi

# Port usage
info "Checking port 5000..."
if lsof -i :5000 >/dev/null 2>&1; then
    success "Port 5000 is in use"
    lsof -i :5000
else
    warning "Port 5000 is not in use"
fi

echo ""
echo "🔧 Recommended Actions:"
echo "======================"

if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    echo "1. Run build script: cd ~/Film_Flex_Release && npm run build"
fi

if ! pm2 info filmflex | grep -q "online" 2>/dev/null; then
    echo "2. Restart PM2: sudo pm2 restart filmflex"
fi

if [ ! -f "$DEPLOY_DIR/ecosystem.config.cjs" ]; then
    echo "3. Copy ecosystem config: cp ~/Film_Flex_Release/ecosystem.config.cjs /var/www/filmflex/"
fi

echo "4. Run fix script: ./fix-production.sh"
echo ""
