#!/bin/bash

# FilmFlex Blue-Green Deployment Script
# Zero-downtime deployment using blue-green strategy

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SOURCE_DIR="/root/Film_Flex_Release"
BASE_DIR="/var/www/filmflex"
CURRENT_LINK="$BASE_DIR/current"
BLUE_DIR="$BASE_DIR/blue"
GREEN_DIR="$BASE_DIR/green"
DATE=$(date '+%Y%m%d-%H%M%S')
LOG_FILE="/var/log/filmflex/blue-green-deploy-$DATE.log"
HEALTH_CHECK_URL="http://localhost:3000/health"
HEALTH_CHECK_TIMEOUT=30

# Ports for blue-green
BLUE_PORT=3001
GREEN_PORT=3002
ACTIVE_PORT=3000

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging functions
log() {
    local message="$1"
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

success() {
    local message="$1"
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $message" >> "$LOG_FILE"
}

warning() {
    local message="$1"
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $message" >> "$LOG_FILE"
}

error() {
    local message="$1"
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $message${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$LOG_FILE"
}

highlight() {
    local message="$1"
    echo -e "${PURPLE}[$(date '+%H:%M:%S')] 🚀 $message${NC}"
}

# Error handling
handle_error() {
    local exit_code=$?
    local step="$1"
    error "Blue-Green deployment failed at step: $step (exit code: $exit_code)"
    
    # Cleanup partial deployment
    if [ -n "$NEW_ENV" ]; then
        log "Cleaning up failed deployment environment: $NEW_ENV"
        pm2 delete "filmflex-$NEW_ENV" 2>/dev/null || true
    fi
    
    error "Check the full log at: $LOG_FILE"
    exit $exit_code
}

trap 'handle_error "Unknown step"' ERR

# Determine current and new environments
get_current_environment() {
    if [ -L "$CURRENT_LINK" ]; then
        local target=$(readlink "$CURRENT_LINK")
        if [[ "$target" == *"blue"* ]]; then
            echo "blue"
        elif [[ "$target" == *"green"* ]]; then
            echo "green"
        else
            echo "none"
        fi
    else
        echo "none"
    fi
}

# Health check function
health_check() {
    local url="$1"
    local timeout="$2"
    local count=0
    
    log "Starting health check for: $url"
    
    while [ $count -lt $timeout ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            success "Health check passed"
            return 0
        fi
        
        log "Health check attempt $((count + 1))/$timeout..."
        sleep 1
        count=$((count + 1))
    done
    
    error "Health check failed after $timeout attempts"
    return 1
}

# Print banner
echo -e "${PURPLE}"
echo "============================================="
echo "    FilmFlex Blue-Green Deployment v1.0"
echo "    Zero-Downtime Production Deployment"
echo "============================================="
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   error "This script must be run as root"
   exit 1
fi

# Verify source directory
if [ ! -d "$SOURCE_DIR" ]; then
    error "Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create base directories
mkdir -p "$BLUE_DIR" "$GREEN_DIR"

# Determine environments
CURRENT_ENV=$(get_current_environment)
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
    NEW_DIR="$GREEN_DIR"
    NEW_PORT="$GREEN_PORT"
elif [ "$CURRENT_ENV" = "green" ]; then
    NEW_ENV="blue"
    NEW_DIR="$BLUE_DIR"
    NEW_PORT="$BLUE_PORT"
else
    # First deployment
    NEW_ENV="blue"
    NEW_DIR="$BLUE_DIR"
    NEW_PORT="$BLUE_PORT"
fi

highlight "Current environment: ${CURRENT_ENV:-none}"
highlight "Deploying to: $NEW_ENV"
highlight "New environment port: $NEW_PORT"

log "Starting blue-green deployment..."

# Step 1: Deploy to new environment
log "Step 1: Deploying to $NEW_ENV environment..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=dist \
    --exclude=.DS_Store \
    "$SOURCE_DIR/" "$NEW_DIR/" >> "$LOG_FILE" 2>&1 || handle_error "Code deployment"

cd "$NEW_DIR"

# Step 2: Install dependencies and build
log "Step 2: Installing dependencies and building..."
npm ci --production >> "$LOG_FILE" 2>&1 || handle_error "Dependency installation"
npm run build >> "$LOG_FILE" 2>&1 || handle_error "Build process"

# Step 3: Configure environment for new deployment
log "Step 3: Configuring environment..."
if [ -f "$CURRENT_LINK/.env" ]; then
    cp "$CURRENT_LINK/.env" "$NEW_DIR/.env"
else
    warning "No existing .env found, using default configuration"
fi

# Update port in ecosystem config for new environment
cat > "$NEW_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [{
    name: 'filmflex-$NEW_ENV',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $NEW_PORT
    }
  }]
}
EOF

