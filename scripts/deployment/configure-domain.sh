#!/bin/bash

echo "🌐 FilmFlex Domain Configuration Tool"
echo "===================================="
echo "📅 Date: $(date)"
echo "🎯 Domain: phimgg.com"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Initialize logging
init_logging "configure-domain"

# Enhanced domain configuration function
configure_domain_comprehensive() {
    local domain_name="phimgg.com"
    local server_ip="38.54.14.154"
    local issues_found=false
    
    print_header "Comprehensive Domain Configuration for $domain_name"
    echo ""
    
    # 1. DNS Resolution Check
    print_info "1. Checking DNS resolution for $domain_name..."
    local resolved_ip=""
    
    if command -v dig >/dev/null 2>&1; then
        resolved_ip=$(dig +short A "$domain_name" | head -1)
        print_info "Using dig for DNS lookup"
    elif command -v nslookup >/dev/null 2>&1; then
        resolved_ip=$(nslookup "$domain_name" | grep -A1 "Name:" | tail -1 | awk '{print $2}' 2>/dev/null)
        print_info "Using nslookup for DNS lookup"
    else
        print_warning "No DNS lookup tools available (dig/nslookup)"
    fi
    
    if [ -z "$resolved_ip" ]; then
        print_error "Could not resolve DNS for $domain_name"
        print_info "Troubleshooting steps:"
        print_info "  • Check if domain is registered"
        print_info "  • Verify DNS provider settings"
        print_info "  • Manual check: dig +short A $domain_name"
        issues_found=true
    elif [ "$resolved_ip" = "$server_ip" ]; then
        print_status "DNS correctly points to server ($resolved_ip)"
    else
        print_warning "DNS mismatch: Domain points to $resolved_ip, server is $server_ip"
        print_info "Action needed:"
        print_info "  • Update DNS A record to point $domain_name to $server_ip"
        print_info "  • DNS propagation may take up to 24-48 hours"
        issues_found=true
    fi
    
    # Check www subdomain
    local www_resolved_ip=""
    if command -v dig >/dev/null 2>&1; then
        www_resolved_ip=$(dig +short A "www.$domain_name" | head -1)
    fi
    
    if [ ! -z "$www_resolved_ip" ]; then
        if [ "$www_resolved_ip" = "$server_ip" ]; then
            print_status "www.$domain_name also points correctly"
        else
            print_warning "www.$domain_name points to different IP: $www_resolved_ip"
        fi
    else
        print_info "www.$domain_name does not resolve (optional)"
    fi
    
    echo ""
    
    # 2. SSL Certificate Check
    print_info "2. Checking SSL certificate for $domain_name..."
    if check_ssl_certificate "$domain_name"; then
        print_status "SSL certificate is valid and current"
        
        # Show certificate details
        if command -v openssl >/dev/null 2>&1; then
            local cert_issuer=$(openssl x509 -issuer -noout -in "/etc/letsencrypt/live/$domain_name/cert.pem" 2>/dev/null | cut -d= -f2-)
            print_info "Certificate issuer: $cert_issuer"
        fi
    else
        print_error "SSL certificate issues detected"
        print_info "Generate SSL certificate:"
        print_info "  • Install certbot: apt install certbot python3-certbot-nginx"
        print_info "  • Generate cert: certbot --nginx -d $domain_name -d www.$domain_name"
        issues_found=true
    fi
    
    echo ""
    
    # 3. Nginx Configuration Check
    print_info "3. Checking Nginx configuration for $domain_name..."
    if check_nginx_status; then
        print_status "Nginx is running with valid configuration"
        
        # Check for domain-specific config
        local nginx_config_found=false
        for config_path in "/etc/nginx/sites-available/$domain_name" "/etc/nginx/conf.d/$domain_name.conf" "/etc/nginx/sites-enabled/$domain_name"; do
            if [ -f "$config_path" ]; then
                print_status "Domain config found: $config_path"
                nginx_config_found=true
                break
            fi
        done
        
        if [ "$nginx_config_found" = false ]; then
            print_warning "Domain-specific Nginx configuration not found"
            print_info "Create configuration:"
            print_info "  • Run: ./scripts/deployment/setup-nginx.sh"
            issues_found=true
        fi
    else
        print_error "Nginx issues detected"
        issues_found=true
    fi
    
    echo ""
    
    # 4. Firewall Configuration
    print_info "4. Checking firewall configuration..."
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            print_info "UFW firewall is active"
            if ufw status | grep -q "80\|443\|Nginx"; then
                print_status "Firewall allows HTTP/HTTPS traffic"
            else
                print_warning "Firewall may block web traffic"
                print_info "Allow web traffic:"
                print_info "  • ufw allow 'Nginx Full'"
                print_info "  • ufw allow 80"
                print_info "  • ufw allow 443"
                issues_found=true
            fi
        else
            print_info "UFW firewall is inactive"
        fi
    else
        print_info "No UFW firewall detected"
    fi
    
    echo ""
    
    # 5. Domain Accessibility Tests
    print_info "5. Testing domain accessibility..."
    
    # Test HTTP redirect
    if test_endpoint "http://$domain_name" 301 2 || test_endpoint "http://$domain_name" 302 2; then
        print_status "HTTP redirects properly to HTTPS"
    elif test_endpoint "http://$domain_name" 200 1; then
        print_warning "HTTP responds directly without redirect"
    else
        print_error "Cannot connect via HTTP"
        issues_found=true
    fi
    
    # Test HTTPS
    if test_endpoint "https://$domain_name" 200 3; then
        print_status "HTTPS works correctly"
    else
        print_error "Cannot connect via HTTPS"
        issues_found=true
    fi
    
    # Test API endpoint
    if test_endpoint "https://$domain_name/api/health" 200 2; then
        print_status "API endpoint accessible via domain"
    else
        print_warning "API endpoint issue via domain"
    fi
    
    echo ""
    
    # 6. Performance Check
    print_info "6. Performance and security check..."
    if command -v curl >/dev/null 2>&1; then
        local response_time=$(curl -s -o /dev/null -w "%{time_total}" "https://$domain_name" 2>/dev/null || echo "0")
        if [ ! -z "$response_time" ] && [ "$response_time" != "0" ]; then
            print_info "Response time: ${response_time}s"
        fi
        
        # Check security headers
        local security_headers=$(curl -s -I "https://$domain_name" 2>/dev/null | grep -i "strict-transport-security\|x-frame-options")
        if [ ! -z "$security_headers" ]; then
            print_status "Security headers detected"
        else
            print_info "Consider adding security headers to Nginx config"
        fi
    fi
    
    # Final Summary
    echo ""
    print_bold "================== CONFIGURATION SUMMARY =================="
    echo ""
    
    if [ "$issues_found" = false ]; then
        print_status "🎉 DOMAIN FULLY CONFIGURED - $domain_name is ready!"
        echo ""
        print_info "✓ DNS: Correctly pointing to server"
        print_info "✓ SSL: Valid certificate installed"
        print_info "✓ Nginx: Running with valid configuration"
        print_info "✓ Firewall: Properly configured"
        print_info "✓ Access: HTTPS working correctly"
    else
        print_warning "⚠️  CONFIGURATION ISSUES FOUND - Action required"
        echo ""
        print_info "Review the issues above and follow the suggested actions"
        print_info "Re-run this script after making changes to verify fixes"
    fi
    
    echo ""
    print_info "Configuration check completed at $(date)"
    print_info "Domain: https://$domain_name"
    echo "=================================================================="
    
    return $([ "$issues_found" = false ] && echo 0 || echo 1)
}

# Check if running as root (needed for some operations)
if [[ $EUID -eq 0 ]]; then
    print_info "Running as root - full system access available"
else
    print_warning "Running as non-root - some checks may be limited"
    print_info "For full system checks, run as root: sudo $0"
fi

echo ""

# Acquire lock
acquire_lock "domain-config" 120

# Run domain configuration
configure_domain_comprehensive
config_result=$?

echo ""
print_info "Domain Configuration Tool Commands:"
print_info "• Re-run checks: ./scripts/deployment/configure-domain.sh"
print_info "• Setup SSL: certbot --nginx -d phimgg.com -d www.phimgg.com"
print_info "• Setup Nginx: ./scripts/deployment/setup-nginx.sh"
print_info "• Check health: ./scripts/deployment/health-check.sh"
print_info "• Full deployment: ./scripts/deployment/deploy-production.sh"

echo ""
if [ $config_result -eq 0 ]; then
    print_status "Domain configuration is optimal! 🌐"
else
    print_warning "Please address the configuration issues above 🔧"
fi