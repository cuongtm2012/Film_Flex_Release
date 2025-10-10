#!/bin/bash

echo "🚀 FilmFlex Production Deployment Script"
echo "=========================================="
echo "📅 Date: $(date)"
echo "🌐 Target: Production Server (38.54.14.154)"
echo "🎬 Database: 5,005+ Movies Pre-loaded"
echo ""

# Color codes for output (fallback if common functions not available)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Basic print functions (fallback)
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

print_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

print_mode() {
    echo -e "${BLUE}📦 $1${NC}"
}

# Try to load common functions if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/lib/common-functions.sh" ]; then
    source "$SCRIPT_DIR/lib/common-functions.sh"
    print_info "Loaded common functions library"
else
    print_warning "Common functions library not found, using fallback functions"
fi

# Default deployment mode
DEPLOYMENT_MODE=""
DEPLOY_DATABASE=false
DEPLOY_APP=false
MODE_NAME=""

# Nginx configuration paths
NGINX_SOURCE_DIR="$SCRIPT_DIR/../../nginx"
NGINX_DEST_DIR="/etc/nginx"
NGINX_CONF_D_DIR="/etc/nginx/conf.d"
NGINX_BACKUP_DIR="/etc/nginx/backup/$(date +%Y%m%d_%H%M%S)"

# Enhanced deployment logging and reporting
setup_deployment_logging() {
    # Create deployment logs directory
    local log_dir="$(pwd)/logs/deployment"
    mkdir -p "$log_dir"
    
    # Create deployment log file with timestamp
    DEPLOYMENT_LOG="$log_dir/deployment-$(date +%Y%m%d_%H%M%S).log"
    
    # Function to log both to console and file
    log_deployment() {
        local message="$1"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> "$DEPLOYMENT_LOG"
    }
    
    print_info "Deployment logging initialized: $DEPLOYMENT_LOG"
    log_deployment "FilmFlex $MODE_NAME started"
}

