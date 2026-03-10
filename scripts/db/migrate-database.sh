#!/bin/bash

# PhimGG Database Migration Script
# This script migrates data from local PostgreSQL to Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_CONTAINER="filmflex-postgres"
DOCKER_DB_USER="filmflex"
DOCKER_DB_NAME="filmflex"
BACKUP_DIR="./database_backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🗄️  PhimGG Database Migration Script${NC}"
echo "======================================"

# Function to print colored output
log() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Check if Docker container is running
echo -e "\n${BLUE}📋 Checking Docker container status...${NC}"
if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
    error "Docker container '$DOCKER_CONTAINER' is not running!"
    echo "Please start it with: docker-compose up -d"
    exit 1
fi
log "Docker container is running"

# Step 2: First, let's create the schema in the Docker container
echo -e "\n${BLUE}🏗️  Creating database schema in Docker container...${NC}"
if docker exec -i "$DOCKER_CONTAINER" psql -U "$DOCKER_DB_USER" -d "$DOCKER_DB_NAME" < shared/filmflex_schema.sql; then
    log "Database schema created successfully"
else
    error "Failed to create database schema"
    exit 1
fi

# Step 3: Check what local database you want to dump from
echo -e "\n${BLUE}🔍 Detecting local database...${NC}"

# Common PostgreSQL connection methods
LOCAL_METHODS=(
    "psql -U postgres -d filmflex"
    "psql -U filmflex -d filmflex" 
    "psql -d filmflex"
    "psql -U $(whoami) -d filmflex"
)

LOCAL_PSQL_CMD=""
for method in "${LOCAL_METHODS[@]}"; do
    echo "Testing: $method"
    if $method -c "SELECT 1;" >/dev/null 2>&1; then
        LOCAL_PSQL_CMD="$method"
        log "Found working connection: $method"
        break
    fi
done

if [ -z "$LOCAL_PSQL_CMD" ]; then
    warn "Could not auto-detect local database connection."
    echo "Please specify your local database connection manually:"
    echo "Examples:"
    echo "  - psql -U your_username -d filmflex"
    echo "  - psql -h localhost -U postgres -d filmflex"
    echo ""
    read -p "Enter your local psql command: " LOCAL_PSQL_CMD
    
    # Test the user-provided command
    if ! $LOCAL_PSQL_CMD -c "SELECT 1;" >/dev/null 2>&1; then
        error "Cannot connect to local database with: $LOCAL_PSQL_CMD"
        exit 1
    fi
fi

# Step 4: Check what tables have data locally
echo -e "\n${BLUE}📊 Checking local database content...${NC}"
TABLES_WITH_DATA=$(echo "
SELECT schemaname||'.'||tablename as table_name, n_tup_ins as row_count 
FROM pg_stat_user_tables 
WHERE n_tup_ins > 0 
ORDER BY n_tup_ins DESC;
" | $LOCAL_PSQL_CMD -t | head -10)

if [ -z "$TABLES_WITH_DATA" ]; then
    warn "No tables with data found in local database"
    echo "Available tables:"
    echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | $LOCAL_PSQL_CMD -t
    exit 1
fi

echo "Tables with data in your local database:"
echo "$TABLES_WITH_DATA"

# Step 5: Create data dump from local database
echo -e "\n${BLUE}💾 Creating data dump from local database...${NC}"
DUMP_FILE="$BACKUP_DIR/filmflex_data_$TIMESTAMP.sql"

# Extract connection parameters from LOCAL_PSQL_CMD
if [[ $LOCAL_PSQL_CMD == *"-U"* ]]; then
    USERNAME=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-U \([^ ]*\).*/\1/p')
    PG_DUMP_CMD="pg_dump -U $USERNAME"
else
    PG_DUMP_CMD="pg_dump"
fi

if [[ $LOCAL_PSQL_CMD == *"-h"* ]]; then
    HOST=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-h \([^ ]*\).*/\1/p')
    PG_DUMP_CMD="$PG_DUMP_CMD -h $HOST"
fi

# Create data-only dump
if $PG_DUMP_CMD --data-only --no-owner --no-privileges -d filmflex > "$DUMP_FILE"; then
    log "Data dump created: $DUMP_FILE"
else
    error "Failed to create data dump"
    exit 1
fi

# Step 6: Import data into Docker container
echo -e "\n${BLUE}📥 Importing data into Docker container...${NC}"
if docker exec -i "$DOCKER_CONTAINER" psql -U "$DOCKER_DB_USER" -d "$DOCKER_DB_NAME" < "$DUMP_FILE"; then
    log "Data imported successfully!"
else
    error "Failed to import data"
    exit 1
fi

# Step 7: Verify the migration
echo -e "\n${BLUE}🔍 Verifying data migration...${NC}"
echo "Checking row counts in Docker container:"

DOCKER_TABLES=(movies users episodes comments watchlist view_history movie_reactions)

for table in "${DOCKER_TABLES[@]}"; do
    count=$(docker exec "$DOCKER_CONTAINER" psql -U "$DOCKER_DB_USER" -d "$DOCKER_DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$count" -gt 0 ]; then
        log "$table: $count rows"
    else
        echo "$table: 0 rows"
    fi
done

echo -e "\n${GREEN}🎉 Database migration completed successfully!${NC}"
echo ""
echo "Summary:"
echo "- Schema created in Docker container"
echo "- Data exported from local database"
echo "- Data imported to Docker container"
echo "- Backup saved: $DUMP_FILE"
echo ""
echo "Your PhimGG Docker application now has all your local data!"
echo "Test your app at: http://localhost:5000"