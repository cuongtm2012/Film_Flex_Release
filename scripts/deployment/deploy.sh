#!/bin/bash

# FilmFlex Master Deployment Orchestrator - Enhanced Edition
# Version: 3.0
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

# Ensure log directory exists
mkdir -p "$LOG_DIR" 2>/dev/null || true

# =============================================================================
# DEPLOYMENT MODES
# =============================================================================

show_usage() {
    print_banner "FilmFlex Deployment Orchestrator v3.0"
    echo
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo
    echo "DEPLOYMENT MODES:"
    echo "  full          Complete production deployment with SSL and database"
    echo "  production    Production deployment using Docker images"
    echo "  development   Development deployment with local build"
    echo "  docker        Docker-only deployment"
    echo "  pm2           PM2-only deployment"
    echo "  quick         Quick redeploy without database changes"
    echo "  ssl           SSL certificate setup only"
    echo "  database      Database setup and migration only"
    echo "  health        Comprehensive health check"
    echo "  rollback      Rollback to previous version"
    echo "  setup         Initial server setup and prerequisites"
    echo
    echo "OPTIONS:"
    echo "  --force       Skip confirmations"
    echo "  --dry-run     Show what would be done without executing"
    echo "  --verbose     Enable detailed logging"
    echo "  --skip-tests  Skip health checks"
    echo "  --no-ssl      Skip SSL certificate setup"
    echo "  --backup      Create backup before deployment"
    echo
    echo "EXAMPLES:"
    echo "  $0 full                         # Complete production deployment"
    echo "  $0 production --force           # Force production Docker deployment"
    echo "  $0 development --verbose        # Development deployment with detailed logs"
    echo "  $0 ssl --force                  # Force SSL certificate renewal"
    echo "  $0 health --verbose             # Detailed health check"
    echo "  $0 setup                        # Initial server setup"
}

# =============================================================================
# ENHANCED DEPLOYMENT FUNCTIONS
# =============================================================================

deploy_full() {
    print_banner "Full Production Deployment - Enhanced"
    
    # Phase 1: Prerequisites and Setup
    log "Phase 1: Checking prerequisites and server setup..."
    acquire_lock "full-deployment" || { error "Another deployment is running"; return 1; }
    check_system_resources || { error "System resources insufficient"; return 1; }
    setup_server_prerequisites
    
    # Phase 2: Backup current deployment
    if [ "$CREATE_BACKUP" = "true" ]; then
        log "Phase 2: Creating backup..."
        create_comprehensive_backup
    fi
    
    # Phase 3: DNS and SSL Setup
    log "Phase 3: DNS and SSL configuration..."
    if [ "$SKIP_SSL" != "true" ]; then
        check_dns_configuration
        setup_ssl_certificates_enhanced
    fi
    
    # Phase 4: Database setup
    log "Phase 4: Setting up database with comprehensive schema..."
    setup_database_comprehensive
    
    # Phase 5: Build and deploy application
    log "Phase 5: Building and deploying application..."
    build_application_enhanced
    deploy_application_enhanced
    
    # Phase 6: Configure services
    log "Phase 6: Configuring services..."
    configure_nginx_enhanced
    setup_cors_configuration
    
    # Phase 7: Health checks and verification
    if [ "$SKIP_TESTS" != "true" ]; then
        log "Phase 7: Running comprehensive health checks..."
        run_comprehensive_health_check || { error "Health checks failed"; return 1; }
    fi
    
    success "Full deployment completed successfully!"
    show_deployment_summary
}

