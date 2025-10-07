#!/bin/bash

# Enhanced Cron Docker Wrapper for PhimGG Imports
# Handles multiple import strategies with better content discovery

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="/var/log/filmflex"
LOCK_DIR="/var/lock/filmflex"

# Docker container names
APP_CONTAINER="filmflex-app"
DB_CONTAINER="filmflex-postgres"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize logging
init_logging() {
    local import_type="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="$LOG_DIR/cron-import-${import_type}-${timestamp}.log"
    
    mkdir -p "$LOG_DIR" "$LOCK_DIR"
    touch "$LOG_FILE"
    
    # Start logging
    exec > >(tee -a "$LOG_FILE")
    exec 2>&1
}

# Enhanced logging function
log_enhanced() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "[$timestamp] ${GREEN}✅ SUCCESS${NC}: $message" ;;
        "ERROR") echo -e "[$timestamp] ${RED}❌ ERROR${NC}: $message" ;;
        "WARNING") echo -e "[$timestamp] ${YELLOW}⚠️  WARNING${NC}: $message" ;;
        *) echo -e "[$timestamp] ${BLUE}ℹ️  INFO${NC}: $message" ;;
    esac
}

# Acquire lock to prevent concurrent imports
acquire_import_lock() {
    local lock_name="$1"
    local timeout="${2:-300}"
    local lock_file="$LOCK_DIR/$lock_name.lock"
    
    local count=0
    while [ $count -lt $timeout ]; do
        if mkdir "$lock_file" 2>/dev/null; then
            echo $$ > "$lock_file/pid"
            log_enhanced "INFO" "Acquired lock: $lock_name"
            return 0
        fi
        
        # Check if existing lock is stale
        if [ -f "$lock_file/pid" ]; then
            local existing_pid=$(cat "$lock_file/pid" 2>/dev/null || echo "")
            if [ ! -z "$existing_pid" ] && ! kill -0 "$existing_pid" 2>/dev/null; then
                log_enhanced "WARNING" "Removing stale lock for PID $existing_pid"
                rm -rf "$lock_file"
                continue
            fi
        fi
        
        sleep 5
        count=$((count + 5))
    done
    
    log_enhanced "ERROR" "Could not acquire lock: $lock_name (timeout after ${timeout}s)"
    return 1
}

# Release lock
release_import_lock() {
    local lock_name="$1"
    local lock_file="$LOCK_DIR/$lock_name.lock"
    
    if [ -d "$lock_file" ]; then
        rm -rf "$lock_file"
        log_enhanced "INFO" "Released lock: $lock_name"
    fi
}

# Check system health before import
check_system_health() {
    log_enhanced "INFO" "Checking system health..."
    
    # Check Docker containers
    if ! docker ps | grep -q "$APP_CONTAINER"; then
        log_enhanced "ERROR" "App container not running: $APP_CONTAINER"
        return 1
    fi
    
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        log_enhanced "ERROR" "Database container not running: $DB_CONTAINER"
        return 1
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_enhanced "ERROR" "Disk usage too high: ${disk_usage}%"
        return 1
    fi
    
    # Check memory
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 95 ]; then
        log_enhanced "WARNING" "Memory usage high: ${memory_usage}%"
    fi
    
    log_enhanced "SUCCESS" "System health check passed"
    return 0
}

