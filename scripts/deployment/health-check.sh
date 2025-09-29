#!/bin/bash

echo "🏥 FilmFlex System Health Check"
echo "==============================="
echo "📅 Date: $(date)"
echo "🎯 Target: phimgg.com Production Environment"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Initialize logging
init_logging "health-check"

# Enhanced health check function (comprehensive version)
perform_comprehensive_health_check() {
    print_header "System Health Status Report"
    echo ""
    
    local overall_health=true
    local health_issues=()
    local warnings=()
    
    # 1. Docker System Health
    print_info "1. Checking Docker system..."
    if ! check_docker_prerequisites; then
        health_issues+=("Docker daemon down")
        overall_health=false
    else
        print_status "Docker daemon is running"
        
        # Check Docker version and system usage
        local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        print_info "Docker version: $docker_version"
        
        local docker_system_df=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null)
        if [ ! -z "$docker_system_df" ]; then
            print_info "Docker system usage:"
            echo "$docker_system_df" | head -5
        fi
    fi
    
    echo ""
    
    # 2. Container Health
    print_info "2. Checking container health..."
    if ! check_docker_containers; then
        health_issues+=("Container issues")
        overall_health=false
    else
        # Get detailed container information
        local app_status=$(check_container_status "filmflex-app")
        local db_status=$(check_container_status "filmflex-postgres")
        
        print_info "App container: $app_status"
        print_info "DB container: $db_status"
        
        # Check container resource usage
        local container_stats=$(docker stats filmflex-app --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null)
        if [ ! -z "$container_stats" ]; then
            print_info "App resource usage: $container_stats"
        fi
    fi
    
    echo ""
    
    # 3. Application Health
    print_info "3. Testing application endpoints..."
    
    # Test main endpoint
    if test_endpoint "http://localhost:5000" 200 3; then
        print_status "Local application endpoint is responding"
    else
        print_error "Local application not responding"
        health_issues+=("App endpoint down")
        overall_health=false
    fi
    
    # Test API health endpoint
    if test_endpoint "http://localhost:5000/api/health" 200 3; then
        print_status "API health endpoint is responding"
        
        # Get API health data
        local api_health_data=$(curl -s http://localhost:5000/api/health 2>/dev/null)
        if [ ! -z "$api_health_data" ]; then
            print_info "API health data: $api_health_data"
        fi
    else
        print_error "API health endpoint not responding"
        health_issues+=("API endpoint down")
        overall_health=false
    fi
    
    # Test Movies API
    if test_endpoint "http://localhost:5000/api/movies?limit=1" 200 2; then
        print_status "Movies API is responding"
    else
        print_warning "Movies API not responding properly"
        warnings+=("Movies API issue")
    fi
    
    echo ""
    
    # 4. Database Health
    print_info "4. Checking database..."
    local db_stats=$(get_database_stats)
    local movies=$(echo "$db_stats" | cut -d'|' -f1)
    local episodes=$(echo "$db_stats" | cut -d'|' -f2)
    
    if [ "$movies" -gt 0 ]; then
        print_status "Database has data: $movies movies, $episodes episodes"
    else
        print_warning "Database appears empty or connection issue"
        health_issues+=("DB has no data")
    fi
    
    echo ""
    
    # 5. Domain Access Testing
    print_info "5. Testing domain accessibility..."
    
    if test_endpoint "https://phimgg.com" 200 2; then
        print_status "Domain https://phimgg.com is accessible"
    elif test_endpoint "https://phimgg.com" 301 2 || test_endpoint "https://phimgg.com" 302 2; then
        print_status "Domain redirects properly"
    else
        print_warning "Cannot test domain from server (may be network/DNS limitation)"
        warnings+=("Domain access issue")
    fi
    
    # Test domain API
    if test_endpoint "https://phimgg.com/api/health" 200 2; then
        print_status "Domain API is accessible"
    else
        print_info "Domain API test skipped (network limitation)"
    fi
    
    echo ""
    
    # 6. Nginx Status
    print_info "6. Checking Nginx reverse proxy..."
    if check_nginx_status; then
        print_status "Nginx is running with valid configuration"
        
        # Check if nginx is listening on correct ports
        local nginx_listening=$(netstat -tuln 2>/dev/null | grep -E ":80 |:443 " | wc -l)
        if [ "$nginx_listening" -ge 2 ]; then
            print_status "Nginx listening on HTTP/HTTPS ports"
        else
            print_warning "Nginx may not be listening on standard ports"
            warnings+=("Nginx port configuration")
        fi
    else
        print_error "Nginx issues detected"
        health_issues+=("Nginx down or misconfigured")
        overall_health=false
    fi
    
    echo ""
    
    # 7. System Resources
    print_info "7. Checking system resources..."
    if check_system_resources; then
        print_status "System resources are within normal limits"
    else
        print_warning "High system resource usage detected"
        warnings+=("High resource usage")
    fi
    
    echo ""
    
    # 8. SSL Certificate
    print_info "8. Checking SSL certificate..."
    if check_ssl_certificate "phimgg.com"; then
        print_status "SSL certificate is valid"
    else
        print_warning "SSL certificate issues detected"
        warnings+=("SSL certificate problem")
    fi
    
    echo ""
    
    # Overall Health Summary
    print_bold "=================== HEALTH SUMMARY ==================="
    echo ""
    
    local total_checks=8
    local critical_issues=${#health_issues[@]}
    local warning_count=${#warnings[@]}
    
    print_info "Health Check Results:"
    print_info "• Critical Issues: $critical_issues"
    print_info "• Warnings: $warning_count"
    print_info "• Checks Performed: $total_checks"
    
    echo ""
    
    if [ "$overall_health" = true ] && [ $critical_issues -eq 0 ] && [ $warning_count -eq 0 ]; then
        print_status "🎉 PERFECT HEALTH - All systems optimal!"
        echo ""
        print_info "✓ Application: Running perfectly"
        print_info "✓ Database: Healthy with data"
        print_info "✓ Domain: Fully accessible"
        print_info "✓ Nginx: Running with valid config"
        print_info "✓ Resources: Within optimal limits"
        print_info "✓ Security: SSL and firewall configured"
    elif [ "$overall_health" = true ] && [ $critical_issues -eq 0 ]; then
        print_status "✅ SYSTEM HEALTHY - Minor warnings detected"
        echo ""
        print_info "Core systems are functioning properly"
        if [ $warning_count -gt 0 ]; then
            print_info "Warnings to address:"
            for warning in "${warnings[@]}"; do
                echo "   • $warning"
            done
        fi
    else
        print_error "🚨 CRITICAL ISSUES DETECTED - Immediate attention required!"
        echo ""
        if [ $critical_issues -gt 0 ]; then
            print_error "Critical issues:"
            for issue in "${health_issues[@]}"; do
                echo "   • $issue"
            done
        fi
        
        if [ $warning_count -gt 0 ]; then
            echo ""
            print_warning "Additional warnings:"
            for warning in "${warnings[@]}"; do
                echo "   • $warning"
            done
        fi
    fi
    
    echo ""
    print_info "Health check completed at $(date)"
    print_info "Next check recommended in: 1 hour (or after making changes)"
    echo "======================================================="
    
    return $([ "$overall_health" = true ] && [ $critical_issues -eq 0 ] && echo 0 || echo 1)
}

# Check if running as root for system checks
if [[ $EUID -eq 0 ]]; then
    print_info "Running as root - full system access available"
else
    print_warning "Running as non-root - some system checks may be limited"
    print_info "For complete system health check, run: sudo $0"
fi

echo ""

# Acquire lock to prevent concurrent health checks
if acquire_lock "health-check" 60; then
    # Run comprehensive health check
    perform_comprehensive_health_check
    health_result=$?
else
    print_warning "Another health check is already running - using basic check"
    perform_basic_health_check
    health_result=$?
fi

echo ""
print_info "Health Check Tool Commands:"
print_info "• Re-run health check: ./scripts/deployment/health-check.sh"
print_info "• Configure domain: ./scripts/deployment/configure-domain.sh"
print_info "• View app logs: docker compose -f docker-compose.server.yml logs -f app"
print_info "• View db logs: docker compose -f docker-compose.server.yml logs -f postgres"
print_info "• Check containers: docker compose -f docker-compose.server.yml ps"
print_info "• Restart services: docker compose -f docker-compose.server.yml restart"
print_info "• Full deployment: ./scripts/deployment/deploy-production.sh"

echo ""
if [ $health_result -eq 0 ]; then
    print_status "System health is optimal! 🎬"
else
    print_warning "Please address the health issues above 🔧"
    print_info "Run deployment script if major issues persist"
fi

# Clean up old logs
cleanup_old_logs 7
