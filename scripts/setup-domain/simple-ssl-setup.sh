#!/bin/bash

# Simple FilmFlex SSL Setup Script
# Step-by-step approach to avoid hanging issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="phimgg.com"
EMAIL="admin@phimgg.com"
COMPOSE_FILE="docker-compose.nginx-ssl.yml"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Start basic services
start_basic_services() {
    log "Step 1: Starting basic services (postgres + app)..."
    docker compose -f $COMPOSE_FILE up -d postgres app
    
    log "Waiting for services to be ready..."
    sleep 30
    
    if docker compose -f $COMPOSE_FILE exec -T app curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        success "App is running and healthy"
    else
        warning "App health check failed, but continuing..."
    fi
}

# Step 2: Start nginx with HTTP only (for SSL challenge)
start_nginx_http() {
    log "Step 2: Starting nginx with HTTP-only config for SSL challenge..."
    
    # Create temporary HTTP-only config
    cat > nginx/temp-http.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        proxy_pass http://filmflex_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Backup original config
    if [ -f "nginx/phimgg.com.conf" ]; then
        cp nginx/phimgg.com.conf nginx/phimgg.com.conf.backup
    fi
    
    # Use temporary config
    cp nginx/temp-http.conf nginx/phimgg.com.conf
    
    # Start nginx
    docker compose -f $COMPOSE_FILE up -d nginx-proxy
    
    sleep 10
    success "Nginx started in HTTP mode"
}

# Step 3: Get SSL certificates manually
get_ssl_certificates() {
    log "Step 3: Obtaining SSL certificates..."
    
    # Create certbot volumes if they don't exist
    docker volume create film_flex_release_certbot_conf || true
    docker volume create film_flex_release_certbot_www || true
    
    # Run certbot with explicit timeout
    log "Requesting certificates for $DOMAIN and www.$DOMAIN..."
    
    timeout 300 docker run --rm \
        --network film_flex_release_filmflex-network \
        -v film_flex_release_certbot_conf:/etc/letsencrypt \
        -v film_flex_release_certbot_www:/var/www/certbot \
        certbot/certbot:latest \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --expand \
        -d $DOMAIN -d www.$DOMAIN
    
    if [ $? -eq 0 ]; then
        success "SSL certificates obtained successfully!"
    else
        error "Failed to obtain SSL certificates"
        return 1
    fi
}

# Step 4: Apply SSL configuration
apply_ssl_config() {
    log "Step 4: Applying SSL configuration..."
    
    # Restore original SSL config
    if [ -f "nginx/phimgg.com.conf.backup" ]; then
        mv nginx/phimgg.com.conf.backup nginx/phimgg.com.conf
    fi
    
    # Clean up temp file
    rm -f nginx/temp-http.conf
    
    # Restart nginx with SSL config
    docker compose -f $COMPOSE_FILE restart nginx-proxy
    
    sleep 10
    success "SSL configuration applied"
}

# Step 5: Test setup
test_ssl_setup() {
    log "Step 5: Testing SSL setup..."
    
    # Test HTTP redirect
    if curl -I -s http://$DOMAIN | grep -q "301\|302"; then
        success "HTTP to HTTPS redirect working"
    else
        warning "HTTP redirect may not be working"
    fi
    
    # Test HTTPS
    if curl -I -s -k https://$DOMAIN | grep -q "200"; then
        success "HTTPS is working"
    else
        warning "HTTPS may not be working"
    fi
    
    success "SSL setup completed!"
}

# Main execution
main() {
    log "🚀 Starting simple SSL setup for $DOMAIN..."
    
    start_basic_services
    start_nginx_http
    get_ssl_certificates
    apply_ssl_config
    test_ssl_setup
    
    echo ""
    success "🎉 SSL setup completed!"
    echo ""
    log "Your site should now be available at:"
    log "  • https://$DOMAIN"
    log "  • https://www.$DOMAIN"
    echo ""
    log "To check logs: docker compose -f $COMPOSE_FILE logs -f"
    log "To stop: docker compose -f $COMPOSE_FILE down"
}

# Handle arguments
case "${1:-}" in
    "1"|"start-basic")
        start_basic_services
        ;;
    "2"|"start-nginx")
        start_nginx_http
        ;;
    "3"|"get-ssl")
        get_ssl_certificates
        ;;
    "4"|"apply-ssl")
        apply_ssl_config
        ;;
    "5"|"test")
        test_ssl_setup
        ;;
    *)
        main
        ;;
esac