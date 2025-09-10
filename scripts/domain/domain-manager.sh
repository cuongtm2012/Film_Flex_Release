#!/bin/bash

# =============================================================================
# FilmFlex Complete Domain & SSL Management Script v6.0
# =============================================================================
# This unified script handles all domain and SSL tasks:
# - DNS diagnostics and troubleshooting  
# - Domain configuration and setup
# - SSL certificate installation with Let's Encrypt
# - Nginx configuration with HTTPS
# - Automated monitoring and fixes
# - Emergency CORS and SSL fixes
# - Production deployment integration
# - Comprehensive SSL testing and validation
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_DOMAIN="phimgg.com"
DEFAULT_SERVER_IP="38.54.14.154"
DEFAULT_EMAIL="admin@phimgg.com"
DEFAULT_APP_PORT="5000"

# Global variables
DOMAIN=""
SERVER_IP=""
EMAIL=""
APP_PORT=""
APP_DIR="/var/www/filmflex"
NGINX_CONF=""
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
SSL_ENABLED=false
FORCE_RENEW=false

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "============================================================================="
    echo "                   FilmFlex Domain & SSL Management Suite"
    echo "============================================================================="
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_message() {
    echo "[$DATE] $1" >> "$LOG_DIR/domain-manager.log"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        print_info "Usage: sudo $0 [command] [options]"
        exit 1
    fi
}

setup_variables() {
    DOMAIN="${1:-$DEFAULT_DOMAIN}"
    SERVER_IP="${2:-$DEFAULT_SERVER_IP}"
    EMAIL="${3:-$DEFAULT_EMAIL}"
    APP_PORT="${4:-$DEFAULT_APP_PORT}"
    NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    print_info "Configuration:"
    echo "  Domain: $DOMAIN"
    echo "  Server IP: $SERVER_IP"
    echo "  Email: $EMAIL"
    echo "  App Port: $APP_PORT"
    echo "  App Directory: $APP_DIR"
}

show_usage() {
    print_banner
    echo -e "${YELLOW}🚀 Domain & SSL Management Commands:${NC}"
    echo ""
    echo -e "${GREEN}Essential Commands:${NC}"
    echo "  $0 dns-check [domain]               - ⚡ Quick DNS status check (run this first!)"
    echo "  $0 setup [domain] [ip] [email]      - 🔧 Complete domain and SSL setup"
    echo "  $0 ssl [domain] [email]             - 🔒 Install/renew SSL certificate only"
    echo ""
    echo -e "${BLUE}Diagnostic Commands:${NC}"
    echo "  $0 diagnose [domain]                - 🔍 Complete DNS/SSL diagnostics"
    echo "  $0 test-ssl [domain]                - 🛡️  Test SSL certificate and security"
    echo "  $0 monitor [domain]                 - 📊 Real-time monitoring"
    echo ""
    echo -e "${PURPLE}Advanced Commands:${NC}"
    echo "  $0 ssl-force [domain] [email]       - 🔄 Force renew SSL certificate"
    echo "  $0 nginx-setup [domain] [port]      - ⚙️  Setup nginx configuration only"
    echo "  $0 fix-cors [domain]                - 🌐 Fix CORS issues"
    echo "  $0 emergency-fix [domain]           - 🚨 Emergency domain/SSL fix"
    echo ""
    echo -e "${YELLOW}📋 Current Issue Resolution:${NC}"
    echo -e "${RED}Your SSL fails because of multiple DNS A records!${NC}"
    echo ""
    echo -e "${CYAN}Step-by-Step Solution:${NC}"
    echo "  1️⃣  sudo $0 dns-check phimgg.com"
    echo "     👆 This will show you exactly what's wrong"
    echo ""
    echo "  2️⃣  Fix DNS in your registrar (remove extra IPs)"
    echo "     👆 Remove: 15.197.225.128 and 3.33.251.168"
    echo "     👆 Keep only: 38.54.14.154"
    echo ""
    echo "  3️⃣  sudo $0 ssl phimgg.com admin@phimgg.com"
    echo "     👆 Install SSL after DNS is clean"
    echo ""
    echo -e "${GREEN}Quick Test Examples:${NC}"
    echo "  sudo $0 dns-check phimgg.com        # Check current DNS status"
    echo "  sudo $0 diagnose phimgg.com         # Full diagnostic report"
    echo ""
}

