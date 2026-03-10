#!/bin/bash

echo "🌐 FilmFlex Nginx Setup & Deployment Automation"
echo "==============================================="
echo "📅 Date: $(date)"
echo "🎯 Target: Production Server Configuration"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh" 2>/dev/null || {
    # Fallback functions if common-functions not available
    print_status() { echo -e "\033[0;32m✅ $1\033[0m"; }
    print_warning() { echo -e "\033[1;33m⚠️  $1\033[0m"; }
    print_error() { echo -e "\033[0;31m❌ $1\033[0m"; }
    print_info() { echo -e "\033[0;34mℹ️  $1\033[0m"; }
    print_header() { echo -e "\033[0;35m🎯 $1\033[0m"; }
}

# Initialize logging
LOG_FILE="/var/log/filmflex/nginx-setup-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || LOG_FILE="/tmp/nginx-setup.log"

# Configuration variables
NGINX_CONFIG_DIR="/etc/nginx"
NGINX_SITES_AVAILABLE="$NGINX_CONFIG_DIR/sites-available"
NGINX_SITES_ENABLED="$NGINX_CONFIG_DIR/sites-enabled"
STATIC_FILES_DIR="/var/www/filmflex/dist/public"
DOMAIN="phimgg.com"
BACKUP_DIR="/var/backups/nginx"

# Parse command line arguments
FORCE_RESTART=false
SKIP_STATIC_SYNC=false
CUSTOM_DOMAIN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --force-restart)
            FORCE_RESTART=true
            shift
            ;;
        --skip-static)
            SKIP_STATIC_SYNC=true
            shift
            ;;
        --domain=*)
            CUSTOM_DOMAIN="${1#*=}"
            DOMAIN="$CUSTOM_DOMAIN"
            shift
            ;;
        --help|-h)
            show_nginx_usage
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

show_nginx_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --force-restart    Force Nginx restart instead of reload"
    echo "  --skip-static      Skip static file synchronization"
    echo "  --domain=DOMAIN    Use custom domain (default: phimgg.com)"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Standard setup"
    echo "  $0 --force-restart                   # Setup with restart"
    echo "  $0 --domain=mysite.com               # Custom domain"
    echo "  $0 --skip-static --force-restart     # Skip static sync, force restart"
    echo ""
}

# Backup existing configuration
backup_nginx_config() {
    print_header "📦 Backing up existing Nginx configuration"
    
    # Create backup directory with timestamp
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup main nginx.conf
    if [ -f "$NGINX_CONFIG_DIR/nginx.conf" ]; then
        cp "$NGINX_CONFIG_DIR/nginx.conf" "$backup_path/nginx.conf.backup"
        print_status "Backed up main nginx.conf"
    fi
    
    # Backup site configuration
    if [ -f "$NGINX_SITES_AVAILABLE/$DOMAIN" ]; then
        cp "$NGINX_SITES_AVAILABLE/$DOMAIN" "$backup_path/$DOMAIN.backup"
        print_status "Backed up $DOMAIN configuration"
    fi
    
    # Keep only last 5 backups
    find "$BACKUP_DIR" -name "backup_*" -type d | sort | head -n -5 | xargs rm -rf 2>/dev/null || true
    
    print_info "Backup stored in: $backup_path"
    echo "$backup_path" > /tmp/nginx_backup_path
}

