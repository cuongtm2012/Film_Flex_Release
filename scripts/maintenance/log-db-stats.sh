#!/bin/bash

# Database Statistics Logging Script
# Logs database statistics for monitoring trends

set -e

LOG_FILE="/var/log/filmflex/db-stats-$(date +%Y%m%d).log"
STATS_FILE="/var/log/filmflex/db-stats-history.csv"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_db() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] ${BLUE}ℹ️  $message${NC}" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log_db "Starting database statistics collection"

# Get database statistics
MOVIES=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
EPISODES=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | tr -d ' ' || echo "0")
DB_SIZE=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT pg_size_pretty(pg_database_size('filmflex'));" 2>/dev/null | tr -d ' ' || echo "Unknown")

# Get table sizes
MOVIES_SIZE=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT pg_size_pretty(pg_total_relation_size('movies'));" 2>/dev/null | tr -d ' ' || echo "Unknown")
EPISODES_SIZE=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT pg_size_pretty(pg_total_relation_size('episodes'));" 2>/dev/null | tr -d ' ' || echo "Unknown")

# Log current statistics
log_db "Database Statistics:"
log_db "  Movies: $MOVIES"
log_db "  Episodes: $EPISODES"
log_db "  Total database size: $DB_SIZE"
log_db "  Movies table size: $MOVIES_SIZE"
log_db "  Episodes table size: $EPISODES_SIZE"

# Create CSV header if file doesn't exist
if [ ! -f "$STATS_FILE" ]; then
    echo "timestamp,movies,episodes,db_size,movies_size,episodes_size" > "$STATS_FILE"
fi

# Append to CSV history
echo "$(date -Iseconds),$MOVIES,$EPISODES,$DB_SIZE,$MOVIES_SIZE,$EPISODES_SIZE" >> "$STATS_FILE"

log_db "Database statistics logged to $STATS_FILE"