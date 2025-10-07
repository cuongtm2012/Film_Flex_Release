#!/bin/bash

# Enhanced PhimGG Import Wrapper with Better Content Discovery
# Designed to find and import new content more effectively

set -e

# Load common functions
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Configuration
MAX_RETRIES=3
DEFAULT_TIMEOUT=120
IMPORT_SUCCESS_THRESHOLD=1  # Minimum new items to consider success

# Enhanced logging with import statistics
enhanced_log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo "[$timestamp] ✅ SUCCESS: $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo "[$timestamp] ❌ ERROR: $message" | tee -a "$LOG_FILE" ;;
        "WARNING") echo "[$timestamp] ⚠️  WARNING: $message" | tee -a "$LOG_FILE" ;;
        *) echo "[$timestamp] ℹ️  INFO: $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Check if new content is available by scanning multiple sources
check_for_new_content() {
    local scan_type="$1"
    
    enhanced_log "INFO" "Checking for new content - scan type: $scan_type"
    
    # Strategy 1: Check recent pages (last few pages often have new content)
    local recent_pages_cmd="node scripts/data/import-movies-docker.cjs --start-page=1 --max-pages=5 --dry-run --verbose"
    
    # Strategy 2: Check random pages to discover content
    local random_pages_cmd="node scripts/data/import-movies-docker.cjs --random-pages=3 --dry-run --verbose"
    
    # Strategy 3: Check different categories or sources
    local category_cmd="node scripts/data/import-movies-docker.cjs --category=phim-moi --max-pages=3 --dry-run --verbose"
    
    case "$scan_type" in
        "recent")
            enhanced_log "INFO" "Scanning recent pages for new content"
            timeout 300 docker exec "$APP_CONTAINER" sh -c "$recent_pages_cmd" 2>&1 | grep -E "(new content found|potential new movies|would import)" || return 1
            ;;
        "random")
            enhanced_log "INFO" "Scanning random pages for new content"
            timeout 300 docker exec "$APP_CONTAINER" sh -c "$random_pages_cmd" 2>&1 | grep -E "(new content found|potential new movies|would import)" || return 1
            ;;
        "category")
            enhanced_log "INFO" "Scanning category pages for new content"
            timeout 300 docker exec "$APP_CONTAINER" sh -c "$category_cmd" 2>&1 | grep -E "(new content found|potential new movies|would import)" || return 1
            ;;
        *)
            enhanced_log "WARNING" "Unknown scan type: $scan_type"
            return 1
            ;;
    esac
}

