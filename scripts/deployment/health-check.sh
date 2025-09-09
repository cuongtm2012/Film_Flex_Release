#!/bin/bash

# FilmFlex Optimized Health Check Script
# Version: 2.0 - Uses shared common functions and provides detailed monitoring

set -e

# Load common functions
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/common-functions.sh"

# =============================================================================
# HEALTH CHECK FUNCTIONS
# =============================================================================

check_application_endpoints() {
    log "Testing application endpoints..."
    
    local base_url="http://localhost:5000"
    local endpoints=(
        "/api/health"
        "/api/movies?page=1&limit=5"
        "/api/categories"
        "/"
    )
    
    local passed=0
    local total=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        local url="${base_url}${endpoint}"
        if curl -f -s --max-time 10 "$url" >/dev/null 2>&1; then
            success "✓ $endpoint"
            ((passed++))
        else
            warning "✗ $endpoint (failed)"
        fi
    done
    
    log "Endpoint tests: $passed/$total passed"
    
    if [ $passed -eq $total ]; then
        return 0
    elif [ $passed -gt 0 ]; then
        warning "Some endpoints failed but application is partially responding"
        return 1
    else
        error "All endpoints failed - application not responding"
        return 2
    fi
}

check_database_integrity() {
    log "Checking database integrity..."
    
    if ! check_docker_containers; then
        warning "Docker containers not running, skipping database check"
        return 1
    fi
    
    # Test basic connectivity
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        error "Database not ready"
        return 1
    fi
    
    # Get detailed statistics
    local db_stats=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            COALESCE((SELECT COUNT(*) FROM movies), 0) as movies,
            COALESCE((SELECT COUNT(*) FROM episodes), 0) as episodes,
            COALESCE((SELECT COUNT(*) FROM categories), 0) as categories,
            COALESCE((SELECT COUNT(*) FROM users), 0) as users
    " 2>/dev/null | tr -d ' ' | tr '\n' '|' || echo "0|0|0|0")
    
    local movies=$(echo "$db_stats" | cut -d'|' -f1)
    local episodes=$(echo "$db_stats" | cut -d'|' -f2)
    local categories=$(echo "$db_stats" | cut -d'|' -f3)
    local users=$(echo "$db_stats" | cut -d'|' -f4)
    
    success "Database integrity check passed"
    log "  ├─ Movies: $movies"
    log "  ├─ Episodes: $episodes"
    log "  ├─ Categories: $categories"
    log "  └─ Users: $users"
    
    # Check for data consistency
    if [ "$movies" -gt 0 ] && [ "$episodes" -gt 0 ]; then
        success "Database contains sufficient data"
        return 0
    elif [ "$movies" -gt 0 ]; then
        warning "Movies found but no episodes - may need data import"
        return 1
    else
        warning "No movie data found - database may need initialization"
        return 1
    fi
}

check_storage_and_logs() {
    log "Checking storage and log status..."
    
    # Check log directories
    local log_dirs=("/var/log/filmflex" "/app/logs")
    for dir in "${log_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local log_count=$(find "$dir" -name "*.log" -type f | wc -l)
            local total_size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "Unknown")
            log "  ├─ $dir: $log_count files, $total_size total"
        else
            warning "  └─ $dir: Not found"
        fi
    done
    
    # Check for large log files (>100MB)
    local large_logs=$(find /var/log -name "*.log" -size +100M 2>/dev/null | wc -l)
    if [ "$large_logs" -gt 0 ]; then
        warning "$large_logs log files are larger than 100MB"
    fi
    
    success "Storage check completed"
    return 0
}

