#!/bin/bash

# PhimGG Local Database Export Script
# This script exports your complete local PostgreSQL database to /shared folder

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SHARED_DIR="./shared"

echo -e "${BLUE}🗄️  PhimGG Local Database Export Script${NC}"
echo "=========================================="
echo "Timestamp: $TIMESTAMP"
echo ""

# Function to print colored output
log() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Function to test database connection
test_connection() {
    local cmd="$1"
    local desc="$2"
    echo "Testing: $desc"
    if $cmd -c "SELECT 1;" >/dev/null 2>&1; then
        echo "  ✅ Success"
        return 0
    else
        echo "  ❌ Failed"
        return 1
    fi
}

# Step 1: Detect local PostgreSQL connection
echo -e "${BLUE}🔍 Detecting local PostgreSQL database...${NC}"

# Common PostgreSQL connection methods
LOCAL_METHODS=(
    "psql -U postgres -d filmflex"
    "psql -U filmflex -d filmflex" 
    "psql -d filmflex"
    "psql -U $(whoami) -d filmflex"
    "psql -h localhost -U postgres -d filmflex"
    "psql -h localhost -U filmflex -d filmflex"
)

LOCAL_PSQL_CMD=""
for method in "${LOCAL_METHODS[@]}"; do
    if test_connection "$method" "$method"; then
        LOCAL_PSQL_CMD="$method"
        log "Found working connection: $method"
        break
    fi
done

if [ -z "$LOCAL_PSQL_CMD" ]; then
    warn "Could not auto-detect local database connection."
    echo ""
    echo "Available PostgreSQL databases on your system:"
    psql -l 2>/dev/null | grep filmflex || echo "No filmflex database found"
    echo ""
    echo "Please check your local PostgreSQL setup:"
    echo "1. Is PostgreSQL running? (brew services list | grep postgresql)"
    echo "2. Does the filmflex database exist? (psql -l)"
    echo "3. Do you have the correct user permissions?"
    exit 1
fi

# Step 2: Check database content
echo -e "\n${BLUE}📊 Checking local database content...${NC}"