deploy_production() {
    print_banner "Production Docker Deployment"
    
    acquire_lock "production-deployment" || { error "Another deployment is running"; return 1; }
    
    log "Checking prerequisites for production deployment..."
    check_docker_prerequisites || { error "Docker prerequisites failed"; return 1; }
    
    # Create production Docker Compose configuration
    create_production_compose_config
    
    log "Stopping existing containers..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    log "Pulling latest production images..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" pull
    
    log "Starting production services..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" up -d
    
    log "Waiting for services to be ready..."
    sleep 30
    
    # Verify deployment
    verify_production_deployment
    
    if [ "$SKIP_TESTS" != "true" ]; then
        check_docker_containers || { error "Container health check failed"; return 1; }
        check_application_health || { error "Application health check failed"; return 1; }
    fi
    
    success "Production deployment completed!"
    show_deployment_summary
}

deploy_development() {
    print_banner "Development Deployment"
    
    acquire_lock "development-deployment" || { error "Another deployment is running"; return 1; }
    
    log "Setting up development environment..."
    cd "$SOURCE_DIR"
    
    # Update source code
    if git rev-parse --git-dir > /dev/null 2>&1; then
        log "Updating source code..."
        git pull origin main || warning "Git pull failed, using current code"
    fi
    
    # Install dependencies and build
    log "Installing dependencies..."
    npm install || { error "npm install failed"; return 1; }
    
    log "Building application..."
    npm run build || { error "Build failed"; return 1; }
    
    # Setup development database
    log "Setting up development database..."
    setup_development_database
    
    # Start development services
    log "Starting development services..."
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs || pm2 restart ecosystem.config.cjs
    else
        pm2 start dist/index.js --name filmflex-dev
    fi
    
    if [ "$SKIP_TESTS" != "true" ]; then
        check_pm2_status || { error "PM2 health check failed"; return 1; }
        check_application_health || { error "Application health check failed"; return 1; }
    fi
    
    success "Development deployment completed!"
}

deploy_quick() {
    print_banner "Quick Deployment - Fast Redeploy"
    
    acquire_lock "quick-deployment" || { error "Another deployment is running"; return 1; }
    
    log "Starting quick deployment (no database changes)..."
    cd "$SOURCE_DIR"
    
    # Quick update source code if git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        log "Pulling latest changes..."
        git pull origin main || warning "Git pull failed, using current code"
    fi
    
    # Check if Docker containers are running
    if check_docker_containers; then
        log "Quick Docker deployment detected..."
        
        # Pull latest images
        log "Pulling latest Docker images..."
        docker compose -f "$COMPOSE_FILE" pull app || true
        
        # Restart only the app container (keep database running)
        log "Restarting application container..."
        docker compose -f "$COMPOSE_FILE" up -d --no-deps app
        
        # Wait for container to be ready
        log "Waiting for application to start..."
        sleep 20
        
    else
        log "Quick PM2 deployment detected..."
        
        # Install dependencies and build quickly
        log "Installing dependencies (quick)..."
        npm install --production || { error "npm install failed"; return 1; }
        
        log "Building application..."
        npm run build || { error "Build failed"; return 1; }
        
        # Restart PM2 services
        log "Restarting PM2 services..."
        if [ -f "ecosystem.config.cjs" ]; then
            pm2 restart ecosystem.config.cjs
        else
            pm2 restart filmflex-dev 2>/dev/null || pm2 start dist/index.js --name filmflex-dev
        fi
        
        # Wait for PM2 to stabilize
        sleep 10
    fi
    
    # Quick health check
    if [ "$SKIP_TESTS" != "true" ]; then
        log "Running quick health check..."
        check_application_health || { error "Quick health check failed"; return 1; }
    fi
    
    success "Quick deployment completed successfully!"
    log "Application redeployed without database changes"
}

deploy_ssl() {
    print_banner "SSL Certificate Setup"
    
    log "Checking DNS configuration..."
    check_dns_configuration || { error "DNS configuration issues detected"; return 1; }
    
    log "Setting up SSL certificates..."
    setup_ssl_certificates_enhanced || { error "SSL setup failed"; return 1; }
    
    log "Configuring Nginx with SSL..."
    configure_nginx_enhanced || { error "Nginx configuration failed"; return 1; }
    
    success "SSL setup completed!"
}