# Enhanced import execution with multiple strategies
execute_enhanced_import() {
    local import_type="$1"
    local force_import="${2:-false}"
    
    enhanced_log "INFO" "Starting enhanced import - type: $import_type, force: $force_import"
    
    # Get initial database stats
    local initial_stats=$(get_database_stats)
    local initial_movies=$(echo "$initial_stats" | cut -d'|' -f1)
    local initial_episodes=$(echo "$initial_stats" | cut -d'|' -f2)
    
    enhanced_log "INFO" "Initial database state - Movies: $initial_movies, Episodes: $initial_episodes"
    
    local import_cmd=""
    local timeout_minutes=60
    local description=""
    local expected_new_items=0
    
    case "$import_type" in
        "smart-regular")
            # Smart regular import: scan multiple recent pages and categories
            import_cmd="node scripts/data/import-movies-docker.cjs --smart-scan --max-pages=5 --delay=2 --include-recent --include-categories"
            timeout_minutes=90
            description="Smart Regular Import (Multiple Sources)"
            expected_new_items=2
            ;;
        "deep-discovery")
            # Deep discovery: scan further back and different sources
            import_cmd="node scripts/data/import-movies-docker.cjs --deep-scan --start-page=1 --max-pages=15 --delay=3 --random-sampling=true"
            timeout_minutes=180
            description="Deep Discovery Import (15 pages)"
            expected_new_items=5
            ;;
        "comprehensive-weekly")
            # Comprehensive weekly: full scan of all accessible content
            import_cmd="bash scripts/data/import-all-movies-resumable.sh --enhanced-mode --max-concurrent=2"
            timeout_minutes=600
            description="Comprehensive Weekly Import"
            expected_new_items=10
            ;;
        "targeted-new")
            # Targeted new content: focus on newest uploads and updates
            import_cmd="node scripts/data/import-movies-docker.cjs --target-new --sort=newest --max-pages=8 --delay=2"
            timeout_minutes=120
            description="Targeted New Content Import"
            expected_new_items=3
            ;;
        "fallback")
            # Fallback import: try different approach if regular fails
            import_cmd="node scripts/data/import-movies-docker.cjs --alternative-source --max-pages=6 --delay=1"
            timeout_minutes=75
            description="Fallback Import Strategy"
            expected_new_items=1
            ;;
        *)
            enhanced_log "ERROR" "Unknown enhanced import type: $import_type"
            return 1
            ;;
    esac
    
    enhanced_log "INFO" "Executing: $description"
    enhanced_log "INFO" "Command: $import_cmd"
    enhanced_log "INFO" "Timeout: ${timeout_minutes} minutes"
    enhanced_log "INFO" "Expected new items: $expected_new_items"
    
    # Pre-import content check (unless forced)
    if [ "$force_import" != "true" ]; then
        enhanced_log "INFO" "Pre-checking for new content availability..."
        
        # Quick scan to see if there's likely new content
        local content_check_cmd="node scripts/data/import-movies-docker.cjs --quick-scan --max-pages=2 --dry-run"
        local new_content_estimate=$(timeout 180 docker exec "$APP_CONTAINER" sh -c "$content_check_cmd" 2>&1 | grep -o "estimated [0-9]\+ new items" | grep -o "[0-9]\+" || echo "0")
        
        enhanced_log "INFO" "Pre-scan estimated new content: $new_content_estimate items"
        
        if [ "$new_content_estimate" -eq 0 ] && [ "$expected_new_items" -gt 0 ]; then
            enhanced_log "WARNING" "Pre-scan found no new content, but continuing with import"
        fi
    fi
    
    # Execute the import with enhanced monitoring
    local import_success=false
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ] && [ "$import_success" = false ]; do
        retry_count=$((retry_count + 1))
        enhanced_log "INFO" "Import attempt $retry_count/$MAX_RETRIES"
        
        if timeout "${timeout_minutes}m" docker exec "$APP_CONTAINER" sh -c "mkdir -p /app/logs && $import_cmd" 2>&1 | tee -a "$LOG_FILE"; then
            # Check import results
            local final_stats=$(get_database_stats)
            local final_movies=$(echo "$final_stats" | cut -d'|' -f1)
            local final_episodes=$(echo "$final_stats" | cut -d'|' -f2)
            
            local added_movies=$((final_movies - initial_movies))
            local added_episodes=$((final_episodes - initial_episodes))
            local total_new_items=$((added_movies + added_episodes))
            
            enhanced_log "SUCCESS" "$description completed"
            enhanced_log "SUCCESS" "Import results - Movies: +$added_movies (total: $final_movies), Episodes: +$added_episodes (total: $final_episodes)"
            enhanced_log "INFO" "Total new items imported: $total_new_items"
            
            # Check if import met expectations
            if [ "$total_new_items" -ge "$IMPORT_SUCCESS_THRESHOLD" ]; then
                enhanced_log "SUCCESS" "Import exceeded success threshold ($total_new_items >= $IMPORT_SUCCESS_THRESHOLD)"
                import_success=true
            elif [ "$total_new_items" -eq 0 ]; then
                enhanced_log "WARNING" "No new items imported - database may be up to date"
                if [ "$retry_count" -lt $MAX_RETRIES ]; then
                    enhanced_log "INFO" "Trying alternative import strategy..."
                    # Switch to a different strategy for retry
                    case "$import_type" in
                        "smart-regular") import_type="targeted-new" ;;
                        "targeted-new") import_type="fallback" ;;
                        *) import_type="fallback" ;;
                    esac
                    continue
                else
                    enhanced_log "INFO" "All retry attempts completed - accepting current state"
                    import_success=true
                fi
            else
                enhanced_log "SUCCESS" "Import completed with some new content ($total_new_items items)"
                import_success=true
            fi
        else
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                enhanced_log "ERROR" "$description timed out after ${timeout_minutes} minutes"
            else
                enhanced_log "ERROR" "$description failed with exit code $exit_code"
            fi
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                enhanced_log "INFO" "Retrying with reduced scope..."
                # Reduce timeout and pages for retry
                timeout_minutes=$((timeout_minutes * 3 / 4))
                import_cmd=$(echo "$import_cmd" | sed 's/--max-pages=[0-9]\+/--max-pages=3/')
            fi
        fi
    done
    
    if [ "$import_success" = true ]; then
        return 0
    else
        enhanced_log "ERROR" "All import attempts failed"
        return 1
    fi
}