# Get database statistics
get_database_stats() {
    local movies=$(docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
    local episodes=$(docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "$movies|$episodes"
}

# Execute import with specific strategy
execute_import_strategy() {
    local strategy="$1"
    local max_pages="${2:-5}"
    local timeout_minutes="${3:-30}"
    
    log_enhanced "INFO" "Executing import strategy: $strategy"
    log_enhanced "INFO" "Max pages: $max_pages, Timeout: ${timeout_minutes}m"
    
    # Get initial database stats
    local initial_stats=$(get_database_stats)
    local initial_movies=$(echo "$initial_stats" | cut -d'|' -f1)
    local initial_episodes=$(echo "$initial_stats" | cut -d'|' -f2)
    
    log_enhanced "INFO" "Initial database: $initial_movies movies, $initial_episodes episodes"
    
    # Build import command based on strategy
    local import_cmd=""
    
    case "$strategy" in
        "regular")
            import_cmd="node scripts/data/import-movies-docker.cjs --max-pages=$max_pages --delay=2"
            ;;
        "weekend")
            import_cmd="node scripts/data/import-movies-docker.cjs --max-pages=$((max_pages * 2)) --delay=3 --include-episodes"
            ;;
        "deep")
            import_cmd="bash scripts/data/import-all-movies-resumable.sh --max-pages=$((max_pages * 3))"
            ;;
        "comprehensive")
            import_cmd="bash scripts/data/import-all-movies-resumable.sh --full-scan"
            timeout_minutes=120
            ;;
        "targeted")
            import_cmd="node scripts/data/import-movies-docker.cjs --max-pages=$max_pages --sort=newest --delay=1"
            ;;
        *)
            log_enhanced "ERROR" "Unknown import strategy: $strategy"
            return 1
            ;;
    esac
    
    log_enhanced "INFO" "Import command: $import_cmd"
    
    # Execute the import
    local import_success=false
    local retry_count=0
    local max_retries=2
    
    while [ $retry_count -lt $max_retries ] && [ "$import_success" = false ]; do
        retry_count=$((retry_count + 1))
        log_enhanced "INFO" "Import attempt $retry_count/$max_retries"
        
        if timeout "${timeout_minutes}m" docker exec "$APP_CONTAINER" sh -c "cd /app && $import_cmd" 2>&1; then
            import_success=true
            log_enhanced "SUCCESS" "Import command completed successfully"
        else
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                log_enhanced "ERROR" "Import timed out after ${timeout_minutes} minutes"
            else
                log_enhanced "ERROR" "Import failed with exit code: $exit_code"
            fi
            
            if [ $retry_count -lt $max_retries ]; then
                log_enhanced "INFO" "Retrying with reduced scope..."
                max_pages=$((max_pages / 2))
                if [ $max_pages -lt 1 ]; then
                    max_pages=1
                fi
            fi
        fi
    done
    
    # Check results
    local final_stats=$(get_database_stats)
    local final_movies=$(echo "$final_stats" | cut -d'|' -f1)
    local final_episodes=$(echo "$final_stats" | cut -d'|' -f2)
    
    local added_movies=$((final_movies - initial_movies))
    local added_episodes=$((final_episodes - initial_episodes))
    
    log_enhanced "SUCCESS" "Import results: +$added_movies movies, +$added_episodes episodes"
    log_enhanced "INFO" "Final database: $final_movies movies, $final_episodes episodes"
    
    # Update success tracking
    echo "$added_movies|$added_episodes|$(date +%s)" >> "$LOG_DIR/import-results.log"
    
    if [ "$import_success" = true ]; then
        return 0
    else
        return 1
    fi
}

# Main import wrapper function
main() {
    local import_type="${1:-regular}"
    local test_mode="${2:-false}"
    
    # Initialize logging
    init_logging "$import_type"
    
    log_enhanced "INFO" "=== Enhanced PhimGG Import Started ==="
    log_enhanced "INFO" "Import type: $import_type"
    log_enhanced "INFO" "Test mode: $test_mode"
    log_enhanced "INFO" "Time: $(date)"
    log_enhanced "INFO" "Cron execution via: $0"
    
    # Acquire lock
    if ! acquire_import_lock "cron-import-$import_type" 300; then
        log_enhanced "ERROR" "Could not acquire import lock"
        exit 1
    fi
    
    # Ensure cleanup on exit
    trap 'release_import_lock "cron-import-$import_type"' EXIT
    
    # System health check
    if ! check_system_health; then
        log_enhanced "ERROR" "System health check failed"
        exit 1
    fi
    
    # Determine import parameters based on type and time
    local max_pages=5
    local timeout_minutes=30
    local strategy="$import_type"
    
    case "$import_type" in
        "regular")
            max_pages=5
            timeout_minutes=30
            ;;
        "weekend")
            max_pages=8
            timeout_minutes=45
            ;;
        "deep")
            max_pages=15
            timeout_minutes=90
            ;;
        "comprehensive")
            max_pages=25
            timeout_minutes=120
            ;;
        "targeted")
            max_pages=6
            timeout_minutes=25
            ;;
        *)
            log_enhanced "WARNING" "Unknown import type, using regular strategy"
            strategy="regular"
            ;;
    esac
    
    # Skip import if in test mode
    if [ "$test_mode" = "test" ]; then
        log_enhanced "INFO" "Test mode - skipping actual import"
        log_enhanced "SUCCESS" "Test completed successfully"
        exit 0
    fi
    
    # Execute the import
    if execute_import_strategy "$strategy" "$max_pages" "$timeout_minutes"; then
        log_enhanced "SUCCESS" "=== Enhanced PhimGG Import Completed Successfully ==="
        
        # Clean up old logs (keep last 20)
        find "$LOG_DIR" -name "cron-import-*.log" -type f | sort -r | tail -n +21 | xargs rm -f 2>/dev/null || true
        
        exit 0
    else
        log_enhanced "ERROR" "=== Enhanced PhimGG Import Failed ==="
        
        # Update failure counter for emergency fallback
        local failure_count_file="/tmp/import_failed_count"
        local current_failures=$(cat "$failure_count_file" 2>/dev/null || echo "0")
        echo $((current_failures + 1)) > "$failure_count_file"
        
        exit 1
    fi
}

# Execute main function
main "$@"