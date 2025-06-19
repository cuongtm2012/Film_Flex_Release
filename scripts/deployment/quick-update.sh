#!/bin/bash

# FilmFlex Quick Update Script
# Fast updates without full rebuild - for production servers
# Use this for quick code changes that don't require dependency updates

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SOURCE_DIR="${HOME}/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
success() { log "${GREEN}✓ $1${NC}"; }
info() { log "${BLUE}ℹ $1${NC}"; }
warning() { log "${YELLOW}⚠ $1${NC}"; }
error() { log "${RED}✗ $1${NC}"; }

info "Starting quick update..."

# Pull changes
cd "$SOURCE_DIR"
git pull origin main
success "Code updated"

# Copy only changed files
info "Syncing files..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=logs \
    "$SOURCE_DIR/" "$DEPLOY_DIR/"

# Quick build
cd "$DEPLOY_DIR"
info "Quick build..."
npm run build 2>/dev/null || npx tsc
success "Build completed"

# Restart app
info "Restarting application..."
pm2 restart filmflex
success "Application restarted"

# Quick health check
sleep 3
if curl -f -s http://localhost:5000/api/health > /dev/null; then
    success "🚀 Quick update completed!"
else
    warning "Update completed, health check pending..."
fi

info "Status: pm2 status"
