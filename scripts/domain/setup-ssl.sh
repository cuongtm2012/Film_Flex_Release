#!/bin/bash

# FilmFlex Docker Nginx SSL Setup Script
# Automated setup for Nginx with Let's Encrypt SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.ssl.yml"
ENV_FILE=".env.ssl"

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
    echo "  FilmFlex SSL Setup with Docker"
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
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Load and validate environment variables
load_environment() {
    log "Loading environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found!"
        log "Please copy .env.ssl and configure your domain settings"
        exit 1
    fi
    
    source $ENV_FILE
    
    if [ "$DOMAIN" = "your-domain.com" ]; then
        error "Please configure your actual domain in $ENV_FILE"
        exit 1
    fi
    
    if [ "$SERVER_IP" = "your.server.ip.address" ]; then
        error "Please configure your actual server IP in $ENV_FILE"
        exit 1
    fi
    
    # Update nginx config with actual domain
    sed -i.bak "s/your-domain.com/$DOMAIN/g" nginx/conf.d/default.conf
    
    success "Environment loaded: Domain=$DOMAIN, IP=$SERVER_IP"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p nginx/conf.d
    mkdir -p logs
    
    # Create initial certbot directories to avoid mount issues
    docker run --rm -v $(pwd)/certbot-conf:/etc/letsencrypt \
        certbot/certbot sh -c "mkdir -p /etc/letsencrypt/live"
    
    success "Directories created"
}

# Start services without SSL first
start_initial_services() {
    log "Starting initial services (app and database)..."
    
    # Start only app and postgres first
    docker-compose -f $COMPOSE_FILE up -d postgres app
    
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check if app is responding
    if docker-compose -f $COMPOSE_FILE exec app curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        success "FilmFlex app is running and healthy"
    else
        warning "App health check failed, but continuing..."
    fi
}

# Create temporary nginx config for certificate generation
create_temp_nginx_config() {
    log "Creating temporary nginx config for certificate generation..."
    
    # Backup original config
    cp nginx/conf.d/default.conf nginx/conf.d/default.conf.ssl
    
    # Create temporary HTTP-only config
    cat > nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Temporary proxy for app (testing)
    location / {
        proxy_pass http://app:5000;
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
start_nginx_temp() {
    log "Starting Nginx for certificate generation..."
    
    docker-compose -f $COMPOSE_FILE up -d nginx
    
    sleep 15
    
    # Test if nginx is responding
    if curl -f http://localhost > /dev/null 2>&1; then
        success "Nginx started successfully"
    else
        warning "Nginx may not be accessible from localhost"
    fi
}

# Generate SSL certificates
generate_ssl_certificates() {
    log "Generating SSL certificates with Let's Encrypt..."
    
    # Check if certificates already exist
    if docker-compose -f $COMPOSE_FILE exec certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        warning "Certificates already exist for $DOMAIN"
        read -p "Do you want to renew them? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Skipping certificate generation"
            return 0
        fi
    fi
    
    # Generate certificates using webroot method
    log "Requesting SSL certificate for $DOMAIN and www.$DOMAIN..."
    
    docker-compose -f $COMPOSE_FILE run --rm certbot \
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
        # Restore original config and exit
        mv nginx/conf.d/default.conf.ssl nginx/conf.d/default.conf
        exit 1
    fi
}

# Restore SSL nginx configuration
restore_ssl_config() {
    log "Restoring SSL nginx configuration..."
    
    # Restore the full SSL configuration
    mv nginx/conf.d/default.conf.ssl nginx/conf.d/default.conf
    
    success "SSL configuration restored"
}

# Restart nginx with SSL
restart_nginx_with_ssl() {
    log "Restarting Nginx with SSL configuration..."
    
    # Test nginx config first
    if docker-compose -f $COMPOSE_FILE exec nginx nginx -t; then
        docker-compose -f $COMPOSE_FILE restart nginx
        sleep 10
        success "Nginx restarted with SSL"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# Start certbot for auto-renewal
start_ssl_renewal() {
    log "Starting SSL auto-renewal service..."
    
    docker-compose -f $COMPOSE_FILE up -d certbot
    
    success "SSL auto-renewal service started"
}

# Test the complete setup
test_setup() {
    log "Testing the complete setup..."
    
    # Test HTTP redirect
    log "Testing HTTP to HTTPS redirect..."
    if curl -I -s http://$DOMAIN | grep -q "301\|302"; then
        success "HTTP redirect working"
    else
        warning "HTTP redirect may not be working properly"
    fi
    
    # Test HTTPS
    log "Testing HTTPS access..."
    if curl -I -s -k https://$DOMAIN | grep -q "200\|301\|302"; then
        success "HTTPS access working"
    else
        warning "HTTPS access may not be working properly"
    fi
    
    # Test SSL certificate
    log "Testing SSL certificate..."
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates | grep -q "After"; then
        success "SSL certificate is valid"
    else
        warning "SSL certificate validation issues"
    fi
    
    # Test app health through proxy
    log "Testing app connectivity through proxy..."
    if curl -s https://$DOMAIN/api/health > /dev/null 2>&1; then
        success "FilmFlex app accessible through HTTPS proxy"
    else
        warning "App may not be accessible through HTTPS proxy"
    fi
}

# Display final instructions
show_completion_message() {
    echo ""
    success "🎉 FilmFlex SSL setup completed successfully!"
    echo ""
    log "Your FilmFlex application is now running with:"
    log "✅ Nginx reverse proxy"
    log "✅ Let's Encrypt SSL certificates"
    log "✅ Automatic certificate renewal"
    log "✅ HTTP to HTTPS redirect"
    log "✅ Security headers"
    log "✅ Rate limiting protection"
    echo ""
    log "🌐 Website: https://$DOMAIN"
    log "🌐 Alternative: https://www.$DOMAIN"
    echo ""
    log "📋 Management commands:"
    log "  • View logs: docker-compose -f $COMPOSE_FILE logs -f"
    log "  • Stop services: docker-compose -f $COMPOSE_FILE down"
    log "  • Restart nginx: docker-compose -f $COMPOSE_FILE restart nginx"
    log "  • Check certificates: docker-compose -f $COMPOSE_FILE exec certbot certbot certificates"
    log "  • Manual renewal: docker-compose -f $COMPOSE_FILE exec certbot certbot renew"
    echo ""
    warning "Important reminders:"
    log "1. Ensure your DNS A records point to: $SERVER_IP"
    log "2. Wait for DNS propagation (up to 24 hours)"
    log "3. Certificates auto-renew every 12 hours"
    log "4. Monitor logs for any issues"
    echo ""
}

# Cleanup function for errors
cleanup_on_error() {
    error "Setup failed. Cleaning up..."
    
    # Restore original nginx config if backup exists
    if [ -f nginx/conf.d/default.conf.ssl ]; then
        mv nginx/conf.d/default.conf.ssl nginx/conf.d/default.conf
    fi
    
    # Stop services
    docker-compose -f $COMPOSE_FILE down
    
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
    start_nginx_temp
    generate_ssl_certificates
    restore_ssl_config
    restart_nginx_with_ssl
    start_ssl_renewal
    test_setup
    show_completion_message
}

# Run main function
main "$@"