# Smart import strategy selector
select_import_strategy() {
    local base_type="$1"
    local time_of_day=$(date +%H)
    local day_of_week=$(date +%u)  # 1=Monday, 7=Sunday
    
    # Determine optimal strategy based on time and day
    case "$base_type" in
        "regular")
            if [ "$time_of_day" -ge 6 ] && [ "$time_of_day" -le 10 ]; then
                echo "smart-regular"  # Morning: check recent updates
            else
                echo "targeted-new"   # Evening: focus on new content
            fi
            ;;
        "weekend")
            if [ "$day_of_week" -eq 6 ]; then
                echo "deep-discovery"  # Saturday: deep scan
            else
                echo "smart-regular"   # Sunday: regular scan
            fi
            ;;
        "deep")
            echo "comprehensive-weekly"  # Deep scan day
            ;;
        "comprehensive")
            echo "comprehensive-weekly"  # Full comprehensive import
            ;;
        *)
            echo "smart-regular"  # Default fallback
            ;;
    esac
}

# Main execution function
main() {
    local import_type="${1:-regular}"
    local force_import="${2:-false}"
    
    # Initialize enhanced logging
    init_logging "enhanced-import-$import_type"
    
    enhanced_log "INFO" "=== Enhanced FilmFlex Import Started ==="
    enhanced_log "INFO" "Base import type: $import_type"
    enhanced_log "INFO" "Force import: $force_import"
    enhanced_log "INFO" "Time: $(date)"
    enhanced_log "INFO" "Day of week: $(date +%A)"
    
    # Acquire lock to prevent concurrent imports
    if ! acquire_lock "enhanced-import" 300; then
        enhanced_log "ERROR" "Could not acquire import lock - another import may be running"
        exit 1
    fi
    
    # System health check
    if ! check_system_resources; then
        enhanced_log "ERROR" "System resources insufficient for import"
        exit 1
    fi
    
    if ! check_docker_containers; then
        enhanced_log "ERROR" "Docker container health check failed"
        exit 1
    fi
    
    # Select optimal import strategy
    local selected_strategy=$(select_import_strategy "$import_type")
    enhanced_log "INFO" "Selected import strategy: $selected_strategy"
    
    # Sync latest scripts to container
    enhanced_log "INFO" "Syncing latest import scripts..."
    local sync_script="$SOURCE_DIR/scripts/deployment/sync-docker-scripts.sh"
    if [ -f "$sync_script" ]; then
        if bash "$sync_script" >/dev/null 2>&1; then
            enhanced_log "SUCCESS" "Scripts synced successfully"
        else
            enhanced_log "WARNING" "Script sync failed, using existing container scripts"
        fi
    fi
    
    # Execute the enhanced import
    if execute_enhanced_import "$selected_strategy" "$force_import"; then
        enhanced_log "SUCCESS" "Enhanced import completed successfully"
        
        # Post-import validation
        enhanced_log "INFO" "Running post-import validation..."
        local final_stats=$(get_database_stats)
        enhanced_log "INFO" "Final database state: $final_stats"
        
        # Check database integrity
        if docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies WHERE title IS NULL OR title = '';" 2>/dev/null | grep -q " 0"; then
            enhanced_log "SUCCESS" "Database integrity check passed"
        else
            enhanced_log "WARNING" "Database integrity issues detected"
        fi
        
        enhanced_log "SUCCESS" "=== Enhanced FilmFlex Import Completed Successfully ==="
        exit 0
    else
        enhanced_log "ERROR" "Enhanced import failed after all retry attempts"
        enhanced_log "ERROR" "=== Enhanced FilmFlex Import Failed ==="
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"