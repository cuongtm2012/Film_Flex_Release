#!/bin/bash

# FilmFlex Failed Import Retry Script
# Attempts to retry failed imports based on error logs

set -e

LOG_DIR="/var/log/filmflex"
ERROR_LOG="$LOG_DIR/cron-errors.log"
RETRY_LOG="$LOG_DIR/retry-attempts.log"
MAX_RETRIES=3

mkdir -p "$LOG_DIR"

log() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [RETRY] $1" | tee -a "$RETRY_LOG"
}

# Check for recent import failures
check_recent_failures() {
    if [ ! -f "$ERROR_LOG" ]; then
        log "No error log found, nothing to retry"
        exit 0
    fi
    
    # Check for errors in the last 4 hours
    local recent_errors=$(find "$ERROR_LOG" -mmin -240 -exec grep -c "ERROR" {} \; 2>/dev/null || echo "0")
    
    if [ "$recent_errors" -eq 0 ]; then
        log "No recent import errors found"
        exit 0
    fi
    
    log "Found $recent_errors recent error(s), analyzing..."
    return 0
}

# Analyze error patterns
analyze_errors() {
    # Look for specific error patterns in recent logs
    local timeout_errors=$(tail -n 100 "$ERROR_LOG" | grep -c "timed out" || echo "0")
    local container_errors=$(tail -n 100 "$ERROR_LOG" | grep -c "container.*not running" || echo "0")
    local resource_errors=$(tail -n 100 "$ERROR_LOG" | grep -c "resources too high" || echo "0")
    
    log "Error analysis - Timeouts: $timeout_errors, Container issues: $container_errors, Resource issues: $resource_errors"
    
    # Determine retry strategy based on error types
    if [ "$container_errors" -gt 0 ]; then
        log "Container issues detected, attempting container restart"
        return 1
    elif [ "$resource_errors" -gt 0 ]; then
        log "Resource issues detected, waiting before retry"
        sleep 300  # Wait 5 minutes
        return 2
    elif [ "$timeout_errors" -gt 0 ]; then
        log "Timeout issues detected, attempting smaller batch size"
        return 3
    fi
    
    return 0
}

# Restart containers if needed
restart_containers() {
    log "Attempting container restart..."
    
    cd /root/Film_Flex_Release
    
    if docker-compose ps | grep -q "Exit"; then
        log "Found stopped containers, restarting..."
        docker-compose restart
        sleep 30
        log "Container restart completed"
        return 0
    else
        log "All containers appear to be running"
        return 1
    fi
}

# Attempt a small retry import
attempt_retry_import() {
    local retry_type="${1:-regular}"
    local retry_count_file="/var/lock/filmflex/retry_count"
    local current_retries=0
    
    if [ -f "$retry_count_file" ]; then
        current_retries=$(cat "$retry_count_file")
    fi
    
    if [ "$current_retries" -ge "$MAX_RETRIES" ]; then
        log "Maximum retry attempts ($MAX_RETRIES) reached, aborting"
        rm -f "$retry_count_file"
        return 1
    fi
    
    echo $((current_retries + 1)) > "$retry_count_file"
    log "Retry attempt $((current_retries + 1))/$MAX_RETRIES"
    
    # Attempt a small import to test system
    if /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh regular 2>&1 | tee -a "$RETRY_LOG"; then
        log "Retry import successful"
        rm -f "$retry_count_file"
        return 0
    else
        log "Retry import failed"
        return 1
    fi
}

main() {
    log "==================== RETRY CHECK START ===================="
    
    # Check if there are recent failures worth retrying
    if ! check_recent_failures; then
        exit 0
    fi
    
    # Analyze the types of errors
    analyze_errors
    local error_type=$?
    
    case $error_type in
        1)  # Container issues
            if restart_containers; then
                attempt_retry_import "regular"
            fi
            ;;
        2)  # Resource issues
            # Already waited in analyze_errors
            attempt_retry_import "regular"
            ;;
        3)  # Timeout issues
            log "Attempting reduced batch size import"
            /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh custom "node scripts/data/import-movies-docker.cjs --max-pages=1 --delay=5"
            ;;
        *)  # Other/unknown issues
            log "Unknown error type, attempting standard retry"
            attempt_retry_import "regular"
            ;;
    esac
    
    log "==================== RETRY CHECK END ===================="
}

main "$@"