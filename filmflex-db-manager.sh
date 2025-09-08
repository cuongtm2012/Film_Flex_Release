#!/bin/bash

# FilmFlex Master Database Manager - Fixed Version
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
    echo "  Unified Database Operations (Fixed)"
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

# Check Docker container with better detection
check_docker_container() {
    local container_name="${1:-filmflex-postgres}"
    
    # Check if container exists and is running
    if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
        DOCKER_CONTAINER="$container_name"
        success "Docker container found: $container_name"
        
        # Test database connection
        if docker exec "$container_name" pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
            success "Database connection verified"
            return 0
        else
            warning "Container running but database not ready"
            return 1
        fi
    else
        warning "Docker container '$container_name' not running"
        
        # Show available PostgreSQL containers
        local postgres_containers=$(docker ps --format "{{.Names}}" | grep -i postgres || true)
        if [ -n "$postgres_containers" ]; then
            info "Available PostgreSQL containers:"
            echo "$postgres_containers"
        fi
        return 1
    fi
}

# Export from local PostgreSQL with better error handling
export_local_database() {
    log "Exporting from local PostgreSQL database..."
    
    if ! detect_local_postgres; then
        error "Cannot connect to local database"
        return 1
    fi
    
    mkdir -p "$SHARED_DIR" "$BACKUP_DIR"
    
    # Get database statistics
    highlight "Database Statistics:"
    if ! $LOCAL_PSQL_CMD -c "
    SELECT 
        'movies' as table_name, COUNT(*) as rows FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    ORDER BY table_name;
    " 2>/dev/null; then
        warning "Could not retrieve table statistics"
    fi
    
    # Extract connection parameters for pg_dump
    local dump_params=""
    if [[ $LOCAL_PSQL_CMD == *"-U"* ]]; then
        local username=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-U \([^ ]*\).*/\1/p')
        dump_params="$dump_params -U $username"
    fi
    if [[ $LOCAL_PSQL_CMD == *"-h"* ]]; then
        local host=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-h \([^ ]*\).*/\1/p')
        dump_params="$dump_params -h $host"
    fi
    
    # Export schema
    local schema_file="$SHARED_DIR/filmflex_schema_$TIMESTAMP.sql"
    log "Exporting schema to: $schema_file"
    if pg_dump $dump_params --schema-only --no-owner --no-privileges -d filmflex > "$schema_file"; then
        success "Schema exported: $schema_file"
        cp "$schema_file" "$SHARED_DIR/filmflex_schema.sql"
    else
        error "Schema export failed"
        return 1
    fi
    
    # Export data
    local data_file="$SHARED_DIR/filmflex_data_clean_$TIMESTAMP.sql"
    log "Exporting data to: $data_file"
    if pg_dump $dump_params --data-only --no-owner --no-privileges --column-inserts -d filmflex > "$data_file"; then
        success "Data exported: $data_file"
        local size=$(du -h "$data_file" | cut -f1)
        info "Export size: $size"
    else
        error "Data export failed"
        return 1
    fi
}

# Import to Docker container with improved error handling
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
    for pattern in "$SHARED_DIR"/filmflex_data_clean_*.sql; do
        if [ -f "$pattern" ]; then
            data_file="$pattern"
            break
        fi
    done
    
    if [ ! -f "$schema_file" ]; then
        error "Schema file not found: $schema_file"
        info "Available files in $SHARED_DIR:"
        ls -la "$SHARED_DIR"/*.sql 2>/dev/null || info "No SQL files found"
        return 1
    fi
    
    # Import schema
    log "Importing schema from: $(basename "$schema_file")"
    if docker cp "$schema_file" "$container_name:/tmp/schema.sql" && \
       docker exec "$container_name" psql -U filmflex -d filmflex -f /tmp/schema.sql >/dev/null 2>&1; then
        success "Schema imported successfully"
        docker exec "$container_name" rm -f /tmp/schema.sql
    else
        error "Schema import failed"
        return 1
    fi
    
    # Import data if available
    if [ -n "$data_file" ] && [ -f "$data_file" ]; then
        log "Importing data from: $(basename "$data_file")"
        local file_size=$(du -h "$data_file" | cut -f1)
        info "Data file size: $file_size"
        
        if docker cp "$data_file" "$container_name:/tmp/data.sql" && \
           docker exec "$container_name" psql -U filmflex -d filmflex -f /tmp/data.sql >/dev/null 2>&1; then
            success "Data imported successfully"
            docker exec "$container_name" rm -f /tmp/data.sql
        else
            warning "Data import had issues, but continuing..."
        fi
    else
        info "No data file found, schema-only import completed"
    fi
    
    # Update sequences
    log "Updating database sequences..."
    docker exec "$container_name" psql -U filmflex -d filmflex << 'EOF' >/dev/null 2>&1
DO $$
DECLARE max_id INTEGER;
BEGIN
    -- Update sequences for all main tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movies') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM movies;
        PERFORM setval('movies_id_seq', max_id);
        RAISE NOTICE 'Updated movies sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM users;
        PERFORM setval('users_id_seq', max_id);
        RAISE NOTICE 'Updated users sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'episodes') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM episodes;
        PERFORM setval('episodes_id_seq', max_id);
        RAISE NOTICE 'Updated episodes sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM comments;
        PERFORM setval('comments_id_seq', max_id);
        RAISE NOTICE 'Updated comments sequence to %', max_id;
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
    UNION ALL
    SELECT 'comments', COUNT(*) FROM comments
    ORDER BY table_name;
    " 2>/dev/null || warning "Could not verify import"
}

# Migrate from local to Docker
migrate_local_to_docker() {
    log "Migrating from local PostgreSQL to Docker..."
    
    if export_local_database && import_to_docker "${1:-filmflex-postgres}"; then
        success "🎉 Migration completed successfully!"
    else
        error "Migration failed"
        return 1
    fi
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
                local dump_params=""
                if [[ $LOCAL_PSQL_CMD == *"-U"* ]]; then
                    local username=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-U \([^ ]*\).*/\1/p')
                    dump_params="$dump_params -U $username"
                fi
                if [[ $LOCAL_PSQL_CMD == *"-h"* ]]; then
                    local host=$(echo $LOCAL_PSQL_CMD | sed -n 's/.*-h \([^ ]*\).*/\1/p')
                    dump_params="$dump_params -h $host"
                fi
                
                if pg_dump $dump_params -d filmflex > "$backup_file"; then
                    success "Local backup created: $backup_file"
                else
                    error "Local backup failed"
                    return 1
                fi
            else
                return 1
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
            else
                return 1
            fi
            ;;
        *)
            error "Invalid source. Use 'local' or 'docker'"
            return 1
            ;;
    esac
    
    # Compress backup
    if gzip "$backup_file"; then
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        success "Backup compressed: ${backup_file}.gz ($size)"
    fi
}