deploy_database() {
    print_banner "Database Setup and Migration"
    
    log "Setting up comprehensive database..."
    setup_database_comprehensive || { error "Database setup failed"; return 1; }
    
    success "Database setup completed!"
}

setup_server() {
    print_banner "Initial Server Setup"
    
    log "Installing server prerequisites..."
    setup_server_prerequisites || { error "Server setup failed"; return 1; }
    
    log "Configuring firewall..."
    setup_firewall_rules
    
    log "Setting up monitoring..."
    setup_monitoring
    
    success "Server setup completed!"
}

# =============================================================================
# ENHANCED HELPER FUNCTIONS
# =============================================================================

setup_server_prerequisites() {
    log "Installing essential packages..."
    
    # Update system
    apt-get update -y
    
    # Install essential packages
    apt-get install -y curl wget git nginx certbot python3-certbot-nginx \
        postgresql-client docker.io docker-compose-plugin nodejs npm \
        ufw fail2ban htop ncdu tree jq
    
    # Install PM2 globally
    npm install -g pm2
    
    # Start and enable services
    systemctl enable docker
    systemctl start docker
    systemctl enable nginx
    systemctl start nginx
    
    # Add user to docker group
    usermod -aG docker $USER || true
    
    success "Server prerequisites installed"
}

create_production_compose_config() {
    log "Creating production Docker Compose configuration..."
    
    cat > "$SOURCE_DIR/$COMPOSE_FILE" << 'COMPOSE_EOF'
version: '3.8'

services:
  postgres:
    # Custom PostgreSQL image with complete movie database (5,005+ movies)
    image: cuongtm2012/filmflex-postgres-data:latest
    container_name: filmflex-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: filmflex
      POSTGRES_USER: filmflex
      POSTGRES_PASSWORD: filmflex2024
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - filmflex-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filmflex -d filmflex"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    # Multi-platform FilmFlex application (supports ARM64 and AMD64)
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      # Database Configuration
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
      
      # Application Configuration
      NODE_ENV: production
      PORT: 5000
      
      # CORS Configuration (Fixed for server deployment)
      ALLOWED_ORIGINS: "*"
      CLIENT_URL: "*"
      CORS_ORIGIN: "*"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma"
      CORS_CREDENTIALS: "true"
      
      # Server Configuration
      DOMAIN: "${PRODUCTION_IP}"
      SERVER_IP: "${PRODUCTION_IP}"
      PUBLIC_URL: "http://${PRODUCTION_IP}:5000"
      
      # Security
      SESSION_SECRET: filmflex_production_secret_2024
    ports:
      - "5000:5000"
    networks:
      - filmflex-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  filmflex-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  app_logs:
    driver: local
COMPOSE_EOF
    
    success "Production Docker Compose configuration created"
}

check_dns_configuration() {
    log "Checking DNS configuration for $PRODUCTION_DOMAIN..."
    
    local resolved_ips=$(dig +short $PRODUCTION_DOMAIN A | sort)
    local expected_ip="$PRODUCTION_IP"
    
    log "Expected IP: $expected_ip"
    log "Resolved IPs: $resolved_ips"
    
    if echo "$resolved_ips" | grep -q "$expected_ip"; then
        success "DNS includes correct IP address"
        return 0
    else
        error "DNS does NOT include correct IP address ($expected_ip)"
        return 1
    fi
}