# Get table counts
echo "Checking tables and data counts..."
TABLE_INFO=$($LOCAL_PSQL_CMD -t -c "
SELECT 
    schemaname||'.'||relname as table_name,
    n_tup_ins as insert_count,
    n_tup_upd as update_count,
    n_tup_del as delete_count,
    n_live_tup as current_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
")

if [ -z "$TABLE_INFO" ]; then
    error "No tables found in the filmflex database"
    echo "Available tables:"
    $LOCAL_PSQL_CMD -t -c "SELECT relname FROM pg_stat_user_tables WHERE schemaname = 'public';"
    exit 1
fi

echo "Tables in your local filmflex database:"
echo "Table Name                    | Live Rows | Inserts | Updates | Deletes"
echo "-------------------------------------------------------------------"
echo "$TABLE_INFO" | while read line; do
    if [ -n "$line" ]; then
        echo "$line" | awk -F'|' '{printf "%-30s| %-9s| %-7s| %-7s| %-7s\n", $1, $5, $2, $3, $4}'
    fi
done

# Get total row counts for key tables
echo ""
echo "Key table statistics:"
MOVIES_COUNT=$($LOCAL_PSQL_CMD -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | xargs)
EPISODES_COUNT=$($LOCAL_PSQL_CMD -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | xargs)
USERS_COUNT=$($LOCAL_PSQL_CMD -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)

echo "📹 Movies: $MOVIES_COUNT"
echo "🎬 Episodes: $EPISODES_COUNT" 
echo "👥 Users: $USERS_COUNT"

if [ "$MOVIES_COUNT" -eq 0 ] && [ "$EPISODES_COUNT" -eq 0 ]; then
    warn "Your local database appears to be empty!"
    echo "Do you want to continue anyway? (y/n)"
    read -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Create exports directory
echo -e "\n${BLUE}📁 Preparing export directory...${NC}"
mkdir -p "$SHARED_DIR"
log "Export directory ready: $SHARED_DIR"

# Step 4: Export schema (update existing)
echo -e "\n${BLUE}🏗️  Exporting database schema...${NC}"
SCHEMA_FILE="$SHARED_DIR/filmflex_schema_$TIMESTAMP.sql"

# Extract connection parameters for pg_dump
DUMP_PARAMS=""
if [[ $LOCAL_PSQL_CMD == *"-U"* ]]; then
    USERNAME=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-U \([^ ]*\).*/\1/p')
    DUMP_PARAMS="$DUMP_PARAMS -U $USERNAME"
fi
if [[ $LOCAL_PSQL_CMD == *"-h"* ]]; then
    HOST=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-h \([^ ]*\).*/\1/p')
    DUMP_PARAMS="$DUMP_PARAMS -h $HOST"
fi

# Find the correct pg_dump version that matches PostgreSQL server
PG_DUMP_CMD="pg_dump"
if [ -x "/opt/homebrew/Cellar/postgresql@15/15.13/bin/pg_dump" ]; then
    PG_DUMP_CMD="/opt/homebrew/Cellar/postgresql@15/15.13/bin/pg_dump"
    log "Using PostgreSQL 15 pg_dump to match server version"
elif [ -x "/opt/homebrew/bin/pg_dump" ]; then
    PG_DUMP_CMD="/opt/homebrew/bin/pg_dump"
    warn "Using default pg_dump (may have version mismatch)"
fi

# Export schema only
if $PG_DUMP_CMD $DUMP_PARAMS --schema-only --no-owner --no-privileges -d filmflex > "$SCHEMA_FILE"; then
    log "Schema exported: $SCHEMA_FILE"
    
    # Update the main schema file too
    cp "$SCHEMA_FILE" "$SHARED_DIR/filmflex_schema.sql"
    log "Updated main schema file: $SHARED_DIR/filmflex_schema.sql"
else
    error "Failed to export schema"
    exit 1
fi

# Step 5: Export complete data
echo -e "\n${BLUE}💾 Exporting complete database data...${NC}"
DATA_FILE="$SHARED_DIR/filmflex_complete_data_$TIMESTAMP.sql"

if $PG_DUMP_CMD $DUMP_PARAMS --data-only --no-owner --no-privileges --column-inserts -d filmflex > "$DATA_FILE"; then
    log "Complete data exported: $DATA_FILE"
    
    # Create a clean version without comments
    DATA_CLEAN_FILE="$SHARED_DIR/filmflex_data_clean_$TIMESTAMP.sql"
    grep -v "^--" "$DATA_FILE" | grep -v "^SET" | grep -v "^SELECT" | grep -v "^\s*$" > "$DATA_CLEAN_FILE"
    log "Clean data file created: $DATA_CLEAN_FILE"
else
    error "Failed to export data"
    exit 1
fi

# Step 6: Export individual table data (for targeted imports)
echo -e "\n${BLUE}📋 Exporting individual tables...${NC}"
TABLES_DIR="$SHARED_DIR/tables_$TIMESTAMP"
mkdir -p "$TABLES_DIR"

# Key tables to export individually
KEY_TABLES=("movies" "episodes" "users" "view_history" "watchlist" "comments")

for table in "${KEY_TABLES[@]}"; do
    echo "Exporting table: $table"
    TABLE_FILE="$TABLES_DIR/${table}_data.sql"
    
    # Check if table exists and has data
    ROW_COUNT=$($LOCAL_PSQL_CMD -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs || echo "0")
    
    if [ "$ROW_COUNT" -gt 0 ]; then
        if $PG_DUMP_CMD $DUMP_PARAMS --data-only --no-owner --no-privileges --column-inserts -t "$table" -d filmflex > "$TABLE_FILE"; then
            echo "  ✅ $table: $ROW_COUNT rows exported"
        else
            echo "  ❌ $table: Export failed"
        fi
    else
        echo "  ⚠️  $table: No data to export"
    fi
done

log "Individual tables exported to: $TABLES_DIR"

# Step 7: Create import scripts
echo -e "\n${BLUE}📜 Creating import scripts...${NC}"

# Create VPS import script
VPS_IMPORT_SCRIPT="$SHARED_DIR/import_to_vps_$TIMESTAMP.sh"
cat > "$VPS_IMPORT_SCRIPT" << EOF
#!/bin/bash
# VPS Import Script - Generated $(date)
# Run this script on your VPS to import the database

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "\${GREEN}✅ \$1\${NC}"; }
error() { echo -e "\${RED}❌ \$1\${NC}"; }

echo -e "\${BLUE}🗄️ PhimGG VPS Database Import\${NC}"
echo "Generated from local export: $TIMESTAMP"
echo ""

# Check if Docker container is running
if ! docker ps | grep -q "filmflex-postgres"; then
    error "filmflex-postgres container is not running!"
    echo "Start it with: docker-compose -f docker-compose.prod.yml up -d postgres"
    exit 1
fi

log "PostgreSQL container is running"

# Clear existing data (optional - uncomment if needed)
# echo "Clearing existing data..."
# docker exec -i filmflex-postgres psql -U filmflex -d filmflex -c "
# TRUNCATE TABLE episodes, movies, users, view_history, watchlist, comments RESTART IDENTITY CASCADE;
# "