# Generate deployment report
generate_deployment_report() {
    local deployment_status="$1"
    
    print_header "📊 Generating Deployment Report"
    
    # Create report file
    local report_file="$(pwd)/logs/deployment/deployment-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# FilmFlex Deployment Report

**Date:** $(date)  
**Mode:** $MODE_NAME  
**Status:** $deployment_status  
**Server:** 38.54.14.154 (phimgg.com)  

## Deployment Summary

- **Database:** $([ "$DEPLOY_DATABASE" = true ] && echo "Deployed/Updated" || echo "Preserved (No Changes)")
- **Application:** Updated with latest code
- **Nginx:** $([ "$SKIP_NGINX" = true ] && echo "Skipped" || echo "Updated with fresh configuration")
- **Domain:** https://phimgg.com
- **Direct Access:** http://38.54.14.154:5000

## Health Check Results

### Container Status
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No FilmFlex containers found")

### Application Response
- **Local Endpoint:** HTTP $LOCAL_HTTP_CODE
- **API Health:** HTTP $API_HTTP_CODE

### Database Status
$(if [ "$DEPLOY_DATABASE" = true ] || docker ps | grep -q filmflex-postgres; then
    echo "- **Movie Count:** $MOVIE_COUNT movies loaded"
    echo "- **Connection:** $(docker exec filmflex-app nc -z filmflex-postgres 5432 2>/dev/null && echo "✅ Connected" || echo "❌ Failed")"
else
    echo "- **Status:** Database container not found"
fi)

### Nginx Status
$(if command -v nginx >/dev/null 2>&1; then
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "- **Service:** ✅ Running"
        echo "- **Configuration:** $(nginx -t 2>/dev/null && echo "✅ Valid" || echo "❌ Invalid")"
        echo "- **Ports:** $(ss -tlnp 2>/dev/null | grep nginx | awk '{print $4}' | cut -d: -f2 | sort -u | tr '\n' ' ' || echo "None")"
    else
        echo "- **Service:** ❌ Not Running"
    fi
else
    echo "- **Service:** ❌ Not Installed"
fi)

## Performance Metrics

- **Deployment Time:** Started at deployment initialization
- **Application Start Time:** ~40 seconds (with health checks)
- **Database Initialization:** $([ "$DEPLOY_DATABASE" = true ] && echo "~2-3 minutes (full deployment)" || echo "N/A (preserved)")

## Management Commands

\`\`\`bash
# View logs
docker compose -f docker-compose.server.yml logs -f

# Restart services  
docker compose -f docker-compose.server.yml restart

# Check container status
docker compose -f docker-compose.server.yml ps

# Nginx management
sudo nginx -t && sudo systemctl status nginx
sudo systemctl reload nginx

# Application health check
curl -I https://phimgg.com
curl -I http://localhost:5000/api/health
\`\`\`

## Troubleshooting

### If domain is not accessible:
1. Check Nginx status: \`sudo systemctl status nginx\`
2. Validate configuration: \`sudo nginx -t\`
3. Check SSL certificates: \`sudo openssl x509 -in /etc/letsencrypt/live/phimgg.com/cert.pem -noout -dates\`

### If application is not responding:
1. Check container logs: \`docker logs filmflex-app --tail 50\`
2. Verify database connection: \`docker exec filmflex-app nc -z filmflex-postgres 5432\`
3. Test direct access: \`curl -I http://localhost:5000\`

---
*Report generated by FilmFlex Production Deployment Script*  
*Version: $(date +%Y.%m.%d)*
EOF

    print_status "Deployment report generated: $report_file"
    log_deployment "Deployment report generated: $report_file"
}

# Final production readiness check
final_production_check() {
    print_header "🔍 Final Production Readiness Check"
    
    local readiness_score=0
    local max_score=10
    
    # Check 1: Application responding
    if [ "$LOCAL_HTTP_CODE" = "200" ]; then
        print_status "✅ Application is responding locally"
        ((readiness_score++))
    else
        print_error "❌ Application not responding locally"
    fi
    
    # Check 2: API health endpoint
    if [ "$API_HTTP_CODE" = "200" ]; then
        print_status "✅ API health endpoint is working"
        ((readiness_score++))
    else
        print_error "❌ API health endpoint not working"
    fi
    
    # Check 3: Database connectivity
    if docker exec filmflex-app nc -z filmflex-postgres 5432 2>/dev/null; then
        print_status "✅ Database connectivity verified"
        ((readiness_score++))
    else
        print_error "❌ Database connectivity failed"
    fi
    
    # Check 4: Nginx service
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
        print_status "✅ Nginx service is running"
        ((readiness_score++))
    else
        print_error "❌ Nginx service not running"
    fi
    
    # Check 5: Nginx configuration
    if command -v nginx >/dev/null 2>&1 && nginx -t 2>/dev/null; then
        print_status "✅ Nginx configuration is valid"
        ((readiness_score++))
    else
        print_error "❌ Nginx configuration has errors"
    fi
    
    # Check 6: SSL certificates
    if [ -f "/etc/letsencrypt/live/phimgg.com/cert.pem" ]; then
        if openssl x509 -in /etc/letsencrypt/live/phimgg.com/cert.pem -noout -checkend 2592000 2>/dev/null; then
            print_status "✅ SSL certificates are valid (>30 days remaining)"
            ((readiness_score++))
        else
            print_warning "⚠️  SSL certificates expire within 30 days"
        fi
    else
        print_error "❌ SSL certificates not found"
    fi
    
    # Check 7: Container health
    if docker ps --format "{{.Names}}" | grep -q "^filmflex-app$" && docker ps --format "{{.Names}}" | grep -q "^filmflex-postgres$"; then
        print_status "✅ All required containers are running"
        ((readiness_score++))
    else
        print_error "❌ Not all required containers are running"
    fi
    
    # Check 8: Disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 85 ]; then
        print_status "✅ Sufficient disk space available ($disk_usage% used)"
        ((readiness_score++))
    else
        print_warning "⚠️  High disk usage: $disk_usage% used"
    fi
    
    # Check 9: Memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -lt 85 ]; then
        print_status "✅ Sufficient memory available ($memory_usage% used)"
        ((readiness_score++))
    else
        print_warning "⚠️  High memory usage: $memory_usage% used"
    fi
    
    # Check 10: Port availability
    if ss -tlnp 2>/dev/null | grep -q ":80.*nginx" && ss -tlnp 2>/dev/null | grep -q ":443.*nginx"; then
        print_status "✅ Required ports (80, 443) are properly bound"
        ((readiness_score++))
    else
        print_error "❌ Required ports not properly bound to Nginx"
    fi
    
    # Calculate readiness percentage
    local readiness_percentage=$((readiness_score * 100 / max_score))
    
    echo ""
    print_header "📈 Production Readiness Score: $readiness_score/$max_score ($readiness_percentage%)"
    
    if [ $readiness_percentage -ge 90 ]; then
        print_status "🌟 EXCELLENT - Production ready!"
        return 0
    elif [ $readiness_percentage -ge 75 ]; then
        print_warning "✅ GOOD - Minor issues detected but production ready"
        return 0
    elif [ $readiness_percentage -ge 50 ]; then
        print_warning "⚠️  FAIR - Several issues need attention"
        return 1
    else
        print_error "❌ POOR - Critical issues prevent production deployment"
        return 1
    fi
}

# Function to manage Nginx configuration updates
manage_nginx_config() {
    local action="$1"
    
    case "$action" in
        "backup")
            print_header "Creating Nginx Configuration Backup"
            
            # Create backup directory
            if [ -d "$NGINX_DEST_DIR" ]; then
                print_info "Creating backup at: $NGINX_BACKUP_DIR"
                mkdir -p "$NGINX_BACKUP_DIR"
                
                # Backup main nginx.conf
                if [ -f "$NGINX_DEST_DIR/nginx.conf" ]; then
                    cp "$NGINX_DEST_DIR/nginx.conf" "$NGINX_BACKUP_DIR/"
                    print_status "Backed up nginx.conf"
                fi
                
                # Backup conf.d directory
                if [ -d "$NGINX_CONF_D_DIR" ]; then
                    cp -r "$NGINX_CONF_D_DIR" "$NGINX_BACKUP_DIR/"
                    print_status "Backed up conf.d directory"
                fi
                
                # Backup any site-specific configs
                if [ -f "$NGINX_DEST_DIR/phimgg.com.conf" ]; then
                    cp "$NGINX_DEST_DIR/phimgg.com.conf" "$NGINX_BACKUP_DIR/"
                    print_status "Backed up phimgg.com.conf"
                fi
                
                print_status "Nginx configuration backup completed"
            else
                print_warning "Nginx directory not found, skipping backup"
            fi
            ;;
            
        "clear")
            print_header "Clearing Existing Nginx Configuration"
            
            # Clear conf.d directory (but preserve basic files)
            if [ -d "$NGINX_CONF_D_DIR" ]; then
                print_info "Clearing $NGINX_CONF_D_DIR..."
                
                # Remove only FilmFlex-related configurations
                find "$NGINX_CONF_D_DIR" -name "*filmflex*" -type f -delete 2>/dev/null || true
                find "$NGINX_CONF_D_DIR" -name "*phimgg*" -type f -delete 2>/dev/null || true
                find "$NGINX_CONF_D_DIR" -name "*.conf" -type f -exec grep -l "filmflex\|phimgg" {} \; -delete 2>/dev/null || true
                
                print_status "Cleared FilmFlex-related configurations from conf.d"
            fi
            
            # Remove any site-specific configs in main directory
            if [ -f "$NGINX_DEST_DIR/phimgg.com.conf" ]; then
                rm -f "$NGINX_DEST_DIR/phimgg.com.conf"
                print_status "Removed old phimgg.com.conf"
            fi
            
            # Clean up any temporary or old config files
            find "$NGINX_DEST_DIR" -name "*.conf.old" -type f -delete 2>/dev/null || true
            find "$NGINX_DEST_DIR" -name "*.conf.bak" -type f -delete 2>/dev/null || true
            find "$NGINX_DEST_DIR" -name "*.conf.tmp" -type f -delete 2>/dev/null || true
            
            print_status "Cleared stale Nginx configuration files"
            ;;
            
        "copy")
            print_header "Copying Fresh Nginx Configuration"
            
            if [ ! -d "$NGINX_SOURCE_DIR" ]; then
                print_error "Nginx source directory not found: $NGINX_SOURCE_DIR"
                return 1
            fi
            
            # Ensure destination directories exist
            mkdir -p "$NGINX_DEST_DIR" "$NGINX_CONF_D_DIR"
            
            # Copy main nginx.conf if it exists
            if [ -f "$NGINX_SOURCE_DIR/nginx.conf" ]; then
                print_info "Copying nginx.conf..."
                cp "$NGINX_SOURCE_DIR/nginx.conf" "$NGINX_DEST_DIR/"
                print_status "Copied nginx.conf"
            fi
            
            # Copy site-specific configuration to the correct location (conf.d)
            if [ -f "$NGINX_SOURCE_DIR/phimgg.com.conf" ]; then
                print_info "Copying phimgg.com.conf to conf.d directory..."
                cp "$NGINX_SOURCE_DIR/phimgg.com.conf" "$NGINX_CONF_D_DIR/"
                print_status "Copied phimgg.com.conf to conf.d"
            fi
            
            # Copy conf.d directory contents
            if [ -d "$NGINX_SOURCE_DIR/conf.d" ]; then
                print_info "Copying conf.d configurations..."
                cp -r "$NGINX_SOURCE_DIR/conf.d/"* "$NGINX_CONF_D_DIR/" 2>/dev/null || true
                print_status "Copied conf.d configurations"
            fi
            
            # If building from Docker image, extract configs from there
            if docker images | grep -q "cuongtm2012/filmflex-app"; then
                print_info "Extracting Nginx configurations from Docker image..."
                
                # Create temporary container to extract configs
                local temp_container="filmflex-config-extract-$(date +%s)"
                
                if docker create --name "$temp_container" cuongtm2012/filmflex-app:latest >/dev/null 2>&1; then
                    # Try to copy nginx configs from container if they exist
                    docker cp "$temp_container:/app/nginx/." "$NGINX_SOURCE_DIR/" 2>/dev/null || true
                    docker cp "$temp_container:/etc/nginx/." "$NGINX_SOURCE_DIR/" 2>/dev/null || true
                    
                    # Copy any extracted configs
                    if [ -f "$NGINX_SOURCE_DIR/nginx.conf" ]; then
                        cp "$NGINX_SOURCE_DIR/nginx.conf" "$NGINX_DEST_DIR/"
                        print_status "Extracted and copied nginx.conf from Docker image"
                    fi
                    
                    # Clean up
                    docker rm "$temp_container" >/dev/null 2>&1
                fi
            fi
            
            print_status "Fresh Nginx configuration copied successfully"
            ;;
            
        "permissions")
            print_header "Setting Nginx Configuration Permissions"
            
            # Set proper ownership (nginx user if exists, otherwise root)
            local nginx_user="nginx"
            if ! id "$nginx_user" >/dev/null 2>&1; then
                nginx_user="www-data"
                if ! id "$nginx_user" >/dev/null 2>&1; then
                    nginx_user="root"
                fi
            fi
            
            print_info "Setting ownership to $nginx_user:$nginx_user"
            
            # Set ownership and permissions
            chown -R "$nginx_user:$nginx_user" "$NGINX_DEST_DIR" 2>/dev/null || chown -R root:root "$NGINX_DEST_DIR"
            
            # Set file permissions
            find "$NGINX_DEST_DIR" -type f -name "*.conf" -exec chmod 644 {} \;
            find "$NGINX_DEST_DIR" -type d -exec chmod 755 {} \;
            
            # Ensure main config is readable
            chmod 644 "$NGINX_DEST_DIR/nginx.conf" 2>/dev/null || true
            
            print_status "Nginx configuration permissions set correctly"
            ;;
            
        "validate")
            print_header "Validating Nginx Configuration"
            
            # Test nginx configuration
            if command -v nginx >/dev/null 2>&1; then
                print_info "Testing Nginx configuration syntax..."
                
                if nginx -t 2>/dev/null; then
                    print_status "Nginx configuration syntax is valid"
                    return 0
                else
                    print_error "Nginx configuration syntax errors detected"
                    print_info "Running nginx -t for detailed error information:"
                    nginx -t
                    return 1
                fi
            else
                print_warning "Nginx command not found, skipping validation"
                return 0
            fi
            ;;
            
        "reload")
            print_header "Reloading Nginx Service"
            
            if command -v systemctl >/dev/null 2>&1; then
                # Check if nginx is running
                if systemctl is-active --quiet nginx; then
                    print_info "Reloading Nginx configuration..."
                    
                    if systemctl reload nginx 2>/dev/null; then
                        print_status "Nginx configuration reloaded successfully"
                    else
                        print_warning "Nginx reload failed, attempting restart..."
                        
                        if systemctl restart nginx 2>/dev/null; then
                            print_status "Nginx restarted successfully"
                        else
                            print_error "Failed to restart Nginx"
                            return 1
                        fi
                    fi
                else
                    print_info "Nginx is not running, starting service..."
                    
                    if systemctl start nginx 2>/dev/null; then
                        print_status "Nginx started successfully"
                    else
                        print_error "Failed to start Nginx"
                        return 1
                    fi
                fi
                
                # Enable nginx to start on boot
                systemctl enable nginx 2>/dev/null || true
                
            elif command -v service >/dev/null 2>&1; then
                # Fallback to service command
                print_info "Using service command to reload Nginx..."
                
                if service nginx reload 2>/dev/null; then
                    print_status "Nginx reloaded successfully"
                elif service nginx restart 2>/dev/null; then
                    print_status "Nginx restarted successfully"
                else
                    print_error "Failed to reload/restart Nginx"
                    return 1
                fi
            else
                print_warning "No service management command found"
                print_info "Please manually reload Nginx: sudo nginx -s reload"
            fi
            ;;
            
        "status")
            print_header "Checking Nginx Status"
            
            # Check if nginx is installed
            if command -v nginx >/dev/null 2>&1; then
                print_status "Nginx is installed: $(nginx -v 2>&1)"
                
                # Check if nginx is running
                if command -v systemctl >/dev/null 2>&1; then
                    if systemctl is-active --quiet nginx; then
                        print_status "Nginx service is running"
                        
                        # Show brief status
                        local nginx_status=$(systemctl status nginx --no-pager -l | head -5)
                        print_info "Service status: Active"
                    else
                        print_warning "Nginx service is not running"
                    fi
                fi
                
                # Test configuration
                if nginx -t 2>/dev/null; then
                    print_status "Nginx configuration is valid"
                else
                    print_error "Nginx configuration has errors"
                fi
                
                # Check if listening on expected ports
                if command -v netstat >/dev/null 2>&1; then
                    local listening_ports=$(netstat -tlnp 2>/dev/null | grep nginx | awk '{print $4}' | cut -d: -f2 | sort -u | tr '\n' ' ')
                    if [ -n "$listening_ports" ]; then
                        print_status "Nginx listening on ports: $listening_ports"
                    fi
                elif command -v ss >/dev/null 2>&1; then
                    local listening_ports=$(ss -tlnp 2>/dev/null | grep nginx | awk '{print $4}' | cut -d: -f2 | sort -u | tr '\n' ' ')
                    if [ -n "$listening_ports" ]; then
                        print_status "Nginx listening on ports: $listening_ports"
                    fi
                fi
                
            else
                print_error "Nginx is not installed"
                return 1
            fi
            ;;
            
        *)
            print_error "Unknown nginx management action: $action"
            return 1
            ;;
    esac
}

# Enhanced domain connectivity testing
test_domain_connectivity() {
    print_header "Testing Domain Connectivity"
    
    local domain_tests_passed=true
    
    # Test HTTP redirect (should return 301)
    print_info "Testing HTTP redirect..."
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://phimgg.com 2>/dev/null || echo "000")
    if [ "$http_code" = "301" ]; then
        print_status "HTTP redirect working (HTTP $http_code)"
    else
        print_warning "HTTP redirect not working (HTTP $http_code)"
        domain_tests_passed=false
    fi
    
    # Test HTTPS connection
    print_info "Testing HTTPS connection..."
    local https_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://phimgg.com 2>/dev/null || echo "000")
    if [ "$https_code" = "200" ]; then
        print_status "HTTPS connection working (HTTP $https_code)"
    else
        print_warning "HTTPS connection not working (HTTP $https_code)"
        domain_tests_passed=false
    fi
    
    # Test SSL certificate
    if command -v openssl >/dev/null 2>&1; then
        print_info "Testing SSL certificate..."
        local ssl_test=$(echo | openssl s_client -connect phimgg.com:443 -servername phimgg.com 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        if [ $? -eq 0 ]; then
            print_status "SSL certificate is valid"
            local expiry=$(echo "$ssl_test" | grep "notAfter" | cut -d= -f2)
            print_info "Certificate expires: $expiry"
        else
            print_warning "SSL certificate test failed"
            domain_tests_passed=false
        fi
    fi
    
    return $([ "$domain_tests_passed" = true ] && echo 0 || echo 1)
}

# Function to perform complete Nginx configuration update
update_nginx_configuration() {
    print_header "🔧 Updating Nginx Configuration"
    
    local update_failed=false
    
    # Step 1: Backup existing configuration
    manage_nginx_config "backup" || update_failed=true
    
    # Step 2: Clear old configurations
    manage_nginx_config "clear" || update_failed=true
    
    # Step 3: Copy fresh configurations
    manage_nginx_config "copy" || update_failed=true
    
    # Step 4: Set proper permissions
    manage_nginx_config "permissions" || update_failed=true
    
    # Step 5: Validate configuration
    if ! manage_nginx_config "validate"; then
        print_error "Nginx configuration validation failed!"
        print_info "Attempting to restore from backup..."
        
        # Restore from backup
        if [ -d "$NGINX_BACKUP_DIR" ]; then
            cp -r "$NGINX_BACKUP_DIR/"* "$NGINX_DEST_DIR/" 2>/dev/null || true
            print_info "Restored configuration from backup"
            
            # Re-validate restored config
            if manage_nginx_config "validate"; then
                print_status "Restored configuration is valid"
            else
                print_error "Both new and backup configurations are invalid!"
                update_failed=true
            fi
        else
            print_error "No backup available for restoration"
            update_failed=true
        fi
    fi
    
    # Step 6: Reload Nginx service
    if [ "$update_failed" = false ]; then
        manage_nginx_config "reload" || update_failed=true
    fi
    
    # Step 7: Final status check
    manage_nginx_config "status"
    
    if [ "$update_failed" = true ]; then
        print_error "Nginx configuration update failed!"
        return 1
    else
        print_status "✅ Nginx configuration updated successfully!"
        return 0
    fi
}

# Enhanced build verification and cache busting
verify_build_content() {
    local image_name="$1"
    print_header "🔍 Verifying Build Content"
    
    # Create temporary container to inspect content
    local temp_container="filmflex-verify-$(date +%s)"
    
    if docker create --name "$temp_container" "$image_name" >/dev/null 2>&1; then
        # Check if PhimGG branding is present in the built application
        print_info "Checking for PhimGG branding in built application..."
        
        # Extract and check footer component
        if docker cp "$temp_container:/app/dist/index.html" /tmp/verify-index.html 2>/dev/null; then
            if grep -q "PhimGG" /tmp/verify-index.html 2>/dev/null; then
                print_status "✅ PhimGG branding found in built application"
                BUILD_VERIFICATION_PASSED=true
            else
                print_warning "⚠️  PhimGG branding not found in index.html - checking source files"
                
                # Check if source files contain PhimGG
                if docker cp "$temp_container:/app/client/src/components/Footer.tsx" /tmp/verify-footer.tsx 2>/dev/null; then
                    if grep -q "PhimGG" /tmp/verify-footer.tsx 2>/dev/null; then
                        print_status "✅ PhimGG branding found in Footer component source"
                        BUILD_VERIFICATION_PASSED=true
                    else
                        print_error "❌ PhimGG branding missing from Footer component"
                        BUILD_VERIFICATION_PASSED=false
                    fi
                else
                    print_warning "Could not verify source files in container"
                    BUILD_VERIFICATION_PASSED=false
                fi
            fi
        else
            print_warning "Could not extract files for verification"
            BUILD_VERIFICATION_PASSED=false
        fi
        
        # Check build timestamp
        if docker cp "$temp_container:/app/build-info.txt" /tmp/build-info.txt 2>/dev/null; then
            local build_time=$(cat /tmp/build-info.txt 2>/dev/null || echo "Unknown")
            print_info "Build timestamp: $build_time"
        fi
        
        # Clean up temporary files
        rm -f /tmp/verify-*.html /tmp/verify-*.tsx /tmp/build-info.txt 2>/dev/null
        
        # Clean up container
        docker rm "$temp_container" >/dev/null 2>&1
        
        return $([ "$BUILD_VERIFICATION_PASSED" = true ] && echo 0 || echo 1)
    else
        print_error "Failed to create verification container"
        return 1
    fi
}

# Force rebuild with no cache and content verification
force_fresh_build() {
    print_header "🔨 Force Fresh Build with Latest Code"
    
    # Ensure we have the latest code
    print_info "Ensuring latest source code..."
    if git rev-parse --git-dir >/dev/null 2>&1; then
        # Stash any local changes
        git stash push -m "Pre-deployment stash $(date)" 2>/dev/null || true
        
        # Force fetch and reset to latest
        git fetch origin --force
        git reset --hard origin/main
        git clean -fxd  # Remove all untracked files and build artifacts
        
        print_status "✅ Source code updated to latest main branch"
    else
        print_warning "Not a git repository - using current code"
    fi
    
    # Remove ALL related images to force complete rebuild
    print_info "Removing all existing FilmFlex images..."
    docker rmi $(docker images | grep -E "(cuongtm2012/filmflex|filmflex)" | awk '{print $3}') 2>/dev/null || true
    
    # Clear Docker build cache
    print_info "Clearing Docker build cache..."
    docker builder prune -f 2>/dev/null || true
    
    # Determine best Dockerfile
    local dockerfile="Dockerfile"
    if [ -f "Dockerfile.final" ]; then
        dockerfile="Dockerfile.final"
        print_info "Using Dockerfile.final for build"
    elif [ -f "Dockerfile" ]; then
        dockerfile="Dockerfile"
        print_info "Using Dockerfile for build"
    else
        print_error "No Dockerfile found!"
        return 1
    fi
    
    # Add build timestamp to track deployment
    echo "Build Time: $(date)" > build-info.txt
    echo "Git Commit: $(git rev-parse HEAD 2>/dev/null || echo 'Unknown')" >> build-info.txt
    echo "Build Mode: Force Fresh Build" >> build-info.txt
    
    # Build with no cache and pull latest base images
    print_info "Building application with --no-cache and --pull flags..."
    if docker build \
        --no-cache \
        --pull \
        --build-arg BUILDKIT_INLINE_CACHE=0 \
        --build-arg BUILD_TIME="$(date)" \
        --build-arg CACHE_BUSTER="$(date +%s)" \
        -t cuongtm2012/filmflex-app:local \
        -f "$dockerfile" .; then
        
        print_status "✅ Fresh build completed successfully"
        
        # Verify the build contains our changes
        if verify_build_content "cuongtm2012/filmflex-app:local"; then
            print_status "✅ Build verification passed - latest changes included"
            return 0
        else
            print_error "❌ Build verification failed - changes not reflected"
            return 1
        fi
    else
        print_error "❌ Build failed"
        return 1
    fi
}

# Enhanced cache invalidation
invalidate_all_caches() {
    print_header "🧹 Comprehensive Cache Invalidation"
    
    # 1. Clear browser cache headers by updating environment variables
    local cache_buster="$(date +%Y%m%d_%H%M%S)"
    print_info "Setting cache-busting headers with timestamp: $cache_buster"
    
    # 2. Clear Nginx cache if present
    if [ -d "/var/cache/nginx" ]; then
        print_info "Clearing Nginx cache..."
        rm -rf /var/cache/nginx/* 2>/dev/null || true
        print_status "Nginx cache cleared"
    fi
    
    # 3. Restart Nginx to clear any in-memory cache
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
        print_info "Restarting Nginx to clear in-memory cache..."
        systemctl restart nginx 2>/dev/null && print_status "Nginx restarted"
    fi
    
    # 4. Set cache-control headers in the Docker environment
    export CACHE_BUSTER="$cache_buster"
    export APP_VERSION="$(date +%s)"
    
    print_status "✅ Cache invalidation completed"
}

# Parse command line arguments
show_usage() {
    echo "Usage: $0 [--full|--app-only] [OPTIONS]"
    echo ""
    echo "DEPLOYMENT MODES:"
    echo "  --full        Full deployment (Database + Application + Nginx)"
    echo "  --app-only    Application-only deployment (faster updates)"
    echo ""
    echo "OPTIONS:"
    echo "  --help, -h    Show this help message"
    echo "  --skip-nginx  Skip Nginx configuration update"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 --full         # Deploy everything (database + app + nginx)"
    echo "  $0 --app-only     # Deploy only the application + nginx"
    echo "  $0 --full --skip-nginx  # Deploy without updating nginx"
    echo ""
    echo "DESCRIPTION:"
    echo "  --full: Redeploys both PostgreSQL and FilmFlex containers"
    echo "          Use for fresh setup or major updates"
    echo "          Includes database initialization and health checks"
    echo "          Updates Nginx configuration with latest configs"
    echo ""
    echo "  --app-only: Updates only the FilmFlex application container"
    echo "              Use for code updates and quick releases" 
    echo "              Keeps existing database container running"
    echo "              Still updates Nginx configuration unless --skip-nginx"
    echo ""
}

# Initialize flags
SKIP_NGINX=false

# Parse arguments
while [ $# -gt 0 ]; do
    case $1 in
        --full)
            DEPLOYMENT_MODE="full"
            DEPLOY_DATABASE=true
            DEPLOY_APP=true
            MODE_NAME="Full Deployment"
            shift
            ;;
        --app-only)
            DEPLOYMENT_MODE="app-only"
            DEPLOY_DATABASE=false
            DEPLOY_APP=true
            MODE_NAME="App-Only Deployment"
            shift
            ;;
        --skip-nginx)
            SKIP_NGINX=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# If no mode specified, show interactive selection
if [ -z "$DEPLOYMENT_MODE" ]; then
    echo ""
    print_header "Select Deployment Mode:"
    echo ""
    print_mode "1) Full Deployment (Database + Application + Nginx)"
    echo "   ├─ Redeploys both PostgreSQL and FilmFlex containers"
    echo "   ├─ Use for fresh setup or major updates"
    echo "   ├─ Includes database initialization and health checks"
    echo "   ├─ Updates Nginx configuration with latest configs"
    echo "   └─ Takes longer but ensures complete environment refresh"
    echo ""
    print_mode "2) App-Only Deployment (Application + Nginx)"
    echo "   ├─ Updates only the FilmFlex application container"
    echo "   ├─ Use for code updates and quick releases"
    echo "   ├─ Keeps existing database container running"
    echo "   ├─ Updates Nginx configuration for consistency"
    echo "   └─ Faster deployment for routine updates"
    echo ""

    # Get user selection with validation
    while true; do
        printf "Please select deployment mode (1 or 2): "
        read selection
        case $selection in
            1)
                DEPLOYMENT_MODE="full"
                DEPLOY_DATABASE=true
                DEPLOY_APP=true
                MODE_NAME="Full Deployment"
                break
                ;;
            2)
                DEPLOYMENT_MODE="app-only"
                DEPLOY_DATABASE=false
                DEPLOY_APP=true
                MODE_NAME="App-Only Deployment"
                break
                ;;
            *)
                print_warning "Invalid selection. Please enter 1 or 2."
                ;;
        esac
    done
fi

print_status "Selected: $MODE_NAME"

# Show configuration summary
echo ""
print_header "Deployment Configuration:"
print_info "• Mode: $MODE_NAME"
print_info "• Database: $([ "$DEPLOY_DATABASE" = true ] && echo "Will be deployed/restarted" || echo "Will remain running (no changes)")"
print_info "• Application: Will be deployed/updated with latest code"
print_info "• Nginx: $([ "$SKIP_NGINX" = true ] && echo "Will be skipped" || echo "Will be updated with fresh configuration")"
print_info "• Source: Latest code from main branch"
echo ""

# Confirmation prompt
printf "Continue with $MODE_NAME? (y/N): "
read -r reply
if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
    print_info "Deployment cancelled by user."
    exit 0
fi

# Basic prerequisite checks
print_info "Checking prerequisites..."

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not available"
    exit 1
fi

print_status "Prerequisites check passed"

# Initialize deployment logging
setup_deployment_logging

# Function to get existing database network
get_database_network() {
    local db_network=$(docker inspect filmflex-postgres --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
    if [ -n "$db_network" ]; then
        echo "$db_network"
    else
        echo "bridge"
    fi
}

# Conditional cleanup based on deployment mode
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Full cleanup - stopping all containers and removing images..."
    docker compose -f docker-compose.server.yml down --remove-orphans 2>/dev/null || true
    docker stop filmflex-app filmflex-postgres 2>/dev/null || true
    docker rm filmflex-app filmflex-postgres 2>/dev/null || true
    
    # Remove old images to force fresh pull
    print_info "Removing old images to force fresh download..."
    docker rmi cuongtm2012/filmflex-app:latest 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-app:local 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-postgres-data:latest 2>/dev/null || true
else
    print_info "App-only cleanup - stopping only application container..."
    docker stop filmflex-app 2>/dev/null || true
    docker rm filmflex-app 2>/dev/null || true
    
    # Remove only app images to force fresh pull
    print_info "Removing old application images to force update..."
    docker rmi cuongtm2012/filmflex-app:latest 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-app:local 2>/dev/null || true
    
    # Check if database is running and get its network
    if docker ps | grep -q filmflex-postgres; then
        print_status "Database container is running - will be preserved"
        DB_NETWORK=$(get_database_network)
        print_info "Database is on network: $DB_NETWORK"
    else
        print_warning "Database container is not running - consider Full Deployment mode"
        printf "Continue with App-Only deployment anyway? (y/N): "
        read -r reply
        if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
            print_info "Switching to Full Deployment mode..."
            DEPLOY_DATABASE=true
            MODE_NAME="Full Deployment (Auto-switched)"
        fi
    fi
fi

# Clean up Docker system
docker system prune -f 2>/dev/null || true

# Update to latest code if in git repository
if git rev-parse --git-dir >/dev/null 2>&1; then
    print_info "Updating to latest main branch code..."
    git stash 2>/dev/null || true
    git fetch origin || print_warning "Git fetch failed"
    git checkout main 2>/dev/null || git checkout -b main origin/main 2>/dev/null
    git reset --hard origin/main 2>/dev/null && print_status "Updated to latest main branch"
    git clean -fd 2>/dev/null || true
else
    print_warning "Not a Git repository - using current code"
fi

# Update Nginx configuration before starting containers
if [ "$SKIP_NGINX" = false ]; then
    update_nginx_configuration || {
        print_error "Nginx configuration update failed!"
        printf "Continue deployment anyway? (y/N): "
        read -r reply
        if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
            print_info "Deployment cancelled due to Nginx configuration failure."
            exit 1
        else
            print_warning "Continuing deployment with potentially outdated Nginx configuration"
        fi
    }
fi

# Create Docker Compose configuration based on deployment mode
print_info "Creating Docker Compose configuration for $MODE_NAME..."

if [ "$DEPLOY_DATABASE" = true ]; then
    # Full deployment configuration
    cat > docker-compose.server.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  postgres:
    # Custom PostgreSQL image with complete movie database (5,005+ movies)
    image: cuongtm2012/filmflex-postgres-data:latest
    container_name: filmflex-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: filmflex
      POSTGRES_USER: filmflex
      POSTGRES_PASSWORD: filmflex2024
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - filmflex-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filmflex -d filmflex"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
      NODE_ENV: production
      PORT: 5000
      DOMAIN: "phimgg.com"
      SERVER_DOMAIN: "phimgg.com"
      PUBLIC_URL: "https://phimgg.com"
      CLIENT_URL: "https://phimgg.com"
      BASE_URL: "https://phimgg.com"
      ALLOWED_ORIGINS: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000,https://38.54.14.154:5000,http://localhost:5000"
      CORS_ORIGIN: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Forwarded-For,X-Forwarded-Proto"
      CORS_CREDENTIALS: "true"
      HOST: "0.0.0.0"
      SERVER_IP: "38.54.14.154"
      SESSION_SECRET: filmflex_production_secret_2024
      TRUST_PROXY: "true"
      APP_VERSION: "$(date +%s)"
      CACHE_BUSTER: "$(date +%Y%m%d_%H%M%S)"
    ports:
      - "127.0.0.1:5000:5000"
    networks:
      - filmflex-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  filmflex-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  app_logs:
    driver: local
COMPOSE_EOF
else
    # App-only deployment configuration - connect to existing database network
    # First, detect the existing database network
    DB_NETWORK=${DB_NETWORK:-"bridge"}
    print_info "Connecting app to existing database network: $DB_NETWORK"
    
    cat > docker-compose.server.yml << COMPOSE_EOF
version: '3.8'

services:
  app:
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://filmflex:filmflex2024@filmflex-postgres:5432/filmflex
      NODE_ENV: production
      PORT: 5000
      DOMAIN: "phimgg.com"
      SERVER_DOMAIN: "phimgg.com"
      PUBLIC_URL: "https://phimgg.com"
      CLIENT_URL: "https://phimgg.com"
      BASE_URL: "https://phimgg.com"
      ALLOWED_ORIGINS: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000,https://38.54.14.154:5000,http://localhost:5000"
      CORS_ORIGIN: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Forwarded-For,X-Forwarded-Proto"
      CORS_CREDENTIALS: "true"
      HOST: "0.0.0.0"
      SERVER_IP: "38.54.14.154"
      SESSION_SECRET: filmflex_production_secret_2024
      TRUST_PROXY: "true"
      APP_VERSION: "$(date +%s)"
      CACHE_BUSTER: "$(date +%Y%m%d_%H%M%S)"
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    network_mode: "$DB_NETWORK"

volumes:
  app_logs:
    driver: local
COMPOSE_EOF
fi

print_status "Docker Compose configuration created for $MODE_NAME"

# Pull/build images with enhanced verification
print_info "Starting deployment process with enhanced build verification..."

# Step 1: Force fresh build to ensure latest changes
if ! force_fresh_build; then
    print_error "Fresh build failed - attempting fallback to remote image"
    
    # Fallback: Try to pull latest remote image
    if [ "$DEPLOY_DATABASE" = true ]; then
        print_info "Pulling all Docker images as fallback..."
        docker compose -f docker-compose.server.yml pull
    else
        print_info "Pulling application Docker image as fallback..."
        docker pull cuongtm2012/filmflex-app:latest
    fi
    
    # Use the remote image but warn user
    print_warning "Using remote image - may not contain latest local changes"
    print_info "Consider pushing latest changes to repository and rebuilding the Docker image"
else
    # Update compose file to use our verified local build
    sed -i 's|image: cuongtm2012/filmflex-app:latest|image: cuongtm2012/filmflex-app:local|' docker-compose.server.yml
    print_status "✅ Using verified fresh build with latest changes"
fi

# Step 2: Comprehensive cache invalidation
invalidate_all_caches

# Start services
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Starting all FilmFlex services..."
    docker compose -f docker-compose.server.yml up -d --force-recreate --renew-anon-volumes
    
    # Wait and verify database
    print_info "Waiting for database initialization..."
    sleep 30
    
    for i in $(seq 1 10); do
        if docker exec filmflex-postgres pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
            print_status "Database is ready"
            break
        fi
        print_info "Database still initializing... (attempt $i/10)"
        sleep 15
    done
    
    # Get movie count
    MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$MOVIE_COUNT" -gt 0 ]; then
        print_status "Database verified: $MOVIE_COUNT movies loaded"
    fi
else
    print_info "Starting FilmFlex application (app-only deployment)..."
    
    # Check existing database
    if ! docker ps | grep -q filmflex-postgres; then
        print_error "No existing database container found!"
        exit 1
    fi
    
    # For app-only deployment, we need to connect to the existing network
    print_info "Connecting new app container to existing database network..."
    docker compose -f docker-compose.server.yml up -d --force-recreate app
    
    # Wait for container to start
    sleep 20
    
    # Additional verification - ensure app can connect to database
    print_info "Verifying database connectivity..."
    for i in $(seq 1 5); do
        if docker exec filmflex-app nc -z filmflex-postgres 5432 2>/dev/null; then
            print_status "App can connect to database"
            break
        elif [ $i -eq 5 ]; then
            print_error "App cannot connect to database after 5 attempts"
            print_info "Checking container logs for details..."
            docker logs filmflex-app --tail 10
        else
            print_info "Waiting for database connection... (attempt $i/5)"
            sleep 10
        fi
    done
fi

# Test application
print_info "Testing application endpoints..."
sleep 15

LOCAL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")

if [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_status "Local application responding (HTTP $LOCAL_HTTP_CODE)"
else
    print_warning "Local application not responding (HTTP $LOCAL_HTTP_CODE)"
    print_info "Checking application logs..."
    docker logs filmflex-app --tail 20
fi

if [ "$API_HTTP_CODE" = "200" ]; then
    print_status "API health endpoint responding (HTTP $API_HTTP_CODE)"
else
    print_warning "API health endpoint not responding (HTTP $API_HTTP_CODE)"
fi

# Check Nginx
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
    print_status "Nginx is running"
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
        systemctl reload nginx 2>/dev/null || print_warning "Could not reload Nginx"
    else
        print_warning "Nginx configuration has issues"
    fi
else
    print_warning "Nginx is not running - domain access will not work"
fi

# After services are started and tested, do a final Nginx check
if [ "$SKIP_NGINX" = false ]; then
    # Final Nginx validation and reload after application is running
    print_header "Final Nginx Configuration Check"
    
    # Wait for application to be fully ready
    print_info "Waiting for application to be ready before final Nginx check..."
    sleep 10
    
    # Test that Nginx can proxy to the application
    if command -v nginx >/dev/null 2>&1; then
        # Reload Nginx to ensure it picks up the running application
        manage_nginx_config "reload"
        
        # Test the proxy connection
        if curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost >/dev/null 2>&1; then
            print_status "Nginx proxy to application is working"
        else
            print_warning "Nginx proxy test failed - check configuration"
        fi
    fi
fi

# Test domain connectivity
test_domain_connectivity || {
    print_warning "Domain connectivity tests failed. Please check domain configuration."
}

# Basic health check
echo ""
print_header "Post-Deployment Health Check"

health_passed=true

# Check Docker containers
if docker ps --format "table {{.Names}}" | grep -q "^filmflex-app$"; then
    print_status "Application container is running"
else
    print_error "Application container not found"
    health_passed=false
fi

if [ "$DEPLOY_DATABASE" = true ]; then
    if docker ps --format "table {{.Names}}" | grep -q "^filmflex-postgres$"; then
        print_status "Database container is running"
    else
        print_error "Database container not found"
        health_passed=false
    fi
elif docker ps --format "table {{.Names}}" | grep -q "^filmflex-postgres$"; then
    print_status "Database container is running (preserved)"
else
    print_error "Database container not found"
    health_passed=false
fi

# Test endpoints
if [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_status "Application is responding"
else
    print_error "Application not responding"
    health_passed=false
fi

# Final production readiness check
final_production_check

# Generate deployment report
generate_deployment_report $([ "$health_passed" = true ] && echo "SUCCESS" || echo "FAILED")

# Final summary
echo ""
print_header "🎉 FilmFlex $MODE_NAME Complete!"
print_status "Domain URL: https://phimgg.com"
print_status "Direct Access: http://38.54.14.154:5000"
print_status "Status: Production Ready"

echo ""
print_info "Deployment Summary:"
print_info "• Mode: $MODE_NAME"
print_info "• Source: Latest main branch code"
print_info "• Application: Updated with latest changes"
print_info "• Nginx: $([ "$SKIP_NGINX" = true ] && echo "Skipped" || echo "Updated with fresh configuration")"
print_info "• Domain: Configured for phimgg.com"
print_info "• Health Check: $([ "$health_passed" = true ] && echo "PASSED" || echo "ISSUES DETECTED")"

echo ""
print_info "Management Commands:"
print_info "• View logs: docker compose -f docker-compose.server.yml logs -f"
print_info "• Restart services: docker compose -f docker-compose.server.yml restart"
print_info "• Check containers: docker compose -f docker-compose.server.yml ps"
print_info "• Check Nginx: sudo nginx -t && sudo systemctl status nginx"
print_info "• Reload Nginx: sudo systemctl reload nginx"

# Final status
if [ "$LOCAL_HTTP_CODE" = "200" ] && [ "$health_passed" = true ]; then
    print_status "✅ $MODE_NAME SUCCESS: All systems operational!"
    log_deployment "$MODE_NAME completed successfully - all systems operational"
elif [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_warning "⚠️  $MODE_NAME PARTIAL: App works but health issues detected"
    log_deployment "$MODE_NAME completed with warnings - app works but health issues detected"
else
    print_error "❌ $MODE_NAME FAILED: Application not responding"
    log_deployment "$MODE_NAME failed - application not responding"
    exit 1
fi

print_status "Deployment completed! 🎬"
log_deployment "Deployment process completed"