setup_ssl_certificates_enhanced() {
    log "Setting up SSL certificates with Let's Encrypt..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Check if certificate already exists and is valid
    local ssl_cert="/etc/letsencrypt/live/$PRODUCTION_DOMAIN/fullchain.pem"
    if [ -f "$ssl_cert" ]; then
        local exp_date=$(openssl x509 -in "$ssl_cert" -noout -enddate | cut -d= -f2)
        local exp_timestamp=$(date -d "$exp_date" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (exp_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            success "SSL certificate is valid for $days_until_expiry more days"
            return 0
        fi
    fi
    
    # Stop nginx temporarily for standalone mode
    systemctl stop nginx
    
    # Get certificate
    log "Obtaining SSL certificate for $PRODUCTION_DOMAIN..."
    if certbot certonly --standalone \
        --email "admin@$PRODUCTION_DOMAIN" \
        --agree-tos \
        --non-interactive \
        --domains "$PRODUCTION_DOMAIN,www.$PRODUCTION_DOMAIN"; then
        success "SSL certificate obtained successfully"
        
        # Start nginx and configure SSL
        systemctl start nginx
        configure_nginx_ssl
        
        # Set up auto-renewal
        local renewal_cron="0 12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'"
        (crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "$renewal_cron") | crontab -
        success "SSL auto-renewal configured"
        
        return 0
    else
        error "Failed to obtain SSL certificate"
        systemctl start nginx
        return 1
    fi
}

configure_nginx_ssl() {
    log "Configuring Nginx SSL settings..."
    
    local nginx_conf="/etc/nginx/sites-available/$PRODUCTION_DOMAIN"
    local ssl_cert="/etc/letsencrypt/live/$PRODUCTION_DOMAIN/fullchain.pem"
    local ssl_key="/etc/letsencrypt/live/$PRODUCTION_DOMAIN/privkey.pem"
    
    # Update SSL certificate paths in nginx config
    if [ -f "$nginx_conf" ]; then
        # Replace certificate paths with Let's Encrypt paths
        sed -i "s|ssl_certificate .*|ssl_certificate $ssl_cert;|" "$nginx_conf"
        sed -i "s|ssl_certificate_key .*|ssl_certificate_key $ssl_key;|" "$nginx_conf"
        
        # Test nginx configuration
        if nginx -t; then
            systemctl reload nginx
            success "Nginx SSL configuration updated and reloaded"
        else
            error "Nginx configuration test failed after SSL setup"
            return 1
        fi
    else
        warning "Nginx configuration file not found: $nginx_conf"
        return 1
    fi
}

configure_nginx_enhanced() {
    log "Configuring Nginx with enhanced settings..."
    
    local nginx_conf="/etc/nginx/sites-available/$PRODUCTION_DOMAIN"
    local nginx_enabled="/etc/nginx/sites-enabled/$PRODUCTION_DOMAIN"
    
    # Create nginx configuration directory
    mkdir -p "/etc/nginx/sites-available"
    mkdir -p "/etc/nginx/sites-enabled"
    
    # Check if SSL certificates exist
    local ssl_cert="/etc/letsencrypt/live/$PRODUCTION_DOMAIN/fullchain.pem"
    local ssl_key="/etc/letsencrypt/live/$PRODUCTION_DOMAIN/privkey.pem"
    local has_ssl=false
    
    if [ -f "$ssl_cert" ] && [ -f "$ssl_key" ]; then
        has_ssl=true
        log "SSL certificates found - configuring HTTPS"
    else
        log "No SSL certificates found - configuring HTTP only"
    fi
    
    # Create enhanced nginx configuration
    cat > "$nginx_conf" << NGINX_EOF
server {
    listen 80;
    server_name $PRODUCTION_DOMAIN www.$PRODUCTION_DOMAIN;
    
$(if [ "$has_ssl" = "true" ]; then
cat << SSL_REDIRECT_EOF
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $PRODUCTION_DOMAIN www.$PRODUCTION_DOMAIN;
    
    # SSL Configuration
    ssl_certificate $ssl_cert;
    ssl_certificate_key $ssl_key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
SSL_REDIRECT_EOF
else
cat << HTTP_ONLY_EOF
    # HTTP only configuration
HTTP_ONLY_EOF
fi)
    
    # Common configuration for both HTTP and HTTPS
    root /var/www/html;
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # CORS headers for API requests
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    add_header Access-Control-Expose-Headers "Content-Length,Content-Range" always;
    
    # Handle preflight OPTIONS requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type "text/plain; charset=utf-8";
        add_header Content-Length 0;
        return 204;
    }
    
    # Proxy to FilmFlex application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        
        # Additional CORS headers for proxied requests
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin "*" always;
    }
    
    # API specific configuration
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # API specific CORS
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Credentials "true" always;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # Security - deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /(package\.json|tsconfig\.json|\.env.*)\$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Logs
    access_log /var/log/nginx/$PRODUCTION_DOMAIN.access.log;
    error_log /var/log/nginx/$PRODUCTION_DOMAIN.error.log;
}
NGINX_EOF
    
    # Enable the site
    if [ ! -L "$nginx_enabled" ]; then
        ln -sf "$nginx_conf" "$nginx_enabled"
    fi
    
    # Remove default nginx site if it exists
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        rm -f "/etc/nginx/sites-enabled/default"
    fi
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        success "Nginx enhanced configuration applied and reloaded"
        
        # Show configuration summary
        log "Nginx configuration summary:"
        log "  • Domain: $PRODUCTION_DOMAIN"
        log "  • SSL: $([ "$has_ssl" = "true" ] && echo "Enabled (HTTPS)" || echo "Disabled (HTTP only)")"
        log "  • Proxy target: http://127.0.0.1:5000"
        log "  • CORS: Enabled for all origins"
        log "  • Compression: Enabled"
        
        return 0
    else
        error "Nginx configuration test failed"
        return 1
    fi
}