# Import schema
echo "Importing schema..."
docker cp filmflex_schema.sql filmflex-postgres:/tmp/
docker exec -i filmflex-postgres psql -U filmflex -d filmflex -f /tmp/filmflex_schema.sql

# Import data
echo "Importing data..."
docker cp filmflex_data_clean_$TIMESTAMP.sql filmflex-postgres:/tmp/
docker exec -i filmflex-postgres psql -U filmflex -d filmflex -f /tmp/filmflex_data_clean_$TIMESTAMP.sql

# Verify import
echo "Verifying import..."
docker exec -i filmflex-postgres psql -U filmflex -d filmflex -c "
SELECT 
  (SELECT COUNT(*) FROM movies) as movies,
  (SELECT COUNT(*) FROM episodes) as episodes,
  (SELECT COUNT(*) FROM users) as users;
"

log "Database import completed!"
EOF

chmod +x "$VPS_IMPORT_SCRIPT"
log "VPS import script created: $VPS_IMPORT_SCRIPT"

# Create Docker import script
DOCKER_IMPORT_SCRIPT="$SHARED_DIR/import_to_docker_$TIMESTAMP.sh"
cat > "$DOCKER_IMPORT_SCRIPT" << EOF
#!/bin/bash
# Docker Import Script - Generated $(date)
# Run this script locally to import to your Docker container

CONTAINER_NAME="filmflex-postgres"
DB_USER="filmflex"
DB_NAME="filmflex"

if ! docker ps | grep -q "\$CONTAINER_NAME"; then
    echo "❌ \$CONTAINER_NAME container is not running!"
    exit 1
fi

echo "📋 Importing schema..."
docker cp filmflex_schema.sql \$CONTAINER_NAME:/tmp/
docker exec \$CONTAINER_NAME psql -U \$DB_USER -d \$DB_NAME -f /tmp/filmflex_schema.sql

echo "💾 Importing data..."
docker cp filmflex_data_clean_$TIMESTAMP.sql \$CONTAINER_NAME:/tmp/
docker exec \$CONTAINER_NAME psql -U \$DB_USER -d \$DB_NAME -f /tmp/filmflex_data_clean_$TIMESTAMP.sql

echo "✅ Import completed!"
EOF

chmod +x "$DOCKER_IMPORT_SCRIPT"
log "Docker import script created: $DOCKER_IMPORT_SCRIPT"

# Step 8: Create verification script
VERIFY_SCRIPT="$SHARED_DIR/verify_database_$TIMESTAMP.sh"
cat > "$VERIFY_SCRIPT" << EOF
#!/bin/bash
# Database Verification Script

echo "🔍 Verifying database content..."

# For Docker container
if docker ps | grep -q "filmflex-postgres"; then
    echo "Docker PostgreSQL verification:"
    docker exec filmflex-postgres psql -U filmflex -d filmflex -c "
    SELECT 
        'movies' as table_name, COUNT(*) as row_count FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL  
    SELECT 'users', COUNT(*) FROM users
    UNION ALL
    SELECT 'view_history', COUNT(*) FROM view_history
    UNION ALL
    SELECT 'watchlist', COUNT(*) FROM watchlist
    ORDER BY table_name;
    "
fi

echo ""
echo "Expected counts from local export:"
echo "Movies: $MOVIES_COUNT"
echo "Episodes: $EPISODES_COUNT" 
echo "Users: $USERS_COUNT"
EOF

chmod +x "$VERIFY_SCRIPT"
log "Verification script created: $VERIFY_SCRIPT"

# Step 9: Summary
echo -e "\n${BLUE}📋 Export Summary${NC}"
echo "================="
echo "✅ Schema exported: filmflex_schema.sql (updated)"
echo "✅ Complete data: filmflex_complete_data_$TIMESTAMP.sql"
echo "✅ Clean data: filmflex_data_clean_$TIMESTAMP.sql"
echo "✅ Individual tables: tables_$TIMESTAMP/"
echo "✅ VPS import script: import_to_vps_$TIMESTAMP.sh"
echo "✅ Docker import script: import_to_docker_$TIMESTAMP.sh"
echo "✅ Verification script: verify_database_$TIMESTAMP.sh"
echo ""

echo -e "${GREEN}🎉 Export completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Upload the shared/ folder to your VPS"
echo "2. Run the import script on your VPS:"
echo "   ./shared/import_to_vps_$TIMESTAMP.sh"
echo "3. Verify the import:"
echo "   ./shared/verify_database_$TIMESTAMP.sh"
echo ""

# Show file sizes
echo -e "${BLUE}📊 Generated Files:${NC}"
ls -lah "$SHARED_DIR" | grep "$TIMESTAMP"
echo ""

log "🚀 Ready for VPS deployment!"