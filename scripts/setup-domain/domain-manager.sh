#!/bin/bash

# FilmFlex Domain Management Toolkit
# Comprehensive script for managing phimgg.com domain setup and maintenance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN="phimgg.com"
SERVER_IP="38.54.14.154"

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
    echo -e "${PURPLE}"
    echo "========================================"
    echo "  FilmFlex Domain Management Toolkit"
    echo "  Domain: $DOMAIN"
    echo "  Server: $SERVER_IP"
    echo "========================================"
    echo -e "${NC}"
}

# Check domain DNS resolution
check_dns() {
    log "Checking DNS resolution for $DOMAIN..."
    
    # Check A record
    if command -v dig &> /dev/null; then
        DNS_IP=$(dig +short $DOMAIN A | head -1)
    elif command -v nslookup &> /dev/null; then
        DNS_IP=$(nslookup $DOMAIN | grep "Address:" | tail -1 | awk '{print $2}')
    else
        warning "DNS tools not available, skipping DNS check"
        return
    fi
    
    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        success "DNS correctly points to $SERVER_IP"
    else
        error "DNS mismatch! Points to $DNS_IP, should be $SERVER_IP"
    fi
    
    # Check www subdomain
    if command -v dig &> /dev/null; then
        WWW_IP=$(dig +short www.$DOMAIN A | head -1)
        if [ "$WWW_IP" = "$SERVER_IP" ]; then
            success "www.$DOMAIN correctly points to $SERVER_IP"
        else
            warning "www.$DOMAIN points to $WWW_IP or is not configured"
        fi
    fi
}

