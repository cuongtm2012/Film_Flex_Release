#!/bin/bash

echo "🏥 FilmFlex Comprehensive Health Check"
echo "====================================="
echo "📅 Date: $(date)"
echo "🌐 Target: phimgg.com Production"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Initialize logging
init_logging "health-check"

# Parse command line arguments
DETAILED_MODE=false
CRITICAL_ONLY=false
JSON_REPORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --detailed)
            DETAILED_MODE=true
            shift
            ;;
        --critical)
            CRITICAL_ONLY=true
            shift
            ;;
        --json|--report)
            JSON_REPORT=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "OPTIONS:"
            echo "  --detailed    Show detailed system information"
            echo "  --critical    Show only critical issues"
            echo "  --json        Output JSON format report"
            echo "  --help        Show this help"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Health check variables
health_issues=()
warnings=()
critical_issues=()

# 1. System Resources Check
print_header "1. System Resources"
if check_system_resources; then
    [ "$CRITICAL_ONLY" = false ] && print_status "System resources are healthy"
else
    critical_issues+=("High resource usage")
    print_error "System resources under stress"
fi

echo ""

# 2. Docker Infrastructure Check
print_header "2. Docker Infrastructure"

if docker info >/dev/null 2>&1; then
    print_status "Docker daemon is running"
    
    # Check container status
    if check_docker_containers; then
        print_status "All containers are healthy"
    else
        critical_issues+=("Container issues")
    fi
    
    # Get database statistics
    local db_stats=$(get_database_stats)
    local movies=$(echo "$db_stats" | cut -d'|' -f1)
    local episodes=$(echo "$db_stats" | cut -d'|' -f2)
    
    if [ "$movies" -gt 0 ]; then
        print_status "Database contains $movies movies and $episodes episodes"
    else
        health_issues+=("Database appears empty")
        print_warning "Database appears empty or connection issue"
    fi
else
    critical_issues+=("Docker daemon not running")
    print_error "Docker daemon is not running"
fi

echo ""

# 3. Application Health Check
print_header "3. Application Health"

# Test local endpoint
if test_endpoint "http://localhost:5000" 200 3; then
    print_status "Application responding on localhost:5000"
else
    critical_issues+=("App not responding locally")
    print_error "Application not responding on localhost:5000"
fi

# Test health endpoint
if test_endpoint "http://localhost:5000/api/health" 200 2; then
    print_status "Health endpoint responding correctly"
else
    health_issues+=("Health endpoint issues")
    print_warning "Health endpoint not responding"
fi

# Test CORS configuration
if check_cors_configuration; then
    [ "$CRITICAL_ONLY" = false ] && print_status "CORS configuration is working"
else
    warnings+=("CORS configuration issues")
    [ "$CRITICAL_ONLY" = false ] && print_warning "CORS configuration may have issues"
fi

echo ""

# 4. Nginx Web Server Check
print_header "4. Nginx Web Server"

if check_nginx_status; then
    print_status "Nginx is running and properly configured"
    
    # Test HTTP redirect
    if test_endpoint "http://38.54.14.154" 301 1 || test_endpoint "http://38.54.14.154" 302 1; then
        [ "$CRITICAL_ONLY" = false ] && print_status "HTTP redirects properly"
    else
        [ "$CRITICAL_ONLY" = false ] && print_info "HTTP redirect not configured (optional)"
    fi
    
    # Test HTTPS if certificate exists
    if check_ssl_certificate "phimgg.com"; then
        [ "$CRITICAL_ONLY" = false ] && print_status "SSL certificate is valid"
        
        if test_endpoint "https://phimgg.com" 200 2; then
            [ "$CRITICAL_ONLY" = false ] && print_status "HTTPS domain access working"
        else
            warnings+=("HTTPS domain access issues")
            [ "$CRITICAL_ONLY" = false ] && print_warning "HTTPS domain access issues"
        fi
    else
        warnings+=("SSL certificate issues")
        [ "$CRITICAL_ONLY" = false ] && print_warning "SSL certificate expired or missing"
    fi
