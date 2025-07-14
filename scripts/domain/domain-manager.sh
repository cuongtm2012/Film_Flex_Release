#!/bin/bash

# =============================================================================
# FilmFlex Complete Domain Setup & Management Script
# =============================================================================
# This unified script handles all domain-related tasks:
# - DNS diagnostics and troubleshooting
# - Domain configuration and setup
# - SSL certificate installation
# - Nginx configuration
# - Automated monitoring and fixes
# =============================================================================

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
DEFAULT_SERVER_IP="154.205.142.255"
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

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "============================================================================="
    echo "                     FilmFlex Domain Management Suite"
    echo "============================================================================="
    echo -e "${NC}"
}

print_section() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ SUCCESS: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ INFO: $1${NC}"
}

log_message() {
    echo "[$DATE] $1" >> "$LOG_DIR/domain-setup.log"
}

check_root() {
    if [ "$(id -u)" != "0" ]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# =============================================================================
# CONFIGURATION FUNCTIONS
# =============================================================================

setup_variables() {
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Set domain
    if [ -n "$1" ]; then
        DOMAIN="$1"
    else
        DOMAIN="$DEFAULT_DOMAIN"
    fi
    
    # Set server IP
    if [ -n "$2" ]; then
        SERVER_IP="$2"
    else
        SERVER_IP="$DEFAULT_SERVER_IP"
    fi
    
    # Set email
    if [ -n "$3" ]; then
        EMAIL="$3"
    else
        EMAIL="$DEFAULT_EMAIL"
    fi
    
    # Set app port
    APP_PORT="$DEFAULT_APP_PORT"
    
    # Set nginx config path
    NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
    
    print_info "Configuration:"
    echo -e "  Domain: ${GREEN}$DOMAIN${NC}"
    echo -e "  Server IP: ${GREEN}$SERVER_IP${NC}"
    echo -e "  Email: ${GREEN}$EMAIL${NC}"
    echo -e "  App Port: ${GREEN}$APP_PORT${NC}"
}

# =============================================================================
# DNS DIAGNOSTIC FUNCTIONS
# =============================================================================

check_dns_resolution() {
    print_section "DNS Resolution Check"
    
    local dns_ok=true
    
    # Check A record for domain
    print_info "Checking A record for $DOMAIN..."
    local dig_result=$(dig +short $DOMAIN A)
    if [ -n "$dig_result" ]; then
        echo -e "  A record: ${GREEN}$dig_result${NC}"
        if [ "$dig_result" = "$SERVER_IP" ]; then
            print_success "A record is correct"
        else
            print_error "A record points to $dig_result instead of $SERVER_IP"
            dns_ok=false
        fi
    else
        print_error "No A record found for $DOMAIN"
        dns_ok=false
    fi
    
    # Check A record for www subdomain
    print_info "Checking A record for www.$DOMAIN..."
    local www_result=$(dig +short www.$DOMAIN A)
    if [ -n "$www_result" ]; then
        echo -e "  WWW A record: ${GREEN}$www_result${NC}"
        if [ "$www_result" = "$SERVER_IP" ]; then
            print_success "WWW A record is correct"
        else
            print_error "WWW A record points to $www_result instead of $SERVER_IP"
            dns_ok=false
        fi
    else
        print_error "No WWW A record found"
        dns_ok=false
    fi
    
    # Check nameservers
    print_info "Checking nameservers..."
    local ns_records=$(dig +short $DOMAIN NS)
    if [ -n "$ns_records" ]; then
        echo -e "${GREEN}Nameservers:${NC}"
        echo "$ns_records" | sed 's/^/  /'
    else
        print_warning "No nameserver records found"
    fi
    
    return $dns_ok
}

check_dns_propagation() {
    print_section "DNS Propagation Check"
    
    # Check from different DNS servers
    print_info "Checking from Google DNS (8.8.8.8)..."
    local google_result=$(dig @8.8.8.8 +short $DOMAIN A)
    echo -e "  Result: ${GREEN}${google_result:-"No result"}${NC}"
    
    print_info "Checking from Cloudflare DNS (1.1.1.1)..."
    local cloudflare_result=$(dig @1.1.1.1 +short $DOMAIN A)
    echo -e "  Result: ${GREEN}${cloudflare_result:-"No result"}${NC}"
    
    print_info "Checking from OpenDNS (208.67.222.222)..."
    local opendns_result=$(dig @208.67.222.222 +short $DOMAIN A)
    echo -e "  Result: ${GREEN}${opendns_result:-"No result"}${NC}"
}

check_server_connectivity() {
    print_section "Server Connectivity Check"
    
    # Ping test
    print_info "Testing ping to $SERVER_IP..."
    if ping -c 3 $SERVER_IP > /dev/null 2>&1; then
        print_success "Server is reachable"
    else
        print_error "Server is not reachable"
    fi
    
    # Port tests
    for port in 80 443 $APP_PORT; do
        print_info "Testing port $port..."
        if timeout 5 bash -c "</dev/tcp/$SERVER_IP/$port" 2>/dev/null; then
            print_success "Port $port is open"
        else
            print_error "Port $port is not accessible"
        fi
    done
}

test_http_response() {
    print_section "HTTP Response Test"
    
    # Test direct IP
    print_info "Testing direct IP access..."
    local ip_status=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:$APP_PORT/ 2>/dev/null || echo "000")
    if [ "$ip_status" = "200" ]; then
        print_success "Direct IP responds with HTTP 200"
    else
        print_warning "Direct IP responds with HTTP $ip_status"
    fi
    
    # Test domain if DNS is working
    if dig +short $DOMAIN A | grep -q "$SERVER_IP"; then
        print_info "Testing domain access..."
        local domain_status=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/ 2>/dev/null || echo "000")
        if [[ "$domain_status" =~ ^(200|301|302)$ ]]; then
            print_success "Domain responds with HTTP $domain_status"
        else
            print_warning "Domain responds with HTTP $domain_status"
        fi
    fi
}