# =============================================================================
# DNS FUNCTIONS
# =============================================================================

check_dns_records() {
    print_section "DNS Records Check"
    
    local dns_ok=true
    local record_count=0
    
    print_info "Checking A record for $DOMAIN..."
    local domain_result=$(dig +short $DOMAIN A 2>/dev/null || echo "")
    
    if [ -n "$domain_result" ]; then
        echo "Current A records:"
        record_count=$(echo "$domain_result" | wc -l)
        
        # Check each IP
        while read -r ip; do
            if [ -n "$ip" ]; then
                if [ "$ip" = "$SERVER_IP" ]; then
                    echo -e "  ${GREEN}✅ $ip${NC} (correct)"
                else
                    echo -e "  ${RED}❌ $ip${NC} (should be removed)"
                    dns_ok=false
                fi
            fi
        done <<< "$domain_result"
        
        # Check record count
        print_info "Total A records found: $record_count"
        
        if [ "$record_count" -gt 1 ]; then
            print_error "Multiple A records detected - SSL will fail"
            print_warning "Let's Encrypt will try to validate all IPs and fail on wrong ones"
            dns_ok=false
        fi
        
        # Check if our server IP is in the list
        if echo "$domain_result" | grep -q "$SERVER_IP"; then
            print_success "Target server IP found in DNS records"
        else
            print_error "Target server IP ($SERVER_IP) not found in DNS"
            dns_ok=false
        fi
    else
        print_error "No A record found for $DOMAIN"
        dns_ok=false
    fi
    
    # Check WWW record
    print_info "Checking A record for www.$DOMAIN..."
    local www_result=$(dig +short www.$DOMAIN A 2>/dev/null || echo "")
    if [ -n "$www_result" ]; then
        if [ "$www_result" = "$SERVER_IP" ]; then
            print_success "WWW A record is correct: $www_result"
        else
            print_warning "WWW A record points to $www_result instead of $SERVER_IP"
            dns_ok=false
        fi
    else
        print_warning "No WWW A record found - recommended to add one"
    fi
    
    if [ "$dns_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

check_dns_propagation() {
    print_section "DNS Propagation Check"
    
    local dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")
    local dns_names=("Google" "Cloudflare" "OpenDNS" "Quad9")
    
    for i in "${!dns_servers[@]}"; do
        local dns_server="${dns_servers[$i]}"
        local dns_name="${dns_names[$i]}"
        
        print_info "Checking from $dns_name DNS ($dns_server)..."
        local result=$(dig @$dns_server +short $DOMAIN A 2>/dev/null || echo "")
        
        if [ -n "$result" ]; then
            local correct_only=true
            while read -r ip; do
                if [ -n "$ip" ]; then
                    if [ "$ip" = "$SERVER_IP" ]; then
                        echo -e "    ${GREEN}✅ $ip${NC} (correct)"
                    else
                        echo -e "    ${RED}❌ $ip${NC} (wrong)"
                        correct_only=false
                    fi
                fi
            done <<< "$result"
            
            if [ "$correct_only" = true ]; then
                print_success "$dns_name DNS is correctly propagated"
            else
                print_warning "$dns_name DNS still has multiple/wrong records"
            fi
        else
            echo -e "  ${RED}❌ No result from $dns_name${NC}"
        fi
    done
}

provide_dns_fix_instructions() {
    print_section "DNS Configuration Instructions"
    
    print_warning "DNS issues detected. Please follow these steps:"
    echo ""
    echo -e "${YELLOW}🌐 CRITICAL: SSL will fail until DNS is fixed!${NC}"
    echo ""
    echo -e "${YELLOW}1. Login to your domain registrar (GoDaddy, Namecheap, etc.)${NC}"
    echo -e "${YELLOW}2. Go to DNS Management for $DOMAIN${NC}"
    echo -e "${YELLOW}3. Remove these A records:${NC}"
    
    local current_ips=$(dig +short $DOMAIN A 2>/dev/null || echo "")
    if [ -n "$current_ips" ]; then
        while read -r ip; do
            if [ "$ip" != "$SERVER_IP" ] && [ -n "$ip" ]; then
                echo -e "   ${RED}❌ Remove: $ip${NC}"
            fi
        done <<< "$current_ips"
    fi
    
    echo -e "${YELLOW}4. Ensure these A records exist:${NC}"
    echo -e "   ${GREEN}✅ @ (root) → $SERVER_IP${NC}"
    echo -e "   ${GREEN}✅ www → $SERVER_IP${NC}"
    echo ""
    echo -e "${YELLOW}5. Save changes and wait 15-30 minutes for propagation${NC}"
    echo ""
    echo -e "${CYAN}Why this matters:${NC}"
    echo "• Let's Encrypt validates ALL A records"
    echo "• If any IP fails validation, SSL installation fails"
    echo "• Your current extra IPs (15.197.225.128, 3.33.251.168) are unreachable"
    echo ""
    echo -e "${GREEN}After fixing DNS:${NC}"
    echo "  sudo $0 dns-check $DOMAIN $SERVER_IP  # Verify cleanup"
    echo "  sudo $0 ssl $DOMAIN                   # Install SSL"
}

# =============================================================================
# SSL FUNCTIONS
# =============================================================================

install_certbot() {
    if ! command -v certbot &> /dev/null; then
        print_info "Installing Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
        print_success "Certbot installed"
    else
        print_info "Certbot is already installed"
    fi
}

check_existing_ssl() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_info "Existing SSL certificate found for $DOMAIN"
        
        # Check expiration
        local exp_date=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
        if [ -n "$exp_date" ]; then
            local exp_timestamp=$(date -d "$exp_date" +%s 2>/dev/null || echo "0")
            local current_timestamp=$(date +%s)
            local days_left=$(( (exp_timestamp - current_timestamp) / 86400 ))
            
            if [ $days_left -gt 30 ]; then
                print_success "SSL certificate is valid for $days_left more days"
                return 0  # Certificate exists and is valid
            else
                print_warning "SSL certificate expires in $days_left days"
                return 1  # Certificate needs renewal
            fi
        else
            print_warning "Could not check SSL certificate expiration"
            return 1
        fi
    else
        print_info "No existing SSL certificate found"
        return 1  # No certificate
    fi
}

get_ssl_certificate() {
    print_section "SSL Certificate Installation"
    
    install_certbot
    
    # Pre-flight DNS check
    print_info "Pre-flight DNS validation..."
    local dns_record_count=$(dig +short $DOMAIN A 2>/dev/null | wc -l)
    local domain_ips=$(dig +short $DOMAIN A 2>/dev/null || echo "")
    
    if [ "$dns_record_count" -gt 1 ]; then
        print_error "Multiple A records detected ($dns_record_count records)"
        print_error "Let's Encrypt will validate ALL records and fail if any are unreachable"
        echo ""
        echo "Current A records:"
        while read -r ip; do
            if [ -n "$ip" ]; then
                if [ "$ip" = "$SERVER_IP" ]; then
                    echo -e "  ${GREEN}✅ $ip${NC} (reachable)"
                else
                    echo -e "  ${RED}❌ $ip${NC} (unreachable - will cause SSL failure)"
                fi
            fi
        done <<< "$domain_ips"
        echo ""
        print_error "SSL installation aborted - fix DNS first"
        provide_dns_fix_instructions
        return 1
    fi
    
    # Check if certificate already exists and is valid
    if check_existing_ssl && [ "$FORCE_RENEW" = false ]; then
        print_info "Using existing valid SSL certificate"
        return 0
    fi
    
    print_info "Obtaining SSL certificate for $DOMAIN..."
    
    # Ensure webroot directory exists
    mkdir -p /var/www/html
    
    # Stop nginx temporarily for standalone validation
    print_info "Temporarily stopping nginx for SSL validation..."
    systemctl stop nginx 2>/dev/null || true
    
    # Try standalone method first
    local ssl_success=false
    local cert_log_file="/tmp/certbot-$DOMAIN.log"
    
    print_info "Attempting SSL certificate installation (standalone method)..."
    if certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN" \
        --non-interactive \
        --logs-dir /var/log/letsencrypt \
        ${FORCE_RENEW:+--force-renewal} > "$cert_log_file" 2>&1; then
        
        print_success "SSL certificate obtained successfully!"
        ssl_success=true
        log_message "SSL certificate obtained for $DOMAIN"
        
    else
        print_warning "Standalone method failed. Checking error details..."
        
        # Show relevant error details
        if grep -q "Invalid response" "$cert_log_file"; then
            print_error "Let's Encrypt validation failed:"
            grep "Detail:" "$cert_log_file" | head -5
            echo ""
            print_error "This indicates DNS or connectivity issues"
        fi
        
        print_info "Trying webroot method as fallback..."
        
        # Start nginx for webroot validation
        systemctl start nginx
        sleep 3
        
        if certbot certonly \
            --webroot \
            --webroot-path=/var/www/html \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            --domains "$DOMAIN,www.$DOMAIN" \
            --non-interactive \
            --logs-dir /var/log/letsencrypt \
            ${FORCE_RENEW:+--force-renewal} > "$cert_log_file" 2>&1; then
            
            print_success "SSL certificate obtained using webroot method!"
            ssl_success=true
            log_message "SSL certificate obtained for $DOMAIN using webroot"
        else
            print_error "Both standalone and webroot methods failed"
            print_error "SSL certificate installation failed"
            
            # Show specific error details
            if [ -f "$cert_log_file" ]; then
                echo ""
                print_warning "Error details:"
                grep -A2 -B2 "Error\|Failed\|Detail:" "$cert_log_file" | tail -10
            fi
            
            echo ""
            print_info "Common causes:"
            echo "• Multiple DNS A records (fix with DNS cleanup)"
            echo "• Firewall blocking port 80/443"
            echo "• Domain not pointing to this server"
            echo "• Rate limiting (wait 1 hour and try again)"
            
            log_message "SSL certificate installation failed for $DOMAIN"
        fi
    fi
    
    # Cleanup log file
    rm -f "$cert_log_file"
    
    # Restart nginx
    systemctl start nginx 2>/dev/null || true
    
    if [ "$ssl_success" = true ]; then
        SSL_ENABLED=true
        setup_ssl_renewal
        return 0
    else
        return 1
    fi
}

setup_ssl_renewal() {
    print_info "Setting up SSL auto-renewal..."
    
    # Test renewal process
    if certbot renew --dry-run --quiet 2>/dev/null; then
        print_success "SSL renewal test passed"
    else
        print_warning "SSL renewal test failed"
    fi
    
    # Add cron job for renewal
    local cron_job="0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
    
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
        print_success "SSL renewal cron job added"
    else
        print_info "SSL renewal cron job already exists"
    fi
}

create_nginx_ssl_config() {
    print_section "Creating Nginx SSL Configuration"
    
    cat > "$NGINX_CONF" << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Certificate paths
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Serve static files from React build
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # CORS headers for static files
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Cache control for HTML files
        location ~* \.html\$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header 'Access-Control-Allow-Origin' '*' always;
        }
    }

    # API proxy to backend server
    location /api/ {
        proxy_pass http://localhost:$APP_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # CORS headers for API
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Static assets optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot|otf)\$ {
        root $APP_DIR/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header 'Access-Control-Allow-Origin' '*' always;
        
        # Enable gzip
        gzip_static on;
    }

    # Security: block sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /\.env {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Health check
    location = /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml;

    # Logging
    access_log /var/log/nginx/$DOMAIN.access.log combined;
    error_log /var/log/nginx/$DOMAIN.error.log warn;
}
EOF

    print_success "Nginx SSL configuration created"
}

