#!/bin/bash

# Enhanced Health Check Script for FilmFlex
# Monitors system health and import effectiveness

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/var/log/filmflex/health-check-$(date +%Y%m%d).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log_health() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "[$timestamp] ${GREEN}✅ $message${NC}" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "[$timestamp] ${RED}❌ $message${NC}" | tee -a "$LOG_FILE" ;;
        "WARNING") echo -e "[$timestamp] ${YELLOW}⚠️  $message${NC}" | tee -a "$LOG_FILE" ;;
        *) echo -e "[$timestamp] ${BLUE}ℹ️  $message${NC}" | tee -a "$LOG_FILE" ;;
    esac
}

# Basic system checks
check_basic_system() {
    log_health "INFO" "Starting basic system health check"
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_health "ERROR" "Docker not installed"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_health "ERROR" "Docker daemon not running"
        return 1
    fi
    
    # Check containers
    if ! docker ps | grep -q filmflex-app; then
        log_health "ERROR" "App container not running"
        return 1
    fi
    
    if ! docker ps | grep -q filmflex-postgres; then
        log_health "ERROR" "Database container not running"
        return 1
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_health "WARNING" "High disk usage: ${disk_usage}%"
    else
        log_health "SUCCESS" "Disk usage normal: ${disk_usage}%"
    fi
    
    # Check memory
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 90 ]; then
        log_health "WARNING" "High memory usage: ${memory_usage}%"
    else
        log_health "SUCCESS" "Memory usage normal: ${memory_usage}%"
    fi
    
    log_health "SUCCESS" "Basic system health check passed"
    return 0
}

# Check application endpoints
check_application() {
    log_health "INFO" "Checking application health"
    
    # Test local endpoint
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_health "SUCCESS" "Application responding (HTTP $http_code)"
    else
        log_health "ERROR" "Application not responding (HTTP $http_code)"
        return 1
    fi
    
    # Test API health endpoint
    local api_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
    if [ "$api_code" = "200" ]; then
        log_health "SUCCESS" "API health endpoint responding (HTTP $api_code)"
    else
        log_health "WARNING" "API health endpoint issues (HTTP $api_code)"
    fi
    
    return 0
}

# Check database health
check_database() {
    log_health "INFO" "Checking database health"
    
    # Test database connection
    if docker exec filmflex-postgres pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
        log_health "SUCCESS" "Database connection healthy"
    else
        log_health "ERROR" "Database connection failed"
        return 1
    fi
    
    # Get database stats
    local movies=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
    local episodes=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | tr -d ' ' || echo "0")
    
    log_health "INFO" "Database contains $movies movies and $episodes episodes"
    
    if [ "$movies" -gt 1000 ]; then
        log_health "SUCCESS" "Database has good content volume"
    else
        log_health "WARNING" "Low content volume in database"
    fi
    
    return 0
}

# Check import effectiveness
check_import_effectiveness() {
    log_health "INFO" "Checking recent import effectiveness"
    
    # Check for recent import logs
    local recent_imports=$(find /var/log/filmflex -name "cron-import-*.log" -mtime -1 2>/dev/null | wc -l)
    
    if [ "$recent_imports" -gt 0 ]; then
        log_health "SUCCESS" "Found $recent_imports recent import logs"
        
        # Check success rate
        local successful=0
        local total=0
        
        find /var/log/filmflex -name "cron-import-*.log" -mtime -7 2>/dev/null | while read -r logfile; do
            if [ -f "$logfile" ]; then
                total=$((total + 1))
                if grep -q "Import Completed Successfully" "$logfile" 2>/dev/null; then
                    successful=$((successful + 1))
                fi
            fi
        done
        
        log_health "INFO" "Import success tracking available"
    else
        log_health "WARNING" "No recent import logs found"
    fi
    
    return 0
}

# Main health check function
main() {
    local mode="${1:-full}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "$mode" in
        "--critical")
            log_health "INFO" "Running critical health checks only"
            check_basic_system && check_application && check_database
            ;;
        "--basic")
            log_health "INFO" "Running basic health checks"
            check_basic_system && check_application
            ;;
        "--full"|*)
            log_health "INFO" "Running full health check"
            local all_passed=true
            
            check_basic_system || all_passed=false
            check_application || all_passed=false
            check_database || all_passed=false
            check_import_effectiveness || true  # Non-critical
            
            if [ "$all_passed" = true ]; then
                log_health "SUCCESS" "All health checks passed"
                exit 0
            else
                log_health "ERROR" "Some health checks failed"
                exit 1
            fi
            ;;
    esac
}

# Run main function
main "$@"
