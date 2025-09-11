#!/bin/bash

# FilmFlex Production Deployment Script - FIXED VERSION
# This script deploys FilmFlex to production with proper SSL and latest code

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="filmflex"
DOMAIN="phimgg.com"
EMAIL="your-email@example.com"  # Change this to your email
REPO_URL="https://github.com/your-username/filmflex.git"  # Change to your repo
DEPLOY_PATH="/opt/filmflex"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    print_success "System packages updated"
}

# Install required packages
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install Node.js 20.x
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install other dependencies
    sudo apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        docker.io \
        docker-compose \
        git \
        curl \
        wget \
        unzip \
        postgresql-client
    
    # Start and enable services
    sudo systemctl enable docker nginx
    sudo systemctl start docker nginx
    
    print_success "Dependencies installed"
}

# Setup deployment directory and pull latest code
setup_code() {
    print_status "Setting up application code..."
    
    # Create deployment directory
    sudo mkdir -p $DEPLOY_PATH
    sudo chown -R $USER:$USER $DEPLOY_PATH
    
    # Clone or update repository
    if [ -d "$DEPLOY_PATH/.git" ]; then
        print_status "Updating existing repository..."
        cd $DEPLOY_PATH
        git fetch origin
        git reset --hard origin/main  # Force update to latest main branch
        git clean -fd  # Remove untracked files
        print_success "Repository updated to latest version"
    else
        print_status "Cloning repository..."
        git clone $REPO_URL $DEPLOY_PATH
        cd $DEPLOY_PATH
        print_success "Repository cloned"
    fi
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm ci --production
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    print_success "Application code setup completed"
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates for $DOMAIN..."
    
    # Stop nginx temporarily
    sudo systemctl stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN \
        --non-interactive || {
        print_warning "SSL certificate generation failed, continuing with HTTP..."
        sudo systemctl start nginx
        return 1
    }
    
    # Setup auto-renewal
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer
    
    print_success "SSL certificates configured"
}

# Configure nginx
configure_nginx() {
    print_status "Configuring nginx..."
    
    # Copy nginx configuration
    sudo cp $DEPLOY_PATH/nginx/phimgg.com.conf $NGINX_SITES/phimgg.com
    
    # Enable the site
    sudo ln -sf $NGINX_SITES/phimgg.com $NGINX_ENABLED/phimgg.com
    
    # Remove default nginx site
    sudo rm -f $NGINX_ENABLED/default
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_success "Nginx configuration is valid"
        sudo systemctl restart nginx
        print_success "Nginx restarted"
    else
        print_error "Nginx configuration is invalid"
        exit 1
    fi
}

# Setup Docker environment
setup_docker() {
    print_status "Setting up Docker environment..."
    
    cd $DEPLOY_PATH
    
    # Stop any existing containers
    sudo docker-compose down 2>/dev/null || true
    
    # Pull latest images
    sudo docker-compose pull
    
    # Build and start containers
    sudo docker-compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if containers are running
    if sudo docker-compose ps | grep -q "Up"; then
        print_success "Docker containers are running"
    else
        print_error "Failed to start Docker containers"
        sudo docker-compose logs
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if application is responding
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
            print_success "Application is responding on port 5000"
            break
        else
            print_status "Attempt $attempt/$max_attempts: Application not ready yet..."
            sleep 5
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Application failed to start properly"
        exit 1
    fi
    
    # Check nginx status
    if sudo systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
        exit 1
    fi
    
    # Test domain access
    if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
        print_success "Domain $DOMAIN is accessible"
    else
        print_warning "Domain $DOMAIN might not be accessible yet (DNS propagation)"
    fi
}

# Setup monitoring and logs
setup_monitoring() {
    print_status "Setting up monitoring and logs..."
    
    # Create log directories
    sudo mkdir -p /var/log/filmflex
    sudo chown -R $USER:$USER /var/log/filmflex
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/filmflex > /dev/null << 'EOF'
/var/log/filmflex/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 filmflex filmflex
}
EOF
    
    print_success "Monitoring and logs configured"
}

# Main deployment function
main() {
    print_status "Starting FilmFlex production deployment..."
    
    # Pre-deployment checks
    check_root
    
    # Deployment steps
    update_system
    install_dependencies
    setup_code
    setup_ssl
    configure_nginx
    setup_docker
    setup_monitoring
    verify_deployment
    
    print_success "🎉 FilmFlex deployment completed successfully!"
    echo ""
    echo -e "${GREEN}Application URLs:${NC}"
    echo -e "  • HTTPS: ${BLUE}https://$DOMAIN${NC}"
    echo -e "  • HTTP:  ${BLUE}http://$DOMAIN${NC} (redirects to HTTPS)"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Update DNS records to point $DOMAIN to this server's IP"
    echo "2. Test the application thoroughly"
    echo "3. Monitor logs: sudo docker-compose logs -f"
    echo ""
    echo -e "${GREEN}Useful commands:${NC}"
    echo "  • View logs: sudo docker-compose logs -f"
    echo "  • Restart services: sudo docker-compose restart"
    echo "  • Update SSL: sudo certbot renew"
    echo "  • Check nginx: sudo nginx -t && sudo systemctl reload nginx"
}

# Run main function
main "$@"