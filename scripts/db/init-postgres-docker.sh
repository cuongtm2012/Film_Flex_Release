#!/bin/bash

# Docker PostgreSQL Initialization Script
# This script runs inside the PostgreSQL container during startup

set -e

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] POSTGRES INIT: $1${NC}" >&2; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" >&2; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1${NC}" >&2; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2; }

log "Starting FilmFlex PostgreSQL initialization..."

# Database connection parameters
DB_NAME="${POSTGRES_DB:-filmflex}"
DB_USER="${POSTGRES_USER:-filmflex}"
DB_PASSWORD="${POSTGRES_PASSWORD:-filmflex2024}"

log "Database: $DB_NAME, User: $DB_USER"

# Create admin user if not exists
create_admin_user() {
    log "Creating admin user if not exists..."
    
    psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
		-- Create admin user if users table exists
		DO \$\$
		BEGIN
		    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
		        -- Check if admin user already exists
		        IF NOT EXISTS (SELECT FROM users WHERE username = 'admin') THEN
		            INSERT INTO users (username, email, password, role, status, created_at, updated_at)
		            VALUES (
		                'admin',
		                'admin@filmflex.com',
		                '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
		                'admin',
		                'active',
		                NOW(),
		                NOW()
		            );
		            RAISE NOTICE 'Admin user created (username: admin, password: password)';
		        ELSE
		            RAISE NOTICE 'Admin user already exists';
		        END IF;
		    ELSE
		        RAISE NOTICE 'Users table does not exist, skipping admin user creation';
		    END IF;
		EXCEPTION
		    WHEN OTHERS THEN
		        RAISE NOTICE 'Could not create admin user: %', SQLERRM;
		END
		\$\$;
	EOSQL
}

# Update sequences to prevent ID conflicts
update_sequences() {
    log "Updating database sequences..."
    
    psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<-EOSQL
		-- Update sequences for all tables with id columns
		DO \$\$
		DECLARE
		    max_id INTEGER;
		    seq_name TEXT;
		BEGIN
		    -- Update sequences for all tables with id columns
		    FOR seq_name IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
		    LOOP
		        BEGIN
		            -- Extract table name from sequence name (assuming format: tablename_id_seq)
		            DECLARE
		                table_name TEXT := replace(seq_name, '_id_seq', '');
		            BEGIN
		                IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
		                    EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM %I', table_name) INTO max_id;
		                    EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id);
		                    RAISE NOTICE 'Updated sequence % to %', seq_name, max_id;
		                END IF;
		            END;
		        EXCEPTION
		            WHEN OTHERS THEN
		                RAISE NOTICE 'Could not update sequence %: %', seq_name, SQLERRM;
		        END;
		    END LOOP;
		END
		\$\$;
	EOSQL
    
    log "Database sequences updated"
}

# Verify database setup
verify_setup() {
    log "Verifying database setup..."
    
    # Check tables
    TABLE_COUNT=$(psql -t --username "$DB_USER" --dbname "$DB_NAME" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    log "Total tables: $TABLE_COUNT"
    
    # Show data counts if tables exist
    if [ $TABLE_COUNT -gt 0 ]; then
        log "Data summary:"
        psql --username "$DB_USER" --dbname "$DB_NAME" -c "
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movies')
                THEN (SELECT 'movies: ' || COUNT(*) FROM movies)
                ELSE 'movies: table not found'
            END
        UNION ALL
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'episodes')
                THEN (SELECT 'episodes: ' || COUNT(*) FROM episodes)
                ELSE 'episodes: table not found'
            END
        UNION ALL
        SELECT 
            CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
                THEN (SELECT 'users: ' || COUNT(*) FROM users)
                ELSE 'users: table not found'
            END;
        " 2>/dev/null || info "Could not retrieve data counts"
    fi
    
    log "Database verification completed"
}

# Main initialization process
main() {
    log "=== FilmFlex PostgreSQL Initialization Started ==="
    
    # Wait a moment for PostgreSQL to be fully ready
    sleep 2
    
    # Create admin user if users table exists
    create_admin_user
    
    # Update sequences
    update_sequences
    
    # Verify setup
    verify_setup
    
    log "=== FilmFlex PostgreSQL Initialization Completed ==="
}

# Only run if this script is executed directly (not sourced)
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi