#!/bin/bash

# Domain Security Checker for phimgg.com
# Verifies SSL configuration, security headers, and best practices

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

DOMAIN="phimgg.com"

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

info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

print_banner() {
    echo -e "${PURPLE}"
    echo "========================================"
    echo "  Security Analysis for $DOMAIN"
    echo "  SSL, Headers & Best Practices"
    echo "========================================"
    echo -e "${NC}"
}

# Check SSL certificate details
check_ssl_certificate() {
    log "Checking SSL certificate..."
    
    # Get certificate info
    CERT_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        success "SSL certificate retrieved successfully"
        
        # Check expiration
        EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
        info "Certificate expires: $EXPIRY"
        
        # Check issuer
        ISSUER=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null | cut -d= -f2-)
        info "Issued by: $ISSUER"
        
        # Check key size
        KEY_SIZE=$(echo "$CERT_INFO" | grep "Public-Key:" | grep -o "[0-9]\+" | head -1)
        if [ "$KEY_SIZE" -ge 2048 ]; then
            success "Key size: ${KEY_SIZE} bits (secure)"
        else
            warning "Key size: ${KEY_SIZE} bits (consider upgrading to 2048+)"
        fi
        
        # Check signature algorithm
        SIG_ALG=$(echo "$CERT_INFO" | grep "Signature Algorithm:" | head -1 | cut -d: -f2 | tr -d ' ')
        if [[ "$SIG_ALG" == *"sha256"* ]]; then
            success "Signature algorithm: $SIG_ALG (secure)"
        else
            warning "Signature algorithm: $SIG_ALG"
        fi
    else
        error "Failed to retrieve SSL certificate"
    fi
}

# Check security headers
check_security_headers() {
    log "Checking HTTP security headers..."
    
    HEADERS=$(curl -I -s -m 10 https://$DOMAIN)
    
    # HSTS
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        HSTS_VALUE=$(echo "$HEADERS" | grep -i "strict-transport-security" | cut -d: -f2- | tr -d ' \r')
        success "HSTS enabled: $HSTS_VALUE"
    else
        error "HSTS not enabled"
    fi
    
    # X-Frame-Options
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        FRAME_OPTIONS=$(echo "$HEADERS" | grep -i "x-frame-options" | cut -d: -f2- | tr -d ' \r')
        success "X-Frame-Options: $FRAME_OPTIONS"
    else
        warning "X-Frame-Options header missing"
    fi
    
    # X-Content-Type-Options
    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        CONTENT_TYPE_OPTIONS=$(echo "$HEADERS" | grep -i "x-content-type-options" | cut -d: -f2- | tr -d ' \r')
        success "X-Content-Type-Options: $CONTENT_TYPE_OPTIONS"
    else
        warning "X-Content-Type-Options header missing"
    fi
    
    # X-XSS-Protection
    if echo "$HEADERS" | grep -qi "x-xss-protection"; then
        XSS_PROTECTION=$(echo "$HEADERS" | grep -i "x-xss-protection" | cut -d: -f2- | tr -d ' \r')
        success "X-XSS-Protection: $XSS_PROTECTION"
    else
        warning "X-XSS-Protection header missing"
    fi
    
    # Referrer Policy
    if echo "$HEADERS" | grep -qi "referrer-policy"; then
        REFERRER_POLICY=$(echo "$HEADERS" | grep -i "referrer-policy" | cut -d: -f2- | tr -d ' \r')
        success "Referrer-Policy: $REFERRER_POLICY"
    else
        warning "Referrer-Policy header missing"
    fi
    
    # Content Security Policy
    if echo "$HEADERS" | grep -qi "content-security-policy"; then
        success "Content Security Policy detected"
    else
        warning "Content Security Policy not configured"
    fi
}

# Check SSL/TLS configuration
check_ssl_config() {
    log "Checking SSL/TLS configuration..."
    
    # Test SSL Labs API (if available)
    if command -v curl &> /dev/null; then
        # Check supported protocols
        if openssl s_client -connect $DOMAIN:443 -tls1_2 < /dev/null &>/dev/null; then
            success "TLS 1.2 supported"
        else
            warning "TLS 1.2 not supported"
        fi
        
        if openssl s_client -connect $DOMAIN:443 -tls1_3 < /dev/null &>/dev/null; then
            success "TLS 1.3 supported"
        else
            info "TLS 1.3 not supported (optional)"
        fi
        
        # Check for weak protocols
        if openssl s_client -connect $DOMAIN:443 -ssl3 < /dev/null &>/dev/null; then
            error "SSL 3.0 still supported (insecure)"
        else
            success "SSL 3.0 disabled"
        fi
    fi
}

# Check HTTP to HTTPS redirect
check_https_redirect() {
    log "Checking HTTP to HTTPS redirect..."
    
    HTTP_RESPONSE=$(curl -I -s -m 10 http://$DOMAIN)
    
    if echo "$HTTP_RESPONSE" | grep -q "301\|302"; then
        LOCATION=$(echo "$HTTP_RESPONSE" | grep -i "location:" | cut -d: -f2- | tr -d ' \r')
        if [[ "$LOCATION" == https://* ]]; then
            success "HTTP redirects to HTTPS: $LOCATION"
        else
            warning "HTTP redirects but not to HTTPS: $LOCATION"
        fi
    else
        error "No HTTP to HTTPS redirect configured"
    fi
}

# Check for mixed content issues
check_mixed_content() {
    log "Checking for potential mixed content issues..."
    
    PAGE_CONTENT=$(curl -s -m 10 https://$DOMAIN | head -100)
    
    if echo "$PAGE_CONTENT" | grep -q 'src="http://\|href="http://'; then
        warning "Potential mixed content detected (HTTP resources on HTTPS page)"
    else
        success "No obvious mixed content issues detected"
    fi
}

# Performance and security best practices
check_performance_security() {
    log "Checking performance and security best practices..."
    
    HEADERS=$(curl -I -s -m 10 https://$DOMAIN)
    
    # Compression
    if echo "$HEADERS" | grep -qi "content-encoding.*gzip"; then
        success "Gzip compression enabled"
    else
        warning "Gzip compression not detected"
    fi
    
    # HTTP/2
    if echo "$HEADERS" | grep -q "HTTP/2"; then
        success "HTTP/2 supported"
    else
        warning "HTTP/2 not detected"
    fi
    
    # Server header disclosure
    if echo "$HEADERS" | grep -qi "server:"; then
        SERVER_HEADER=$(echo "$HEADERS" | grep -i "server:" | cut -d: -f2- | tr -d ' \r')
        warning "Server header disclosed: $SERVER_HEADER"
    else
        success "Server header hidden"
    fi
}

# Generate security score
calculate_security_score() {
    log "Calculating security score..."
    
    SCORE=0
    TOTAL=10
    
    # SSL certificate (2 points)
    if echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep -q "After"; then
        SCORE=$((SCORE + 2))
    fi
    
    HEADERS=$(curl -I -s -m 10 https://$DOMAIN)
    
    # HSTS (2 points)
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        SCORE=$((SCORE + 2))
    fi
    
    # Security headers (3 points)
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        SCORE=$((SCORE + 1))
    fi
    if echo "$HEADERS" | grep -qi "x-content-type-options"; then
        SCORE=$((SCORE + 1))
    fi
    if echo "$HEADERS" | grep -qi "x-xss-protection"; then
        SCORE=$((SCORE + 1))
    fi
    
    # HTTPS redirect (2 points)
    if curl -I -s -m 10 http://$DOMAIN | grep -q "301\|302"; then
        SCORE=$((SCORE + 2))
    fi
    
    # HTTP/2 (1 point)
    if echo "$HEADERS" | grep -q "HTTP/2"; then
        SCORE=$((SCORE + 1))
    fi
    
    PERCENTAGE=$((SCORE * 100 / TOTAL))
    
    echo ""
    log "Security Score: $SCORE/$TOTAL ($PERCENTAGE%)"
    
    if [ $PERCENTAGE -ge 90 ]; then
        success "Excellent security configuration!"
    elif [ $PERCENTAGE -ge 70 ]; then
        success "Good security configuration"
    elif [ $PERCENTAGE -ge 50 ]; then
        warning "Average security - room for improvement"
    else
        error "Poor security configuration - needs attention"
    fi
}

# Main execution
main() {
    print_banner
    
    case "${1:-all}" in
        "ssl"|"certificate")
            check_ssl_certificate
            ;;
        "headers")
            check_security_headers
            ;;
        "config")
            check_ssl_config
            ;;
        "redirect")
            check_https_redirect
            ;;
        "mixed")
            check_mixed_content
            ;;
        "performance")
            check_performance_security
            ;;
        "score")
            calculate_security_score
            ;;
        "all"|*)
            check_ssl_certificate
            echo ""
            check_security_headers
            echo ""
            check_ssl_config
            echo ""
            check_https_redirect
            echo ""
            check_mixed_content
            echo ""
            check_performance_security
            echo ""
            calculate_security_score
            ;;
    esac
    
    echo ""
    log "Security analysis completed"
}

main "$@"