#!/bin/bash

# FilmFlex Fresh Instance Deployment Manager
# Version: 2.0 - Fresh Instance Setup + Deployment
# Updated for new VPS: 38.54.14.154
# Date: July 5, 2025
#
# Usage:
#   ./filmflex-fresh-deploy.sh setup              # Initial server setup (run first)
#   ./filmflex-fresh-deploy.sh deploy [quick|full] # Deploy application  
#   ./filmflex-fresh-deploy.sh fix [cors|errors|all] # Fix specific issues
#   ./filmflex-fresh-deploy.sh status             # Check current status
#   ./filmflex-fresh-deploy.sh restart            # Restart application
#   ./filmflex-fresh-deploy.sh logs [lines]       # View application logs

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration for new instance
SERVER_IP="38.54.14.154"
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="/var/backups/filmflex"
DATE=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/filmflex/production-deploy-$DATE.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" "/var/log/filmflex"

# Logging functions
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

success() { log "${GREEN}✅ $1${NC}"; }
warning() { log "${YELLOW}⚠️ $1${NC}"; }
error() { log "${RED}❌ $1${NC}"; }
info() { log "${BLUE}ℹ Log: $LOG_FILE${NC}"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Initial server setup for fresh Ubuntu 22.04 instance
setup_server() {
    log "🚀 Setting up fresh Ubuntu 22.04 server for FilmFlex"
    log "======================================================"
    
    info "📋 Server Information:"
    info "IP: $SERVER_IP"
    info "OS: Ubuntu 22.04"
    info "Location: Ho Chi Minh, Vietnam"
    
    # Update system packages
    log "📦 Updating system packages..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq >/dev/null 2>&1
    apt-get upgrade -y -qq >/dev/null 2>&1
    success "System packages updated"
    
    # Install essential tools
    log "🔧 Installing essential tools..."
    apt-get install -y -qq curl wget git unzip software-properties-common \
        build-essential ssl-cert ca-certificates gnupg lsb-release \
        ufw fail2ban htop nano vim net-tools >/dev/null 2>&1
    success "Essential tools installed"
    
    # Install Node.js 18 LTS (stable for production)
    log "📱 Installing Node.js 18 LTS..."
    if ! command_exists node; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >/dev/null 2>&1
        apt-get install -y nodejs >/dev/null 2>&1
        success "Node.js $(node --version) installed"
    else
        success "Node.js $(node --version) already installed"
    fi
    
    # Install PM2 globally
    log "⚙️ Installing PM2 process manager..."
    if ! command_exists pm2; then
        npm install -g pm2 >/dev/null 2>&1
        pm2 startup >/dev/null 2>&1 || true
        success "PM2 installed and configured"
    else
        success "PM2 already installed"
    fi
    
    # Install PostgreSQL
    log "🗄️ Installing PostgreSQL..."
    if ! command_exists psql; then
        apt-get install -y postgresql postgresql-contrib >/dev/null 2>&1
        systemctl start postgresql
        systemctl enable postgresql
        success "PostgreSQL installed and started"
        
        # Configure PostgreSQL for FilmFlex
        log "🔧 Configuring PostgreSQL for FilmFlex..."
        sudo -u postgres psql -c "CREATE USER filmflex WITH PASSWORD 'filmflex2024';" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE DATABASE filmflex OWNER filmflex;" 2>/dev/null || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;" 2>/dev/null || true
        success "PostgreSQL configured for FilmFlex"
    else
        success "PostgreSQL already installed"
    fi
    
    # Install Nginx
    log "🌐 Installing Nginx..."
    if ! command_exists nginx; then
        apt-get install -y nginx >/dev/null 2>&1
        systemctl start nginx
        systemctl enable nginx
        success "Nginx installed and started"
    else
        success "Nginx already installed"
    fi
    
    # Configure firewall
    log "🔒 Configuring firewall..."
    ufw --force enable >/dev/null 2>&1
    ufw allow ssh >/dev/null 2>&1
    ufw allow 80 >/dev/null 2>&1
    ufw allow 443 >/dev/null 2>&1
    ufw allow 5000 >/dev/null 2>&1
    success "Firewall configured"
    
    # Create application directories
    log "📁 Creating application directories..."
    mkdir -p "$DEPLOY_DIR" "$BACKUP_DIR" "/var/log/filmflex"
    chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null || true
    success "Application directories created"
    
    # Create nginx configuration for FilmFlex
    log "⚙️ Configuring Nginx for FilmFlex..."
    cat > /etc/nginx/sites-available/filmflex << 'EOF'
server {
    listen 80;
    server_name 38.54.14.154;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF
    
    # Enable nginx site
    ln -sf /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/ 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    nginx -t >/dev/null 2>&1 && systemctl reload nginx
    success "Nginx configured for FilmFlex"
    
    success "🎉 Server setup completed successfully!"
    log ""
    log "📋 Setup Summary:"
    log "  ✅ Node.js: $(node --version)"
    log "  ✅ npm: $(npm --version)"
    log "  ✅ PM2: $(pm2 --version)"
    log "  ✅ PostgreSQL: Running"
    log "  ✅ Nginx: Running"
    log "  ✅ Firewall: Configured"
    log ""
    log "🚀 Ready for application deployment!"
    log "Next step: ./filmflex-fresh-deploy.sh deploy"
}

# Pre-flight checks
preflight_checks() {
    log "🔍 Running comprehensive pre-flight checks..."
    
    local checks_passed=0
    local total_checks=6
    
    # Check Node.js
    if command_exists node; then
        success "Node.js: $(node --version)"
        ((checks_passed++))
    else
        error "Required command not found: node"
        warning "Run: ./filmflex-fresh-deploy.sh setup"
        return 1
    fi
    
    # Check npm
    if command_exists npm; then
        success "npm: $(npm --version)"
        ((checks_passed++))
    else
        error "Required command not found: npm"
        warning "Run: ./filmflex-fresh-deploy.sh setup"
        return 1
    fi
    
    # Check PM2
    if command_exists pm2; then
        success "PM2: $(pm2 --version)"
        ((checks_passed++))
    else
        error "Required command not found: pm2"
        warning "Run: npm install -g pm2"
        return 1
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        success "PostgreSQL: Available"
        ((checks_passed++))
    else
        warning "PostgreSQL not found (will install during setup)"
    fi
    
    # Check Nginx
    if command_exists nginx; then
        success "Nginx: Available"
        ((checks_passed++))
    else
        warning "Nginx not found (will install during setup)"
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        success "Disk space: ${disk_usage}% used"
        ((checks_passed++))
    else
        warning "Disk space: ${disk_usage}% used (consider cleanup)"
    fi
    
    success "Pre-flight checks: $checks_passed/$total_checks passed"
    return 0
}

# Deploy application
deploy_application() {
    local deploy_type="${1:-quick}"
    
    log "🚀 Starting FilmFlex deployment ($deploy_type)"
    log "============================================="
    
    # Run pre-flight checks
    preflight_checks || return 1
    
    cd "$SOURCE_DIR" || {
        error "Source directory not found: $SOURCE_DIR"
        return 1
    }
    
    # Create production environment file
    log "📝 Creating production environment configuration..."
    cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=filmflex_production_secret_$(date +%s)
CLIENT_URL=http://$SERVER_IP:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
    success "Environment configuration created"
    
    # Stop existing application
    log "🛑 Stopping existing application..."
    pm2 stop filmflex >/dev/null 2>&1 || true
    pm2 delete filmflex >/dev/null 2>&1 || true
    success "Application stopped"
    
    # Create backup
    if [ "$deploy_type" = "full" ] && [ -d "$DEPLOY_DIR" ]; then
        log "💾 Creating backup..."
        local backup_name="filmflex-backup-$DATE"
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$backup_name" 2>/dev/null || true
        success "Backup created: $backup_name"
    fi
    
    # Clean install dependencies
    log "📦 Installing dependencies..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install --production --no-optional --legacy-peer-deps >/dev/null 2>&1
    success "Dependencies installed"
    
    # Build application
    log "🏗️ Building application..."
    
    # Clean previous build
    rm -rf dist 2>/dev/null || true
    
    # Install tsc-alias if not present (resolves path mappings)
    npm install tsc-alias --save-dev --silent 2>/dev/null || true
    
    # Build server with TypeScript and resolve path mappings
    if npx tsc -p tsconfig.server.json && npx tsc-alias -p tsconfig.server.json >/dev/null 2>&1; then
        success "Server build completed with path mapping resolution"
    elif npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --resolve-extensions=.ts,.js >/dev/null 2>&1; then
        success "Server build completed with esbuild bundling"
    elif npm run build >/dev/null 2>&1; then
        success "Standard build completed"
    else
        error "All build methods failed"
        return 1
    fi
    
    # Verify build output
    if [ -f "dist/server/index.js" ]; then
        success "Build succeeded - server file found at dist/server/index.js"
    elif [ -f "dist/index.js" ]; then
        success "Build succeeded - server file found at dist/index.js"
    else
        error "Build failed - no server file found in dist/"
        ls -la dist/ 2>/dev/null || echo "dist directory doesn't exist"
        return 1
    fi
    
    # Copy to deployment directory
    log "📁 Deploying to production directory..."
    
    # Ensure deployment directory exists
    mkdir -p "$DEPLOY_DIR"
    
    # Copy built application files
    if [ -d "dist" ]; then
        cp -r dist "$DEPLOY_DIR/"
        success "Built files copied"
    else
        error "dist directory not found! Build may have failed."
        return 1
    fi
    
    # Copy essential files
    cp package.json "$DEPLOY_DIR/" 2>/dev/null || error "package.json not found"
    cp ecosystem.config.js "$DEPLOY_DIR/" 2>/dev/null || cp ecosystem.config.cjs "$DEPLOY_DIR/ecosystem.config.js" 2>/dev/null || warning "ecosystem config not found"
    cp .env "$DEPLOY_DIR/" 2>/dev/null || warning ".env not found"
    
    # Copy other necessary directories if they exist
    [ -d "public" ] && cp -r public "$DEPLOY_DIR/" || true
    [ -d "migrations" ] && cp -r migrations "$DEPLOY_DIR/" || true
    [ -d "shared" ] && cp -r shared "$DEPLOY_DIR/" || true
    
    # Install production dependencies
    cd "$DEPLOY_DIR"
    npm install --production --no-optional --legacy-peer-deps >/dev/null 2>&1
    
    # Set proper ownership
    chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null || true
    
    success "Application deployed"
    
    # Create production server wrapper
    log "⚙️ Creating production server configuration..."
    cat > "$DEPLOY_DIR/production-start.cjs" << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting FilmFlex Production Server...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

// Check if dist/server/index.js exists (correct path after TypeScript build)
const serverPath = path.join(__dirname, 'dist', 'server', 'index.js');
const fs = require('fs');

if (!fs.existsSync(serverPath)) {
    console.error('❌ Server file not found:', serverPath);
    
    // Try alternative paths
    const altPath = path.join(__dirname, 'dist', 'index.js');
    if (fs.existsSync(altPath)) {
        console.log('📍 Found server at alternative path:', altPath);
        console.log('📍 Server path:', altPath);
        
        // Start with alternative path
        const server = spawn('node', [altPath], {
            stdio: 'inherit',
            env: process.env,
            cwd: __dirname
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
        server.on('exit', (code) => {
            console.log(`🛑 Server exited with code ${code}`);
            if (code !== 0) {
                console.error('❌ Server crashed, exiting...');
            }
            process.exit(code);
        });
        
        return;
    }
    
    console.error('Available files in dist:', fs.readdirSync(path.join(__dirname, 'dist')).join(', '));
    if (fs.existsSync(path.join(__dirname, 'dist', 'server'))) {
        console.error('Available files in dist/server:', fs.readdirSync(path.join(__dirname, 'dist', 'server')).join(', '));
    }
    process.exit(1);
}

console.log('📍 Server path:', serverPath);

// Start the application
const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: __dirname
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    console.log(`🛑 Server exited with code ${code}`);
    if (code !== 0) {
        console.error('❌ Server crashed, exiting...');
    }
    process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    server.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down...');
    server.kill('SIGINT');
});
EOF
    
    # Start application with PM2
    log "🚀 Starting application with PM2..."
    cd "$DEPLOY_DIR"
    pm2 start production-start.cjs --name filmflex --env production >/dev/null 2>&1
    pm2 save >/dev/null 2>&1
    sleep 5
    
    # Verify deployment
    log "✅ Verifying deployment..."
    if pm2 list | grep filmflex | grep -q online; then
        success "PM2: FilmFlex is online"
    else
        error "PM2: FilmFlex failed to start"
        pm2 logs filmflex --lines 10
        return 1
    fi
    
    # Check if port is listening
    if netstat -tlnp 2>/dev/null | grep -q ":5000 " || ss -tlnp 2>/dev/null | grep -q ":5000 "; then
        success "Port 5000: Listening"
    else
        warning "Port 5000: Not listening (may still be starting)"
    fi
    
    # Test HTTP endpoint
    sleep 3
    if curl -s -I http://localhost:5000 >/dev/null 2>&1; then
        success "HTTP: Application responding"
    else
        warning "HTTP: Application not responding yet"
    fi
    
    success "🎉 FilmFlex deployment completed!"
    log ""
    log "📋 Deployment Summary:"
    log "  🌐 URL: http://$SERVER_IP"
    log "  🔍 Health: http://$SERVER_IP/api/health"
    log "  📊 PM2: pm2 logs filmflex"
    log "  🔧 Logs: $LOG_FILE"
    log ""
    log "🚀 FilmFlex is now running on http://$SERVER_IP"
}

# Application status check
check_status() {
    log "🔍 FilmFlex Application Status Check"
    log "===================================="
    
    # PM2 Status
    info "📊 PM2 Process Status:"
    if pm2 list 2>/dev/null | grep filmflex | grep -q online; then
        success "FilmFlex is running in PM2"
    else
        warning "FilmFlex process not found or not online"
        pm2 list 2>/dev/null || echo "PM2 not available"
    fi
    
    # Port Status
    info "🔌 Port 5000 Status:"
    if netstat -tlnp 2>/dev/null | grep -q ":5000 " || ss -tlnp 2>/dev/null | grep -q ":5000 "; then
        success "Port 5000 is listening"
    else
        warning "Port 5000 is not listening"
    fi
    
    # HTTP Status
    info "🌐 HTTP Endpoint Status:"
    if curl -s -I http://localhost:5000 >/dev/null 2>&1; then
        success "Application is responding to HTTP requests"
    else
        warning "Application is not responding to HTTP requests"
    fi
    
    # Nginx Status
    info "🌍 Nginx Status:"
    if systemctl is-active nginx >/dev/null 2>&1; then
        success "Nginx is running"
    else
        warning "Nginx is not running"
    fi
    
    log ""
    log "📊 Status Summary:"
    log "=================="
    pm2_status=$(pm2 list 2>/dev/null | grep filmflex | grep -q online && echo "ONLINE" || echo "OFFLINE")
    port_status=$(netstat -tlnp 2>/dev/null | grep -q ":5000 " && echo "LISTENING" || echo "NOT_LISTENING")
    http_status=$(curl -s -I http://localhost:5000 >/dev/null 2>&1 && echo "RESPONDING" || echo "NOT_RESPONDING")
    
    log "PM2 Status: $pm2_status"
    log "Port Status: $port_status"
    log "HTTP Status: $http_status"
    log ""
    
    if [ "$pm2_status" = "ONLINE" ] && [ "$port_status" = "LISTENING" ] && [ "$http_status" = "RESPONDING" ]; then
        success "🎉 All systems operational!"
    else
        warning "⚠️ Application has issues - see details above"
        log ""
        log "💡 Try: ./filmflex-fresh-deploy.sh fix all"
    fi
}

# Show application logs
show_logs() {
    local lines="${1:-20}"
    log "📄 FilmFlex Application Logs (last $lines lines)"
    log "============================================="
    
    if command_exists pm2; then
        pm2 logs filmflex --lines "$lines" 2>/dev/null || echo "No PM2 logs available"
    else
        echo "PM2 not available"
    fi
}

# Restart application
restart_application() {
    log "🔄 Restarting FilmFlex Application"
    log "================================="
    
    pm2 restart filmflex >/dev/null 2>&1 || {
        warning "PM2 restart failed, trying fresh start..."
        cd "$DEPLOY_DIR" || cd "$SOURCE_DIR"
        pm2 stop filmflex >/dev/null 2>&1 || true
        pm2 delete filmflex >/dev/null 2>&1 || true
        pm2 start "$DEPLOY_DIR/production-start.cjs" --name filmflex --env production >/dev/null 2>&1
    }
    
    sleep 3
    success "Application restarted"
    check_status
}

# Fix common issues
fix_issues() {
    local fix_type="${1:-all}"
    
    log "🔧 Fixing FilmFlex Issues ($fix_type)"
    log "===================================="
    
    case "$fix_type" in
        "cors"|"all")
            log "🌐 Fixing CORS configuration..."
            cd "$DEPLOY_DIR" || cd "$SOURCE_DIR"
            
            # Update environment with correct server IP
            sed -i "s|CLIENT_URL=.*|CLIENT_URL=http://$SERVER_IP:5000|g" .env 2>/dev/null || true
            
            success "CORS configuration updated"
            ;;
    esac
    
    case "$fix_type" in
        "errors"|"all")
            log "🔧 Fixing module and dependency errors..."
            
            # Fix in deployment directory first
            if [ -d "$DEPLOY_DIR" ]; then
                cd "$DEPLOY_DIR"
                rm -rf node_modules package-lock.json 2>/dev/null || true
                npm install --production --no-optional --legacy-peer-deps >/dev/null 2>&1
                success "Production dependencies fixed"
            fi
            
            # Also fix in source directory
            cd "$SOURCE_DIR"
            rm -rf node_modules package-lock.json 2>/dev/null || true
            npm install --production --no-optional --legacy-peer-deps >/dev/null 2>&1
            
            success "Dependencies fixed"
            ;;
    esac
    
    # Restart after fixes
    restart_application
}

# Help function
show_help() {
    echo "FilmFlex Fresh Instance Deployment Manager"
    echo "=========================================="
    echo "Version: 2.0 - For Ubuntu 22.04 Fresh Instance"
    echo "Server: $SERVER_IP"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup                      Initial server setup (run first on fresh instance)"
    echo "  deploy [quick|full]        Deploy application (default: quick)"
    echo "  status                     Check application status"
    echo "  restart                    Restart application"
    echo "  logs [lines]               View logs (default: 20 lines)"
    echo "  fix [cors|errors|all]      Fix specific issues (default: all)"
    echo "  help                       Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup                   # First-time server setup"
    echo "  $0 deploy full             # Full production deployment"
    echo "  $0 status                  # Check if app is running"
    echo "  $0 logs 50                 # Show last 50 log lines"
    echo "  $0 fix cors                # Fix CORS issues"
    echo ""
    echo "Fresh Instance Workflow:"
    echo "  1. $0 setup                # Setup Node.js, PM2, PostgreSQL, Nginx"
    echo "  2. $0 deploy full          # Deploy FilmFlex application"
    echo "  3. $0 status               # Verify deployment"
    echo ""
}

# Main command handler
case "${1:-help}" in
    "setup")
        setup_server
        ;;
    "deploy")
        deploy_application "${2:-quick}"
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs "${2:-20}"
        ;;
    "restart")
        restart_application
        ;;
    "fix")
        fix_issues "${2:-all}"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
