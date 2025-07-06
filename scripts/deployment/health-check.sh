#!/bin/bash

# FilmFlex Production Health Check Script v2.0
# Enhanced health monitoring for phimgg.com production environment (154.205.142.255)
# Comprehensive checks for production deployment
# Version: 2.0 - Updated for phimgg.com production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration for phimgg.com production
DEPLOY_DIR="/var/www/filmflex"
APP_URL="http://localhost:5000"
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
PRODUCTION_URL="http://$PRODUCTION_IP:5000"

# Logging functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }

echo -e "${PURPLE}=========================================="
echo "  FilmFlex Production Health Check v2.0"
echo "  phimgg.com Production Environment"
echo "  Production IP: $PRODUCTION_IP"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "==========================================${NC}"
echo

# Check PM2 status
info "Checking PM2 process status..."
if pm2 list | grep filmflex | grep -q online; then
    success "PM2 process is online"
    pm2 list | grep filmflex
else
    error "PM2 process is not online"
    pm2 list | grep filmflex || echo "No filmflex process found"
fi
echo

# Check port availability
info "Checking port 5000..."
if netstat -tln | grep -q ":5000 "; then
    success "Port 5000 is listening"
else
    error "Port 5000 is not listening"
fi
echo

# Check application response
info "Testing application endpoints..."
if curl -f -s --max-time 10 "$APP_URL/" >/dev/null 2>&1; then
    success "Root endpoint responding"
elif curl -f -s --max-time 10 "$APP_URL/api/health" >/dev/null 2>&1; then
    success "Health API endpoint responding"
    HEALTH_RESPONSE=$(curl -s --max-time 10 "$APP_URL/api/health" 2>/dev/null | head -c 200)
    info "Health response: $HEALTH_RESPONSE"
elif curl -s --max-time 10 "$APP_URL/" | grep -q -E "(html|json|text|<!DOCTYPE)" 2>/dev/null; then
    success "Server responding with content"
else
    error "Application not responding properly"
fi
echo

# Check production IP accessibility
info "Testing production IP accessibility ($PRODUCTION_IP)..."
if command -v timeout >/dev/null 2>&1; then
    if timeout 10 curl -f -s "$PRODUCTION_URL/api/health" >/dev/null 2>&1; then
        success "Production IP accessible: $PRODUCTION_URL"
    elif timeout 10 curl -f -s "$PRODUCTION_URL/" >/dev/null 2>&1; then
        success "Production IP accessible (root): $PRODUCTION_URL"
    else
        warning "Production IP not accessible (may need firewall configuration)"
        info "This could be normal if firewall blocks external access"
    fi
else
    info "timeout command not available, skipping production IP test"
fi
echo

# Check CORS configuration
info "Testing CORS configuration for phimgg.com..."
if curl -f -s --max-time 10 "$APP_URL/api/health" >/dev/null 2>&1; then
    CORS_TEST=$(curl -s -I -H "Origin: https://phimgg.com" "$APP_URL/api/health" | grep -i "access-control-allow-origin" || echo "No CORS headers")
    if [[ "$CORS_TEST" == *"access-control-allow-origin"* ]]; then
        success "CORS headers configured: $CORS_TEST"
    else
        warning "CORS headers not detected or not configured"
        info "CORS test result: $CORS_TEST"
    fi
else
    warning "Cannot test CORS - application not responding"
fi
echo

# Check environment variables (production settings)
info "Checking production environment configuration..."
if pm2 show filmflex 2>/dev/null | grep -q "NODE_ENV.*production"; then
    success "NODE_ENV set to production"
else
    warning "NODE_ENV may not be set to production"
fi

if pm2 show filmflex 2>/dev/null | grep -q "DOMAIN.*phimgg.com"; then
    success "Domain configured for phimgg.com"
else
    warning "Domain may not be configured for phimgg.com"
fi
echo

# Check database connection (if psql is available)
if command -v psql &>/dev/null; then
    info "Checking database connection..."
    if pg_isready -h localhost -p 5432 &>/dev/null; then
        success "PostgreSQL is ready"
    else
        warning "PostgreSQL connection issues"
    fi
else
    info "PostgreSQL client not available for database check"
fi
echo

# Check disk space
info "Checking disk space..."
df -h / | tail -1 | while read filesystem size used avail percent mount; do
    if [[ ${percent%?} -gt 90 ]]; then
        error "Disk space critical: $percent used"
    elif [[ ${percent%?} -gt 80 ]]; then
        warning "Disk space high: $percent used"
    else
        success "Disk space OK: $percent used"
    fi
done
echo

# Check memory usage
info "Checking memory usage..."
if pm2 list | grep filmflex | grep -q online; then
    pm2 show filmflex | grep -E "(memory|cpu)" || true
fi
echo

# Show recent logs
info "Recent application logs (last 5 lines):"
pm2 logs filmflex --lines 5 --nostream 2>/dev/null || warning "Could not retrieve logs"
echo

# Check for errors in logs
info "Checking for recent errors..."
error_count=$(pm2 logs filmflex --lines 20 --nostream 2>/dev/null | grep -i error | wc -l || echo "0")
if [ "$error_count" -gt 0 ]; then
    warning "Found $error_count error entries in recent logs"
    pm2 logs filmflex --lines 10 --nostream 2>/dev/null | grep -i error | tail -3 || true
else
    success "No recent errors found in logs"
fi
echo

success "Health check completed for phimgg.com production!"
echo ""
echo -e "${GREEN}=========================================="
echo "📊 Production Health Summary"
echo "=========================================="
echo -e "${NC}"
info "🌐 Production URLs:"
info "  • Local: $APP_URL"
info "  • Production IP: $PRODUCTION_URL"
info "  • Domain: https://$PRODUCTION_DOMAIN (when DNS configured)"
echo ""
info "📋 Management Commands:"
info "  • Detailed logs: pm2 logs filmflex"
info "  • Process status: pm2 status"
info "  • Monitor: pm2 monit"
info "  • Restart: pm2 restart filmflex"
echo ""
info "🔧 Quick Actions:"
info "  • Restart server: cd $DEPLOY_DIR && ./restart.sh"
info "  • Check errors: pm2 logs filmflex --err"
info "  • Real-time logs: pm2 logs filmflex --follow"