run_full_diagnostics() {
    print_banner
    print_section "Complete DNS & Domain Diagnostics"
    
    check_dns_resolution
    check_dns_propagation
    check_server_connectivity
    test_http_response
    
    print_section "Recommendations"
    
    # Provide specific recommendations based on results
    local dig_result=$(dig +short $DOMAIN A)
    if [ -z "$dig_result" ]; then
        print_error "DNS Issue: No A record found"
        echo -e "  ${YELLOW}Solution: Add A record in your DNS provider:${NC}"
        echo -e "    Type: A, Name: @, Value: $SERVER_IP, TTL: 1 Hour"
        echo -e "    Type: A, Name: www, Value: $SERVER_IP, TTL: 1 Hour"
    elif [ "$dig_result" != "$SERVER_IP" ]; then
        print_error "DNS Issue: Wrong A record"
        echo -e "  ${YELLOW}Solution: Update A record to point to $SERVER_IP${NC}"
    else
        print_success "DNS configuration appears correct"
    fi
    
    echo
    print_info "For immediate testing, use: http://$SERVER_IP:$APP_PORT"
}

# =============================================================================
# EMERGENCY FIX FUNCTIONS
# =============================================================================

fix_nginx_config() {
    print_section "Emergency Nginx Configuration Fix"
    
    local nginx_conf="/etc/nginx/sites-available/$DOMAIN"
    
    if [ ! -f "$nginx_conf" ]; then
        print_error "Nginx config file not found: $nginx_conf"
        exit 1
    fi
    
    print_info "Backing up current nginx configuration..."
    cp "$nginx_conf" "$nginx_conf.backup.$(date +%Y%m%d-%H%M%S)"
    
    print_info "Creating corrected nginx configuration..."
    
    cat > "$nginx_conf" << EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Cookie, Range, Accept-Ranges' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Main location block
    location / {
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Cookie, Range, Accept-Ranges' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }

        # Proxy to Node.js application
        proxy_pass http://localhost:$APP_PORT;
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

    # Handle static files efficiently
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache static files
        expires 30d;
        add_header Cache-Control "public, immutable" always;
    }
}
EOF

    print_success "Nginx configuration fixed"
    
    # Test nginx configuration
    print_info "Testing nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
        
        # Reload nginx
        print_info "Reloading nginx..."
        systemctl reload nginx
        print_success "Nginx reloaded successfully"
        
        print_section "Fix Applied Successfully!"
        print_success "Your nginx configuration has been fixed"
        print_info "You can now continue with domain setup"
        
    else
        print_error "Nginx configuration still has errors"
        print_info "Restoring backup..."
        
        # Find the most recent backup
        local backup_file=$(ls -t "$nginx_conf".backup.* 2>/dev/null | head -1)
        if [ -n "$backup_file" ]; then
            cp "$backup_file" "$nginx_conf"
            print_info "Configuration restored from backup: $(basename "$backup_file")"
        fi
        
        nginx -t
        exit 1
    fi
}