create_nginx_http_config() {
    print_section "Creating Nginx HTTP Configuration"
    
    cat > "$NGINX_CONF" << EOF
# HTTP server block (temporary, before SSL)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Serve static files from React build
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:$APP_PORT/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers for API
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot|otf)\$ {
        root $APP_DIR/dist;
        expires 30d;
        add_header Cache-Control "public";
        add_header 'Access-Control-Allow-Origin' '*' always;
    }

    # Logging
    access_log /var/log/nginx/$DOMAIN.access.log combined;
    error_log /var/log/nginx/$DOMAIN.error.log warn;
}
EOF

    print_success "Nginx HTTP configuration created"
}

test_nginx_config() {
    print_info "Testing nginx configuration..."
    if nginx -t 2>/dev/null; then
        print_success "Nginx configuration is valid"
        return 0
    else
        print_error "Nginx configuration test failed"
        nginx -t
        return 1
    fi
}

reload_nginx() {
    print_info "Reloading nginx..."
    
    # Enable the site
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/"
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    if test_nginx_config; then
        systemctl reload nginx
        print_success "Nginx reloaded successfully"
        return 0
    else
        return 1
    fi
}

# =============================================================================
# SSL TESTING FUNCTIONS
# =============================================================================

test_ssl_certificate() {
    print_section "SSL Certificate Testing"
    
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_error "No SSL certificate found for $DOMAIN"
        return 1
    fi
    
    # Test certificate validity
    print_info "Testing certificate validity..."
    local cert_info=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout 2>/dev/null)
    
    if [ -n "$cert_info" ]; then
        # Check expiration
        local exp_date=$(echo "$cert_info" | grep "Not After" | cut -d: -f2-)
        print_info "Certificate expires: $exp_date"
        
        # Check domains
        local cert_domains=$(echo "$cert_info" | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | sed 's/,//g' || echo "")
        print_info "Certificate covers domains: $cert_domains"
    fi
    
    # Test HTTPS connection
    print_info "Testing HTTPS connection..."
    local https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/" 2>/dev/null || echo "000")
    
    if [ "$https_status" = "200" ]; then
        print_success "HTTPS connection successful (HTTP $https_status)"
    else
        print_warning "HTTPS connection failed (HTTP $https_status)"
    fi
    
    # Test SSL security
    test_ssl_security
}

