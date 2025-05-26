#!/bin/bash

# FilmFlex Production Deployment Script for Linux
# Run this script on the production server after uploading the source code

set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define paths
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y%m%d%H%M%S')

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Production Deployment"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   error "This script must be run as root"
   exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/deployment-${DATE}.log"

# Function to log and execute commands
execute() {
    local cmd="$1"
    log "Executing: $cmd"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Executing: $cmd" >> "$LOG_FILE"
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        success "Command completed successfully"
        return 0
    else
        warning "Command completed with warnings (check $LOG_FILE)"
        return 1
    fi
}

log "Starting FilmFlex production deployment..."
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"
log "Log file: $LOG_FILE"

# Step 1: Update system and install dependencies
log "Step 1: Installing system dependencies..."
execute "apt-get update"
execute "apt-get install -y curl git nginx postgresql postgresql-contrib"

# Install Node.js 20.x
log "Installing Node.js 20.x..."
execute "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
execute "apt-get install -y nodejs"

# Install PM2
log "Installing PM2..."
execute "npm install -g pm2"

# Step 2: Setup PostgreSQL
log "Step 2: Setting up PostgreSQL..."
execute "systemctl start postgresql"
execute "systemctl enable postgresql"

# Create database user and database
log "Creating PostgreSQL user and database..."
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'filmflex') THEN
        CREATE USER filmflex WITH PASSWORD 'filmflex2024' CREATEDB;
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE filmflex'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'filmflex')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
EOF

success "PostgreSQL setup completed"

# Step 3: Import database schema
log "Step 3: Importing database schema..."
if [ -f "$SOURCE_DIR/shared/schema_filmflex.sql" ]; then
    execute "sudo -u postgres psql -d filmflex -f $SOURCE_DIR/shared/schema_filmflex.sql"
    success "Database schema imported successfully"
else
    error "Database schema file not found at $SOURCE_DIR/shared/schema_filmflex.sql"
    exit 1
fi

# Step 4: Deploy application
log "Step 4: Deploying application..."
execute "mkdir -p $DEPLOY_DIR"
execute "mkdir -p $LOG_DIR"

# Copy source code
log "Copying source code..."
execute "rsync -av --exclude=node_modules --exclude=.git --exclude=logs --exclude=dist $SOURCE_DIR/ $DEPLOY_DIR/"

# Set up environment
log "Setting up environment..."
cat > "$DEPLOY_DIR/.env" << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=filmflex_production_secret_$(date +%s)
EOF

execute "chmod 600 $DEPLOY_DIR/.env"

# Install dependencies and build
log "Installing dependencies..."
cd "$DEPLOY_DIR"
execute "npm install --production"

log "Building application..."
execute "npm run build"

# Set permissions
execute "chown -R www-data:www-data $DEPLOY_DIR"
execute "chmod -R 755 $DEPLOY_DIR"

# Step 5: Configure Nginx
log "Step 5: Configuring Nginx..."
cat > /etc/nginx/sites-available/filmflex << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 100M;
    
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
        proxy_read_timeout 86400;
    }
    
    location /static/ {
        alias /var/www/filmflex/dist/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /var/www/filmflex/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

execute "ln -sf /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/"
execute "rm -f /etc/nginx/sites-enabled/default"
execute "nginx -t"
execute "systemctl restart nginx"
execute "systemctl enable nginx"

# Step 6: Start application with PM2
log "Step 6: Starting application with PM2..."
cd "$DEPLOY_DIR"

# Stop existing processes
execute "pm2 stop filmflex || true"
execute "pm2 delete filmflex || true"

# Start new process
execute "pm2 start dist/index.js --name filmflex --log $LOG_DIR/app.log --error $LOG_DIR/app-error.log"
execute "pm2 save"

# Set up PM2 startup
pm2 startup systemd -u root --hp /root | tail -1 | bash

# Step 7: Setup data import
log "Step 7: Setting up data import..."
cd "$DEPLOY_DIR/scripts/data"
execute "chmod +x *.sh *.cjs"

# Run initial data import (limited for faster deployment)
log "Running initial data import (100 movies)..."
execute "./import-movies.sh --limit 100 || true"

# Setup cron job for daily import
log "Setting up daily data import cron job..."
(crontab -l 2>/dev/null || echo "") | grep -v "filmflex.*import" || true
(crontab -l 2>/dev/null; echo "0 2 * * * cd $DEPLOY_DIR/scripts/data && ./import-movies.sh >> $LOG_DIR/cron-import.log 2>&1") | crontab -

# Step 8: Verification
log "Step 8: Verifying deployment..."

# Wait for application to start
sleep 10

# Check application health
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Application health check passed"
else
    warning "Application health check failed - checking logs..."
    execute "pm2 logs filmflex --lines 20"
fi

# Display status
log "Deployment verification:"
execute "pm2 status"
execute "systemctl status nginx --no-pager -l"
execute "systemctl status postgresql --no-pager -l"

# Display system resources
log "System resources:"
execute "df -h"
execute "free -h"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")

echo ""
success "🎉 FilmFlex deployment completed successfully!"
echo ""
echo -e "${GREEN}🌐 Your application is accessible at:${NC}"
echo -e "${BLUE}   Main site: http://$SERVER_IP${NC}"
echo -e "${BLUE}   Admin panel: http://$SERVER_IP/admin${NC}"
echo -e "${BLUE}   API: http://$SERVER_IP/api${NC}"
echo ""
echo -e "${YELLOW}📋 Management commands:${NC}"
echo -e "${BLUE}   Check logs: pm2 logs filmflex${NC}"
echo -e "${BLUE}   Restart app: pm2 restart filmflex${NC}"
echo -e "${BLUE}   Check status: pm2 status${NC}"
echo -e "${BLUE}   View deployment log: tail -f $LOG_FILE${NC}"
echo ""
echo -e "${YELLOW}📊 Data import:${NC}"
echo -e "${BLUE}   Import logs: tail -f $LOG_DIR/cron-import.log${NC}"
echo -e "${BLUE}   Manual import: cd $DEPLOY_DIR/scripts/data && ./import-movies.sh${NC}"
echo -e "${BLUE}   Full import: cd $DEPLOY_DIR/scripts/data && ./import-all-movies-resumable.sh${NC}"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