# Step 4: Start new environment
log "Step 4: Starting $NEW_ENV environment on port $NEW_PORT..."
pm2 start "$NEW_DIR/ecosystem.config.cjs" >> "$LOG_FILE" 2>&1 || handle_error "Application start"

# Step 5: Health check new environment
log "Step 5: Running health checks..."
sleep 5
health_check "http://localhost:$NEW_PORT/health" $HEALTH_CHECK_TIMEOUT || handle_error "Health check"

# Step 6: Update Nginx configuration for traffic switching
log "Step 6: Preparing Nginx configuration..."
cat > /etc/nginx/sites-available/filmflex << EOF
upstream filmflex_backend {
    server 127.0.0.1:$NEW_PORT;
    # Backup server (current environment) - commented out during switch
    # server 127.0.0.1:$ACTIVE_PORT backup;
}

server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Serve static files
    location /static/ {
        alias /var/www/filmflex/current/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API and application routes
    location / {
        proxy_pass http://filmflex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://filmflex_backend;
        access_log off;
    }
}
EOF

# Step 7: Test Nginx configuration
log "Step 7: Testing Nginx configuration..."
nginx -t >> "$LOG_FILE" 2>&1 || handle_error "Nginx configuration test"

# Step 8: Switch traffic to new environment
log "Step 8: Switching traffic to $NEW_ENV environment..."
systemctl reload nginx >> "$LOG_FILE" 2>&1 || handle_error "Nginx reload"

# Step 9: Final health check with actual traffic
log "Step 9: Final health check with live traffic..."
sleep 3
health_check "http://localhost/health" 10 || handle_error "Live traffic health check"

# Step 10: Update current symlink
log "Step 10: Updating current environment symlink..."
rm -f "$CURRENT_LINK"
ln -sf "$NEW_DIR" "$CURRENT_LINK"

# Step 11: Stop old environment (if exists)
if [ "$CURRENT_ENV" != "none" ]; then
    log "Step 11: Stopping old environment ($CURRENT_ENV)..."
    pm2 delete "filmflex-$CURRENT_ENV" >> "$LOG_FILE" 2>&1 || warning "Failed to stop old environment"
else
    log "Step 11: No old environment to stop (first deployment)"
fi

# Step 12: Update PM2 process name for consistency
log "Step 12: Updating PM2 process configuration..."
pm2 delete "filmflex-$NEW_ENV" >> "$LOG_FILE" 2>&1 || true

# Create final ecosystem config with standard name
cat > "$NEW_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [{
    name: 'filmflex',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $ACTIVE_PORT
    }
  }]
}
EOF

# Update Nginx to use standard port
cat > /etc/nginx/sites-available/filmflex << EOF
upstream filmflex_backend {
    server 127.0.0.1:$ACTIVE_PORT;
}

server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    location /static/ {
        alias $CURRENT_LINK/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location / {
        proxy_pass http://filmflex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://filmflex_backend;
        access_log off;
    }
}
EOF

pm2 start "$NEW_DIR/ecosystem.config.cjs" >> "$LOG_FILE" 2>&1 || handle_error "Final application start"
systemctl reload nginx >> "$LOG_FILE" 2>&1 || handle_error "Final Nginx reload"

# Step 13: Final verification
log "Step 13: Final deployment verification..."
sleep 5
health_check "http://localhost/health" 10 || handle_error "Final verification"

# Step 14: Save PM2 configuration
pm2 save >> "$LOG_FILE" 2>&1

success "Blue-Green deployment completed successfully!"
highlight "Active environment: $NEW_ENV"
highlight "Application URL: http://$(hostname -I | awk '{print $1}')"
highlight "Previous environment ($CURRENT_ENV) has been stopped and is available for rollback"

# Display final status
echo ""
log "Current PM2 processes:"
pm2 list

echo ""
log "Recent application logs:"
pm2 logs filmflex --lines 10

log "Deployment log saved to: $LOG_FILE"