test_ssl_security() {
    print_info "Testing SSL security configuration..."
    
    # Test TLS version
    local tls_test=$(echo | openssl s_client -connect "$DOMAIN:443" -tls1_2 2>/dev/null | grep "Protocol" || echo "")
    if [ -n "$tls_test" ]; then
        print_success "TLS 1.2+ supported"
    else
        print_warning "TLS version check failed"
    fi
    
    # Test HSTS header
    local hsts_header=$(curl -s -I "https://$DOMAIN/" 2>/dev/null | grep -i "strict-transport-security" || echo "")
    if [ -n "$hsts_header" ]; then
        print_success "HSTS header present"
    else
        print_warning "HSTS header missing"
    fi
    
    # Test certificate chain
    print_info "Validating certificate chain..."
    if echo | openssl s_client -connect "$DOMAIN:443" -verify_return_error 2>/dev/null >/dev/null; then
        print_success "Certificate chain is valid"
    else
        print_warning "Certificate chain validation failed"
    fi
}

test_cors_with_ssl() {
    print_section "Testing CORS with SSL"
    
    local test_origins=("https://$DOMAIN" "http://localhost:3000" "https://example.com")
    
    for origin in "${test_origins[@]}"; do
        print_info "Testing CORS from origin: $origin"
        
        local cors_response=$(curl -s -I -H "Origin: $origin" "https://$DOMAIN/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
        
        if [ -n "$cors_response" ]; then
            print_success "CORS response: $(echo $cors_response | tr -d '\r\n')"
        else
            print_warning "No CORS headers found for $origin"
        fi
    done
    
    # Test OPTIONS request
    print_info "Testing CORS preflight (OPTIONS)..."
    local options_response=$(curl -s -I -X OPTIONS -H "Origin: https://$DOMAIN" -H "Access-Control-Request-Method: GET" "https://$DOMAIN/api/health" 2>/dev/null || echo "")
    
    if echo "$options_response" | grep -qi "access-control-allow"; then
        print_success "CORS preflight working"
    else
        print_warning "CORS preflight may have issues"
    fi
}

# =============================================================================
# MAIN OPERATION FUNCTIONS
# =============================================================================

verify_dns_ready_for_ssl() {
    print_section "DNS Readiness Check for SSL"
    
    local dns_ready=true
    local record_count=$(dig +short $DOMAIN A 2>/dev/null | wc -l)
    local domain_ips=$(dig +short $DOMAIN A 2>/dev/null || echo "")
    
    print_info "Checking DNS prerequisites for SSL installation..."
    
    # Check record count
    if [ "$record_count" -eq 0 ]; then
        print_error "No A records found for $DOMAIN"
        dns_ready=false
    elif [ "$record_count" -eq 1 ]; then
        local single_ip=$(echo "$domain_ips" | head -1)
        if [ "$single_ip" = "$SERVER_IP" ]; then
            print_success "Perfect! Single A record pointing to correct server"
        else
            print_error "Single A record points to wrong server: $single_ip"
            dns_ready=false
        fi
    else
        print_error "Multiple A records detected ($record_count records)"
        print_error "SSL will fail - Let's Encrypt validates ALL records"
        while read -r ip; do
            if [ -n "$ip" ]; then
                if [ "$ip" = "$SERVER_IP" ]; then
                    echo -e "  ${GREEN}✅ $ip${NC} (correct)"
                else
                    echo -e "  ${RED}❌ $ip${NC} (will cause SSL failure)"
                fi
            fi
        done <<< "$domain_ips"
        dns_ready=false
    fi
    
    # Check WWW record
    local www_record=$(dig +short www.$DOMAIN A 2>/dev/null || echo "")
    if [ -n "$www_record" ] && [ "$www_record" != "$SERVER_IP" ]; then
        print_warning "WWW record points to different server: $www_record"
    fi
    
    if [ "$dns_ready" = true ]; then
        print_success "DNS is ready for SSL installation!"
        return 0
    else
        print_error "DNS is NOT ready for SSL installation"
        provide_dns_fix_instructions
        return 1
    fi
}

run_dns_check() {
    print_banner
    setup_variables "$@"
    
    print_section "DNS Configuration Check for $DOMAIN"
    
    if check_dns_records; then
        print_success "DNS configuration looks good!"
        check_dns_propagation
        
        # Additional SSL readiness check
        echo ""
        verify_dns_ready_for_ssl
    else
        provide_dns_fix_instructions
        exit 1
    fi
}

run_nginx_setup() {
    setup_variables "$@"
    
    print_section "Nginx Configuration Setup"
    
    # Create HTTP config first
    create_nginx_http_config
    
    if reload_nginx; then
        print_success "Nginx configuration applied successfully"
        print_info "Website should be available at: http://$DOMAIN"
    else
        print_error "Nginx configuration failed"
        exit 1
    fi
}

run_ssl_installation() {
    print_banner
    setup_variables "$@"
    
    print_section "SSL Certificate Installation for $DOMAIN"
    
    # Check if we should force renewal
    if [[ "${1:-}" == *"force"* ]] || [ "$FORCE_RENEW" = true ]; then
        FORCE_RENEW=true
        print_info "Force renewal enabled"
    fi
    
    # Critical DNS check first
    print_info "Step 1: Verifying DNS is ready for SSL..."
    if ! verify_dns_ready_for_ssl; then
        print_error "DNS verification failed - SSL installation aborted"
        echo ""
        print_warning "You must fix DNS issues before SSL will work"
        print_info "After fixing DNS, run: sudo $0 dns-check $DOMAIN"
        print_info "Then retry SSL: sudo $0 ssl $DOMAIN"
        exit 1
    fi
    
    # Install SSL certificate
    print_info "Step 2: Installing SSL certificate..."
    if get_ssl_certificate; then
        # Create SSL nginx config
        print_info "Step 3: Configuring nginx for HTTPS..."
        create_nginx_ssl_config
        
        if reload_nginx; then
            print_success "SSL installation completed successfully!"
            print_info "Website is now available at: https://$DOMAIN"
            
            # Test the SSL setup
            print_info "Step 4: Testing SSL configuration..."
            sleep 5
            test_ssl_certificate
            test_cors_with_ssl
            
            print_section "🎉 SSL Installation Complete!"
            print_success "Your website is now secured with HTTPS"
            print_info "✅ HTTP → HTTPS redirect enabled"
            print_info "✅ Modern SSL configuration applied"
            print_info "✅ Auto-renewal configured"
            print_info "✅ Security headers added"
            
        else
            print_error "Nginx SSL configuration failed"
            exit 1
        fi
    else
        print_error "SSL certificate installation failed"
        print_warning "Common solutions:"
        echo "• Wait 1 hour if rate limited"
        echo "• Verify DNS cleanup completed"
        echo "• Check firewall settings"
        echo "• Try: sudo $0 diagnose $DOMAIN"
        exit 1
    fi
}

run_complete_setup() {
    print_banner
    check_root
    setup_variables "$@"
    
    print_section "Complete Domain & SSL Setup for $DOMAIN"
    
    log_message "Starting complete setup for $DOMAIN"
    
    # Step 1: Comprehensive DNS check
    print_info "Step 1: Verifying DNS configuration..."
    if ! verify_dns_ready_for_ssl; then
        print_error "DNS is not ready for SSL"
        echo ""
        print_warning "Complete these steps first:"
        echo "1. Fix DNS records as shown above"
        echo "2. Wait 15-30 minutes for propagation"
        echo "3. Run: sudo $0 dns-check $DOMAIN"
        echo "4. Then run: sudo $0 setup $DOMAIN"
        exit 1
    fi
    
    # Step 2: Setup Nginx (HTTP first)
    print_info "Step 2: Setting up Nginx configuration..."
    create_nginx_http_config
    
    if ! reload_nginx; then
        print_error "Nginx setup failed"
        exit 1
    fi
    
    print_success "HTTP site is now available at: http://$DOMAIN"
    
    # Step 3: Install SSL
    print_info "Step 3: Installing SSL certificate..."
    if get_ssl_certificate; then
        # Update to SSL config
        print_info "Step 4: Configuring HTTPS and security..."
        create_nginx_ssl_config
        
        if reload_nginx; then
            print_success "HTTPS site is now available at: https://$DOMAIN"
            SSL_ENABLED=true
        else
            print_error "SSL nginx configuration failed"
            exit 1
        fi
    else
        print_warning "SSL installation failed, but HTTP site is available"
        print_info "You can retry SSL installation later with:"
        print_info "sudo $0 ssl $DOMAIN $EMAIL"
        print_info "First ensure DNS shows only one A record"
        exit 1
    fi
    
    # Step 5: Final testing
    print_info "Step 5: Running comprehensive tests..."
    sleep 5
    
    if [ "$SSL_ENABLED" = true ]; then
        test_ssl_certificate
        test_cors_with_ssl
    fi
    
    print_section "🎉 Complete Setup Finished!"
    print_success "Domain setup completed for $DOMAIN"
    echo ""
    print_info "🌐 Website URLs:"
    print_info "   HTTP:  http://$DOMAIN (redirects to HTTPS)"
    if [ "$SSL_ENABLED" = true ]; then
        print_info "   HTTPS: https://$DOMAIN ✅"
        print_info ""
        print_info "🔒 Security Features:"
        print_info "   ✅ SSL Certificate installed and valid"
        print_info "   ✅ HTTP to HTTPS redirect"
        print_info "   ✅ Modern TLS configuration"
        print_info "   ✅ Security headers"
        print_info "   ✅ CORS properly configured"
        print_info "   ✅ Auto-renewal setup"
    else
        print_info "   HTTPS: ❌ SSL installation failed"
    fi
    
    log_message "Complete setup finished for $DOMAIN - SSL: $SSL_ENABLED"
}

run_diagnostics() {
    print_banner
    setup_variables "$@"
    
    print_section "Complete Diagnostics for $DOMAIN"
    
    # DNS checks
    check_dns_records
    check_dns_propagation
    
    # SSL checks
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        test_ssl_certificate
        test_cors_with_ssl
    else
        print_info "No SSL certificate found"
    fi
    
    # Nginx checks
    print_section "Nginx Status"
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
        
        if [ -f "$NGINX_CONF" ]; then
            print_success "Nginx configuration exists"
            if test_nginx_config; then
                print_success "Nginx configuration is valid"
            fi
        else
            print_warning "Nginx configuration not found at $NGINX_CONF"
        fi
    else
        print_error "Nginx is not running"
    fi
    
    # Application checks
    print_section "Application Status"
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN/" 2>/dev/null || echo "000")
    local https_status="000"
    
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/" 2>/dev/null || echo "000")
    fi
    
    echo "Website Status:"
    echo "  HTTP ($DOMAIN): $http_status"
    echo "  HTTPS ($DOMAIN): $https_status"
    
    if [ "$http_status" = "200" ] || [ "$https_status" = "200" ]; then
        print_success "Website is responding"
    else
        print_error "Website is not responding properly"
    fi
}

fix_cors_issues() {
    print_banner
    setup_variables "$@"
    
    print_section "CORS Issues Fix for $DOMAIN"
    
    print_info "Applying CORS fixes to nginx configuration..."
    
    # Check if SSL config exists
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        create_nginx_ssl_config
    else
        create_nginx_http_config
    fi
    
    if reload_nginx; then
        print_success "CORS configuration updated"
        
        # Test CORS
        sleep 3
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            test_cors_with_ssl
        else
            print_info "Testing CORS on HTTP..."
            local cors_test=$(curl -s -I -H "Origin: http://localhost:3000" "http://$DOMAIN/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
            if [ -n "$cors_test" ]; then
                print_success "CORS is working: $(echo $cors_test | tr -d '\r\n')"
            else
                print_warning "CORS headers not found"
            fi
        fi
    else
        print_error "Failed to update nginx configuration"
        exit 1
    fi
}

emergency_fix() {
    print_banner
    check_root
    setup_variables "$@"
    
    print_section "Emergency Domain & SSL Fix for $DOMAIN"
    
    print_warning "Running emergency fixes..."
    
    # Stop any conflicting services
    systemctl stop apache2 2>/dev/null || true
    
    # Fix nginx
    print_info "Fixing nginx configuration..."
    
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        create_nginx_ssl_config
    else
        create_nginx_http_config
    fi
    
    # Force reload nginx
    if test_nginx_config; then
        systemctl restart nginx
        print_success "Nginx restarted with new configuration"
    else
        print_error "Nginx configuration has errors"
        exit 1
    fi
    
    # Test connectivity
    sleep 5
    local test_url="http://$DOMAIN/"
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        test_url="https://$DOMAIN/"
    fi
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$test_url" 2>/dev/null || echo "000")
    
    if [ "$status" = "200" ]; then
        print_success "Emergency fix completed - website is responding"
        print_info "Website: $test_url"
    else
        print_error "Website still not responding (HTTP $status)"
        print_info "Manual intervention may be required"
    fi
}

monitor_status() {
    setup_variables "$@"
    
    print_section "Monitoring $DOMAIN"
    
    while true; do
        clear
        echo -e "${CYAN}FilmFlex Domain Monitor - $DOMAIN${NC}"
        echo "Last check: $(date)"
        echo "----------------------------------------"
        
        # Test HTTP
        local http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN/" 2>/dev/null || echo "000")
        echo -n "HTTP Status: "
        if [ "$http_status" = "200" ]; then
            echo -e "${GREEN}$http_status OK${NC}"
        else
            echo -e "${RED}$http_status FAILED${NC}"
        fi
        
        # Test HTTPS
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            local https_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/" 2>/dev/null || echo "000")
            echo -n "HTTPS Status: "
            if [ "$https_status" = "200" ]; then
                echo -e "${GREEN}$https_status OK${NC}"
            else
                echo -e "${RED}$https_status FAILED${NC}"
            fi
            
            # SSL expiry
            local exp_date=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
            if [ -n "$exp_date" ]; then
                local exp_timestamp=$(date -d "$exp_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_left=$(( (exp_timestamp - current_timestamp) / 86400 ))
                
                echo -n "SSL Expires: "
                if [ $days_left -gt 30 ]; then
                    echo -e "${GREEN}$days_left days${NC}"
                elif [ $days_left -gt 7 ]; then
                    echo -e "${YELLOW}$days_left days${NC}"
                else
                    echo -e "${RED}$days_left days${NC}"
                fi
            fi
        else
            echo -e "HTTPS: ${YELLOW}No SSL certificate${NC}"
        fi
        
        # DNS check
        local dns_result=$(dig +short $DOMAIN A 2>/dev/null | head -1)
        echo -n "DNS A Record: "
        if [ "$dns_result" = "$SERVER_IP" ]; then
            echo -e "${GREEN}$dns_result${NC}"
        else
            echo -e "${RED}$dns_result (expected: $SERVER_IP)${NC}"
        fi
        
        echo ""
        echo "Press Ctrl+C to exit"
        sleep 30
    done
}

# =============================================================================
# MAIN SCRIPT LOGIC
# =============================================================================

main() {
    case "${1:-help}" in
        "setup")
            run_complete_setup "${@:2}"
            ;;
        "ssl")
            run_ssl_installation "${@:2}"
            ;;
        "ssl-force")
            FORCE_RENEW=true
            run_ssl_installation "${@:2}"
            ;;
        "dns-check")
            run_dns_check "${@:2}"
            ;;
        "nginx-setup")
            check_root
            run_nginx_setup "${@:2}"
            ;;
        "diagnose")
            run_diagnostics "${@:2}"
            ;;
        "test-ssl")
            setup_variables "${@:2}"
            test_ssl_certificate
            ;;
        "fix-cors")
            check_root
            fix_cors_issues "${@:2}"
            ;;
        "emergency-fix")
            emergency_fix "${@:2}"
            ;;
        "monitor")
            monitor_status "${@:2}"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"

exit 0