generate_health_report() {
    local report_file="$LOG_DIR/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    log "Generating detailed health report..."
    
    # Collect system metrics
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || echo "0")
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' 2>/dev/null || echo "0")
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    local uptime_info=$(uptime | sed 's/.*up \([^,]*\),.*/\1/' 2>/dev/null || echo "unknown")
    
    # Collect application status
    local app_health="unknown"
    local db_health="unknown"
    local container_status="unknown"
    
    if check_application_health >/dev/null 2>&1; then
        app_health="healthy"
    else
        app_health="unhealthy"
    fi
    
    if check_docker_containers >/dev/null 2>&1; then
        container_status="running"
        if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            db_health="healthy"
        else
            db_health="unhealthy"
        fi
    else
        container_status="stopped"
    fi
    
    # Generate JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "system": {
        "cpu_usage": "$cpu_usage",
        "memory_usage": "$memory_usage",
        "disk_usage": "$disk_usage",
        "uptime": "$uptime_info"
    },
    "application": {
        "status": "$app_health",
        "containers": "$container_status",
        "database": "$db_health"
    },
    "urls": {
        "local": "http://localhost:5000",
        "production": "http://$PRODUCTION_IP:5000",
        "domain": "https://$PRODUCTION_DOMAIN"
    }
}
EOF
    
    success "Health report generated: $report_file"
    
    # Display summary
    print_banner "HEALTH SUMMARY"
    log "System Resources: CPU ${cpu_usage}% | Memory ${memory_usage}% | Disk ${disk_usage}%"
    log "Application: $app_health | Containers: $container_status | Database: $db_health"
    log "Uptime: $uptime_info"
}

# =============================================================================
# MONITORING AND ALERTING
# =============================================================================

check_critical_issues() {
    log "Checking for critical issues..."
    
    local issues=()
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    if [ "$disk_usage" -gt 90 ]; then
        issues+=("CRITICAL: Disk usage at ${disk_usage}%")
    elif [ "$disk_usage" -gt 80 ]; then
        issues+=("WARNING: Disk usage at ${disk_usage}%")
    fi
    
    # Check memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}' 2>/dev/null || echo "0")
    if [ "$memory_usage" -gt 95 ]; then
        issues+=("CRITICAL: Memory usage at ${memory_usage}%")
    elif [ "$memory_usage" -gt 85 ]; then
        issues+=("WARNING: Memory usage at ${memory_usage}%")
    fi
    
    # Check if application is responding
    if ! check_application_health >/dev/null 2>&1; then
        issues+=("CRITICAL: Application not responding")
    fi
    
    # Check database connectivity
    if check_docker_containers >/dev/null 2>&1; then
        if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            issues+=("CRITICAL: Database not responding")
        fi
    else
        issues+=("CRITICAL: Docker containers not running")
    fi
    
    # Report issues
    if [ ${#issues[@]} -eq 0 ]; then
        success "No critical issues detected"
        return 0
    else
        error "Critical issues detected:"
        for issue in "${issues[@]}"; do
            error "  • $issue"
        done
        return 1
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local mode="basic"
    local verbose=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --detailed)
                mode="detailed"
                ;;
            --report)
                mode="report"
                ;;
            --critical)
                mode="critical"
                ;;
            --verbose)
                verbose=true
                ;;
            --help|-h)
                echo "Usage: $0 [--detailed|--report|--critical] [--verbose]"
                echo
                echo "Modes:"
                echo "  (default)   Basic health check"
                echo "  --detailed  Comprehensive health check"
                echo "  --report    Generate detailed JSON report"
                echo "  --critical  Check for critical issues only"
                echo
                echo "Options:"
                echo "  --verbose   Enable verbose output"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
        shift
    done
    
    # Initialize logging
    init_logging "health-check-$mode"
    
    print_banner "FilmFlex Health Check - $mode"
    
    case "$mode" in
        "basic")
            check_system_resources
            check_application_health
            if check_docker_containers; then
                check_docker_containers
            elif check_pm2_status; then
                check_pm2_status
            fi
            ;;
        "detailed")
            check_system_resources
            check_application_endpoints
            check_database_integrity
            check_storage_and_logs
            check_cors_configuration
            if command -v nginx >/dev/null 2>&1; then
                check_nginx_status
            fi
            ;;
        "report")
            generate_health_report
            ;;
        "critical")
            check_critical_issues
            ;;
    esac
    
    success "Health check completed - $mode mode"
}

# Execute main function
main "$@"
