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
    # Create deployment logs directory with proper permissions
    local log_dir="$(pwd)/logs/deployment"
    
    # Try to create directory, fallback to /tmp if permissions fail
    if ! mkdir -p "$log_dir" 2>/dev/null; then
        print_warning "Cannot create logs in $(pwd)/logs - using /tmp/filmflex-logs"
        log_dir="/tmp/filmflex-logs"
        mkdir -p "$log_dir" 2>/dev/null || log_dir="/tmp"
    fi
    
    # Create deployment log file with timestamp
    DEPLOYMENT_LOG="$log_dir/deployment-$(date +%Y%m%d_%H%M%S).log"
    
    # Test if we can write to the log file
    if ! touch "$DEPLOYMENT_LOG" 2>/dev/null; then
        print_warning "Cannot write to $DEPLOYMENT_LOG - using console only"
        DEPLOYMENT_LOG=""
    fi
    
    # Function to log both to console and file
    log_deployment() {
        local message="$1"
        local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
        
        if [ -n "$DEPLOYMENT_LOG" ] && [ -w "$DEPLOYMENT_LOG" ]; then
            echo "$timestamp - $message" >> "$DEPLOYMENT_LOG" 2>/dev/null || true
        fi
        
        # Always log to console
        echo "$timestamp - $message" >&2
    }
    
    if [ -n "$DEPLOYMENT_LOG" ]; then
        print_info "Deployment logging initialized: $DEPLOYMENT_LOG"
    else
        print_info "Deployment logging: console only (file logging disabled)"
    fi
    
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

# Enhanced health check with better error reporting and retry logic
perform_health_check() {
    print_header "🏥 Enhanced Health Check"
    
    local check_passed=true
    local max_retries=3
    local retry_delay=10
    
    # 1. Container Status Check
    print_info "Checking container status..."
    
    if docker ps --format "{{.Names}}" | grep -q "^filmflex-app$"; then
        print_status "✅ Application container is running"
        
        # Check container health status
        local app_health=$(docker inspect filmflex-app --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
        if [ "$app_health" = "healthy" ]; then
            print_status "✅ Application container is healthy"
        elif [ "$app_health" = "unhealthy" ]; then
            print_warning "⚠️  Application container is unhealthy"
            print_info "Container health logs:"
            docker inspect filmflex-app --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 2>/dev/null | tail -3
        else
            print_info "ℹ️  Container health check not configured or starting"
        fi
    else
        print_error "❌ Application container not found"
        print_info "Available containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}"
        check_passed=false
    fi
    
    # 2. Database Connectivity Check (with retries)
    print_info "Checking database connectivity..."
    
    local db_connected=false
    for attempt in $(seq 1 $max_retries); do
        if docker exec filmflex-app nc -zv filmflex-postgres 5432 2>/dev/null; then
            print_status "✅ Database connectivity verified (attempt $attempt)"
            db_connected=true
            break
        else
            if [ $attempt -lt $max_retries ]; then
                print_info "⏳ Database connection failed, retrying in ${retry_delay}s (attempt $attempt/$max_retries)"
                sleep $retry_delay
            else
                print_error "❌ Database connectivity failed after $max_retries attempts"
                print_info "Troubleshooting database connection:"
                print_info "  • Checking if database container is running..."
                if docker ps | grep -q filmflex-postgres; then
                    print_info "    ✓ Database container is running"
                    print_info "  • Checking database container health..."
                    local db_health=$(docker inspect filmflex-postgres --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
                    print_info "    Database health: $db_health"
                    
                    print_info "  • Checking network connectivity..."
                    local app_networks=$(docker inspect filmflex-app --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)
                    local db_networks=$(docker inspect filmflex-postgres --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}' 2>/dev/null)
                    print_info "    App networks: $app_networks"
                    print_info "    DB networks: $db_networks"
                    
                    # Check if they share a common network
                    local common_network=""
                    for app_net in $app_networks; do
                        for db_net in $db_networks; do
                            if [ "$app_net" = "$db_net" ]; then
                                common_network="$app_net"
                                break 2
                            fi
                        done
                    done
                    
                    if [ -n "$common_network" ]; then
                        print_info "    ✓ Containers share network: $common_network"
                    else
                        print_error "    ✗ Containers are not on the same network"
                        print_info "    Attempting to connect app to database network..."
                        
                        # Try to connect to each database network
                        for db_net in $db_networks; do
                            if docker network connect "$db_net" filmflex-app 2>/dev/null; then
                                print_status "    ✓ Connected app to network: $db_net"
                                common_network="$db_net"
                                break
                            fi
                        done
                        
                        if [ -n "$common_network" ]; then
                            print_info "    Retesting database connectivity after network fix..."
                            sleep 5
                            if docker exec filmflex-app nc -zv filmflex-postgres 5432 2>/dev/null; then
                                print_status "✅ Database connectivity restored after network fix"
                                db_connected=true
                            fi
                        fi
                    fi
                else
                    print_error "    ✗ Database container is not running"
                fi
                check_passed=false
            fi
        fi
    done
    
    # 3. Application Response Check
    print_info "Checking application response..."
    
    local app_responding=false
    for attempt in $(seq 1 $max_retries); do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:5000 2>/dev/null || echo "000")
        
        if [ "$http_code" = "200" ]; then
            print_status "✅ Application responding (HTTP $http_code) (attempt $attempt)"
            app_responding=true
            break
        else
            if [ $attempt -lt $max_retries ]; then
                print_info "⏳ Application not responding (HTTP $http_code), retrying in ${retry_delay}s (attempt $attempt/$max_retries)"
                sleep $retry_delay
            else
                print_error "❌ Application not responding (HTTP $http_code) after $max_retries attempts"
                print_info "Application logs (last 20 lines):"
                docker logs filmflex-app --tail 20 2>/dev/null || print_info "Could not retrieve logs"
                check_passed=false
            fi
        fi
    done
    
    # 4. API Health Endpoint Check
    print_info "Checking API health endpoint..."
    
    local api_healthy=false
    for attempt in $(seq 1 $max_retries); do
        local api_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:5000/api/health 2>/dev/null || echo "000")
        
        if [ "$api_code" = "200" ]; then
            print_status "✅ API health endpoint responding (HTTP $api_code) (attempt $attempt)"
            api_healthy=true
            break
        else
            if [ $attempt -lt $max_retries ]; then
                print_info "⏳ API health endpoint not responding (HTTP $api_code), retrying in ${retry_delay}s (attempt $attempt/$max_retries)"
                sleep $retry_delay
            else
                print_error "❌ API health endpoint not responding (HTTP $api_code) after $max_retries attempts"
                check_passed=false
            fi
        fi
    done
    
    # 5. Database Query Test (if connected)
    if [ "$db_connected" = true ]; then
        print_info "Testing database queries..."
        
        local movie_count=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
        
        if [ "$movie_count" -gt 0 ]; then
            print_status "✅ Database queries working ($movie_count movies found)"
            MOVIE_COUNT=$movie_count
        else
            print_warning "⚠️  Database query returned no movies"
            MOVIE_COUNT=0
        fi
    fi
    
    # Store results for later use
    LOCAL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:5000 2>/dev/null || echo "000")
    API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:5000/api/health 2>/dev/null || echo "000")
    
    return $([ "$check_passed" = true ] && echo 0 || echo 1)
}