setup_database_comprehensive() {
    log "Setting up comprehensive database with authentication fixes..."
    
    # Check if we're using Docker
    if check_docker_containers; then
        log "Using Docker database - verifying connection..."
        local movie_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | xargs)
        
        if [ ! -z "$movie_count" ] && [ "$movie_count" -gt 0 ]; then
            success "Docker database verified: $movie_count movies loaded"
            return 0
        else
            warning "Docker database may be initializing..."
        fi
    else
        # Setup local PostgreSQL
        setup_local_postgresql
    fi
}

setup_local_postgresql() {
    log "Setting up local PostgreSQL with authentication fixes..."
    
    # Install PostgreSQL if not installed
    if ! command -v psql &> /dev/null; then
        log "Installing PostgreSQL..."
        apt-get update
        apt-get install -y postgresql postgresql-contrib
    fi
    
    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Fix authentication method
    local pg_version=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP "PostgreSQL \K[0-9]+" | head -1)
    local pg_hba_path="/etc/postgresql/${pg_version}/main/pg_hba.conf"
    
    if [ -f "$pg_hba_path" ]; then
        log "Fixing PostgreSQL authentication method..."
        cp "$pg_hba_path" "${pg_hba_path}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Change peer to md5 and scram-sha-256 to md5
        sed -i 's/local[[:space:]]\+all[[:space:]]\+all[[:space:]]\+peer/local   all             all                                     md5/' "$pg_hba_path"
        sed -i 's/host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+127\.0\.0\.1\/32[[:space:]]\+scram-sha-256/host    all             all             127.0.0.1\/32            md5/' "$pg_hba_path"
        sed -i 's/host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+::1\/128[[:space:]]\+scram-sha-256/host    all             all             ::1\/128                 md5/' "$pg_hba_path"
        
        systemctl restart postgresql
        sleep 5
    fi
    
    # Create user and database
    sudo -u postgres psql << 'EOSQL'
DROP USER IF EXISTS filmflex;
CREATE USER filmflex WITH PASSWORD 'filmflex2024' LOGIN CREATEDB SUPERUSER;
DROP DATABASE IF EXISTS filmflex;
CREATE DATABASE filmflex OWNER filmflex;
EOSQL
    
    # Apply schema if available
    local schema_file="$SOURCE_DIR/shared/filmflex_schema.sql"
    if [ -f "$schema_file" ]; then
        log "Applying database schema..."
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$schema_file"
        success "Database schema applied"
    fi
}

