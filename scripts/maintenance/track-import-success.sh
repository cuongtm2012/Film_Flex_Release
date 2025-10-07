#!/bin/bash

# Import Success Tracking Script
# Monitors import effectiveness and adjusts strategies

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
LOG_FILE="/var/log/filmflex/import-tracking.log"
SUCCESS_STATS_FILE="/var/log/filmflex/import-success-stats.json"
FAILURE_COUNT_FILE="/tmp/import_failed_count"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get database statistics
get_db_stats() {
    local movies=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
    local episodes=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "$movies|$episodes"
}

# Check recent import logs for success/failure patterns
analyze_recent_imports() {
    log_with_timestamp "Analyzing recent import performance..."
    
    local recent_logs=$(find /var/log/filmflex -name "*cron-import*.log" -mtime -1 2>/dev/null | sort -r | head -5)
    local successful_imports=0
    local failed_imports=0
    local total_new_items=0
    
    for log_file in $recent_logs; do
        if [ -f "$log_file" ]; then
            if grep -q "Import Completed Successfully" "$log_file"; then
                successful_imports=$((successful_imports + 1))
                
                # Extract new items count from successful imports
                local new_items=$(grep "Import results:" "$log_file" 2>/dev/null | tail -1 | grep -o "+[0-9]\+" | tr -d '+' | head -2 | paste -sd+ | bc 2>/dev/null || echo "0")
                total_new_items=$((total_new_items + new_items))
            elif grep -q "Import Failed" "$log_file"; then
                failed_imports=$((failed_imports + 1))
            fi
        fi
    done
    
    # Update failure count for emergency fallback
    echo "$failed_imports" > "$FAILURE_COUNT_FILE"
    
    log_with_timestamp "Recent import analysis: $successful_imports successful, $failed_imports failed, $total_new_items total new items"
    
    # Generate recommendations
    if [ "$failed_imports" -gt 2 ]; then
        log_with_timestamp "WARNING: High failure rate detected ($failed_imports failures)"
        log_with_timestamp "RECOMMENDATION: Consider switching to fallback import strategy"
    elif [ "$total_new_items" -eq 0 ] && [ "$successful_imports" -gt 0 ]; then
        log_with_timestamp "INFO: Imports successful but no new content found"
        log_with_timestamp "RECOMMENDATION: Database may be comprehensive, consider reducing import frequency"
    elif [ "$total_new_items" -gt 10 ]; then
        log_with_timestamp "SUCCESS: High content discovery rate ($total_new_items new items)"
        log_with_timestamp "RECOMMENDATION: Current import strategy is effective"
    fi
    
    echo "$successful_imports|$failed_imports|$total_new_items"
}

# Update success statistics JSON
update_success_stats() {
    local stats="$1"
    local successful=$(echo "$stats" | cut -d'|' -f1)
    local failed=$(echo "$stats" | cut -d'|' -f2)
    local new_items=$(echo "$stats" | cut -d'|' -f3)
    local db_stats=$(get_db_stats)
    local total_movies=$(echo "$db_stats" | cut -d'|' -f1)
    local total_episodes=$(echo "$db_stats" | cut -d'|' -f2)
    
    # Calculate success rate (avoid division by zero)
    local total_attempts=$((successful + failed))
    local success_rate="0"
    if [ "$total_attempts" -gt 0 ]; then
        success_rate=$(echo "scale=2; $successful * 100 / $total_attempts" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Create or update JSON stats
    cat > "$SUCCESS_STATS_FILE" << EOF
{
  "last_updated": "$(date -Iseconds)",
  "recent_analysis": {
    "successful_imports": $successful,
    "failed_imports": $failed,
    "total_new_items": $new_items,
    "success_rate": $success_rate
  },
  "database_state": {
    "total_movies": $total_movies,
    "total_episodes": $total_episodes,
    "last_check": "$(date -Iseconds)"
  },
  "recommendations": {
    "strategy_effective": $([ "$new_items" -gt 0 ] && echo "true" || echo "false"),
    "needs_fallback": $([ "$failed" -gt 2 ] && echo "true" || echo "false"),
    "database_comprehensive": $([ "$new_items" -eq 0 ] && [ "$successful" -gt 0 ] && echo "true" || echo "false")
  }
}
EOF
    
    log_with_timestamp "Updated success statistics: $SUCCESS_STATS_FILE"
}

# Generate import effectiveness report
generate_report() {
    local stats="$1"
    local successful=$(echo "$stats" | cut -d'|' -f1)
    local failed=$(echo "$stats" | cut -d'|' -f2)
    local new_items=$(echo "$stats" | cut -d'|' -f3)
    
    echo ""
    echo -e "${BLUE}=== FilmFlex Import Effectiveness Report ===${NC}"
    echo -e "${BLUE}Generated: $(date)${NC}"
    echo ""
    
    local total_attempts=$((successful + failed))
    if [ "$total_attempts" -gt 0 ]; then
        local success_rate=$(echo "scale=1; $successful * 100 / $total_attempts" | bc -l 2>/dev/null || echo "0")
        echo -e "${GREEN}Success Rate: ${success_rate}% ($successful/$total_attempts imports)${NC}"
    else
        echo -e "${YELLOW}No recent imports to analyze${NC}"
    fi
    
    echo -e "${BLUE}New Content Discovered: $new_items items${NC}"
    
    local db_stats=$(get_db_stats)
    local total_movies=$(echo "$db_stats" | cut -d'|' -f1)
    local total_episodes=$(echo "$db_stats" | cut -d'|' -f2)
    echo -e "${BLUE}Database Status: $total_movies movies, $total_episodes episodes${NC}"
    
    echo ""
    echo -e "${BLUE}=== Recommendations ===${NC}"
    
    if [ "$failed" -gt 2 ]; then
        echo -e "${RED}⚠️  High failure rate - consider system maintenance${NC}"
    elif [ "$new_items" -eq 0 ] && [ "$successful" -gt 0 ]; then
        echo -e "${YELLOW}ℹ️  Database appears comprehensive - current strategy working${NC}"
    elif [ "$new_items" -gt 5 ]; then
        echo -e "${GREEN}✅ Excellent content discovery - maintain current strategy${NC}"
    else
        echo -e "${BLUE}ℹ️  Normal operation - imports working as expected${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    local command="${1:-analyze}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "$command" in
        "analyze"|"")
            log_with_timestamp "=== Starting Import Success Analysis ==="
            
            # Analyze recent imports
            local analysis_result=$(analyze_recent_imports)
            
            # Update statistics
            update_success_stats "$analysis_result"
            
            # Generate and display report
            generate_report "$analysis_result"
            
            log_with_timestamp "=== Import Success Analysis Complete ==="
            ;;
        
        "report")
            if [ -f "$SUCCESS_STATS_FILE" ]; then
                echo "Current Import Statistics:"
                cat "$SUCCESS_STATS_FILE" | jq . 2>/dev/null || cat "$SUCCESS_STATS_FILE"
            else
                echo "No statistics available. Run 'analyze' first."
            fi
            ;;
        
        "reset")
            log_with_timestamp "Resetting import failure counters"
            rm -f "$FAILURE_COUNT_FILE"
            echo "0" > "$FAILURE_COUNT_FILE"
            ;;
        
        *)
            echo "Usage: $0 {analyze|report|reset}"
            echo ""
            echo "Commands:"
            echo "  analyze  - Analyze recent import performance (default)"
            echo "  report   - Show current statistics"
            echo "  reset    - Reset failure counters"
            ;;
    esac
}

# Run main function
main "$@"