# Show database status with better error handling
show_status() {
    print_banner
    
    # Check local PostgreSQL
    highlight "Local PostgreSQL Status:"
    if detect_local_postgres 2>/dev/null; then
        if ! $LOCAL_PSQL_CMD -c "
        SELECT 
            'movies' as table_name, COUNT(*) as rows FROM movies
        UNION ALL
        SELECT 'episodes', COUNT(*) FROM episodes
        UNION ALL
        SELECT 'users', COUNT(*) FROM users
        ORDER BY table_name;
        " 2>/dev/null; then
            info "Connected but could not retrieve table data"
        fi
    else
        info "Local PostgreSQL not available or no filmflex database"
    fi
    
    echo ""
    
    # Check Docker containers
    highlight "Docker Container Status:"
    local found_container=false
    local containers=("filmflex-postgres" "postgres")
    
    for container in "${containers[@]}"; do
        if check_docker_container "$container" 2>/dev/null; then
            found_container=true
            docker exec "$container" psql -U filmflex -d filmflex -c "
            SELECT 
                'movies' as table_name, COUNT(*) as rows FROM movies
            UNION ALL
            SELECT 'episodes', COUNT(*) FROM episodes
            UNION ALL
            SELECT 'users', COUNT(*) FROM users
            UNION ALL
            SELECT 'comments', COUNT(*) FROM comments
            ORDER BY table_name;
            " 2>/dev/null || info "Container found but could not retrieve data"
            break
        fi
    done
    
    if ! $found_container; then
        info "No PostgreSQL Docker containers running"
        
        # Show available containers
        local all_containers=$(docker ps --format "{{.Names}}" | head -5)
        if [ -n "$all_containers" ]; then
            info "Available containers:"
            echo "$all_containers"
        fi
    fi
    
    # Show available files
    echo ""
    highlight "Available Export Files:"
    if [ -d "$SHARED_DIR" ]; then
        local sql_files=$(ls -1 "$SHARED_DIR"/*.sql 2>/dev/null | head -5)
        if [ -n "$sql_files" ]; then
            ls -lah "$SHARED_DIR"/*.sql | head -5
        else
            info "No SQL export files found in $SHARED_DIR"
        fi
    else
        info "Shared directory not found: $SHARED_DIR"
    fi
    
    # Show backups
    if [ -d "$BACKUP_DIR" ]; then
        local backup_files=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -3)
        if [ -n "$backup_files" ]; then
            echo ""
            highlight "Recent Backups:"
            ls -lah "$BACKUP_DIR"/*.sql.gz | head -3
        fi
    fi
}

# Main command handler with improved help
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
        "status"|"info")
            show_status
            ;;
        "test")
            print_banner
            info "Testing database connections..."
            detect_local_postgres || true
            check_docker_container "filmflex-postgres" || true
            ;;
        "help"|*)
            echo -e "${CYAN}FilmFlex Master Database Manager (Fixed)${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC} $0 [command] [options]"
            echo ""
            echo -e "${YELLOW}Commands:${NC}"
            echo "  export                     - Export from local PostgreSQL to ./shared/"
            echo "  import [container]         - Import from ./shared/ to Docker container"
            echo "  migrate [container]        - Full migration from local to Docker"
            echo "  backup [source] [container] - Create database backup"
            echo "  status                     - Show all database status and files"
            echo "  test                       - Test all database connections"
            echo "  help                       - Show this help"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0 status                  # Check all databases"
            echo "  $0 test                    # Test connections only"
            echo "  $0 export                  # Export local database"
            echo "  $0 import filmflex-postgres # Import to Docker"
            echo "  $0 migrate                 # Full local to Docker migration"
            echo "  $0 backup docker           # Backup Docker database"
            echo "  $0 backup local            # Backup local database"
            echo ""
            echo -e "${YELLOW}Container Names:${NC}"
            echo "  filmflex-postgres (default), postgres, or specify your own"
            ;;
    esac
}

main "$@"