#!/bin/bash

echo "🌐 DNS and Domain Configuration Checker for phimgg.com"
echo "======================================================"
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

# Check DNS resolution
print_info "Checking DNS resolution for phimgg.com..."

# Check if dig is available
if command -v dig &> /dev/null; then
    # Use dig for detailed DNS information
    print_info "DNS A record lookup:"
    dig +short A phimgg.com
    
    print_info "DNS detailed lookup:"
    dig phimgg.com
    
    # Check www subdomain
    print_info "Checking www.phimgg.com:"
    dig +short A www.phimgg.com
else
    # Fallback to nslookup
    print_info "Using nslookup (dig not available):"
    nslookup phimgg.com
fi

# Check if domain resolves to current server IP
SERVER_IP=$(curl -s https://ipinfo.io/ip 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
DOMAIN_IP=$(dig +short A phimgg.com 2>/dev/null | head -1)

print_info "Server IP: $SERVER_IP"
print_info "Domain IP: $DOMAIN_IP"

if [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
    print_status "DNS is correctly pointing to this server"
else
    print_warning "DNS mismatch! Domain points to $DOMAIN_IP but server is $SERVER_IP"
    print_info "This could cause domain access issues"
fi

# Check if ports are accessible
print_info "Checking port accessibility..."

# Check if port 80 is open
if netstat -tuln | grep -q ":80 "; then
    print_status "Port 80 (HTTP) is listening"
else
    print_error "Port 80 (HTTP) is not listening"
fi

# Check if port 443 is open
if netstat -tuln | grep -q ":443 "; then
    print_status "Port 443 (HTTPS) is listening"
else
    print_error "Port 443 (HTTPS) is not listening"
fi

# Check if port 5000 is accessible locally
if netstat -tuln | grep -q "127.0.0.1:5000"; then
    print_status "Application port 5000 is listening on localhost"
elif netstat -tuln | grep -q ":5000 "; then
    print_status "Application port 5000 is listening"
else
    print_warning "Application port 5000 is not accessible"
fi

# Check Nginx status and configuration
print_info "Checking Nginx configuration..."

if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
    
    # Test Nginx configuration
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors:"
        nginx -t
    fi
    
    # Check if phimgg.com configuration exists
    if [ -f "/etc/nginx/sites-available/phimgg.com" ] || [ -f "/etc/nginx/conf.d/phimgg.com.conf" ]; then
        print_status "phimgg.com Nginx configuration found"
    else
        print_warning "phimgg.com Nginx configuration not found in standard locations"
    fi
    
    # Check if configuration is enabled
    if [ -f "/etc/nginx/sites-enabled/phimgg.com" ] || [ -f "/etc/nginx/conf.d/phimgg.com.conf" ]; then
        print_status "phimgg.com configuration is enabled"
    else
        print_warning "phimgg.com configuration may not be enabled"
    fi
else
    print_error "Nginx is not running"
    print_info "Start with: systemctl start nginx"
fi

# Check SSL certificates
print_info "Checking SSL certificates..."

if [ -f "/etc/letsencrypt/live/phimgg.com/fullchain.pem" ]; then
    print_status "SSL certificate found for phimgg.com"
    
    # Check certificate expiry
    cert_expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/phimgg.com/cert.pem 2>/dev/null | cut -d= -f2)
    if [ ! -z "$cert_expiry" ]; then
        print_info "Certificate expires: $cert_expiry"
        
        # Check if certificate expires within 30 days
        if openssl x509 -checkend 2592000 -noout -in /etc/letsencrypt/live/phimgg.com/cert.pem 2>/dev/null; then
            print_status "Certificate is valid for more than 30 days"
        else
            print_warning "Certificate expires within 30 days - consider renewal"
        fi
    fi
else
    print_error "SSL certificate not found for phimgg.com"
    print_info "Generate with: certbot --nginx -d phimgg.com -d www.phimgg.com"
fi

# Test domain connectivity
print_info "Testing domain connectivity..."

# Test HTTP redirect
print_info "Testing HTTP to HTTPS redirect..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://phimgg.com 2>/dev/null || echo "000")
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    print_status "HTTP redirects properly (HTTP $HTTP_RESPONSE)"
else
    print_warning "HTTP redirect may not be working (HTTP $HTTP_RESPONSE)"
fi

# Test HTTPS
print_info "Testing HTTPS connection..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://phimgg.com 2>/dev/null || echo "000")
if [ "$HTTPS_RESPONSE" = "200" ]; then
    print_status "HTTPS is working (HTTP $HTTPS_RESPONSE)"
elif [ "$HTTPS_RESPONSE" = "000" ]; then
    print_error "Cannot connect to HTTPS (connection failed)"
else
    print_warning "HTTPS responding with HTTP $HTTPS_RESPONSE"
fi

# Test API endpoint
print_info "Testing API endpoint..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://phimgg.com/api/health 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
    print_status "API endpoint is working (HTTP $API_RESPONSE)"
else
    print_warning "API endpoint issue (HTTP $API_RESPONSE)"
fi

# Check if application is accessible locally
print_info "Testing local application access..."
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
if [ "$LOCAL_RESPONSE" = "200" ]; then
    print_status "Local application is accessible (HTTP $LOCAL_RESPONSE)"
else
    print_error "Local application not accessible (HTTP $LOCAL_RESPONSE)"
fi

# Check Docker containers
print_info "Checking Docker containers..."
if docker ps | grep -q filmflex-app; then
    print_status "FilmFlex app container is running"
else
    print_error "FilmFlex app container is not running"
fi

if docker ps | grep -q filmflex-postgres; then
    print_status "FilmFlex database container is running"
else
    print_error "FilmFlex database container is not running"
fi

# Check firewall status
print_info "Checking firewall status..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_info "UFW firewall is active"
        print_info "UFW rules:"
        ufw status numbered
    else
        print_info "UFW firewall is inactive"
    fi
elif command -v iptables &> /dev/null; then
    print_info "Checking iptables rules..."
    iptables -L INPUT | head -10
else
    print_info "No firewall tool detected"
fi

echo ""
print_info "Domain Configuration Summary:"
print_info "================================"
print_info "• Server IP: $SERVER_IP"
print_info "• Domain IP: $DOMAIN_IP"
print_info "• HTTP Response: $HTTP_RESPONSE"
print_info "• HTTPS Response: $HTTPS_RESPONSE"
print_info "• API Response: $API_RESPONSE"
print_info "• Local App Response: $LOCAL_RESPONSE"
echo ""

if [ "$DOMAIN_IP" = "$SERVER_IP" ] && [ "$HTTPS_RESPONSE" = "200" ]; then
    print_status "✅ Domain configuration appears correct!"
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    print_error "❌ DNS issue: Domain doesn't point to this server"
    print_info "Contact your domain registrar to update DNS records"
elif [ "$HTTPS_RESPONSE" != "200" ]; then
    print_error "❌ HTTPS issue: Server not responding properly"
    print_info "Check Nginx configuration and SSL certificates"
else
    print_warning "⚠️  Partial issues detected - check individual components"
fi

print_info "Run this script anytime to check domain status: ./scripts/deployment/check-domain.sh"