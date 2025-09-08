#!/bin/bash

# FilmFlex Master Database Manager
# Consolidated script for all database operations (local, Docker, production)

set -e

# Colors and logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SHARED_DIR="./shared"
BACKUP_DIR="./backups"

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️ $1${NC}"; }
highlight() { echo -e "${CYAN}🔧 $1${NC}"; }

print_banner() {
    echo -e "${PURPLE}"
    echo "========================================"
    echo "  FilmFlex Master Database Manager"
    echo "  Unified Database Operations"
    echo "========================================"
    echo -e "${NC}"
    echo "Timestamp: $TIMESTAMP"
    echo ""
}

# Auto-detect PostgreSQL connection
detect_local_postgres() {
    log "Detecting local PostgreSQL connection..."
    
    LOCAL_METHODS=(
        "psql -U postgres -d filmflex"
        "psql -U filmflex -d filmflex" 
        "psql -d filmflex"
        "psql -U $(whoami) -d filmflex"
        "psql -h localhost -U postgres -d filmflex"
    )
    
    for method in "${LOCAL_METHODS[@]}"; do
        if $method -c "SELECT 1;" >/dev/null 2>&1; then
            LOCAL_PSQL_CMD="$method"
            success "Local PostgreSQL found: $method"
            return 0
        fi
    done
    
    error "No local PostgreSQL connection found"
    return 1
}

# Check Docker container
check_docker_container() {
    local container_name="${1:-filmflex-postgres}"
    
    if docker ps | grep -q "$container_name"; then
        DOCKER_CONTAINER="$container_name"
        success "Docker container found: $container_name"
        return 0
    else
        warning "Docker container '$container_name' not running"
        return 1
    fi
}

# Export from local PostgreSQL
export_local_database() {
    log "Exporting from local PostgreSQL database..."
    
    if ! detect_local_postgres; then
        error "Cannot connect to local database"
        return 1
    fi
    
    mkdir -p "$SHARED_DIR" "$BACKUP_DIR"
    
    # Get database statistics
    highlight "Database Statistics:"
    $LOCAL_PSQL_CMD -c "
    SELECT 
        'movies' as table_name, COUNT(*) as rows FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    ORDER BY table_name;
    "
    
    # Export schema
    local schema_file="$SHARED_DIR/filmflex_schema_$TIMESTAMP.sql"
    if pg_dump $(echo $LOCAL_PSQL_CMD | sed 's/psql//' | sed 's/-d filmflex//') --schema-only --no-owner --no-privileges -d filmflex > "$schema_file"; then
        success "Schema exported: $schema_file"
        cp "$schema_file" "$SHARED_DIR/filmflex_schema.sql"
    else
        error "Schema export failed"
        return 1
    fi
    
    # Export data
    local data_file="$SHARED_DIR/filmflex_data_clean_$TIMESTAMP.sql"
    if pg_dump $(echo $LOCAL_PSQL_CMD | sed 's/psql//' | sed 's/-d filmflex//') --data-only --no-owner --no-privileges --column-inserts -d filmflex > "$data_file"; then
        success "Data exported: $data_file"
        local size=$(du -h "$data_file" | cut -f1)
        info "Export size: $size"
    else
        error "Data export failed"
        return 1
    fi
}