# =============================================================================
# INSTALLATION FUNCTIONS
# =============================================================================

install_prerequisites() {
    print_section "Installing Prerequisites"
    
    # Update system
    print_info "Updating system packages..."
    apt update && apt upgrade -y
    
    # Install nginx
    if ! command -v nginx &> /dev/null; then
        print_info "Installing nginx..."
        apt install nginx -y
        print_success "Nginx installed"
    else
        print_success "Nginx already installed"
    fi
    
    # Install certbot
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        apt install certbot python3-certbot-nginx -y
        print_success "Certbot installed"
    else
        print_success "Certbot already installed"
    fi
    
    # Install dig command
    if ! command -v dig &> /dev/null; then
        print_info "Installing DNS utilities..."
        apt install dnsutils -y
        print_success "DNS utilities installed"
    else
        print_success "DNS utilities already installed"
    fi
}

create_nginx_config() {
    print_section "Creating Nginx Configuration"
    
    print_info "Creating nginx configuration for $DOMAIN..."
    
    cat > $NGINX_CONF << EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Cookie, Range, Accept-Ranges' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Handle preflight OPTIONS requests
    location / {
        # Handle CORS preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://$DOMAIN' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Cookie, Range, Accept-Ranges' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }

        # Proxy to Node.js application
        proxy_pass http://localhost:$APP_PORT;
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

    # Handle static files efficiently
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache static files
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    print_success "Nginx configuration created"
    
    # Enable the site
    print_info "Enabling the site..."
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    print_info "Testing nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
        systemctl reload nginx
        print_success "Nginx reloaded"
    else
        print_error "Nginx configuration has errors"
        nginx -t
        exit 1
    fi
}

setup_ssl_certificate() {
    print_section "SSL Certificate Setup"
    
    # Check if DNS is ready
    local dns_ready=false
    local dig_result=$(dig +short $DOMAIN A)
    if [ "$dig_result" = "$SERVER_IP" ]; then
        dns_ready=true
    fi
    
    if [ "$dns_ready" = true ]; then
        print_info "DNS is ready. Obtaining SSL certificate..."
        
        # Get SSL certificate
        if certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect; then
            print_success "SSL certificate obtained successfully"
            log_message "SSL certificate obtained for $DOMAIN"
        else
            print_error "Failed to obtain SSL certificate"
            print_info "You can try manually later with:"
            print_info "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
        fi
    else
        print_warning "DNS not ready yet. Skipping SSL certificate"
        print_info "Run this command after DNS propagation:"
        print_info "certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect"
        
        # Set up automated SSL installation
        setup_ssl_automation
    fi
}

setup_ssl_automation() {
    print_section "Setting Up SSL Automation"
    
    local ssl_script="$APP_DIR/scripts/domain/auto-ssl-check.sh"
    mkdir -p "$(dirname "$ssl_script")"
    
    cat > "$ssl_script" << EOF
#!/bin/bash

# Automated SSL Certificate Installation Script
DOMAIN="$DOMAIN"
SERVER_IP="$SERVER_IP"
EMAIL="$EMAIL"
LOG_FILE="$LOG_DIR/ssl-automation.log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

# Check if DNS resolves correctly
check_dns() {
    local resolved_ip=\$(dig +short \$DOMAIN A)
    [ "\$resolved_ip" = "\$SERVER_IP" ]
}

# Install SSL certificate
install_ssl() {
    echo "[\$DATE] Installing SSL certificate for \$DOMAIN..." >> "\$LOG_FILE"
    
    if certbot --nginx -d \$DOMAIN -d www.\$DOMAIN --email \$EMAIL --agree-tos --non-interactive --redirect; then
        echo "[\$DATE] SSL certificate successfully installed" >> "\$LOG_FILE"
        
        # Remove from cron
        crontab -l | grep -v "auto-ssl-check.sh" | crontab -
        
        echo "[\$DATE] SSL automation completed and removed from cron" >> "\$LOG_FILE"
    else
        echo "[\$DATE] SSL certificate installation failed" >> "\$LOG_FILE"
    fi
}

# Main logic
if check_dns; then
    install_ssl
else
    echo "[\$DATE] DNS not ready yet for \$DOMAIN" >> "\$LOG_FILE"
fi
EOF

    chmod +x "$ssl_script"
    
    # Add to cron (check every 6 hours)
    (crontab -l 2>/dev/null || echo "") | grep -v "auto-ssl-check.sh" | { cat; echo "0 */6 * * * $ssl_script > /dev/null 2>&1"; } | crontab -
    
    print_success "SSL automation set up (checks every 6 hours)"
}

update_app_config() {
    print_section "Updating Application Configuration"
    
    if [ -f "$APP_DIR/.env" ]; then
        print_info "Updating .env file with domain configuration..."
        
        # Update or add WEBSITE_DOMAIN
        if grep -q "WEBSITE_DOMAIN=" "$APP_DIR/.env"; then
            sed -i "s/WEBSITE_DOMAIN=.*/WEBSITE_DOMAIN=$DOMAIN/" "$APP_DIR/.env"
        else
            echo "WEBSITE_DOMAIN=$DOMAIN" >> "$APP_DIR/.env"
        fi
        
        print_success "Application configuration updated"
        
        # Restart application if PM2 is available
        if command -v pm2 &> /dev/null; then
            print_info "Restarting application..."
            cd "$APP_DIR"
            pm2 restart filmflex || print_warning "Could not restart PM2 application"
        fi
    else
        print_warning ".env file not found at $APP_DIR/.env"
    fi
}

configure_firewall() {
    print_section "Configuring Firewall"
    
    if command -v ufw &> /dev/null; then
        print_info "Configuring UFW firewall..."
        ufw allow 'Nginx Full'
        ufw allow ssh
        print_success "Firewall configured"
    else
        print_info "UFW not available, skipping firewall configuration"
    fi
}

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

show_usage() {
    echo -e "${CYAN}FilmFlex Domain Management Suite${NC}"
    echo
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 diagnose                          - Run DNS diagnostics"
    echo "  $0 setup [domain] [ip] [email]       - Full domain setup"
    echo "  $0 ssl [domain]                      - Install SSL certificate"
    echo "  $0 fix [domain]                      - Fix nginx configuration errors"
    echo "  $0 deploy [server]                   - Deploy to remote server"
    echo "  $0 monitor [domain]                  - Monitor DNS and SSL status"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 diagnose"
    echo "  $0 setup phimgg.com 154.205.142.255 admin@phimgg.com"
    echo "  $0 ssl phimgg.com"
    echo "  $0 fix phimgg.com"
    echo "  $0 deploy root@154.205.142.255"
    echo
    echo -e "${YELLOW}Default values:${NC}"
    echo "  Domain: $DEFAULT_DOMAIN"
    echo "  Server IP: $DEFAULT_SERVER_IP"
    echo "  Email: $DEFAULT_EMAIL"
}

run_setup() {
    print_banner
    check_root
    setup_variables "$1" "$2" "$3"
    
    install_prerequisites
    create_nginx_config
    update_app_config
    configure_firewall
    setup_ssl_certificate
    
    print_section "Setup Complete!"
    print_success "Domain $DOMAIN has been configured"
    
    echo
    print_info "Next steps:"
    echo "1. Ensure DNS records are set correctly in your domain provider"
    echo "2. Wait for DNS propagation (up to 48 hours)"
    echo "3. SSL will be automatically installed once DNS propagates"
    echo
    print_info "Test your site:"
    echo "• Direct IP: http://$SERVER_IP:$APP_PORT"
    echo "• Domain: https://$DOMAIN (after DNS propagation)"
    echo
    print_info "Monitor progress:"
    echo "• Check logs: tail -f $LOG_DIR/domain-setup.log"
    echo "• Run diagnostics: $0 diagnose"
}

install_ssl_only() {
    print_banner
    check_root
    setup_variables "$1"
    
    print_section "SSL Certificate Installation"
    
    # Check if domain resolves correctly
    local dig_result=$(dig +short $DOMAIN A)
    if [ "$dig_result" = "$SERVER_IP" ]; then
        print_info "DNS appears to be correctly configured"
        
        if certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect; then
            print_success "SSL certificate installed successfully"
        else
            print_error "SSL certificate installation failed"
            exit 1
        fi
    else
        print_error "DNS not properly configured"
        print_info "Expected: $SERVER_IP, Found: ${dig_result:-"none"}"
        exit 1
    fi
}

deploy_to_server() {
    local server="$1"
    if [ -z "$server" ]; then
        server="root@$DEFAULT_SERVER_IP"
    fi
    
    print_banner
    print_section "Deploying to Remote Server"
    
    print_info "Deploying to: $server"
    
    # Copy nginx configuration
    print_info "Copying updated nginx configuration..."
    scp "$(dirname "$0")/../../nginx/phimgg.com.conf" "$server:/etc/nginx/sites-available/phimgg.com"
    
    # Copy this script to the server
    print_info "Copying domain management script..."
    scp "$0" "$server:/tmp/domain-manager.sh"
    
    # Update nginx configuration on server
    print_info "Updating nginx configuration on server..."
    ssh "$server" << 'EOF'
# Test nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"
    systemctl reload nginx
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Nginx configuration has errors"
    nginx -t
    exit 1
fi

# Move domain manager script
chmod +x /tmp/domain-manager.sh
mv /tmp/domain-manager.sh /root/domain-manager.sh
echo "✓ Domain manager script updated"
EOF
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully"
        print_info "Your domain should now handle static assets properly"
        print_info "Test your site: https://$DEFAULT_DOMAIN"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

monitor_status() {
    setup_variables "$1"
    
    print_banner
    print_section "Monitoring Domain Status"
    
    # Check DNS
    print_info "DNS Status:"
    local dig_result=$(dig +short $DOMAIN A)
    if [ "$dig_result" = "$SERVER_IP" ]; then
        print_success "DNS is correctly configured"
    else
        print_error "DNS issue detected (expected: $SERVER_IP, found: ${dig_result:-"none"})"
    fi
    
    # Check SSL
    print_info "SSL Status:"
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        print_success "SSL certificate is active"
        local ssl_expiry=$(openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        print_info "SSL expires: $ssl_expiry"
    else
        print_warning "No valid SSL certificate found"
    fi
    
    # Check HTTP response
    print_info "Website Status:"
    local status=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ 2>/dev/null || echo "000")
    if [ "$status" = "200" ]; then
        print_success "Website is responding (HTTP $status)"
    else
        print_warning "Website status: HTTP $status"
    fi
}

# =============================================================================
# MAIN SCRIPT LOGIC
# =============================================================================

main() {
    case "${1:-help}" in
        "diagnose")
            setup_variables "$2"
            run_full_diagnostics
            ;;
        "setup")
            run_setup "$2" "$3" "$4"
            ;;
        "ssl")
            install_ssl_only "$2"
            ;;
        "fix")
            check_root
            setup_variables "$2"
            fix_nginx_config
            ;;
        "deploy")
            deploy_to_server "$2"
            ;;
        "monitor")
            monitor_status "$2"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"

exit 0
