#!/bin/bash
# VPS Import Script - Generated Sun Aug 17 20:04:40 +07 2025
# Run this script on your VPS to import the database

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}🗄️ PhimGG VPS Database Import${NC}"
echo "Generated from local export: 20250817_200439"
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
docker cp filmflex_data_clean_20250817_200439.sql filmflex-postgres:/tmp/
docker exec -i filmflex-postgres psql -U filmflex -d filmflex -f /tmp/filmflex_data_clean_20250817_200439.sql

# Verify import
echo "Verifying import..."
docker exec -i filmflex-postgres psql -U filmflex -d filmflex -c "
SELECT 
  (SELECT COUNT(*) FROM movies) as movies,
  (SELECT COUNT(*) FROM episodes) as episodes,
  (SELECT COUNT(*) FROM users) as users;
"

log "Database import completed!"
