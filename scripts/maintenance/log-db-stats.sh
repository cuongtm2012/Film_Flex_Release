#!/bin/bash

# PhimGG Database Statistics Logging Script
# Records daily database statistics for monitoring growth and performance

set -e

LOG_DIR="/var/log/filmflex"
STATS_LOG="$LOG_DIR/db-stats.log"
APP_CONTAINER="filmflex-app"
DB_CONTAINER="filmflex-postgres"

mkdir -p "$LOG_DIR"

log() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DB-STATS] $1" | tee -a "$STATS_LOG"
}

# Get comprehensive database statistics
get_db_stats() {
    local stats=$(docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "
    SELECT 
        'MOVIES: ' || COUNT(*) || ' | EPISODES: ' || (SELECT COUNT(*) FROM episodes) ||
        ' | USERS: ' || (SELECT COUNT(*) FROM users) ||
        ' | DB_SIZE: ' || pg_size_pretty(pg_database_size('filmflex')) ||
        ' | LAST_MOVIE: ' || COALESCE((SELECT title FROM movies ORDER BY created_at DESC LIMIT 1), 'N/A')
    FROM movies;
    " 2>/dev/null | tr -d '\n' | xargs)
    
    echo "$stats"
}

# Get table sizes
get_table_sizes() {
    docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -c "
    SELECT 
        schemaname as schema,
        tablename as table,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    " 2>/dev/null || echo "Could not retrieve table sizes"
}

# Check for recent import activity
check_recent_activity() {
    local recent_movies=$(docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "
    SELECT COUNT(*) FROM movies WHERE created_at > NOW() - INTERVAL '24 hours';
    " 2>/dev/null | tr -d ' ')
    
    local recent_episodes=$(docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "
    SELECT COUNT(*) FROM episodes WHERE created_at > NOW() - INTERVAL '24 hours';  
    " 2>/dev/null | tr -d ' ')
    
    log "Recent activity (24h): Movies: ${recent_movies:-0}, Episodes: ${recent_episodes:-0}"
}

main() {
    if ! docker ps --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
        log "Database container not running, skipping stats collection"
        exit 0
    fi
    
    # Daily statistics
    local daily_stats=$(get_db_stats)
    log "DAILY_STATS: $daily_stats"
    
    # Recent activity
    check_recent_activity
    
    # Weekly detailed report (Sundays)
    if [ "$(date +%u)" -eq 7 ]; then
        log "=== WEEKLY TABLE SIZE REPORT ==="
        get_table_sizes | while IFS= read -r line; do
            log "$line"
        done
        log "=== END WEEKLY REPORT ==="
    fi
}

main "$@"