setup_cors_configuration() {
    log "Setting up CORS configuration..."
    
    # Test CORS from different origins
    local cors_test1=$(curl -s -I -H "Origin: https://$PRODUCTION_DOMAIN" http://localhost:5000/api/health | grep -i "access-control-allow-origin" || echo "No CORS headers")
    
    if [[ "$cors_test1" == *"access-control-allow-origin"* ]]; then
        success "CORS is properly configured"
    else
        warning "CORS configuration may need adjustment"
        
        # Update environment with proper CORS settings
        if [ -f "$DEPLOY_DIR/.env" ]; then
            grep -v "ALLOWED_ORIGINS=" "$DEPLOY_DIR/.env" > "$DEPLOY_DIR/.env.tmp"
            echo "ALLOWED_ORIGINS=https://$PRODUCTION_DOMAIN,https://www.$PRODUCTION_DOMAIN,http://localhost:3000,*" >> "$DEPLOY_DIR/.env.tmp"
            mv "$DEPLOY_DIR/.env.tmp" "$DEPLOY_DIR/.env"
            success "Updated CORS configuration"
        fi
    fi
}

verify_production_deployment() {
    log "Verifying production deployment..."
    
    # Check container status
    local container_status=$(docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}")
    log "Container status:\n$container_status"
    
    # Verify database connection and movie count
    local movie_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | xargs)
    
    if [ ! -z "$movie_count" ] && [ "$movie_count" -gt 0 ]; then
        success "Database verified: $movie_count movies loaded"
    else
        warning "Could not verify movie count - database may still be initializing"
    fi
    
    # Test application endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"; then
        success "Application is responding correctly"
    else
        warning "Application may still be starting up"
    fi
}

create_comprehensive_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="/var/backups/filmflex"
    
    log "Creating comprehensive backup: $backup_name"
    mkdir -p "$backup_dir"
    
    # Backup application files
    if [ -d "$DEPLOY_DIR" ]; then
        tar -czf "$backup_dir/${backup_name}_app.tar.gz" -C "$DEPLOY_DIR" . 2>/dev/null || true
    fi
    
    # Backup database
    if check_docker_containers; then
        docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_dir/${backup_name}_db.sql.gz" 2>/dev/null || true
    elif command -v psql &> /dev/null; then
        PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$backup_dir/${backup_name}_db.sql.gz" 2>/dev/null || true
    fi
    
    # Backup configuration files
    if [ -f "/etc/nginx/sites-available/$PRODUCTION_DOMAIN" ]; then
        cp "/etc/nginx/sites-available/$PRODUCTION_DOMAIN" "$backup_dir/${backup_name}_nginx.conf"
    fi
    
    success "Backup created: $backup_name"
}

setup_firewall_rules() {
    log "Setting up firewall rules..."
    
    # Enable UFW
    ufw --force enable
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application port
    ufw allow 5000/tcp
    
    # Allow PostgreSQL (only from localhost)
    ufw allow from 127.0.0.1 to any port 5432
    
    success "Firewall rules configured"
}

setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Install and configure fail2ban
    if ! command -v fail2ban-server &> /dev/null; then
        apt-get install -y fail2ban
    fi
    
    # Create jail.local for SSH protection
    cat > /etc/fail2ban/jail.local << 'FAIL2BAN_EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
FAIL2BAN_EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    success "Basic monitoring configured"
}

# ...existing code...