# Test HTTP/HTTPS connectivity
test_connectivity() {
    log "Testing domain connectivity..."
    
    # Test HTTP
    if curl -I -s -m 10 http://$DOMAIN | head -1 | grep -q "301\|200"; then
        success "HTTP access working (should redirect to HTTPS)"
    else
        error "HTTP access failed"
    fi
    
    # Test HTTPS
    if curl -I -s -m 10 https://$DOMAIN | head -1 | grep -q "200"; then
        success "HTTPS access working"
    else
        error "HTTPS access failed"
    fi
    
    # Test SSL certificate
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep -q "After"; then
        success "SSL certificate is valid"
        # Show expiration date
        EXPIRY=$(openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
        log "Certificate expires: $EXPIRY"
    else
        error "SSL certificate validation failed"
    fi
}

# Check server status
check_server_status() {
    log "Checking server and services status..."
    
    # Check Docker containers
    if docker ps | grep -q "filmflex-postgres"; then
        success "PostgreSQL container running"
    else
        error "PostgreSQL container not running"
    fi
    
    if docker ps | grep -q "filmflex-app"; then
        success "FilmFlex app container running"
    else
        error "FilmFlex app container not running"
    fi
    
    if docker ps | grep -q "filmflex-nginx-proxy"; then
        success "Nginx proxy container running"
    else
        error "Nginx proxy container not running"
    fi
    
    # Check app health
    if curl -s -m 5 https://$DOMAIN/api/health > /dev/null 2>&1; then
        success "Application health check passed"
    else
        warning "Application health check failed"
    fi
}

# Performance test
performance_test() {
    log "Running performance test..."
    
    # Test page load time
    LOAD_TIME=$(curl -o /dev/null -s -w "%{time_total}" https://$DOMAIN)
    log "Page load time: ${LOAD_TIME}s"
    
    if (( $(echo "$LOAD_TIME < 3.0" | bc -l) )); then
        success "Good page load time"
    else
        warning "Slow page load time (>3s)"
    fi
}

# SSL certificate renewal
renew_ssl() {
    log "Renewing SSL certificates..."
    
    if docker compose -f docker-compose.nginx-ssl.yml run --rm certbot certbot renew; then
        success "SSL certificates renewed"
        log "Reloading nginx..."
        docker compose -f docker-compose.nginx-ssl.yml exec nginx-proxy nginx -s reload
        success "Nginx reloaded"
    else
        error "SSL renewal failed"
    fi
}

# Backup domain configuration
backup_config() {
    log "Backing up domain configuration..."
    
    BACKUP_DIR="backups/domain-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup nginx config
    cp nginx/phimgg.com.conf "$BACKUP_DIR/"
    cp nginx/nginx.conf "$BACKUP_DIR/"
    
    # Backup docker compose files
    cp docker-compose.nginx-ssl.yml "$BACKUP_DIR/"
    cp .env.nginx-ssl "$BACKUP_DIR/" 2>/dev/null || true
    
    # Export SSL certificates
    if docker ps | grep -q "filmflex-nginx-proxy"; then
        docker exec filmflex-nginx-proxy tar czf /tmp/ssl-backup.tar.gz /etc/letsencrypt/live/$DOMAIN/ 2>/dev/null || true
        docker cp filmflex-nginx-proxy:/tmp/ssl-backup.tar.gz "$BACKUP_DIR/ssl-certificates.tar.gz" 2>/dev/null || true
    fi
    
    success "Configuration backed up to $BACKUP_DIR"
}

# Monitor domain
monitor_domain() {
    log "Starting domain monitoring (press Ctrl+C to stop)..."
    
    while true; do
        clear
        echo -e "${CYAN}=== FilmFlex Domain Monitor - $(date) ===${NC}"
        echo ""
        
        # Quick status check
        if curl -I -s -m 5 https://$DOMAIN | head -1 | grep -q "200"; then
            echo -e "${GREEN}🟢 HTTPS Status: UP${NC}"
        else
            echo -e "${RED}🔴 HTTPS Status: DOWN${NC}"
        fi
        
        # Show response time
        RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" -m 5 https://$DOMAIN 2>/dev/null || echo "timeout")
        echo -e "${BLUE}⏱️  Response Time: ${RESPONSE_TIME}s${NC}"
        
        # Show container status
        echo -e "\n${BLUE}📦 Container Status:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep filmflex
        
        # Show recent nginx access
        echo -e "\n${BLUE}📊 Recent Access (last 5):${NC}"
        docker logs --tail 5 filmflex-nginx-proxy 2>/dev/null | tail -5 || echo "No logs available"
        
        sleep 30
    done
}

# Show help menu
show_help() {
    echo -e "${CYAN}FilmFlex Domain Management Commands:${NC}"
    echo ""
    echo -e "${YELLOW}Health Checks:${NC}"
    echo "  dns         - Check DNS resolution"
    echo "  connectivity - Test HTTP/HTTPS connectivity"
    echo "  status      - Check server and services status"
    echo "  health      - Run all health checks"
    echo "  performance - Run performance test"
    echo ""
    echo -e "${YELLOW}SSL Management:${NC}"
    echo "  ssl-status  - Check SSL certificate status"
    echo "  ssl-renew   - Renew SSL certificates"
    echo ""
    echo -e "${YELLOW}Maintenance:${NC}"
    echo "  backup      - Backup domain configuration"
    echo "  monitor     - Start domain monitoring"
    echo "  logs        - Show recent nginx logs"
    echo ""
    echo -e "${YELLOW}Setup Scripts:${NC}"
    echo "  setup-ssl   - Run SSL setup (simple-ssl-setup.sh)"
    echo "  setup-nginx - Run nginx setup (nginx-docker-setup.sh)"
    echo ""
}

# Main execution
main() {
    print_banner
    
    case "${1:-help}" in
        "dns")
            check_dns
            ;;
        "connectivity"|"connect")
            test_connectivity
            ;;
        "status")
            check_server_status
            ;;
        "health")
            check_dns
            test_connectivity
            check_server_status
            ;;
        "performance"|"perf")
            performance_test
            ;;
        "ssl-status")
            openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates
            ;;
        "ssl-renew")
            renew_ssl
            ;;
        "backup")
            backup_config
            ;;
        "monitor")
            monitor_domain
            ;;
        "logs")
            docker logs --tail 50 filmflex-nginx-proxy
            ;;
        "setup-ssl")
            ./simple-ssl-setup.sh
            ;;
        "setup-nginx")
            ./nginx-docker-setup.sh
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"