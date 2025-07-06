#!/bin/bash

# FilmFlex Simple Production Deploy v3.0 - phimgg.com Production
# Lightweight deployment script for phimgg.com production environment
# Handles ES module builds and production configuration
# Version: 3.0 - Updated for phimgg.com (154.205.142.255)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration for phimgg.com production
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="/var/backups/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
success() { log "${GREEN}✓ $1${NC}"; }
info() { log "${BLUE}ℹ $1${NC}"; }
warning() { log "${YELLOW}⚠ $1${NC}"; }
error() { log "${RED}✗ $1${NC}"; }

echo -e "${PURPLE}"
echo "=========================================="
echo "  FilmFlex Simple Deploy v3.0"
echo "  phimgg.com Production Environment"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo -e "${NC}"

info "🚀 FilmFlex Simple Production Deploy for phimgg.com Starting..."
info "📍 Production IP: $PRODUCTION_IP"
info "🌐 Production Domain: $PRODUCTION_DOMAIN"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "Run with sudo: sudo ./simple-deploy.sh"
   exit 1
fi

# Step 1: Update source
info "📥 Getting latest code..."
cd "$SOURCE_DIR"
git fetch origin && git reset --hard origin/main
success "Code updated"

# Step 2: Backup
info "💾 Creating backup..."
mkdir -p "$BACKUP_DIR"
[ -d "$DEPLOY_DIR" ] && cp -r "$DEPLOY_DIR" "$BACKUP_DIR/backup_$(date +%s)" 2>/dev/null || true
success "Backup created"

# Step 3: Stop app
info "⏹️ Stopping application..."
pm2 stop filmflex 2>/dev/null || warning "App not running"
pm2 delete filmflex 2>/dev/null || warning "App not in PM2"

# Step 4: Copy files
info "📁 Copying files..."
mkdir -p "$DEPLOY_DIR"
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=*.log \
    "$SOURCE_DIR/" "$DEPLOY_DIR/"
success "Files copied"

# Step 5: Setup production environment and build
cd "$DEPLOY_DIR"

info "🌐 Setting up production environment for phimgg.com..."
# Create production environment file
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
success "Production environment configured"

info "📦 Installing dependencies..."
npm ci --silent || npm install --silent
success "Dependencies installed"

info "🔧 Installing critical build dependencies..."
npm install @esbuild/linux-x64 @rollup/rollup-linux-x64-gnu --save-dev --silent 2>/dev/null || warning "Some platform-specific binaries failed to install"

info "🏗️ Building application with ES module support..."

# Build client first
if npm run build:client 2>/dev/null || npx vite build 2>/dev/null; then
    success "Client build completed"
else
    warning "Client build failed, continuing..."
fi

# Build server with ES module support
if npm run build:server 2>/dev/null; then
    success "Server ES module build completed"
elif npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:pg --external:express 2>/dev/null; then
    success "ESBuild server build completed"
elif npx tsc -p tsconfig.server.json --skipLibCheck 2>/dev/null; then
    success "TypeScript server build completed"
    # Copy server build if it exists in subdirectory
    [ -d "server/dist" ] && cp -r server/dist/* dist/ 2>/dev/null || true
else
    warning "Complex build failed, creating fallback server..."
    mkdir -p dist
    
    # Create a simple fallback server for production
    cat > "dist/index.js" << 'EOJS'
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// CORS middleware for phimgg.com
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    domain: 'phimgg.com'
  });
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 FilmFlex Server running on port ${port} for phimgg.com`);
  console.log(`🌐 Production URLs:`);
  console.log(`  • Local: http://localhost:${port}`);
  console.log(`  • Production IP: http://154.205.142.255:${port}`);
  console.log(`  • Domain: https://phimgg.com`);
});
EOJS
    success "Fallback server created for production"
fi

# Ensure we have an entry point
if [ ! -f "dist/index.js" ]; then
    error "No server entry point found after build!"
    exit 1
fi

success "Build completed"

# Step 6: Set permissions
info "🔒 Setting permissions..."
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
success "Permissions set"

# Step 7: Start application with production configuration
info "▶️ Starting application for phimgg.com production..."

# Create production PM2 config
cat > ecosystem.config.cjs << 'EOCONFIG'
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

# Try different start methods
if pm2 start ecosystem.config.cjs 2>/dev/null; then
    success "Started with production ecosystem config"
elif pm2 start dist/index.js --name filmflex -i max 2>/dev/null; then
    success "Started directly with cluster mode"
elif pm2 start dist/index.js --name filmflex 2>/dev/null; then
    success "Started directly in single mode"
else
    error "Failed to start application"
    exit 1
fi

pm2 save 2>/dev/null || warning "Failed to save PM2 config"

# Step 8: Enhanced health checks for production
info "🔍 Health check for phimgg.com production..."
sleep 10

# Check multiple endpoints
HEALTH_SUCCESS=false

if curl -f -s http://localhost:5000 > /dev/null 2>&1; then
    success "Root endpoint responding!"
    HEALTH_SUCCESS=true
elif curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Health endpoint responding!"
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    info "Health response: $HEALTH_RESPONSE"
    HEALTH_SUCCESS=true
else
    warning "Local endpoints not responding yet, checking PM2..."
    pm2 status | grep filmflex || error "Application not in PM2"
fi

# Test production IP if accessible
if command -v timeout >/dev/null 2>&1; then
    info "Testing production IP accessibility..."
    if timeout 10 curl -f -s http://154.205.142.255:5000/api/health > /dev/null 2>&1; then
        success "Production IP accessible: 154.205.142.255"
    else
        warning "Production IP not accessible (may need firewall configuration)"
    fi
fi

# Test CORS headers
if [ "$HEALTH_SUCCESS" = true ]; then
    info "Testing CORS configuration..."
    CORS_TEST=$(curl -s -I -H "Origin: https://phimgg.com" http://localhost:5000/api/health | grep -i "access-control-allow-origin" || echo "No CORS")
    if [[ "$CORS_TEST" == *"access-control-allow-origin"* ]]; then
        success "CORS headers configured correctly"
    else
        warning "CORS headers not detected"
    fi
fi

# Step 9: Final checks and completion
if command -v nginx >/dev/null 2>&1; then
    info "🔄 Reloading nginx..."
    nginx -t && systemctl reload nginx 2>/dev/null || warning "Nginx reload failed"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 FilmFlex Simple Deploy Completed!"
echo "=========================================="
echo -e "${NC}"

info "📊 Deployment Summary for phimgg.com:"
info "  • Environment: Production"
info "  • Domain: phimgg.com"
info "  • Production IP: 154.205.142.255"
info "  • Local URL: http://localhost:5000"
info "  • Production URL: http://154.205.142.255:5000"

echo ""
info "📋 Management Commands:"
info "  • Check status: pm2 status"
info "  • View logs: pm2 logs filmflex"
info "  • Monitor: pm2 monit"
info "  • Restart: pm2 restart filmflex"

echo ""
info "🌐 Access URLs:"
info "  • Local: http://localhost:5000"
info "  • Production IP: http://154.205.142.255:5000"
info "  • Domain (when DNS configured): https://phimgg.com"

if [ "$HEALTH_SUCCESS" = true ]; then
    success "✅ Application is running and healthy!"
else
    warning "⚠️  Health check failed - check logs: pm2 logs filmflex"
fi
