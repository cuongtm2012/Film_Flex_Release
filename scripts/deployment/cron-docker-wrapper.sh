#!/bin/bash

# FilmFlex Optimized Cron Docker Wrapper
# Version: 2.0 - Uses shared common functions

set -e

# Load common functions
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/common-functions.sh"

# =============================================================================
# IMPORT EXECUTION FUNCTIONS
# =============================================================================

execute_import() {
    local import_cmd="$1"
    local timeout_minutes="${2:-60}"
    local description="${3:-Import}"
    
    log "Starting: $description"
    log "Command: $import_cmd"
    log "Timeout: ${timeout_minutes} minutes"
    
    # Get initial database stats
    local initial_stats=$(get_database_stats)
    local initial_movies=$(echo "$initial_stats" | cut -d'|' -f1)
    local initial_episodes=$(echo "$initial_stats" | cut -d'|' -f2)
    
    log "Initial database - Movies: $initial_movies, Episodes: $initial_episodes"
    
    # Execute with timeout
    if timeout "${timeout_minutes}m" docker exec "$APP_CONTAINER" sh -c "mkdir -p /app/logs && $import_cmd" 2>&1 | tee -a "$LOG_FILE"; then
        # Get final database stats
        local final_stats=$(get_database_stats)
        local final_movies=$(echo "$final_stats" | cut -d'|' -f1)
        local final_episodes=$(echo "$final_stats" | cut -d'|' -f2)
        
        local added_movies=$((final_movies - initial_movies))
        local added_episodes=$((final_episodes - initial_episodes))
        
        success "$description completed successfully"
        success "Database changes - Movies: +$added_movies (total: $final_movies), Episodes: +$added_episodes (total: $final_episodes)"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            error "$description timed out after ${timeout_minutes} minutes"
        else
            error "$description failed with exit code $exit_code"
        fi
        return $exit_code
    fi
}

sync_scripts() {
    log "Syncing latest import scripts to container..."
    
    local sync_script="$SOURCE_DIR/scripts/deployment/sync-docker-scripts.sh"
    if [ -f "$sync_script" ]; then
        if bash "$sync_script" >/dev/null 2>&1; then
            success "Scripts synced successfully"
        else
            error "Failed to sync scripts, continuing with existing ones..."
        fi
    else
        log "Sync script not found, using existing container scripts"
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local import_type="${1:-regular}"
    shift || true
    local import_args="$*"
    
    # Initialize logging
    init_logging "cron-import-$import_type"
    
    print_banner "CRON IMPORT - $import_type"
    log "Import type: $import_type"
    log "Arguments: $import_args"
    
    # Acquire lock to prevent concurrent imports
    acquire_lock "import" 300
    
    # Check system health
    check_system_resources || { error "System resources insufficient"; exit 1; }
    
    # Check Docker containers
    check_docker_containers || { error "Container health check failed"; exit 1; }
    
    # Sync latest scripts
    sync_scripts
    
    # Execute appropriate import based on type
    case "$import_type" in
        "regular")
            execute_import "node scripts/data/import-movies-docker.cjs --max-pages=3 --delay=2" 45 "Regular Import (3 pages)"
            ;;
        "deep")
            execute_import "node scripts/data/import-movies-docker.cjs --deep-scan --max-pages=10 --delay=3" 90 "Deep Scan Import (10 pages)"
            ;;
        "comprehensive")
            execute_import "bash scripts/data/import-all-movies-resumable.sh" 480 "Comprehensive Import (All Movies)"
            ;;
        "weekend")
            execute_import "node scripts/data/import-movies-docker.cjs --max-pages=2 --delay=1" 30 "Weekend Import (2 pages)"
            ;;
        "custom")
            if [ -n "$import_args" ]; then
                execute_import "$import_args" 120 "Custom Import"
            else
                error "Custom import requires arguments"
                exit 1
            fi
            ;;
        *)
            error "Unknown import type: $import_type"
            echo "Usage: $0 {regular|deep|comprehensive|weekend|custom} [args...]"
            exit 1
            ;;
    esac
    
    success "CRON IMPORT COMPLETED - $import_type"
}

# Execute main function
main "$@"