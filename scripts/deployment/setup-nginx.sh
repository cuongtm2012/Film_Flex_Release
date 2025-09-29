#!/bin/bash

echo "🌐 Nginx Configuration Setup for phimgg.com"
echo "==========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt update
    apt install -y nginx
    print_status "Nginx installed"
else
    print_status "Nginx is already installed"
fi

# Create Nginx configuration directory if it doesn't exist
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/www/certbot

# Create comprehensive Nginx configuration for phimgg.com
print_info "Creating Nginx configuration for phimgg.com..."

cat > /etc/nginx/sites-available/phimgg.com << 'NGINX_EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;

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

# HTTPS server - main configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name phimgg.com www.phimgg.com;

    # SSL Certificate Configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/phimgg.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/phimgg.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/phimgg.com/chain.pem;

    # Modern SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS Headers for API access
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Max-Age "1728000" always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "1728000" always;
        add_header Content-Length 0;
        add_header Content-Type "text/plain charset=UTF-8";
        return 204;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Logging
    access_log /var/log/nginx/phimgg.com.access.log;
    error_log /var/log/nginx/phimgg.com.error.log warn;

    # Proxy settings for all locations
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
    
    # Buffer settings
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    # Static file serving with aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif|mp4|webm|m3u8|ts)$ {
        proxy_pass http://127.0.0.1:5000;
        
        # Cache static files for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC";
        
        # Disable rate limiting for static files
        limit_req off;
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:5000;
        
        # No caching for API responses
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Authentication routes with stricter rate limiting
    location ~ ^/(login|register|auth)/ {
        limit_req zone=login burst=5 nodelay;
        limit_req_status 429;
        
        proxy_pass http://127.0.0.1:5000;
        
        # No caching for auth routes
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check endpoint (no rate limiting)
    location = /api/health {
        proxy_pass http://127.0.0.1:5000;
        access_log off;
        
        # Short cache for health checks
        add_header Cache-Control "max-age=30";
    }

    # Main application with general rate limiting
    location / {
        limit_req zone=general burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:5000;
        
        # HTML files should not be cached to ensure updates are visible
        location ~* \.html$ {
            proxy_pass http://127.0.0.1:5000;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
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

    # Security: deny access to sensitive files
    location ~* \.(env|log|sql|bak|backup)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Security - Block common attack patterns
    location ~* \.(php|asp|aspx|jsp)$ {
        return 444;
    }
    
    location ~* /wp-(admin|content|includes) {
        return 444;
    }
}
NGINX_EOF

print_status "Nginx configuration created"

# Enable the site
if [ ! -L "/etc/nginx/sites-enabled/phimgg.com" ]; then
    print_info "Enabling phimgg.com site..."
    ln -s /etc/nginx/sites-available/phimgg.com /etc/nginx/sites-enabled/
    print_status "Site enabled"
else
    print_status "Site is already enabled"
fi

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    print_info "Removing default Nginx site..."
    rm /etc/nginx/sites-enabled/default
    print_status "Default site removed"
fi

# Test Nginx configuration
print_info "Testing Nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
    
    # Reload Nginx
    print_info "Reloading Nginx..."
    systemctl reload nginx
    print_status "Nginx reloaded"
else
    print_error "Nginx configuration has errors!"
    nginx -t
    exit 1
fi

# Start and enable Nginx
print_info "Starting and enabling Nginx..."
systemctl enable nginx
systemctl start nginx

if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Failed to start Nginx"
    systemctl status nginx
    exit 1
fi

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_status "Certbot installed"
else
    print_status "Certbot is already installed"
fi

# Check if SSL certificate exists
if [ ! -f "/etc/letsencrypt/live/phimgg.com/fullchain.pem" ]; then
    print_info "SSL certificate not found. You can generate one with:"
    print_info "certbot --nginx -d phimgg.com -d www.phimgg.com"
    print_warning "SSL certificate is required for HTTPS access"
else
    print_status "SSL certificate found for phimgg.com"
    
    # Check certificate expiry
    cert_expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/phimgg.com/cert.pem 2>/dev/null | cut -d= -f2)
    print_info "Certificate expires: $cert_expiry"
fi

# Setup UFW firewall rules
if command -v ufw &> /dev/null; then
    print_info "Configuring UFW firewall..."
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    
    # Allow application port (just in case)
    ufw allow 5000
    
    print_status "Firewall rules configured"
    print_info "Enable firewall with: ufw enable"
else
    print_warning "UFW not installed - consider setting up firewall rules"
fi

echo ""
print_status "✅ Nginx setup complete for phimgg.com!"
echo ""
print_info "Next steps:"
print_info "1. Generate SSL certificate: certbot --nginx -d phimgg.com -d www.phimgg.com"
print_info "2. Test domain access: curl -I https://phimgg.com"
print_info "3. Check status: systemctl status nginx"
print_info "4. View logs: tail -f /var/log/nginx/phimgg.com.error.log"
echo ""
print_info "Configuration file: /etc/nginx/sites-available/phimgg.com"
print_info "Reload config: systemctl reload nginx"
print_info "Test config: nginx -t"