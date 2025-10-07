#!/bin/bash

# PhimGG Docker PostgreSQL Manager
# Consolidated script for all PostgreSQL operations in Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
CONTAINER_NAME="filmflex-postgres"
DB_NAME="filmflex"
DB_USER="filmflex"
DB_PASSWORD="filmflex2024"
COMPOSE_FILE="docker-compose.nginx-ssl.yml"

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️ $1${NC}"; }
highlight() { echo -e "${CYAN}🔧 $1${NC}"; }

print_banner() {
    echo -e "${PURPLE}"
    echo "========================================"
    echo "  PhimGG Docker PostgreSQL Manager"
    echo "  Unified Database Management for Docker"
    echo "========================================"
    echo -e "${NC}"
    echo "Container: $CONTAINER_NAME"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
}

# Check if Docker container is running
check_container() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        return 0
    else
        return 1
    fi
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    log "Waiting for PostgreSQL container to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            success "PostgreSQL is ready"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "PostgreSQL container not ready after $max_attempts attempts"
    return 1
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 as test;" >/dev/null 2>&1; then
        success "Database connection successful"
        return 0
    else
        error "Database connection failed"
        return 1
    fi
}

# Initialize database schema
init_schema() {
    log "Initializing database schema..."
    
    # Look for schema files in order of preference
    SCHEMA_FILES=(
        "./shared/filmflex_schema.sql"
        "./shared/01_filmflex_schema.sql" 
        "./shared/filmflex_schema_*.sql"
    )
    
    SCHEMA_FILE=""
    for pattern in "${SCHEMA_FILES[@]}"; do
        for file in $pattern; do
            if [ -f "$file" ]; then
                SCHEMA_FILE="$file"
                break 2
            fi
        done
    done
    
    if [ -n "$SCHEMA_FILE" ]; then
        log "Using schema file: $SCHEMA_FILE"
        docker cp "$SCHEMA_FILE" "$CONTAINER_NAME:/tmp/schema.sql"
        
        if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/schema.sql; then
            success "Database schema created successfully"
            docker exec "$CONTAINER_NAME" rm /tmp/schema.sql
        else
            error "Failed to create database schema"
            return 1
        fi
    else
        error "No schema file found in ./shared/ directory"
        return 1
    fi
}

# Import data
import_data() {
    log "Importing database data..."
    
    # Look for data files in order of preference
    DATA_FILES=(
        "./shared/filmflex_data_clean_*.sql"
        "./shared/02_filmflex_data.sql"
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
        log "Using data file: $DATA_FILE"
        
        # Get file size for progress indication
        FILE_SIZE=$(du -h "$DATA_FILE" | cut -f1)
        log "Data file size: $FILE_SIZE"
        
        docker cp "$DATA_FILE" "$CONTAINER_NAME:/tmp/data.sql"
        
        if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/data.sql; then
            success "Database data imported successfully"
            docker exec "$CONTAINER_NAME" rm /tmp/data.sql
            
            # Update sequences after data import
            update_sequences
        else
            warning "Data import had issues, but continuing..."
        fi
    else
        info "No data files found. Database initialized with empty tables."
    fi
}

# Update database sequences
update_sequences() {
    log "Updating database sequences..."
    
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    -- Update all sequences to prevent ID conflicts
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movies') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM movies;
        PERFORM setval('movies_id_seq', max_id);
        RAISE NOTICE 'Updated movies sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'episodes') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM episodes;
        PERFORM setval('episodes_id_seq', max_id);
        RAISE NOTICE 'Updated episodes sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM users;
        PERFORM setval('users_id_seq', max_id);
        RAISE NOTICE 'Updated users sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM comments;
        PERFORM setval('comments_id_seq', max_id);
        RAISE NOTICE 'Updated comments sequence to %', max_id;
    END IF;
END$$;
EOF
    
    if [ $? -eq 0 ]; then
        success "Database sequences updated"
    else
        warning "Sequence update had issues"
    fi
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    local backup_dir="./backups"
    mkdir -p "$backup_dir"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/filmflex_backup_$timestamp.sql"
    
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$backup_file"; then
        success "Backup created: $backup_file"
        
        # Compress backup
        if gzip "$backup_file"; then
            success "Backup compressed: ${backup_file}.gz"
        fi
        
        # Show backup size
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        info "Backup size: $size"
    else
        error "Backup creation failed"
        return 1
    fi
}

# Export database for migration
export_database() {
    log "Exporting database for migration..."
    
    local export_dir="./shared"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    # Export schema
    local schema_file="$export_dir/filmflex_schema_$timestamp.sql"
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --schema-only --no-owner --no-privileges > "$schema_file"; then
        success "Schema exported: $schema_file"
        cp "$schema_file" "$export_dir/filmflex_schema.sql"
    fi
    
    # Export clean data
    local data_file="$export_dir/filmflex_data_clean_$timestamp.sql"
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --data-only --no-owner --no-privileges --column-inserts > "$data_file"; then
        success "Data exported: $data_file"
        
        # Show export sizes
        local schema_size=$(du -h "$schema_file" | cut -f1)
        local data_size=$(du -h "$data_file" | cut -f1)
        info "Schema size: $schema_size, Data size: $data_size"
    fi
}

# Show database status and statistics
show_status() {
    log "Checking database status..."
    
    if ! check_container; then
        error "PostgreSQL container '$CONTAINER_NAME' is not running"
        info "Start it with: docker compose -f $COMPOSE_FILE up -d postgres"
        return 1
    fi
    
    success "PostgreSQL container is running"
    
    # Show container info
    highlight "Container Information:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$CONTAINER_NAME"
    
    echo ""
    
    # Test connection
    if test_connection; then
        # Show database stats
        highlight "Database Statistics:"
        docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movies')
                THEN (SELECT 'Movies: ' || COUNT(*) FROM movies)
                ELSE 'Movies: table not found'
            END as movies_count
        UNION ALL
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'episodes')
                THEN (SELECT 'Episodes: ' || COUNT(*) FROM episodes)
                ELSE 'Episodes: table not found'
            END
        UNION ALL
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
                THEN (SELECT 'Users: ' || COUNT(*) FROM users)
                ELSE 'Users: table not found'
            END;
        " 2>/dev/null || warning "Could not retrieve database statistics"
        
        # Show table info
        echo ""
        highlight "Tables:"
        docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
        " 2>/dev/null || warning "Could not retrieve table information"
    fi
}