# Setup rate limiting zones in main nginx.conf
setup_rate_limiting() {
    print_header "⚡ Configuring rate limiting zones"
    
    local nginx_conf="$NGINX_CONFIG_DIR/nginx.conf"
    
    # Check if rate limiting zones already exist
    if grep -q "limit_req_zone.*general" "$nginx_conf"; then
        print_status "Rate limiting zones already configured"
        return 0
    fi
    
    # Create temporary file with rate limiting configuration
    local temp_conf="/tmp/nginx_rate_limiting.conf"
    cat > "$temp_conf" << 'EOF'
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;
EOF

    # Insert rate limiting configuration into nginx.conf
    # Find the http block and add rate limiting after it
    if grep -q "http {" "$nginx_conf"; then
        # Create backup
        cp "$nginx_conf" "$nginx_conf.bak.$(date +%s)"
        
        # Insert rate limiting configuration after http {
        awk '
            /^[[:space:]]*http[[:space:]]*{/ {
                print $0
                print "    # Rate limiting zones"
                print "    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;"
                print "    limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;"
                print "    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;"
                print ""
                next
            }
            { print }
        ' "$nginx_conf" > "$nginx_conf.tmp" && mv "$nginx_conf.tmp" "$nginx_conf"
        
        print_status "Rate limiting zones configured successfully"
    else
        print_error "Could not find http block in nginx.conf"
        return 1
    fi
    
    rm -f "$temp_conf"
}

# Sync static files from Docker container
sync_static_files() {
    if [ "$SKIP_STATIC_SYNC" = true ]; then
        print_info "Static file synchronization skipped"
        return 0
    fi
    
    print_header "📁 Synchronizing static files from Docker container"
    
    # Ensure static files directory exists
    mkdir -p "$STATIC_FILES_DIR"
    
    # Check if container is running
    if ! docker ps | grep -q filmflex-app; then
        print_error "FilmFlex app container not running - cannot sync static files"
        return 1
    fi
    
    # Remove old static files
    print_info "Cleaning old static files..."
    rm -rf "${STATIC_FILES_DIR:?}"/* 2>/dev/null || true
    
    # Copy static files from container
    print_info "Copying static files from container..."
    if docker cp filmflex-app:/app/dist/public/. "$STATIC_FILES_DIR/"; then
        print_status "Static files synchronized successfully"
        
        # Set proper permissions
        chown -R www-data:www-data "$STATIC_FILES_DIR" 2>/dev/null || true
        chmod -R 644 "$STATIC_FILES_DIR" 2>/dev/null || true
        find "$STATIC_FILES_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
        
        # Show file count
        local file_count=$(find "$STATIC_FILES_DIR" -type f | wc -l)
        print_info "Synchronized $file_count static files"
        
        # Verify critical assets exist
        if [ -f "$STATIC_FILES_DIR/index.html" ]; then
            print_status "index.html found"
        else
            print_error "index.html missing - this will cause issues"
            return 1
        fi
        
        if [ -d "$STATIC_FILES_DIR/assets" ]; then
            local asset_count=$(ls -1 "$STATIC_FILES_DIR/assets" | wc -l)
            print_status "Assets directory found with $asset_count files"
        else
            print_warning "Assets directory missing"
        fi
        
        return 0
    else
        print_error "Failed to copy static files from container"
        return 1
    fi
}

# Generate Nginx site configuration
generate_site_config() {
    print_header "📝 Generating Nginx site configuration for $DOMAIN"
    
    local config_file="$NGINX_SITES_AVAILABLE/$DOMAIN"
    
    # Generate the configuration
    cat > "$config_file" << EOF
# HTTP server - redirects to HTTPS and handles Let's Encrypt challenges
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server - main configuration with static file serving
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Max-Age "1728000" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Logging
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log warn;

    # Static files root directory
    root $STATIC_FILES_DIR;

    # Handle OPTIONS requests for CORS
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header Content-Length 0;
            add_header Content-Type "text/plain charset=UTF-8";
            return 204;
        }
        
        limit_req zone=general burst=10 nodelay;
        try_files \$uri \$uri/ /index.html @backend;
        add_header X-Cache-Status "SPA";
    }

    # Static file serving with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        try_files \$uri @backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC-FILE";
        access_log off;
    }

    # Manifest and service worker files
    location ~* \.(json|webmanifest)$ {
        try_files \$uri @backend;
        expires 1h;
        add_header Cache-Control "public";
    }

    # Service worker - no caching
    location = /sw.js {
        try_files \$uri @backend;
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no rate limiting)
    location = /api/health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        access_log off;
    }

    # Backend fallback
    location @backend {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Security: deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

    print_status "Site configuration generated: $config_file"
}

# Enable site configuration
enable_site() {
    print_header "🔗 Enabling site configuration"
    
    local config_file="$NGINX_SITES_AVAILABLE/$DOMAIN"
    local symlink="$NGINX_SITES_ENABLED/$DOMAIN"
    
    if [ ! -f "$config_file" ]; then
        print_error "Site configuration not found: $config_file"
        return 1
    fi
    
    # Remove existing symlink if it exists
    if [ -L "$symlink" ]; then
        rm "$symlink"
        print_info "Removed existing symlink"
    fi
    
    # Create new symlink
    ln -s "$config_file" "$symlink"
    print_status "Site enabled: $DOMAIN"
    
    # Disable default site if it exists and is enabled
    if [ -L "$NGINX_SITES_ENABLED/default" ]; then
        rm "$NGINX_SITES_ENABLED/default"
        print_info "Disabled default site"
    fi
}

# Test and reload Nginx configuration
test_and_reload_nginx() {
    print_header "🧪 Testing and reloading Nginx configuration"
    
    # Test configuration syntax
    print_info "Testing Nginx configuration syntax..."
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration syntax is valid"
    else
        print_error "Nginx configuration has syntax errors:"
        nginx -t
        return 1
    fi
    
    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        print_info "Nginx is running"
        
        if [ "$FORCE_RESTART" = true ]; then
            print_info "Force restart requested - restarting Nginx..."
            if systemctl restart nginx; then
                print_status "Nginx restarted successfully"
            else
                print_error "Failed to restart Nginx"
                return 1
            fi
        else
            print_info "Reloading Nginx configuration..."
            if systemctl reload nginx; then
                print_status "Nginx configuration reloaded successfully"
            else
                print_warning "Reload failed, attempting restart..."
                if systemctl restart nginx; then
                    print_status "Nginx restarted successfully"
                else
                    print_error "Failed to restart Nginx"
                    return 1
                fi
            fi
        fi
    else
        print_info "Nginx is not running - starting service..."
        if systemctl start nginx; then
            print_status "Nginx started successfully"
        else
            print_error "Failed to start Nginx"
            return 1
        fi
    fi
    
    # Enable Nginx to start on boot
    systemctl enable nginx 2>/dev/null || true
    
    return 0
}

# Verify deployment
verify_nginx_deployment() {
    print_header "✅ Verifying Nginx deployment"
    
    local success=true
    
    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        print_status "Nginx service is active"
    else
        print_error "Nginx service is not active"
        success=false
    fi
    
    # Check if listening on correct ports
    if ss -tln | grep -q ":80 "; then
        print_status "Nginx listening on port 80 (HTTP)"
    else
        print_error "Nginx not listening on port 80"
        success=false
    fi
    
    if ss -tln | grep -q ":443 "; then
        print_status "Nginx listening on port 443 (HTTPS)"
    else
        print_warning "Nginx not listening on port 443 (SSL may not be configured)"
    fi
    
    # Test local HTTP connection
    local http_response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1 2>/dev/null || echo "000")
    if [ "$http_response" = "301" ] || [ "$http_response" = "302" ]; then
        print_status "HTTP redirect working (HTTP $http_response)"
    else
        print_warning "HTTP redirect may not be working (HTTP $http_response)"
    fi
    
    # Test if static files are accessible
    if [ -f "$STATIC_FILES_DIR/index.html" ]; then
        print_status "Static files directory is accessible"
        local static_count=$(find "$STATIC_FILES_DIR" -type f | wc -l)
        print_info "Static files count: $static_count"
    else
        print_error "Static files directory or index.html not found"
        success=false
    fi
    
    # Check configuration file syntax once more
    if nginx -t >/dev/null 2>&1; then
        print_status "Configuration syntax is valid"
    else
        print_error "Configuration syntax has errors"
        success=false
    fi
    
    if [ "$success" = true ]; then
        print_status "✅ Nginx deployment verification completed successfully"
        return 0
    else
        print_error "❌ Nginx deployment verification failed"
        return 1
    fi
}

# Main deployment function
main() {
    print_info "Starting Nginx deployment automation for domain: $DOMAIN"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR" "$STATIC_FILES_DIR"
    
    # Run deployment steps
    backup_nginx_config || { print_error "Backup failed"; exit 1; }
    setup_rate_limiting || { print_error "Rate limiting setup failed"; exit 1; }
    sync_static_files || { print_error "Static file sync failed"; exit 1; }
    generate_site_config || { print_error "Site config generation failed"; exit 1; }
    enable_site || { print_error "Site enabling failed"; exit 1; }
    test_and_reload_nginx || { print_error "Nginx reload failed"; exit 1; }
    verify_nginx_deployment || { print_error "Deployment verification failed"; exit 1; }
    
    # Success summary
    echo ""
    print_header "🎉 Nginx Deployment Completed Successfully!"
    print_status "Domain: https://$DOMAIN"
    print_status "Static files: $STATIC_FILES_DIR"
    print_status "Configuration: $NGINX_SITES_AVAILABLE/$DOMAIN"
    print_status "Log file: $LOG_FILE"
    
    echo ""
    print_info "Next steps:"
    print_info "• Test website: curl -I https://$DOMAIN"
    print_info "• Check logs: tail -f /var/log/nginx/$DOMAIN.access.log"
    print_info "• Monitor status: systemctl status nginx"
    print_info "• Re-run anytime: $0"
    
    print_status "Nginx deployment automation completed! 🌐"
}

# Run main function
main "$@"