# Import to Docker container
import_to_docker() {
    local container_name="${1:-filmflex-postgres}"
    
    log "Importing to Docker container: $container_name"
    
    if ! check_docker_container "$container_name"; then
        error "Docker container not available"
        return 1
    fi
    
    # Find schema and data files
    local schema_file="$SHARED_DIR/filmflex_schema.sql"
    local data_file=""
    
    # Look for latest data file
    for pattern in "$SHARED_DIR/filmflex_data_clean_*.sql"; do
        if [ -f "$pattern" ]; then
            data_file="$pattern"
            break
        fi
    done
    
    if [ ! -f "$schema_file" ]; then
        error "Schema file not found: $schema_file"
        return 1
    fi
    
    # Import schema
    log "Importing schema..."
    docker cp "$schema_file" "$container_name:/tmp/schema.sql"
    if docker exec "$container_name" psql -U filmflex -d filmflex -f /tmp/schema.sql >/dev/null; then
        success "Schema imported successfully"
        docker exec "$container_name" rm /tmp/schema.sql
    else
        error "Schema import failed"
        return 1
    fi
    
    # Import data if available
    if [ -n "$data_file" ] && [ -f "$data_file" ]; then
        log "Importing data from $(basename "$data_file")..."
        docker cp "$data_file" "$container_name:/tmp/data.sql"
        if docker exec "$container_name" psql -U filmflex -d filmflex -f /tmp/data.sql >/dev/null; then
            success "Data imported successfully"
            docker exec "$container_name" rm /tmp/data.sql
        else
            warning "Data import had issues, but continuing..."
        fi
    else
        info "No data file found, schema-only import completed"
    fi
    
    # Update sequences
    log "Updating database sequences..."
    docker exec "$container_name" psql -U filmflex -d filmflex << 'EOF' >/dev/null
DO $$
DECLARE max_id INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movies') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM movies;
        PERFORM setval('movies_id_seq', max_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM users;
        PERFORM setval('users_id_seq', max_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'episodes') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM episodes;
        PERFORM setval('episodes_id_seq', max_id);
    END IF;
END$$;
EOF
    success "Sequences updated"
    
    # Verify import
    highlight "Import Verification:"
    docker exec "$container_name" psql -U filmflex -d filmflex -c "
    SELECT 
        'movies' as table_name, COUNT(*) as rows FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes  
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    ORDER BY table_name;
    "
}

# Migrate from local to Docker
migrate_local_to_docker() {
    log "Migrating from local PostgreSQL to Docker..."
    
    export_local_database
    import_to_docker "${1:-filmflex-postgres}"
    
    success "🎉 Migration completed successfully!"
}

# Create database backup
backup_database() {
    local source="${1:-docker}"
    local container_name="${2:-filmflex-postgres}"
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/filmflex_backup_$TIMESTAMP.sql"
    
    case "$source" in
        "local")
            log "Creating backup from local PostgreSQL..."
            if detect_local_postgres; then
                if pg_dump $(echo $LOCAL_PSQL_CMD | sed 's/psql//' | sed 's/-d filmflex//') -d filmflex > "$backup_file"; then
                    success "Local backup created: $backup_file"
                else
                    error "Local backup failed"
                    return 1
                fi
            fi
            ;;
        "docker")
            log "Creating backup from Docker container..."
            if check_docker_container "$container_name"; then
                if docker exec "$container_name" pg_dump -U filmflex -d filmflex > "$backup_file"; then
                    success "Docker backup created: $backup_file"
                else
                    error "Docker backup failed"
                    return 1
                fi
            fi
            ;;
    esac
    
    # Compress backup
    if gzip "$backup_file"; then
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        success "Backup compressed: ${backup_file}.gz ($size)"
    fi
}

# Show database status
show_status() {
    print_banner
    
    # Check local PostgreSQL
    highlight "Local PostgreSQL Status:"
    if detect_local_postgres 2>/dev/null; then
        $LOCAL_PSQL_CMD -c "
        SELECT 
            'movies' as table_name, COUNT(*) as rows FROM movies
        UNION ALL
        SELECT 'episodes', COUNT(*) FROM episodes
        UNION ALL
        SELECT 'users', COUNT(*) FROM users
        ORDER BY table_name;
        " 2>/dev/null || info "No data or connection issues"
    else
        info "Local PostgreSQL not available or no filmflex database"
    fi
    
    echo ""
    
    # Check Docker containers
    highlight "Docker Container Status:"
    local containers=("filmflex-postgres" "postgres")
    for container in "${containers[@]}"; do
        if check_docker_container "$container" 2>/dev/null; then
            docker exec "$container" psql -U filmflex -d filmflex -c "
            SELECT 
                'movies' as table_name, COUNT(*) as rows FROM movies
            UNION ALL
            SELECT 'episodes', COUNT(*) FROM episodes
            UNION ALL
            SELECT 'users', COUNT(*) FROM users
            ORDER BY table_name;
            " 2>/dev/null || info "Container found but connection issues"
            break
        fi
    done
    
    if ! docker ps | grep -q postgres; then
        info "No PostgreSQL Docker containers running"
    fi
    
    # Show available files
    echo ""
    highlight "Available Export Files:"
    if [ -d "$SHARED_DIR" ]; then
        ls -lah "$SHARED_DIR"/*.sql 2>/dev/null || info "No export files found"
    else
        info "No shared directory found"
    fi
}

# Main command handler
main() {
    case "${1:-help}" in
        "export")
            print_banner
            export_local_database
            ;;
        "import")
            print_banner
            import_to_docker "${2:-filmflex-postgres}"
            ;;
        "migrate")
            print_banner
            migrate_local_to_docker "${2:-filmflex-postgres}"
            ;;
        "backup")
            print_banner
            backup_database "${2:-docker}" "${3:-filmflex-postgres}"
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo -e "${CYAN}FilmFlex Master Database Manager${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC} $0 [command] [options]"
            echo ""
            echo -e "${YELLOW}Commands:${NC}"
            echo "  export                    - Export from local PostgreSQL to ./shared/"
            echo "  import [container]        - Import from ./shared/ to Docker container"
            echo "  migrate [container]       - Full migration from local to Docker"
            echo "  backup [source] [container] - Create database backup"
            echo "  status                    - Show all database status"
            echo "  help                      - Show this help"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0 export                 # Export local database"
            echo "  $0 import filmflex-postgres # Import to Docker"
            echo "  $0 migrate                # Full local to Docker migration"
            echo "  $0 backup docker          # Backup Docker database"
            echo "  $0 backup local           # Backup local database"
            echo "  $0 status                 # Check all databases"
            ;;
    esac
}

main "$@"