#!/bin/bash

# PhimGG Master Deployment Orchestrator - Enhanced Edition
# Version: 3.1 - Fixed source code sync and SSL issues
# This script combines all deployment functionality into one comprehensive tool

set -e

# Load common functions
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/lib/common-functions.sh" ]; then
    source "$SCRIPT_DIR/lib/common-functions.sh"
else
    # Basic functions if common-functions.sh is not available
    log() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') $@"; }
    success() { echo -e "\033[0;32m✓ $@\033[0m"; }
    warning() { echo -e "\033[1;33m! $@\033[0m"; }
    error() { echo -e "\033[0;31m✗ $@\033[0m"; }
    info() { echo -e "\033[0;34mℹ $@\033[0m"; }
    print_banner() { echo -e "\n\033[1;36m=== $@ ===\033[0m\n"; }
fi

# Enhanced Configuration
PRODUCTION_IP="${PRODUCTION_IP:-38.54.14.154}"
PRODUCTION_DOMAIN="${PRODUCTION_DOMAIN:-phimgg.com}"
PRODUCTION_USER="${PRODUCTION_USER:-root}"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/filmflex}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.server.yml}"
DB_CONTAINER="${DB_CONTAINER:-filmflex-postgres}"
DB_USER="${DB_USER:-filmflex}"
DB_NAME="${DB_NAME:-filmflex}"
DB_PASSWORD="${DB_PASSWORD:-filmflex2024}"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/deploy-$TIMESTAMP.log"

# Deployment flags
FORCE_DEPLOY="false"
DRY_RUN="false"
VERBOSE="false"
SKIP_TESTS="false"
SKIP_SSL="false"
CREATE_BACKUP="false"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force) FORCE_DEPLOY="true"; shift ;;
        --dry-run) DRY_RUN="true"; shift ;;
        --verbose) VERBOSE="true"; shift ;;
        --skip-tests) SKIP_TESTS="true"; shift ;;
        --no-ssl) SKIP_SSL="true"; shift ;;
        --backup) CREATE_BACKUP="true"; shift ;;
        *) MODE="$1"; shift ;;
    esac
done

# Ensure log directory exists locally
mkdir -p "$LOG_DIR" 2>/dev/null || true

# =============================================================================
# ENHANCED DEPLOYMENT FUNCTIONS - FIXED
# =============================================================================

deploy_full() {
    print_banner "Full Production Deployment - Enhanced & Fixed"
    
    log "Phase 1: Syncing latest source code to production server..."
    sync_source_code_to_production || { error "Source code sync failed"; return 1; }
    
    log "Phase 2: Setting up production environment..."
    setup_production_environment || { error "Production setup failed"; return 1; }
    
    log "Phase 3: Configuring SSL and domain..."
    if [ "$SKIP_SSL" != "true" ]; then
        setup_ssl_and_domain || { error "SSL setup failed"; return 1; }
    fi
    
    log "Phase 4: Deploying application..."
    deploy_application_production || { error "Application deployment failed"; return 1; }
    
    log "Phase 5: Configuring nginx with proper backend..."
    configure_nginx_fixed || { error "Nginx configuration failed"; return 1; }
    
    if [ "$SKIP_TESTS" != "true" ]; then
        log "Phase 6: Running health checks..."
        run_health_checks || { error "Health checks failed"; return 1; }
    fi
    
    success "Full deployment completed successfully!"
    show_deployment_info
}

sync_source_code_to_production() {
    print_banner "Syncing Latest Source Code"
    
    # First, update local repository
    log "Updating local repository..."
    cd "$SOURCE_DIR"
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        log "Pulling latest changes from git..."
        git fetch origin
        git reset --hard origin/main
        success "Local repository updated to latest commit: $(git rev-parse --short HEAD)"
    else
        warning "Not a git repository, using current source"
    fi
    
    # Create deployment package
    log "Creating deployment package..."
    local temp_dir="/tmp/filmflex-deploy-$TIMESTAMP"
    mkdir -p "$temp_dir"
    
    # Copy all necessary files excluding node_modules and logs
    rsync -av --exclude 'node_modules' \
              --exclude 'logs' \
              --exclude '.git' \
              --exclude 'dist' \
              --exclude 'build' \
              --exclude '*.log' \
              "$SOURCE_DIR/" "$temp_dir/"
    
    # Sync to production server
    log "Syncing to production server $PRODUCTION_IP..."
    
    # Create deploy directory on server
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" "mkdir -p $DEPLOY_DIR"
    
    # Sync files to server
    rsync -avz --delete \
          --exclude 'node_modules' \
          --exclude 'logs' \
          --exclude '.git' \
          --exclude 'dist' \
          --exclude 'build' \
          --exclude '*.log' \
          "$temp_dir/" "$PRODUCTION_USER@$PRODUCTION_IP:$DEPLOY_DIR/"
    
    # Cleanup temp directory
    rm -rf "$temp_dir"
    
    success "Source code synchronized to production server"
}

