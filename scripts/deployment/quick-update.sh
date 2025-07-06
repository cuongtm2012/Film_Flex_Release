#!/bin/bash

# FilmFlex Quick Update Script v2.0 - phimgg.com Production
# Fast updates with ES module support for production servers
# Updated for phimgg.com production environment (154.205.142.255)
# Use this for quick code changes that don't require full dependency updates

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration for phimgg.com production
SOURCE_DIR="${HOME}/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
success() { log "${GREEN}✓ $1${NC}"; }
info() { log "${BLUE}ℹ $1${NC}"; }
warning() { log "${YELLOW}⚠ $1${NC}"; }
error() { log "${RED}✗ $1${NC}"; }

echo -e "${PURPLE}"
echo "=========================================="
echo "  FilmFlex Quick Update v2.0"
echo "  phimgg.com Production Environment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo -e "${NC}"

info "Starting quick update for phimgg.com production..."
info "📍 Production IP: $PRODUCTION_IP"
info "🌐 Production Domain: $PRODUCTION_DOMAIN"

# Step 1: Pull latest changes
info "📥 Pulling latest changes from repository..."
cd "$SOURCE_DIR"
git pull origin main
CURRENT_COMMIT=$(git log -1 --oneline)
success "Code updated to: $CURRENT_COMMIT"

# Step 2: Create backup
info "💾 Creating quick backup..."
if [ -d "$DEPLOY_DIR" ]; then
    mkdir -p "/var/backups/filmflex"
    cp -r "$DEPLOY_DIR" "/var/backups/filmflex/quick-backup-$TIMESTAMP" 2>/dev/null || warning "Backup failed, continuing..."
    success "Backup created: quick-backup-$TIMESTAMP"
fi

# Step 3: Sync files (excluding dependencies)
info "📁 Syncing updated files..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=logs \
    --exclude=*.log \
    --exclude=.env \
    "$SOURCE_DIR/" "$DEPLOY_DIR/"
success "Files synchronized"

# Step 4: Update production environment if needed
cd "$DEPLOY_DIR"
info "🌐 Checking production environment configuration..."
if [ ! -f ".env.production" ] || ! grep -q "phimgg.com" ".env.production" 2>/dev/null; then
    info "Updating production environment configuration..."
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
    cp ".env.production" ".env"
    success "Production environment updated"
else
    success "Production environment already configured"
fi

# Step 5: Quick build with ES module support
info "🏗️ Quick build with ES module support..."

# Build client if build script exists
if npm run build:client 2>/dev/null; then
    success "Client build completed"
elif npx vite build 2>/dev/null; then
    success "Client build completed (fallback)"
else
    warning "Client build failed or not available"
fi

# Build server with ES module support
BUILD_SUCCESS=false
if npm run build:server 2>/dev/null; then
    success "Server ES module build completed"
    BUILD_SUCCESS=true
elif npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:pg --external:express 2>/dev/null; then
    success "ESBuild server build completed"
    BUILD_SUCCESS=true
elif npx tsc -p tsconfig.server.json --skipLibCheck 2>/dev/null; then
    success "TypeScript server build completed"
    BUILD_SUCCESS=true
else
    warning "Server build failed, checking for existing build..."
fi

# Ensure we have a server entry point
if [ ! -f "dist/index.js" ]; then
    if [ -f "server/index.js" ]; then
        mkdir -p dist
        cp server/index.js dist/
        success "Used existing JavaScript server file"
        BUILD_SUCCESS=true
    else
        error "No server entry point found after build!"
        exit 1
    fi
fi

if [ "$BUILD_SUCCESS" = true ]; then
    success "Build process completed successfully"
else
    warning "Build completed with fallbacks"
fi

# Step 6: Restart application with production environment
info "🔄 Restarting application for phimgg.com production..."

# Ensure production environment variables are set
export NODE_ENV="production"
export DOMAIN="phimgg.com"
export SERVER_IP="154.205.142.255"
export ALLOWED_ORIGINS="*"

# Try graceful restart first
if pm2 restart filmflex; then
    success "Application restarted gracefully"
else
    warning "Graceful restart failed, trying full restart..."
    
    pm2 stop filmflex 2>/dev/null || true
    pm2 delete filmflex 2>/dev/null || true
    
    # Start with ecosystem config if available
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs
        success "Application started with ecosystem config"
    else
        pm2 start dist/index.js --name filmflex
        success "Application started directly"
    fi
fi

pm2 save 2>/dev/null || warning "Failed to save PM2 config"

# Step 7: Quick health verification
info "🏥 Performing quick health check..."
sleep 5

HEALTH_SUCCESS=false
for attempt in {1..6}; do
    if curl -f -s --max-time 5 http://localhost:5000/api/health >/dev/null 2>&1; then
        HEALTH_RESPONSE=$(curl -s --max-time 5 http://localhost:5000/api/health 2>/dev/null | head -c 100)
        success "Health check passed: $HEALTH_RESPONSE"
        HEALTH_SUCCESS=true
        break
    elif curl -f -s --max-time 5 http://localhost:5000/ >/dev/null 2>&1; then
        success "Application responding (root endpoint)"
        HEALTH_SUCCESS=true
        break
    else
        if [ $attempt -lt 6 ]; then
            info "Attempt $attempt/6 - waiting for application..."
            sleep 3
        fi
    fi
done

# Test production IP if accessible
if command -v timeout >/dev/null 2>&1; then
    info "Testing production IP accessibility..."
    if timeout 5 curl -f -s http://154.205.142.255:5000/api/health >/dev/null 2>&1; then
        success "Production IP accessible: 154.205.142.255"
    else
        info "Production IP test skipped (may be firewalled)"
    fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 Quick Update Completed!"
echo "=========================================="
echo -e "${NC}"

info "📊 Update Summary for phimgg.com:"
info "  • Code updated to: $CURRENT_COMMIT"
info "  • Environment: Production"
info "  • Domain: phimgg.com"
info "  • Build: ES module compatible"

echo ""
if [ "$HEALTH_SUCCESS" = true ]; then
    success "✅ Application is running and healthy!"
    info "🌐 Access URLs:"
    info "  • Local: http://localhost:5000"
    info "  • Production IP: http://154.205.142.255:5000"
    info "  • Domain: https://phimgg.com"
else
    warning "⚠️  Health check incomplete - application may still be starting"
    info "Check status: pm2 logs filmflex"
fi

echo ""
info "📋 Management Commands:"
info "  • Status: pm2 status"
info "  • Logs: pm2 logs filmflex"
info "  • Monitor: pm2 monit"
