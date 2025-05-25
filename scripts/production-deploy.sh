#!/bin/bash

# Production Deployment Script for FilmFlex
# Run this script directly on your production server
# Usage: bash production-deploy.sh [branch_name]

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/YOUR_USERNAME/filmflex.git"  # Update with your repo URL
APP_DIR="/var/www/filmflex"
BACKUP_DIR="/var/www/backups"
BRANCH=${1:-main}  # Default to main branch
LOG_FILE="/var/log/filmflex-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run this script as root or with sudo"
        exit 1
    fi
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$APP_DIR" ]; then
        BACKUP_NAME="filmflex-backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)" 2>/dev/null || true
        log "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    fi
}

# Stop services
stop_services() {
    log "Stopping PM2 processes..."
    pm2 delete filmflex 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    log "Stopping nginx..."
    systemctl stop nginx 2>/dev/null || true
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Start PM2
    cd "$APP_DIR"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    export NODE_ENV="production"
    export PORT="5000"
    export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
    
    # Start with PM2
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs --env production
    else
        pm2 start dist/index.js --name filmflex --instances 2
    fi
    
    pm2 save
    pm2 startup systemd -u root --hp /root
}

# Deploy from Git
deploy_from_git() {
    log "Deploying from Git repository..."
    
    # Remove old directory
    if [ -d "$APP_DIR" ]; then
        rm -rf "$APP_DIR"
    fi
    
    # Clone repository
    log "Cloning repository..."
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    
    cd "$APP_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Build application
    log "Building application..."
    npm run build
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
}

# Deploy from uploaded files
deploy_from_upload() {
    log "Deploying from uploaded files..."
    
    # Check if upload directory exists
    UPLOAD_DIR="/tmp/filmflex-upload"
    if [ ! -d "$UPLOAD_DIR" ]; then
        error "Upload directory $UPLOAD_DIR not found!"
        error "Please upload your files to $UPLOAD_DIR first"
        exit 1
    fi
    
    # Backup and remove old directory
    if [ -d "$APP_DIR" ]; then
        rm -rf "$APP_DIR"
    fi
    
    # Move uploaded files
    mv "$UPLOAD_DIR" "$APP_DIR"
    
    cd "$APP_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    npm install --production
    
    # Build if needed
    if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
        log "Building application..."
        npm run build
    fi
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
}

# Update database schema
update_database() {
    log "Updating database schema..."
    
    export PGPASSWORD="filmflex2024"
    
    # Add missing columns
    psql -U filmflex -d filmflex -h localhost << 'EOF'
-- Add missing username column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Update existing users to have usernames
UPDATE users SET username = email WHERE username IS NULL;

-- Add featured_sections table if it doesn't exist
CREATE TABLE IF NOT EXISTS featured_sections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    movie_ids INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add any other missing tables/columns here
EOF
    
    log "Database schema updated successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for service to start
    sleep 10
    
    # Check PM2 status
    pm2 status
    
    # Check API endpoint
    for i in {1..30}; do
        if curl -s http://localhost:5000/api/health > /dev/null; then
            log "✅ API health check passed"
            break
        else
            if [ $i -eq 30 ]; then
                error "❌ API health check failed after 30 attempts"
                return 1
            fi
            sleep 2
        fi
    done
    
    # Check nginx status
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx is running"
    else
        warning "⚠️ Nginx is not running"
    fi
    
    log "🎉 Deployment completed successfully!"
}

# Main deployment function
main() {
    log "Starting FilmFlex production deployment..."
    
    check_root
    
    # Choose deployment method
    echo -e "\n${BLUE}Choose deployment method:${NC}"
    echo "1) Deploy from Git repository"
    echo "2) Deploy from uploaded files in /tmp/filmflex-upload"
    echo "3) Quick restart (no code changes)"
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            if [ -z "$REPO_URL" ] || [ "$REPO_URL" = "https://github.com/YOUR_USERNAME/filmflex.git" ]; then
                error "Please update REPO_URL in this script with your actual repository URL"
                exit 1
            fi
            backup_current
            stop_services
            deploy_from_git
            update_database
            start_services
            health_check
            ;;
        2)
            backup_current
            stop_services
            deploy_from_upload
            update_database
            start_services
            health_check
            ;;
        3)
            log "Performing quick restart..."
            stop_services
            start_services
            health_check
            ;;
        *)
            error "Invalid choice"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"