# Reset database (drop and recreate)
reset_database() {
    warning "This will completely reset the database and all data will be lost!"
    echo -n "Are you sure you want to continue? (yes/no): "
    read confirmation
    
    if [ "$confirmation" != "yes" ]; then
        info "Database reset cancelled"
        return 0
    fi
    
    log "Resetting database..."
    
    # Drop and recreate database
    docker exec "$CONTAINER_NAME" psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec "$CONTAINER_NAME" psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    success "Database reset completed"
    
    # Reinitialize
    init_schema
    info "Database reset and reinitialized with schema"
}

# Show logs
show_logs() {
    log "Showing PostgreSQL container logs..."
    docker logs --tail 50 -f "$CONTAINER_NAME"
}

# Interactive SQL shell
sql_shell() {
    log "Opening interactive PostgreSQL shell..."
    info "Type \\q to exit"
    docker exec -it "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
}

# Main function
main() {
    case "${1:-help}" in
        "init"|"setup")
            print_banner
            if ! check_container; then
                error "PostgreSQL container not running. Start with: docker compose -f $COMPOSE_FILE up -d postgres"
                exit 1
            fi
            wait_for_postgres
            init_schema
            import_data
            show_status
            ;;
        "status"|"info")
            print_banner
            show_status
            ;;
        "test")
            if check_container && wait_for_postgres; then
                test_connection
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "backup")
            if check_container && wait_for_postgres; then
                create_backup
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "export")
            if check_container && wait_for_postgres; then
                export_database
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "reset")
            if check_container && wait_for_postgres; then
                reset_database
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "logs")
            show_logs
            ;;
        "shell"|"psql")
            if check_container; then
                sql_shell
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "sequences")
            if check_container && wait_for_postgres; then
                update_sequences
            else
                error "Container not available"
                exit 1
            fi
            ;;
        "help"|*)
            echo -e "${CYAN}PhimGG Docker PostgreSQL Manager${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC} $0 [command]"
            echo ""
            echo -e "${YELLOW}Commands:${NC}"
            echo "  init      - Initialize database with schema and data"
            echo "  status    - Show database status and statistics"
            echo "  test      - Test database connection"
            echo "  backup    - Create compressed database backup"
            echo "  export    - Export database for migration"
            echo "  reset     - Reset database (WARNING: deletes all data)"
            echo "  logs      - Show PostgreSQL container logs"
            echo "  shell     - Open interactive PostgreSQL shell"
            echo "  sequences - Update database sequences"
            echo "  help      - Show this help message"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  $0 init     # Setup database with schema and data"
            echo "  $0 status   # Check database status"
            echo "  $0 backup   # Create backup"
            echo "  $0 shell    # Open psql shell"
            ;;
    esac
}

main "$@"