else
    critical_issues+=("Nginx not working properly")
fi

echo ""

# 5. Domain and DNS Check (if not critical-only mode)
if [ "$CRITICAL_ONLY" = false ]; then
    print_header "5. Domain Configuration"
    configure_domain
    echo ""
fi

# 6. Detailed System Information (if requested)
if [ "$DETAILED_MODE" = true ]; then
    print_header "6. Detailed System Information"
    
    # System uptime
    local uptime_info=$(uptime)
    print_info "System uptime: $uptime_info"
    
    # Docker version
    local docker_version=$(docker --version 2>/dev/null || echo "Not available")
    print_info "Docker version: $docker_version"
    
    # Nginx version
    local nginx_version=$(nginx -v 2>&1 | grep -o 'nginx/[0-9.]*' || echo "Not available")
    print_info "Nginx version: $nginx_version"
    
    # Container details
    print_info "Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No FilmFlex containers found"
    
    echo ""
fi

# Generate summary report
echo ""
print_header "🎯 Health Check Summary"

# Calculate overall health score
TOTAL_CHECKS=4
PASSED_CHECKS=0

[ ${#critical_issues[@]} -eq 0 ] && ((PASSED_CHECKS++))
[ $(docker ps --format "table {{.Names}}" | grep -c filmflex) -eq 2 ] && ((PASSED_CHECKS++))
[ "$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null)" = "200" ] && ((PASSED_CHECKS++))
[ "$(systemctl is-active nginx 2>/dev/null)" = "active" ] && ((PASSED_CHECKS++))

# Output summary based on mode
if [ "$JSON_REPORT" = true ]; then
    # JSON output
    cat << EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall_health": $([ ${#critical_issues[@]} -eq 0 ] && echo "true" || echo "false"),
  "health_score": "$PASSED_CHECKS/$TOTAL_CHECKS",
  "critical_issues": $(printf '%s\n' "${critical_issues[@]}" | jq -R . | jq -s .),
  "warnings": $(printf '%s\n' "${warnings[@]}" | jq -R . | jq -s .),
  "health_issues": $(printf '%s\n' "${health_issues[@]}" | jq -R . | jq -s .),
  "system_info": {
    "docker_containers": $(docker ps --format '{{.Names}}' | grep filmflex | wc -l),
    "application_status": "$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")",
    "nginx_status": "$(systemctl is-active nginx 2>/dev/null || echo "inactive")",
    "database_movies": $(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
  }
}
EOF
else
    # Human-readable output
    echo ""
    print_info "Health Score: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"
    
    if [ ${#critical_issues[@]} -eq 0 ] && [ ${#health_issues[@]} -eq 0 ] && [ ${#warnings[@]} -eq 0 ]; then
        print_status "✅ ALL SYSTEMS HEALTHY - FilmFlex is running optimally!"
        print_info "🌐 Website: https://phimgg.com"
        print_info "🔧 Direct access: http://38.54.14.154:5000"
    elif [ ${#critical_issues[@]} -eq 0 ]; then
        print_warning "⚠️  SYSTEM MOSTLY HEALTHY - Minor issues detected"
        if [ ${#warnings[@]} -gt 0 ]; then
            print_info "Warnings found:"
            for warning in "${warnings[@]}"; do
                echo "   • $warning"
            done
        fi
        if [ ${#health_issues[@]} -gt 0 ]; then
            print_info "Health issues found:"
            for issue in "${health_issues[@]}"; do
                echo "   • $issue"
            done
        fi
    else
        print_error "❌ CRITICAL ISSUES DETECTED - Immediate attention required"
        print_info "Critical issues:"
        for issue in "${critical_issues[@]}"; do
            echo "   • $issue"
        done
    fi
    
    echo ""
    print_info "Health check completed at $(date)"
    print_info "Log file: $(basename "$LOG_FILE" 2>/dev/null || echo "Not available")"
fi

# Return appropriate exit code
if [ ${#critical_issues[@]} -eq 0 ]; then
    exit 0
else
    exit 1
fi
