#!/bin/bash

# FilmFlex Master Database Manager - Updated for Current Architecture
# Consolidated script for all database operations (local, Docker, production)
# Updated to support OAuth authentication and comprehensive table structure

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
    echo "  Updated for Current Architecture"
    echo "========================================"
    echo -e "${NC}"
    echo "Timestamp: $TIMESTAMP"
    echo "OAuth Support: ✅ Google, Facebook"
    echo "RBAC System: ✅ Roles & Permissions"
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

# Enhanced database statistics with all current tables
get_database_statistics() {
    local connection_cmd="$1"
    
    highlight "📊 Database Statistics (Full Schema):"
    
    # Core tables
    if ! $connection_cmd -c "
    WITH table_stats AS (
        SELECT 'movies' as table_name, COUNT(*) as rows FROM movies
        UNION ALL
        SELECT 'episodes', COUNT(*) FROM episodes
        UNION ALL
        SELECT 'users', COUNT(*) FROM users
        UNION ALL
        SELECT 'comments', COUNT(*) FROM comments
        UNION ALL
        SELECT 'sessions', COUNT(*) FROM sessions
        UNION ALL
        SELECT 'watchlist', COUNT(*) FROM watchlist
        UNION ALL
        SELECT 'view_history', COUNT(*) FROM view_history
        UNION ALL
        SELECT 'roles', COUNT(*) FROM roles
        UNION ALL
        SELECT 'permissions', COUNT(*) FROM permissions
        UNION ALL
        SELECT 'role_permissions', COUNT(*) FROM role_permissions
        UNION ALL
        SELECT 'content_approvals', COUNT(*) FROM content_approvals
        UNION ALL
        SELECT 'audit_logs', COUNT(*) FROM audit_logs
        UNION ALL
        SELECT 'api_keys', COUNT(*) FROM api_keys
        UNION ALL
        SELECT 'analytics_events', COUNT(*) FROM analytics_events
        UNION ALL
        SELECT 'content_performance', COUNT(*) FROM content_performance
        UNION ALL
        SELECT 'user_comment_reactions', COUNT(*) FROM user_comment_reactions
        UNION ALL
        SELECT 'movie_reactions', COUNT(*) FROM movie_reactions
    )
    SELECT 
        table_name,
        rows,
        CASE 
            WHEN table_name IN ('movies', 'episodes', 'users', 'comments') THEN '🔥 Core'
            WHEN table_name IN ('sessions', 'watchlist', 'view_history') THEN '👤 User Data'
            WHEN table_name IN ('roles', 'permissions', 'role_permissions') THEN '🔐 RBAC'
            WHEN table_name IN ('api_keys', 'audit_logs', 'analytics_events') THEN '📊 Analytics'
            ELSE '🔧 Features'
        END as category
    FROM table_stats 
    ORDER BY category, table_name;
    " 2>/dev/null; then
        warning "Could not retrieve complete table statistics"
        
        # Fallback to basic stats
        $connection_cmd -c "
        SELECT 
            'movies' as table_name, COUNT(*) as rows FROM movies
        UNION ALL
        SELECT 'users', COUNT(*) FROM users
        UNION ALL
        SELECT 'episodes', COUNT(*) FROM episodes
        ORDER BY table_name;
        " 2>/dev/null || warning "Could not retrieve basic statistics"
    fi
    
    # OAuth statistics
    info "🔐 OAuth Integration Status:"
    $connection_cmd -c "
    SELECT 
        'Total Users' as metric, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'Google OAuth Users', COUNT(*) FROM users WHERE google_id IS NOT NULL
    UNION ALL
    SELECT 'Facebook OAuth Users', COUNT(*) FROM users WHERE facebook_id IS NOT NULL
    UNION ALL
    SELECT 'Local Auth Users', COUNT(*) FROM users WHERE password IS NOT NULL
    ORDER BY metric;
    " 2>/dev/null || info "OAuth statistics not available"
}