setup_production_environment() {
    print_banner "Setting Up Production Environment"
    
    log "Installing prerequisites on production server..."
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" << 'REMOTE_SETUP'
        # Update system
        apt-get update -y
        
        # Install essential packages
        apt-get install -y curl wget git nginx certbot python3-certbot-nginx \
            postgresql-client docker.io docker-compose-plugin nodejs npm \
            ufw fail2ban htop ncdu tree jq rsync
        
        # Install PM2 globally
        npm install -g pm2
        
        # Start and enable services
        systemctl enable docker
        systemctl start docker
        systemctl enable nginx
        systemctl start nginx
        
        # Create log directory
        mkdir -p /var/log/filmflex
        
        echo "Production environment setup completed"
REMOTE_SETUP
    
    success "Production environment configured"
}

deploy_application_production() {
    print_banner "Deploying Application to Production"
    
    log "Building and starting application on production server..."
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" << REMOTE_DEPLOY
        cd $DEPLOY_DIR
        
        # Install dependencies
        echo "Installing dependencies..."
        npm install --production
        
        # Build application
        echo "Building application..."
        npm run build
        
        # Stop existing containers
        echo "Stopping existing containers..."
        docker compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
        
        # Start new deployment
        echo "Starting Docker services..."
        docker compose -f $COMPOSE_FILE up -d
        
        # Wait for services to be ready
        echo "Waiting for services to initialize..."
        sleep 30
        
        echo "Application deployment completed"
REMOTE_DEPLOY
    
    success "Application deployed successfully"
}

configure_nginx_fixed() {
    print_banner "Configuring Nginx with Fixed Backend"
    
    log "Creating fixed nginx configuration..."
    
    # Create the fixed nginx config locally first
    local temp_nginx="/tmp/phimgg.com.conf"
    cat > "$temp_nginx" << 'NGINX_FIXED'
# HTTP server - redirects to HTTPS and handles Let's Encrypt challenges
server {
    listen 80;
    listen [::]:80;
    server_name phimgg.com www.phimgg.com;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server - main configuration with FIXED BACKEND
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name phimgg.com www.phimgg.com;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/phimgg.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/phimgg.com/privkey.pem;

    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS Headers - FIXED
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Content-Length 0;
        add_header Content-Type "text/plain charset=UTF-8";
        return 204;
    }

    # Logging
    access_log /var/log/nginx/phimgg.com.access.log;
    error_log /var/log/nginx/phimgg.com.error.log warn;

    # FIXED: Direct proxy to localhost instead of upstream
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API routes - FIXED
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location = /api/health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        access_log off;
    }

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_FIXED

    # Copy nginx config to server
    log "Copying nginx configuration to server..."
    scp "$temp_nginx" "$PRODUCTION_USER@$PRODUCTION_IP:/tmp/phimgg.com.conf"
    
    # Apply nginx configuration on server
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" << 'NGINX_SETUP'
        # Copy config to nginx sites-available
        cp /tmp/phimgg.com.conf /etc/nginx/sites-available/phimgg.com
        
        # Enable the site
        ln -sf /etc/nginx/sites-available/phimgg.com /etc/nginx/sites-enabled/phimgg.com
        
        # Remove default site
        rm -f /etc/nginx/sites-enabled/default
        
        # Test nginx configuration
        if nginx -t; then
            systemctl reload nginx
            echo "Nginx configuration updated and reloaded"
        else
            echo "Nginx configuration test failed"
            exit 1
        fi