show_deployment_summary() {
    print_banner "Deployment Summary"
    
    local current_time=$(date)
    local uptime=$(uptime -p 2>/dev/null || echo "Unknown")
    
    log "✅ Deployment completed successfully!"
    log "📅 Time: $current_time"
    log "💻 Server: $PRODUCTION_IP"
    log "🌐 Domain: $PRODUCTION_DOMAIN"
    log "⏱️  Uptime: $uptime"
    
    if check_docker_containers; then
        local movie_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | xargs)
        log "🎬 Movies: ${movie_count:-Unknown}"
    fi
    
    echo
    info "🌐 Application URLs:"
    info "  • Local: http://localhost:5000"
    info "  • Production: http://$PRODUCTION_IP:5000"
    if [ -f "/etc/letsencrypt/live/$PRODUCTION_DOMAIN/fullchain.pem" ]; then
        info "  • HTTPS: https://$PRODUCTION_DOMAIN"
    else
        info "  • HTTP: http://$PRODUCTION_DOMAIN (SSL not configured)"
    fi
    
    echo
    info "📊 Management Commands:"
    info "  • Health check: $0 health"
    info "  • Quick update: $0 quick"
    info "  • SSL setup: $0 ssl"
    info "  • Rollback: $0 rollback"
    info "  • View logs: tail -f $LOG_FILE"
    
    if check_docker_containers; then
        echo
        info "🐳 Docker Commands:"
        info "  • View logs: docker compose -f $COMPOSE_FILE logs -f"
        info "  • Restart: docker compose -f $COMPOSE_FILE restart"
        info "  • Stop: docker compose -f $COMPOSE_FILE down"
    fi
}

# ...existing code...

# =============================================================================
# MAIN EXECUTION - Enhanced
# =============================================================================

main() {
    local mode="full"
    local force=false
    local dry_run=false
    local verbose=false
    SKIP_TESTS=false
    SKIP_SSL=false
    CREATE_BACKUP=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            full|production|development|docker|pm2|quick|ssl|database|health|rollback|setup)
                mode="$1"
                ;;
            --force)
                force=true
                ;;
            --dry-run)
                dry_run=true
                ;;
            --verbose)
                verbose=true
                ;;
            --skip-tests)
                SKIP_TESTS=true
                ;;
            --no-ssl)
                SKIP_SSL=true
                ;;
            --backup)
                CREATE_BACKUP=true
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
    
    # Initialize logging
    if command -v init_logging &> /dev/null; then
        init_logging "deploy-$mode"
    fi
    
    # Dry run mode
    if [ "$dry_run" = "true" ]; then
        log "DRY RUN MODE - No changes will be made"
        log "Would execute: $mode deployment"
        log "Source: $SOURCE_DIR"
        log "Target: $DEPLOY_DIR"
        log "Domain: $PRODUCTION_DOMAIN ($PRODUCTION_IP)"
        return 0
    fi
    
    # Confirmation for production deployments
    if [ "$force" = "false" ] && [[ "$mode" =~ ^(full|production)$ ]]; then
        echo -e "\033[1;33mThis will perform a $mode deployment.\033[0m"
        echo -e "\033[1;33mTarget: $PRODUCTION_DOMAIN ($PRODUCTION_IP)\033[0m"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
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
            run_comprehensive_health_check
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
    
    # Cleanup
    if command -v cleanup_old_logs &> /dev/null; then
        cleanup_old_logs 7
    fi
    
    # Final summary (unless it's just a health check)
    if [ "$mode" != "health" ]; then
        show_deployment_summary
    fi
}

# Helper function to check if Docker containers are running
check_docker_containers() {
    if command -v docker &> /dev/null; then
        docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" ps --services --filter "status=running" | grep -q "app\|postgres"
    else
        return 1
    fi
}

# Helper function to acquire deployment lock
acquire_lock() {
    local lock_name="$1"
    local lock_file="/tmp/filmflex-${lock_name}.lock"
    
    if [ -f "$lock_file" ]; then
        local lock_pid=$(cat "$lock_file")
        if kill -0 "$lock_pid" 2>/dev/null; then
            return 1
        else
            rm -f "$lock_file"
        fi
    fi
    
    echo $$ > "$lock_file"
    return 0
}

# Execute main function
main "$@"