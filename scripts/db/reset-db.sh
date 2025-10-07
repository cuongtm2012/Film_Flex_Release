#!/bin/bash

# Docker Database Reset Utility
# Quick reset and rebuild for development

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTAINER_NAME="filmflex-postgres"
COMPOSE_FILE="docker-compose.nginx-ssl.yml"

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Quick database reset
reset_db() {
    log "Resetting PhimGG database..."
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        log "Stopping and removing existing container..."
        docker compose -f "$COMPOSE_FILE" down postgres
    fi
    
    log "Removing database volume..."
    docker volume rm film_flex_release_postgres_data 2>/dev/null || true
    
    log "Starting fresh PostgreSQL container..."
    docker compose -f "$COMPOSE_FILE" up -d postgres
    
    log "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Wait for container to be healthy
    local attempt=1
    while [ $attempt -le 20 ]; do
        if docker exec "$CONTAINER_NAME" pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
            success "PostgreSQL is ready"
            break
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt 20 ]; then
        error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Initialize with schema and data
    if [ -f "./shared/filmflex_schema.sql" ]; then
        log "Loading schema..."
        docker cp "./shared/filmflex_schema.sql" "$CONTAINER_NAME:/tmp/schema.sql"
        docker exec "$CONTAINER_NAME" psql -U filmflex -d filmflex -f /tmp/schema.sql >/dev/null
        docker exec "$CONTAINER_NAME" rm /tmp/schema.sql
        success "Schema loaded"
    fi
    
    # Load data if available
    DATA_FILES=(
        "./shared/filmflex_data_clean_*.sql"
        "./shared/filmflex_complete_data_*.sql"
    )
    
    DATA_FILE=""
    for pattern in "${DATA_FILES[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                DATA_FILE="$file"
                break 2
            fi
        done
    done
    
    if [ -n "$DATA_FILE" ]; then
        log "Loading data from $(basename "$DATA_FILE")..."
        docker cp "$DATA_FILE" "$CONTAINER_NAME:/tmp/data.sql"
        docker exec "$CONTAINER_NAME" psql -U filmflex -d filmflex -f /tmp/data.sql >/dev/null
        docker exec "$CONTAINER_NAME" rm /tmp/data.sql
        success "Data loaded"
    fi
    
    success "Database reset completed successfully!"
}

case "${1:-reset}" in
    "reset"|"")
        reset_db
        ;;
    *)
        echo "Usage: $0 [reset]"
        echo "Quick database reset for development"
        ;;
esac