NGINX_SETUP
    
    # Cleanup temp file
    rm -f "$temp_nginx"
    
    success "Nginx configured with fixed backend reference"
}

setup_ssl_and_domain() {
    print_banner "Setting Up SSL and Domain Configuration"
    
    log "Setting up SSL certificates for $PRODUCTION_DOMAIN..."
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" << SSL_SETUP
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Stop nginx temporarily
        systemctl stop nginx
        
        # Get certificate using standalone mode
        certbot certonly --standalone \
            --email "admin@$PRODUCTION_DOMAIN" \
            --agree-tos \
            --non-interactive \
            --domains "$PRODUCTION_DOMAIN,www.$PRODUCTION_DOMAIN" || {
            echo "SSL certificate generation failed, starting nginx anyway"
            systemctl start nginx
            exit 1
        }
        
        # Start nginx
        systemctl start nginx
        
        # Set up auto-renewal
        echo "0 12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
        
        echo "SSL certificates configured successfully"
SSL_SETUP
    
    success "SSL and domain configuration completed"
}

run_health_checks() {
    print_banner "Running Health Checks"
    
    log "Checking application health..."
    
    # Test local connection
    local health_check=$(ssh "$PRODUCTION_USER@$PRODUCTION_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/health" 2>/dev/null || echo "000")
    
    if [ "$health_check" = "200" ]; then
        success "Application health check passed (HTTP 200)"
    else
        warning "Application health check returned: $health_check"
    fi
    
    # Test HTTPS domain
    local domain_check=$(curl -s -o /dev/null -w '%{http_code}' "https://$PRODUCTION_DOMAIN/api/health" 2>/dev/null || echo "000")
    
    if [ "$domain_check" = "200" ]; then
        success "Domain HTTPS check passed (HTTP 200)"
    else
        warning "Domain HTTPS check returned: $domain_check"
    fi
    
    # Check Docker containers
    ssh "$PRODUCTION_USER@$PRODUCTION_IP" << 'CONTAINER_CHECK'
        echo "Checking Docker containers status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        echo -e "\nChecking application logs (last 10 lines):"
        docker logs filmflex-app --tail 10 2>/dev/null || echo "No app container logs available"
CONTAINER_CHECK
}

show_deployment_info() {
    print_banner "Deployment Information"
    
    log "Deployment completed at: $(date)"
    log "Production server: $PRODUCTION_IP"
    log "Domain: https://$PRODUCTION_DOMAIN"
    log "Health check: https://$PRODUCTION_DOMAIN/api/health"
    log "Application logs: ssh $PRODUCTION_USER@$PRODUCTION_IP 'docker logs filmflex-app'"
    
    success "PhimGG is now deployed and accessible!"
}

# =============================================================================
# MAIN EXECUTION - Enhanced
# =============================================================================

main() {
    local mode="full"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            full|production|development|docker|pm2|quick|ssl|database|health|rollback|setup)
                mode="$1"
                ;;
            --force)
                FORCE_DEPLOY="true"
                ;;
            --dry-run)
                DRY_RUN="true"
                ;;
            --verbose)
                VERBOSE="true"
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                ;;
            --no-ssl)
                SKIP_SSL="true"
                ;;
            --backup)
                CREATE_BACKUP="true"
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
    
    # Dry run mode
    if [ "$DRY_RUN" = "true" ]; then
        log "DRY RUN MODE - No changes will be made"
        log "Would execute: $mode deployment"
        log "Source: $SOURCE_DIR"
        log "Target: $DEPLOY_DIR"
        log "Domain: $PRODUCTION_DOMAIN ($PRODUCTION_IP)"
        return 0
    fi
    
    # Execute deployment based on mode
    case "$mode" in
        full)
            deploy_full
            ;;
        production)
            deploy_production
            ;;
        development)
            deploy_development
            ;;
        docker)
            deploy_docker
            ;;
        pm2)
            deploy_pm2
            ;;
        quick)
            deploy_quick
            ;;
        ssl)
            deploy_ssl
            ;;
        database)
            deploy_database
            ;;
        health)
            run_health_checks
            ;;
        rollback)
            rollback_deployment
            ;;
        setup)
            setup_server
            ;;
        *)
            error "Invalid deployment mode: $mode"
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"