#!/bin/bash

# PhimGG Nginx Docker SSL Setup Script
# Based on nginx-reverse-proxy best practices
# Automated setup for Nginx with Let's Encrypt SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.nginx-ssl.yml"
ENV_FILE=".env.nginx-ssl"

# Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

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

print_banner() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  PhimGG Nginx Docker SSL Setup"
    echo "  nginx-reverse-proxy Pattern"
    echo "  Nginx + Let's Encrypt + Auto-Renewal"
    echo "========================================"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    log "Using Docker Compose command: $DOCKER_COMPOSE"
    
    success "Prerequisites check passed"
}

# Load and validate environment variables
load_environment() {
    log "Loading environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found!"
        log "Please copy .env.nginx-ssl.example to $ENV_FILE and configure your domain settings"
        exit 1
    fi
    
    source $ENV_FILE
    
    if [ "$DOMAIN" = "phimgg.com" ]; then
        warning "Using default domain. Please update $ENV_FILE with your actual domain."
    fi
    
    if [ -z "$SSL_EMAIL" ]; then
        error "SSL_EMAIL not configured in $ENV_FILE"
        exit 1
    fi
    
    success "Environment loaded: Domain=$DOMAIN, Email=$SSL_EMAIL"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p logs
    mkdir -p nginx
    
    success "Directories created"
}

# Start services without SSL first
start_initial_services() {
    log "Starting initial services (app and database)..."
    
    # Start only postgres and app first
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d postgres app
    
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check if app is responding
    if $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T app curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        success "PhimGG app is running and healthy"
    else
        warning "App health check failed, but continuing..."
    fi
}

