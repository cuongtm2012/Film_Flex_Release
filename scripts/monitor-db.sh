#!/bin/bash
# Database monitoring script for FilmFlex
# Run this script to check database health and performance

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_USER="root"
SSH_HOST="38.54.115.156"
APP_PATH="/var/www/filmflex"
DB_NAME="filmflex"
DB_USER="filmflex"

# Show usage information
function show_usage {
  echo -e "${BLUE}=== FilmFlex Database Monitoring Tool ===${NC}"
  echo "Usage: $0 [OPTION]"
  echo ""
  echo "Options:"
  echo "  --status       Show database status overview"
  echo "  --tables       List tables and row counts"
  echo "  --connections  Show active database connections"
  echo "  --queries      Show current running queries"
  echo "  --slow         Show slow queries (>1s)"
  echo "  --vacuum       Run vacuum analyze to optimize"
  echo "  --backup       Create a database backup"
  echo "  --reindex      Reindex database tables"
  echo "  --help         Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --status"
  echo "  $0 --tables"
}

# Database status overview
function db_status {
  echo -e "${BLUE}=== Database Status Overview ===${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c 'SELECT version();'"
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c 'SELECT NOW() as current_time;'"
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as db_size;\""
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';\""
  
  echo -e "\n${YELLOW}=== Database Uptime ===${NC}"
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime;\""
  
  echo -e "\n${YELLOW}=== Cache Hit Ratio ===${NC}"
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"SELECT 
    round(100 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as cache_hit_ratio 
    FROM pg_statio_user_tables;\""
}

# List tables and row counts
function list_tables {
  echo -e "${BLUE}=== Database Tables and Row Counts ===${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -d $DB_NAME -c \"
    SELECT 
      relname as table_name,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(relid)) as table_size
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
  \""
}

# Show active connections
function show_connections {
  echo -e "${BLUE}=== Active Database Connections ===${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"
    SELECT 
      pid,
      application_name,
      client_addr,
      state,
      query_start,
      NOW() - query_start as duration,
      wait_event_type
    FROM pg_stat_activity
    WHERE datname='$DB_NAME' AND state <> 'idle'
    ORDER BY duration DESC;
  \""
}

# Show current running queries
function show_queries {
  echo -e "${BLUE}=== Currently Running Queries ===${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"
    SELECT 
      pid,
      application_name,
      now() - query_start as duration,
      substring(query, 1, 100) as query_preview
    FROM pg_stat_activity
    WHERE datname='$DB_NAME' AND state = 'active'
    ORDER BY duration DESC;
  \""
}

# Show slow queries
function show_slow_queries {
  echo -e "${BLUE}=== Slow Queries (>1s) ===${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -c \"
    SELECT 
      pid,
      application_name,
      now() - query_start as duration,
      substring(query, 1, 100) as query_preview
    FROM pg_stat_activity
    WHERE datname='$DB_NAME' AND state = 'active' AND now() - query_start > '1 second'::interval
    ORDER BY duration DESC;
  \""
}

# Run vacuum analyze
function run_vacuum {
  echo -e "${BLUE}=== Running VACUUM ANALYZE ===${NC}"
  echo -e "${YELLOW}This will optimize database performance but may take some time.${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -d $DB_NAME -c \"VACUUM ANALYZE;\""
  
  echo -e "${GREEN}Vacuum analyze completed.${NC}"
}

# Create database backup
function create_backup {
  echo -e "${BLUE}=== Creating Database Backup ===${NC}"
  BACKUP_FILE="filmflex_$(date +%Y%m%d_%H%M%S).sql"
  
  ssh $SSH_USER@$SSH_HOST "mkdir -p /var/backups/filmflex && 
    sudo -u postgres pg_dump $DB_NAME > /var/backups/filmflex/$BACKUP_FILE && 
    gzip /var/backups/filmflex/$BACKUP_FILE &&
    echo 'Backup created: /var/backups/filmflex/$BACKUP_FILE.gz'"
  
  echo -e "${GREEN}Backup completed.${NC}"
}

# Reindex database
function reindex_database {
  echo -e "${BLUE}=== Reindexing Database ===${NC}"
  echo -e "${YELLOW}This will rebuild indexes but may take some time.${NC}"
  
  ssh $SSH_USER@$SSH_HOST "sudo -u postgres psql -d $DB_NAME -c \"REINDEX DATABASE $DB_NAME;\""
  
  echo -e "${GREEN}Reindexing completed.${NC}"
}

# Parse command-line arguments
if [ $# -eq 0 ]; then
  # Default action: show usage
  show_usage
  exit 0
else
  case "$1" in
    --status)
      db_status
      ;;
    --tables)
      list_tables
      ;;
    --connections)
      show_connections
      ;;
    --queries)
      show_queries
      ;;
    --slow)
      show_slow_queries
      ;;
    --vacuum)
      run_vacuum
      ;;
    --backup)
      create_backup
      ;;
    --reindex)
      reindex_database
      ;;
    --help)
      show_usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      exit 1
      ;;
  esac
fi