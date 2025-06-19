#!/bin/bash

# FilmFlex Production Health Check Script
# Quick health monitoring for production deployments
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
DEPLOY_DIR="/var/www/filmflex"
APP_URL="http://localhost:5000"

# Logging functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }

echo -e "${PURPLE}=========================================="
echo "    FilmFlex Production Health Check"
echo "    $(date '+%Y-%m-%d %H:%M:%S')"
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
elif curl -s --max-time 10 "$APP_URL/" | grep -q -E "(html|json|text|<!DOCTYPE)" 2>/dev/null; then
    success "Server responding with content"
else
    error "Application not responding properly"
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

success "Health check completed!"
echo -e "${BLUE}For detailed logs: pm2 logs filmflex${NC}"
echo -e "${BLUE}For process management: pm2 status${NC}"
