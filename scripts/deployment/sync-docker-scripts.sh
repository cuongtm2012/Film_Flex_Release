#!/bin/bash

# PhimGG Docker Scripts Sync Script
# This script copies the latest import scripts to the running Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
APP_CONTAINER="filmflex-app"

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

print_banner() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "    PhimGG Docker Scripts Sync"
    echo "======================================================"
    echo -e "${NC}"
    echo "Project Root: $PROJECT_ROOT"
    echo "Target Container: $APP_CONTAINER"
    echo ""
}

# Check if Docker container is running
check_container() {
    log "Checking if Docker container '$APP_CONTAINER' is running..."
    
    if ! docker ps | grep -q "$APP_CONTAINER"; then
        error "Container '$APP_CONTAINER' is not running!"
        echo "Start it with: docker-compose up -d app"
        return 1
    fi
    
    success "Container '$APP_CONTAINER' is running"
    return 0
}

# Sync import scripts to container
sync_import_scripts() {
    log "Syncing import scripts to container..."
    
    # Main import script
    if [ -f "$PROJECT_ROOT/scripts/data/import-movies-docker.cjs" ]; then
        if docker cp "$PROJECT_ROOT/scripts/data/import-movies-docker.cjs" "$APP_CONTAINER:/app/scripts/data/"; then
            success "Copied import-movies-docker.cjs ($(du -h "$PROJECT_ROOT/scripts/data/import-movies-docker.cjs" | cut -f1))"
        else
            error "Failed to copy import-movies-docker.cjs"
            return 1
        fi
    else
        warning "import-movies-docker.cjs not found in local scripts/data/"
    fi
    
    # Batch import script
    if [ -f "$PROJECT_ROOT/scripts/data/batch-import.sh" ]; then
        if docker cp "$PROJECT_ROOT/scripts/data/batch-import.sh" "$APP_CONTAINER:/app/scripts/data/"; then
            success "Copied batch-import.sh"
        else
            warning "Failed to copy batch-import.sh"
        fi
    else
        log "batch-import.sh not found (optional)"
    fi
    
    # Other import utilities
    if [ -f "$PROJECT_ROOT/scripts/data/import-movies-sql.cjs" ]; then
        if docker cp "$PROJECT_ROOT/scripts/data/import-movies-sql.cjs" "$APP_CONTAINER:/app/scripts/data/"; then
            success "Copied import-movies-sql.cjs"
        else
            warning "Failed to copy import-movies-sql.cjs"
        fi
    else
        log "import-movies-sql.cjs not found (optional)"
    fi
}

# Make scripts executable in container
make_scripts_executable() {
    log "Making scripts executable in container..."
    
    docker exec "$APP_CONTAINER" sh -c "
        chmod +x /app/scripts/data/*.sh 2>/dev/null || true
        chmod +x /app/scripts/data/*.cjs 2>/dev/null || true
    "
    
    success "Scripts made executable"
}

# Verify sync was successful
verify_sync() {
    log "Verifying sync was successful..."
    
    echo ""
    log "Files in container scripts/data directory:"
    docker exec "$APP_CONTAINER" ls -la scripts/data/ || {
        error "Failed to list container scripts directory"
        return 1
    }
    
    echo ""
    success "Sync verification completed"
}

# Create container directories if they don't exist
ensure_directories() {
    log "Ensuring required directories exist in container..."
    
    docker exec "$APP_CONTAINER" sh -c "
        mkdir -p /app/scripts/data
        mkdir -p /app/logs
    "
    
    success "Container directories ready"
}

# Main execution
main() {
    print_banner
    
    if ! check_container; then
        exit 1
    fi
    
    ensure_directories
    sync_import_scripts
    make_scripts_executable
    verify_sync
    
    echo ""
    success "Docker scripts sync completed successfully!"
    echo ""
    log "You can now run your import scripts:"
    log "  ./import-docker-movies.sh"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    "verify")
        print_banner
        check_container && verify_sync
        ;;
    "clean")
        print_banner
        if check_container; then
            log "Cleaning container scripts directory..."
            docker exec "$APP_CONTAINER" sh -c "rm -f /app/scripts/data/*"
            success "Container scripts directory cleaned"
        fi
        ;;
    *)
        main
        ;;
esac