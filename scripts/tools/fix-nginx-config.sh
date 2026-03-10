#!/bin/bash

# Nginx Config Auto-Fix Script for PhimGG
# This script updates nginx to proxy all requests to Node.js app

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NGINX_CONFIG="/etc/nginx/sites-available/phimgg.com"
BACKUP_DIR="/etc/nginx/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🔧 NGINX CONFIG AUTO-FIX FOR PHIMGG${NC}"
echo "=================================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Check if config file exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Nginx config file not found: $NGINX_CONFIG${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup current config
echo -e "${YELLOW}📋 Backing up current config...${NC}"
cp "$NGINX_CONFIG" "$BACKUP_DIR/phimgg.com.backup.$TIMESTAMP"
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/phimgg.com.backup.$TIMESTAMP${NC}"

# Create new nginx config
echo -e "${YELLOW}🔧 Creating new nginx configuration...${NC}"

cat > "$NGINX_CONFIG" << 'EOF'
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

# HTTPS server - main configuration with full proxy setup
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name phimgg.com www.phimgg.com;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/phimgg.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/phimgg.com/privkey.pem;

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
    access_log /var/log/nginx/phimgg.com.access.log;
    error_log /var/log/nginx/phimgg.com.error.log warn;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;

    # Handle OPTIONS requests for CORS
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Content-Length 0;
            add_header Content-Type "text/plain charset=UTF-8";
            return 204;
        }

        limit_req zone=general burst=10 nodelay;
        
        # Proxy all requests to Node.js app
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache control for proxied content
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
        
        add_header X-Cache-Status "PROXIED";
    }

    # API routes with enhanced rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        add_header X-Cache-Status "API-PROXIED";
    }

    # Health check endpoint (no rate limiting)
    location = /api/health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        access_log off;
        add_header X-Cache-Status "HEALTH";
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

echo -e "${GREEN}✅ New nginx configuration created${NC}"

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration test passed${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_DIR/phimgg.com.backup.$TIMESTAMP" "$NGINX_CONFIG"
    exit 1
fi

# Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_DIR/phimgg.com.backup.$TIMESTAMP" "$NGINX_CONFIG"
    systemctl reload nginx
    exit 1
fi

# Test the website
echo -e "${YELLOW}🌐 Testing website response...${NC}"
sleep 2

# Test HTTP redirect
echo "Testing HTTP to HTTPS redirect..."
if curl -I -s http://phimgg.com | grep -q "301\|302"; then
    echo -e "${GREEN}✅ HTTP redirect working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP redirect check inconclusive${NC}"
fi

# Test HTTPS response
echo "Testing HTTPS response..."
if curl -I -s https://phimgg.com | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ HTTPS response working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS response check inconclusive${NC}"
fi

# Test for PhimGG content
echo "Testing for PhimGG content..."
if curl -s https://phimgg.com | grep -q -i "phimgg"; then
    echo -e "${GREEN}✅ PhimGG content detected${NC}"
else
    echo -e "${YELLOW}⚠️  PhimGG content check inconclusive (may take a moment)${NC}"
fi

echo
echo -e "${GREEN}🎉 NGINX CONFIG UPDATE COMPLETED!${NC}"
echo "=================================="
echo -e "${BLUE}Summary:${NC}"
echo "• Backup saved to: $BACKUP_DIR/phimgg.com.backup.$TIMESTAMP"
echo "• All requests now proxied to Node.js app (localhost:5000)"
echo "• No more static file serving from nginx"
echo "• Future deployments will automatically reflect changes"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "• Test website: https://phimgg.com"
echo "• Hard refresh browser (Ctrl+Shift+R)"
echo "• Check for PhimGG branding instead of FilmFlex"
echo
echo -e "${BLUE}To rollback if needed:${NC}"
echo "sudo cp $BACKUP_DIR/phimgg.com.backup.$TIMESTAMP $NGINX_CONFIG"
echo "sudo systemctl reload nginx"
EOF

chmod +x /root/Film_Flex_Release/scripts/tools/fix-nginx-config.sh
echo -e "${GREEN}✅ Script created: /root/Film_Flex_Release/scripts/tools/fix-nginx-config.sh${NC}"