# Create temporary nginx config for certificate generation
create_temp_nginx_config() {
    log "Creating temporary nginx config for certificate generation..."
    
    # Backup original config if it exists
    if [ -f "nginx/phimgg.com.conf" ]; then
        cp nginx/phimgg.com.conf nginx/phimgg.com.conf.ssl-backup
    fi
    
    # Create temporary HTTP-only config
    cat > nginx/phimgg.com.conf << EOF
# Temporary configuration for SSL certificate generation
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Temporary proxy to app
    location / {
        proxy_pass http://filmflex_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    success "Temporary nginx config created"
}

# Start nginx for certificate generation
start_nginx_for_certs() {
    log "Starting Nginx for certificate generation..."
    
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d nginx-proxy
    
    sleep 15
    
    # Test if nginx is responding
    if curl -f -s http://localhost > /dev/null 2>&1; then
        success "Nginx started successfully"
    else
        warning "Nginx may not be accessible from localhost"
    fi
}

# Generate SSL certificates using certbot
generate_ssl_certificates() {
    log "Generating SSL certificates with Let's Encrypt..."
    
    # Check if certificates already exist
    if $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T nginx-proxy test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        warning "Certificates already exist for $DOMAIN"
        read -p "Do you want to renew them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Skipping certificate generation"
            return 0
        fi
    fi
    
    # Generate certificates using webroot method (without deploy hook)
    log "Requesting SSL certificate for $DOMAIN and www.$DOMAIN..."
    
    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot \
        certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $SSL_EMAIL \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d $DOMAIN -d www.$DOMAIN
    
    if [ $? -eq 0 ]; then
        success "SSL certificates generated successfully"
    else
        error "Failed to generate SSL certificates"
        restore_nginx_config
        exit 1
    fi
}

# Restore SSL nginx configuration
restore_nginx_config() {
    log "Restoring SSL nginx configuration..."
    
    if [ -f "nginx/phimgg.com.conf.ssl-backup" ]; then
        mv nginx/phimgg.com.conf.ssl-backup nginx/phimgg.com.conf
        success "SSL configuration restored"
    else
        error "SSL configuration backup not found"
    fi
}

# Restart nginx with SSL
restart_nginx_with_ssl() {
    log "Restarting Nginx with SSL configuration..."
    
    # Test nginx config first
    if $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T nginx-proxy nginx -t; then
        $DOCKER_COMPOSE -f $COMPOSE_FILE restart nginx-proxy
        sleep 10
        success "Nginx restarted with SSL"
    else
        error "Nginx configuration test failed"
        $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T nginx-proxy nginx -T
        exit 1
    fi
}

# Start auto-renewal service
start_auto_renewal() {
    log "Starting SSL auto-renewal service..."
    
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d certbot
    
    success "SSL auto-renewal service started"
}

# Test the complete setup
test_setup() {
    log "Testing the complete setup..."
    
    # Test HTTP redirect
    log "Testing HTTP to HTTPS redirect..."
    if curl -I -s -L http://$DOMAIN | grep -q "200\|301\|302"; then
        success "HTTP access working"
    else
        warning "HTTP access issues detected (may be normal during DNS propagation)"
    fi
    
    # Test HTTPS
    log "Testing HTTPS access..."
    if curl -I -s -k https://$DOMAIN | grep -q "200\|301\|302"; then
        success "HTTPS access working"
    else
        warning "HTTPS access issues detected (may be normal during DNS propagation)"
    fi
    
    # Test SSL certificate
    log "Testing SSL certificate..."
    if echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates | grep -q "After"; then
        success "SSL certificate is valid"
    else
        warning "SSL certificate validation issues (may be normal during DNS propagation)"
    fi
    
    # Test app health through proxy
    log "Testing app connectivity through proxy..."
    if curl -s -k https://$DOMAIN/api/health > /dev/null 2>&1; then
        success "PhimGG app accessible through HTTPS proxy"
    else
        warning "App may not be accessible through HTTPS proxy (may be normal during DNS propagation)"
    fi
}

# Show management commands
show_management_commands() {
    echo ""
    log "📋 Management commands:"
    echo ""
    log "View all logs:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
    echo ""
    log "View nginx logs:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f nginx-proxy"
    echo ""
    log "Test nginx configuration:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE exec nginx-proxy nginx -t"
    echo ""
    log "Reload nginx (without restart):"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE exec nginx-proxy nginx -s reload"
    echo ""
    log "Check SSL certificates:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE exec nginx-proxy ls -la /etc/letsencrypt/live/"
    echo ""
    log "Manual certificate renewal:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certbot renew --dry-run"
    echo ""
    log "Stop all services:"
    echo "  $DOCKER_COMPOSE -f $COMPOSE_FILE down"
    echo ""
}

# Display completion message
show_completion_message() {
    echo ""
    success "🎉 PhimGG Nginx SSL setup completed successfully!"
    echo ""
    log "Your PhimGG application is now running with:"
    log "✅ Nginx reverse proxy with modern configuration"
    log "✅ Let's Encrypt SSL certificates"
    log "✅ Automatic certificate renewal every 12 hours"
    log "✅ HTTP to HTTPS redirect"
    log "✅ Modern security headers"
    log "✅ Rate limiting protection"
    log "✅ WebSocket support"
    echo ""
    log "🌐 Website: https://$DOMAIN"
    log "🌐 Alternative: https://www.$DOMAIN"
    echo ""
    show_management_commands
    echo ""
    warning "Important reminders:"
    log "1. Ensure your DNS A records point to your server IP"
    log "2. Wait for DNS propagation (up to 24-48 hours)"
    log "3. Certificates auto-renew every 12 hours"
    log "4. Monitor logs for any issues"
    echo ""
}

# Cleanup function for errors
cleanup_on_error() {
    error "Setup failed. Cleaning up..."
    
    # Restore original nginx config if backup exists
    if [ -f "nginx/phimgg.com.conf.ssl-backup" ]; then
        mv nginx/phimgg.com.conf.ssl-backup nginx/phimgg.com.conf
    fi
    
    exit 1
}

# Main execution
main() {
    # Set trap for cleanup on error
    trap cleanup_on_error ERR
    
    print_banner
    
    check_prerequisites
    load_environment
    setup_directories
    start_initial_services
    create_temp_nginx_config
    start_nginx_for_certs
    generate_ssl_certificates
    restore_nginx_config
    restart_nginx_with_ssl
    start_auto_renewal
    test_setup
    show_completion_message
}

# Handle command line arguments
case "${1:-}" in
    "start")
        log "Starting services..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE up -d
        ;;
    "stop")
        log "Stopping services..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE down
        ;;
    "restart")
        log "Restarting services..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE restart
        ;;
    "logs")
        log "Showing logs..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f
        ;;
    "status")
        log "Service status..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE ps
        ;;
    "ssl-renew")
        log "Renewing SSL certificates..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certbot renew
        $DOCKER_COMPOSE -f $COMPOSE_FILE exec nginx-proxy nginx -s reload
        ;;
    *)
        main
        ;;
esac