# Enhanced export with OAuth support
export_local_database() {
    log "Exporting from local PostgreSQL database..."
    
    if ! detect_local_postgres; then
        error "Cannot connect to local database"
        return 1
    fi
    
    mkdir -p "$SHARED_DIR" "$BACKUP_DIR"
    
    # Get enhanced database statistics
    get_database_statistics "$LOCAL_PSQL_CMD"
    
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
    
    # Export schema with OAuth and RBAC support
    local schema_file="$SHARED_DIR/filmflex_schema_$TIMESTAMP.sql"
    log "Exporting complete schema to: $schema_file"
    if pg_dump $dump_params --schema-only --no-owner --no-privileges -d filmflex > "$schema_file"; then
        success "Schema exported: $schema_file"
        cp "$schema_file" "$SHARED_DIR/filmflex_schema.sql"
        
        # Verify OAuth tables in schema
        if grep -q "google_id\|facebook_id" "$schema_file"; then
            success "✅ OAuth fields detected in schema"
        else
            warning "⚠️ OAuth fields not found in schema"
        fi
        
        if grep -q "roles\|permissions" "$schema_file"; then
            success "✅ RBAC system detected in schema"
        else
            warning "⚠️ RBAC tables not found in schema"
        fi
    else
        error "Schema export failed"
        return 1
    fi
    
    # Export data with proper OAuth handling
    local data_file="$SHARED_DIR/filmflex_data_clean_$TIMESTAMP.sql"
    log "Exporting data (including OAuth users) to: $data_file"
    
    # Enhanced export with sensitive data handling
    if pg_dump $dump_params --data-only --no-owner --no-privileges --column-inserts \
        --exclude-table-data=sessions \
        --exclude-table-data=audit_logs \
        --exclude-table-data=analytics_events \
        -d filmflex > "$data_file"; then
        success "Data exported: $data_file"
        local size=$(du -h "$data_file" | cut -f1)
        info "Export size: $size"
        info "ℹ️ Excluded sensitive tables: sessions, audit_logs, analytics_events"
    else
        error "Data export failed"
        return 1
    fi
    
    # Create OAuth-only export for testing
    local oauth_file="$SHARED_DIR/filmflex_oauth_users_$TIMESTAMP.sql"
    log "Creating OAuth users export..."
    if pg_dump $dump_params --data-only --no-owner --no-privileges --column-inserts \
        --table=users --where="google_id IS NOT NULL OR facebook_id IS NOT NULL" \
        -d filmflex > "$oauth_file"; then
        success "OAuth users exported: $oauth_file"
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
    log "Importing schema with OAuth and RBAC support..."
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
        log "Importing data with OAuth users..."
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
    
    # Update sequences for all tables
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
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roles') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM roles;
        PERFORM setval('roles_id_seq', max_id);
        RAISE NOTICE 'Updated roles sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'permissions') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM permissions;
        PERFORM setval('permissions_id_seq', max_id);
        RAISE NOTICE 'Updated permissions sequence to %', max_id;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM api_keys;
        PERFORM setval('api_keys_id_seq', max_id);
        RAISE NOTICE 'Updated api_keys sequence to %', max_id;
    END IF;
END$$;
EOF
    success "All sequences updated"
    
    # Enhanced verification
    verify_import "$container_name"
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

# Enhanced import verification with OAuth support
verify_import() {
    local container_name="$1"
    
    log "🔍 Verifying import with OAuth and RBAC support..."
    
    # Enhanced verification query
    docker exec "$container_name" psql -U filmflex -d filmflex << 'EOF'
-- Enhanced verification with OAuth and RBAC
WITH table_verification AS (
    SELECT 'movies' as table_name, COUNT(*) as rows FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    UNION ALL
    SELECT 'comments', COUNT(*) FROM comments
    UNION ALL
    SELECT 'sessions', COUNT(*) FROM sessions
    UNION ALL
    SELECT 'watchlist', COUNT(*) FROM watchlist
    UNION ALL
    SELECT 'view_history', COUNT(*) FROM view_history
    UNION ALL
    SELECT 'roles', COUNT(*) FROM roles
    UNION ALL
    SELECT 'permissions', COUNT(*) FROM permissions
    UNION ALL
    SELECT 'role_permissions', COUNT(*) FROM role_permissions
),
oauth_verification AS (
    SELECT 'Total Users' as metric, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'Google OAuth', COUNT(*) FROM users WHERE google_id IS NOT NULL
    UNION ALL
    SELECT 'Facebook OAuth', COUNT(*) FROM users WHERE facebook_id IS NOT NULL
    UNION ALL
    SELECT 'Local Auth', COUNT(*) FROM users WHERE password IS NOT NULL
)
SELECT '=== TABLE VERIFICATION ===' as section, '' as data, '' as extra
UNION ALL
SELECT table_name, rows::text, 
    CASE 
        WHEN table_name IN ('movies', 'episodes', 'users') AND rows > 0 THEN '✅'
        WHEN rows > 0 THEN '✅'
        ELSE '⚠️'
    END
FROM table_verification
UNION ALL
SELECT '', '', ''
UNION ALL
SELECT '=== OAUTH VERIFICATION ===' as section, '' as data, '' as extra
UNION ALL
SELECT metric, count::text, 
    CASE 
        WHEN metric = 'Total Users' AND count > 0 THEN '✅'
        WHEN count > 0 THEN '🔐'
        ELSE '⚪'
    END
FROM oauth_verification
ORDER BY section DESC, data;
EOF

    success "Import verification completed"
}

# Show database status with better error handling
show_status() {
    print_banner
    
    # Check local PostgreSQL
    highlight "🖥️ Local PostgreSQL Status:"
    if detect_local_postgres 2>/dev/null; then
        get_database_statistics "$LOCAL_PSQL_CMD"
    else
        info "Local PostgreSQL not available or no filmflex database"
    fi
    
    echo ""
    
    # Check Docker containers
    highlight "🐳 Docker Container Status:"
    local found_container=false
    local containers=("filmflex-postgres" "postgres")
    
    for container in "${containers[@]}"; do
        if check_docker_container "$container" 2>/dev/null; then
            found_container=true
            get_database_statistics "docker exec $container psql -U filmflex -d filmflex"
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
    
    # Show available files with OAuth info
    echo ""
    highlight "📁 Available Export Files:"
    if [ -d "$SHARED_DIR" ]; then
        local sql_files=$(ls -1 "$SHARED_DIR"/*.sql 2>/dev/null | head -5)
        if [ -n "$sql_files" ]; then
            for file in $sql_files; do
                local size=$(du -h "$file" 2>/dev/null | cut -f1)
                local has_oauth=""
                if grep -q "google_id\|facebook_id" "$file" 2>/dev/null; then
                    has_oauth=" 🔐"
                fi
                echo "$(basename "$file") ($size)$has_oauth"
            done
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
            highlight "💾 Recent Backups:"
            ls -lah "$BACKUP_DIR"/*.sql.gz | head -3
        fi
    fi
    
    echo ""
    highlight "🔧 Architecture Features:"
    info "✅ OAuth Support: Google, Facebook authentication"
    info "✅ RBAC System: Role-based access control"
    info "✅ Analytics: User behavior tracking"
    info "✅ Content Management: Approval workflow"
    info "✅ API Management: Key-based access control"
}

# Enhanced help with OAuth information
show_help() {
    echo -e "${CYAN}FilmFlex Master Database Manager (Current Architecture)${NC}"
    echo ""
    echo -e "${YELLOW}🔥 Features:${NC}"
    echo "  ✅ OAuth Support (Google, Facebook)"
    echo "  ✅ RBAC System (Roles & Permissions)"
    echo "  ✅ Analytics & Performance Tracking"
    echo "  ✅ Content Management & Moderation"
    echo "  ✅ API Key Management"
    echo ""
    echo -e "${YELLOW}Usage:${NC} $0 [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  export                     - Export from local PostgreSQL (with OAuth data)"
    echo "  import [container]         - Import to Docker container (OAuth-aware)"
    echo "  migrate [container]        - Full migration with OAuth and RBAC support"
    echo "  backup [source] [container] - Create complete database backup"
    echo "  status                     - Show comprehensive database status"
    echo "  test                       - Test all database connections"
    echo "  help                       - Show this help"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 status                  # Check all databases with OAuth info"
    echo "  $0 test                    # Test connections"
    echo "  $0 export                  # Export with OAuth users"
    echo "  $0 import filmflex-postgres # Import with full schema"
    echo "  $0 migrate                 # Complete migration"
    echo ""
    echo -e "${YELLOW}Container Names:${NC}"
    echo "  filmflex-postgres (default) - matches docker-compose.yml"
    echo ""
    echo -e "${YELLOW}Data Handling:${NC}"
    echo "  🔐 OAuth users preserved (google_id, facebook_id)"
    echo "  🛡️ Sensitive data excluded (sessions, audit_logs)"
    echo "  📊 Analytics data optional"
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
            show_help
            ;;
    esac
}

main "$@"