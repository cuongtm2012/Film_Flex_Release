#!/bin/bash

# FilmFlex Production Fix Script
# This script fixes the ES module issue on the production server

echo "🔧 Fixing FilmFlex ES Module Issue..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Navigate to application directory
cd /var/www/filmflex || { log_error "FilmFlex directory not found"; exit 1; }

log_info "Current directory: $(pwd)"

# Stop the application
log_info "Stopping FilmFlex application..."
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true

# Clean up old builds
log_info "Cleaning up old builds..."
rm -rf dist/
rm -rf node_modules/.cache/
npm cache clean --force

# Reinstall dependencies
log_info "Reinstalling dependencies..."
npm install

# Rebuild application with fixed configuration
log_info "Rebuilding application..."
npm run build

# Verify the build
if [ -f "dist/index.js" ]; then
    log_success "Build completed successfully"
    
    # Check if the built file is a proper ES module
    if head -20 dist/index.js | grep -q "var __defProp\|import\|export"; then
        log_success "Built file appears to be a proper ES module"
    else
        log_warning "Built file format may still have issues"
    fi
else
    log_error "Build failed - dist/index.js not found"
    exit 1
fi

# Test the application briefly
log_info "Testing application startup..."
timeout 10s node dist/index.js &
TEST_PID=$!
sleep 5

if kill -0 $TEST_PID 2>/dev/null; then
    log_success "Application starts without ES module errors"
    kill $TEST_PID
else
    log_error "Application still has startup issues"
    # Show recent logs for debugging
    log_info "Recent error logs:"
    tail -20 /var/log/filmflex/error.log 2>/dev/null || echo "No error logs found"
fi

# Restart with PM2
log_info "Starting FilmFlex with PM2..."
pm2 start ecosystem.config.js

# Wait a moment and check status
sleep 5
pm2 status

# Check application health
log_info "Checking application health..."
sleep 10

if curl -f http://localhost:5000/api/health &>/dev/null; then
    log_success "✅ FilmFlex is running successfully!"
    log_success "🌐 Application is available at: https://phimgg.com"
else
    log_error "❌ Application health check failed"
    log_info "PM2 logs:"
    pm2 logs filmflex --lines 20 --nostream
fi

echo ""
echo "========================================="
echo "        Fix Script Completed"
echo "========================================="
echo "🔧 To check logs: pm2 logs filmflex"
echo "🔄 To restart: pm2 restart filmflex"  
echo "📊 To check status: pm2 status"
echo "🧪 To test health: curl http://localhost:5000/api/health"
