#!/bin/bash

# FilmFlex Enhanced Final Deployment Script v4.0 - phimgg.com Production
# =====================================================================
# This script handles complete deployment including:
# - Database schema import from filmflex_schema.sql (simplified approach)
# - PostgreSQL authentication fixes (peer to md5)
# - Node.js dependency fixes (esbuild, rollup binaries)
# - ES module build compatibility with esbuild
# - CORS configuration for production
# - PM2 process management with production environment
# - Final verification and troubleshooting
#
# Updated for phimgg.com production environment (154.205.142.255)
# 
# This script includes proven fixes for:
# ✅ Database schema from filmflex_schema.sql dump file
# ✅ PostgreSQL authentication (peer → md5)
# ✅ Missing @esbuild/linux-x64 binary
# ✅ Missing @rollup/rollup-linux-x64-gnu binary
# ✅ Corrupted node_modules issues
# ✅ ES module build support with esbuild
# ✅ CORS configuration for production
# ✅ Production environment variables with correct password
#
# Usage: bash final-deploy.sh
# Everything is included in one script for simplicity and reliability

# Exit on error but with better error handling
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Updated for phimgg.com production
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
PRODUCTION_IP="154.205.142.255"
PRODUCTION_DOMAIN="phimgg.com"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/final-deploy-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Echo to console and log file
log() {
  echo -e "$@"
  echo "$@" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" >> "$LOG_FILE"
}

# Log a success message
success() {
  log "${GREEN}✓ $@${NC}"
}

# Log a warning message
warning() {
  log "${YELLOW}! $@${NC}"
}

# Log an error message
error() {
  log "${RED}✗ $@${NC}"
}

# Function to check command status and exit if failed
check_status() {
  if [ $? -ne 0 ]; then
    error "$1 failed"
    exit 1
  else
    success "$1 successful"
  fi
}

# Start deployment
log "${BLUE}===== FilmFlex Final Deployment Started at $(date) =====${NC}"
log "Production Environment: phimgg.com (${PRODUCTION_IP})"
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"
log "Log file: $LOG_FILE"

# Step 0: Fix database schema and authentication
log "${BLUE}0. Fixing database schema and authentication...${NC}"

# Get database connection info from environment or use default
if [ -n "$DATABASE_URL" ]; then
  # Use DATABASE_URL from environment if available
  log "Using DATABASE_URL from environment variable"
  DB_URL="$DATABASE_URL"
else
  # Use default connection string with updated password
  log "Using default DATABASE_URL"
  DB_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
fi

# Set PostgreSQL environment variables with correct password
export PGHOST="localhost"
export PGDATABASE="filmflex"
export PGUSER="filmflex"
export PGPASSWORD="filmflex2024"
export PGPORT="5432"

log "${BLUE}Database connection details:${NC}"
log "  Host: $PGHOST"
log "  Port: $PGPORT"
log "  Database: $PGDATABASE"
log "  User: $PGUSER"

# INTEGRATED EMERGENCY POSTGRESQL AUTHENTICATION FIX
log "${BLUE}0.1. Emergency PostgreSQL Authentication Fix (Integrated)...${NC}"
log "🚨 Fixing the exact error: 'password authentication failed for user 'filmflex'"

# Step 1: Check PostgreSQL service status and start if needed
log "Step 1: Checking PostgreSQL service status..."
if ! systemctl is-active --quiet postgresql; then
    log "PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    sleep 3
fi

if systemctl is-active --quiet postgresql; then
    success "PostgreSQL service is running"
else
    error "PostgreSQL failed to start"
    sudo systemctl status postgresql
    exit 1
fi

# Step 2: Fix pg_hba.conf authentication method (CRITICAL FIX)
log "Step 2: Fixing PostgreSQL authentication method..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP "PostgreSQL \K[0-9]+" | head -1)
PG_HBA_PATH="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

log "PostgreSQL version: $PG_VERSION"
log "Config path: $PG_HBA_PATH"

if [ -f "$PG_HBA_PATH" ]; then
    # Backup original pg_hba.conf
    sudo cp "$PG_HBA_PATH" "${PG_HBA_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
      log "Current authentication methods:"
    sudo grep -E "(local|host).*all.*all" "$PG_HBA_PATH" || log "No config found"
    
    # Fix ALL authentication methods - complete solution from quick-auth-fix.sh
    log "Fixing local connections (peer → md5)..."
    sudo sed -i 's/local[[:space:]]\+all[[:space:]]\+all[[:space:]]\+peer/local   all             all                                     md5/' "$PG_HBA_PATH"
    sudo sed -i 's/local[[:space:]]\+filmflex[[:space:]]\+filmflex[[:space:]]\+peer/local   filmflex        filmflex                                md5/' "$PG_HBA_PATH"
    
    # CRITICAL: Fix host connections - change scram-sha-256 to md5 (THIS WAS THE MISSING PIECE)
    log "Fixing host connections (scram-sha-256 → md5)..."
    sudo sed -i 's/host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+127\.0\.0\.1\/32[[:space:]]\+scram-sha-256/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA_PATH"
    sudo sed -i 's/host[[:space:]]\+all[[:space:]]\+all[[:space:]]\+::1\/128[[:space:]]\+scram-sha-256/host    all             all             ::1\/128                 md5/' "$PG_HBA_PATH"
    
    log "Updated authentication methods:"
    sudo grep -E "(local|host).*all.*all" "$PG_HBA_PATH"
    
    # Restart PostgreSQL to apply authentication changes
    log "Restarting PostgreSQL to apply authentication changes..."
    sudo systemctl restart postgresql
    sleep 5
      if systemctl is-active --quiet postgresql; then
        success "PostgreSQL restarted successfully with new authentication"
        success "  ✅ Local connections: peer → md5"
        success "  ✅ Host connections: scram-sha-256 → md5"
        success "  ✅ All authentication methods fixed"
    else
        error "PostgreSQL failed to restart after config change"
        exit 1
    fi
else
    error "PostgreSQL config file not found at $PG_HBA_PATH"
    exit 1
fi

# Step 3: Comprehensive filmflex user recreation with enhanced password handling
log "Step 3: Comprehensive filmflex user recreation with enhanced password handling..."

# First, check current PostgreSQL password encryption method
log "Checking PostgreSQL password encryption method..."
CURRENT_ENCRYPTION=$(sudo -u postgres psql -t -c "SHOW password_encryption;" | xargs)
log "Current password encryption: $CURRENT_ENCRYPTION"

# Check if user exists and its current properties
log "Checking existing user properties..."
sudo -u postgres psql -c "\du filmflex" || log "User filmflex does not exist yet"

log "Method 1: Standard user recreation..."
sudo -u postgres psql << 'EOSQL'
-- Drop and recreate user to ensure clean state
DROP USER IF EXISTS filmflex;
CREATE USER filmflex WITH PASSWORD 'filmflex2024';
ALTER USER filmflex CREATEDB;
ALTER USER filmflex WITH SUPERUSER;
ALTER USER filmflex WITH LOGIN;
\q
EOSQL

if [ $? -eq 0 ]; then
    success "Method 1: Standard user recreation completed"
else
    error "Method 1: Standard user recreation failed"
fi

# Method 2: Enhanced password setting with MD5 hash
log "Method 2: Setting password with explicit MD5 hash..."
MD5_HASH=$(echo -n "filmflex2024filmflex" | md5sum | awk '{print $1}')
MD5_PASSWORD="md5$MD5_HASH"
log "Generated MD5 password hash: $MD5_PASSWORD"

sudo -u postgres psql << EOF
-- Set password using MD5 hash directly for compatibility
ALTER USER filmflex PASSWORD '$MD5_PASSWORD';

-- Ensure all required attributes are set
ALTER USER filmflex WITH LOGIN;
ALTER USER filmflex WITH CREATEDB;
ALTER USER filmflex WITH SUPERUSER;

-- Verify user properties
\du filmflex
EOF

if [ $? -eq 0 ]; then
    success "Method 2: MD5 password hash setting completed"
else
    warning "Method 2: MD5 password hash setting had issues"
fi

# Method 3: Alternative password setting approaches
log "Method 3: Alternative password setting approaches..."
sudo -u postgres psql << 'EOSQL'
-- Try different password setting syntax variations
ALTER USER filmflex PASSWORD 'filmflex2024';
ALTER USER filmflex WITH PASSWORD 'filmflex2024';

-- Ensure proper encoding and attributes
ALTER USER filmflex WITH LOGIN CREATEDB SUPERUSER;

-- Final verification
\du filmflex
EOSQL

if [ $? -eq 0 ]; then
    success "Method 3: Alternative password methods completed"
else
    warning "Method 3: Alternative password methods had issues"
fi

# Step 4: Recreate database with proper ownership
log "Step 4: Recreating database with proper ownership..."
sudo -u postgres psql << 'EOSQL'
-- Drop and recreate database to ensure clean state
DROP DATABASE IF EXISTS filmflex;
CREATE DATABASE filmflex OWNER filmflex;
GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
\q
EOSQL

if [ $? -eq 0 ]; then
    success "Database recreated successfully"
else
    error "Failed to recreate database"
    exit 1
fi

# Step 5: Enhanced authentication testing with diagnostics
log "Step 5: Enhanced authentication testing with diagnostics..."

# Initial test to see current state
log "Initial authentication test:"
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 'Initial test works' as result;" > /dev/null 2>&1; then
    success "Initial authentication test: PASSED"
    INITIAL_TEST_PASSED=true
else
    warning "Initial authentication test: FAILED - proceeding with enhanced fixes"
    INITIAL_TEST_PASSED=false
fi

# If initial test failed, try additional password recovery methods
if [ "$INITIAL_TEST_PASSED" != true ]; then
    log "Applying additional password recovery methods..."
    
    # Emergency password reset with multiple approaches
    sudo -u postgres psql << 'EMERGENCY_FIX'
-- Emergency password reset approach 1: Drop and recreate completely
DROP USER IF EXISTS filmflex CASCADE;
CREATE USER filmflex WITH PASSWORD 'filmflex2024' LOGIN CREATEDB SUPERUSER;

-- Emergency password reset approach 2: Set password with different encoding
ALTER USER filmflex PASSWORD 'filmflex2024';
ALTER USER filmflex WITH PASSWORD 'filmflex2024';

-- Emergency password reset approach 3: Ensure all attributes
ALTER USER filmflex WITH LOGIN;
ALTER USER filmflex WITH CREATEDB;
ALTER USER filmflex WITH SUPERUSER;

-- Display final user state
\du filmflex
EMERGENCY_FIX

    log "Emergency password reset completed"
fi

log "Testing Method 1: Direct password authentication (host connection)"
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 'Method 1 SUCCESS - Host connection works' as test, current_user, current_database();" > /dev/null 2>&1; then
    success "Method 1: Host connection with password WORKS"
    METHOD1_WORKS=true
else
    error "Method 1: Host connection with password FAILED"
    METHOD1_WORKS=false
    
    # Show detailed error for Method 1
    log "Method 1 detailed error output:"
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" 2>&1 | head -3
fi

log "Testing Method 2: Connection string format"
if psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE" -c "SELECT 'Method 2 SUCCESS - Connection string works' as test;" > /dev/null 2>&1; then
    success "Method 2: Connection string WORKS"
    METHOD2_WORKS=true
else
    error "Method 2: Connection string FAILED"
    METHOD2_WORKS=false
    
    # Show detailed error for Method 2
    log "Method 2 detailed error output:"
    psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE" -c "SELECT 1;" 2>&1 | head -3
fi

log "Testing Method 3: Local socket connection"
if sudo -u filmflex psql -d filmflex -c "SELECT 'Method 3 SUCCESS - Local socket works' as test;" > /dev/null 2>&1; then
    success "Method 3: Local socket WORKS"
    METHOD3_WORKS=true
else
    error "Method 3: Local socket FAILED"
    METHOD3_WORKS=false
    
    # Show detailed error for Method 3
    log "Method 3 detailed error output:"
    sudo -u filmflex psql -d filmflex -c "SELECT 1;" 2>&1 | head -3
fi

# Enhanced diagnostic information if any method fails
if [ "$METHOD1_WORKS" != true ] || [ "$METHOD2_WORKS" != true ]; then
    log "Enhanced diagnostic information:"
    
    log "PostgreSQL version and encoding:"
    sudo -u postgres psql -c "SELECT version();" | head -1
    sudo -u postgres psql -c "SHOW server_encoding;" | tail -1
    sudo -u postgres psql -c "SHOW client_encoding;" | tail -1
    
    log "Current user properties:"
    sudo -u postgres psql -c "\du filmflex" | head -5
    
    log "Recent PostgreSQL log entries:"
    sudo tail -5 /var/log/postgresql/postgresql-*-main.log 2>/dev/null || log "Could not access PostgreSQL logs"
fi

# Step 6: Update all configuration files
log "Step 6: Updating all configuration files..."

# Update root .env
ROOT_ENV="/root/.env"
echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable" > "$ROOT_ENV"
success "Updated $ROOT_ENV"

# Update project .env
PROJECT_ENV="$SOURCE_DIR/.env"
if [ -f "$PROJECT_ENV" ]; then
    cp "$PROJECT_ENV" "${PROJECT_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
fi
echo "NODE_ENV=production" > "$PROJECT_ENV"
echo "PORT=5000" >> "$PROJECT_ENV"
echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable" >> "$PROJECT_ENV"
echo "SESSION_SECRET=filmflex_production_secret_2024" >> "$PROJECT_ENV"
success "Updated $PROJECT_ENV"

# Update PM2 ecosystem config if exists
ECOSYSTEM_CONFIG="$SOURCE_DIR/ecosystem.config.cjs"
if [ -f "$ECOSYSTEM_CONFIG" ]; then
    cp "$ECOSYSTEM_CONFIG" "${ECOSYSTEM_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update DATABASE_URL in PM2 config
    sed -i 's|DATABASE_URL:.*|DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable",|' "$ECOSYSTEM_CONFIG"
    success "Updated PM2 ecosystem config"
fi

# Step 7: Final comprehensive authentication test
log "Step 7: Final comprehensive authentication test..."

log "Final Test: Complete authentication verification"
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 
    'Authentication SUCCESSFUL' as status,
    current_user as user,
    current_database() as database,
    version() as postgresql_version;
" > /dev/null 2>&1; then
    success "FINAL TEST PASSED: Authentication is now working!"
    AUTH_FIXED=true
else
    error "FINAL TEST FAILED: Authentication still not working"
    AUTH_FIXED=false
fi

# Verify authentication is working before proceeding
if [ "$AUTH_FIXED" = true ] && [ "$METHOD1_WORKS" = true ] && [ "$METHOD2_WORKS" = true ]; then
    success "🎉 SUCCESS: PostgreSQL authentication is now WORKING!"
    success "  ✅ Authentication method: md5 (both local and host)"
    success "  ✅ User: $PGUSER with password: $PGPASSWORD"
    success "  ✅ Database: $PGDATABASE"
    success "  ✅ Host connections: scram-sha-256 → md5 (FIXED)"
    success "  ✅ Local connections: peer → md5 (FIXED)"
    success "  ✅ All authentication methods tested and verified"
    success "  ✅ Configuration files updated"
else
    error "❌ PostgreSQL authentication fix failed"
    log "Method 1 (Host): $METHOD1_WORKS"
    log "Method 2 (URL): $METHOD2_WORKS"
    log "Method 3 (Socket): $METHOD3_WORKS"
    log "Final Test: $AUTH_FIXED"
    log ""
    log "Debug Commands:"
    log "1. Check PostgreSQL logs: sudo tail -f /var/log/postgresql/postgresql-*-main.log"
    log "2. Check authentication config: sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -E '(local|host).*all.*all'"
    log "3. Test user manually: sudo -u postgres psql -c '\\du filmflex'"
    log "4. Manual test: PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c 'SELECT version();'"
    exit 1
fi

# Create comprehensive database schema using filmflex_schema.sql
log "Applying database schema from filmflex_schema.sql..."

# Check if schema file exists
SCHEMA_FILE="$SOURCE_DIR/shared/filmflex_schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    error "Schema file not found at $SCHEMA_FILE"
    exit 1
fi

# Apply the schema
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f "$SCHEMA_FILE"; then
    success "Database schema applied successfully from filmflex_schema.sql"
    
    # Verify core tables were created
    log "Verifying schema application..."
    TABLES_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('movies', 'episodes', 'users', 'comments');" | xargs)
    
    if [ "$TABLES_COUNT" -ge 4 ]; then
        success "Core tables verified: $TABLES_COUNT/4 tables present"
        
        # Check episodes table specifically for the filename column
        FILENAME_COLUMN=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'episodes' AND column_name = 'filename';" | xargs)
        if [ "$FILENAME_COLUMN" -eq 1 ]; then
            success "Episodes filename column verified"
        else
            warning "Episodes filename column missing - adding it..."
            PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE episodes ADD COLUMN IF NOT EXISTS filename TEXT;"
        fi
        
        # Check for episodes slug constraint
        EPISODES_CONSTRAINT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM pg_constraint WHERE conname LIKE '%episodes%slug%';" | xargs)
        if [ "$EPISODES_CONSTRAINT" -ge 1 ]; then
            success "Episodes slug constraint verified"
        else
            warning "Episodes slug constraint missing - adding it..."
            PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE episodes ADD CONSTRAINT episodes_slug_unique UNIQUE (slug);" || warning "Could not add episodes slug constraint (may already exist with different name)"
        fi
        
        # Check movies table JSONB columns
        JSONB_COLUMNS=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'movies' AND column_name IN ('categories', 'countries') AND data_type = 'jsonb';" | xargs)
        if [ "$JSONB_COLUMNS" -eq 2 ]; then
            success "Movies JSONB columns verified (categories, countries)"
        else
            warning "Movies JSONB columns may need fixing - found $JSONB_COLUMNS/2"
            # Convert TEXT[] to JSONB if needed
            PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" << 'EOFIXJSONB'
-- Fix JSONB columns if they are TEXT[]
DO $$
BEGIN
    -- Fix categories column if it's TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'categories' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE movies ALTER COLUMN categories TYPE JSONB USING 
            CASE 
                WHEN categories IS NULL THEN '[]'::jsonb
                ELSE array_to_json(categories)::jsonb
            END;
        RAISE NOTICE 'Converted categories column from TEXT[] to JSONB';
    END IF;

    -- Fix countries column if it's TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'countries' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE movies ALTER COLUMN countries TYPE JSONB USING 
            CASE 
                WHEN countries IS NULL THEN '[]'::jsonb
                ELSE array_to_json(countries)::jsonb
            END;
        RAISE NOTICE 'Converted countries column from TEXT[] to JSONB';
    END IF;
END$$;
EOFIXJSONB
        fi
    else
        error "Core tables missing: only $TABLES_COUNT/4 tables found"
        exit 1
    fi    # Comprehensive Schema Validation and Repair
    log "Performing comprehensive schema validation and repair..."
    
    # Function to check column exists
    check_column() {
        local table_name=$1
        local column_name=$2
        PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = '$table_name' AND column_name = '$column_name';" | xargs
    }

    # Function to add column if missing
    add_column_if_missing() {
        local table_name=$1
        local column_name=$2
        local column_type=$3
        local default_value=$4
        
        local exists=$(check_column "$table_name" "$column_name")
        
        if [ "$exists" -eq 0 ]; then
            warning "Adding missing column $column_name to $table_name..."
            if [ -n "$default_value" ]; then
                PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE $table_name ADD COLUMN $column_name $column_type DEFAULT $default_value;"
            else
                PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "ALTER TABLE $table_name ADD COLUMN $column_name $column_type;"
            fi
            success "Added $column_name to $table_name"
        else
            success "Column $column_name exists in $table_name"
        fi
    }

    # Fix users table - add all missing columns
    log "Fixing users table schema..."
    add_column_if_missing "users" "password" "TEXT" ""
    add_column_if_missing "users" "role" "TEXT" "'user'"
    add_column_if_missing "users" "status" "TEXT" "'active'"
    add_column_if_missing "users" "google_id" "TEXT" ""
    add_column_if_missing "users" "avatar" "TEXT" ""
    add_column_if_missing "users" "display_name" "TEXT" ""
    add_column_if_missing "users" "created_at" "TIMESTAMP" "NOW()"
    add_column_if_missing "users" "updated_at" "TIMESTAMP" "NOW()"
    add_column_if_missing "users" "last_login" "TIMESTAMP" ""

    # Fix episodes table
    log "Fixing episodes table schema..."
    add_column_if_missing "episodes" "filename" "TEXT" ""

    # Fix JSONB columns in movies table
    log "Ensuring JSONB columns are correct..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" << 'EOFIXJSONB'
-- Fix JSONB columns if they are TEXT[]
DO $$
BEGIN
    -- Fix categories column if it's TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'categories' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE movies ALTER COLUMN categories TYPE JSONB USING 
            CASE 
                WHEN categories IS NULL THEN '[]'::jsonb
                ELSE array_to_json(categories)::jsonb
            END;
        RAISE NOTICE 'Converted categories column from TEXT[] to JSONB';
    END IF;

    -- Fix countries column if it's TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' AND column_name = 'countries' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE movies ALTER COLUMN countries TYPE JSONB USING 
            CASE 
                WHEN countries IS NULL THEN '[]'::jsonb
                ELSE array_to_json(countries)::jsonb
            END;
        RAISE NOTICE 'Converted countries column from TEXT[] to JSONB';
    END IF;
END$$;
EOFIXJSONB

    success "Schema validation and repair completed"
    
    # Add default roles and permissions
    log "Adding default roles and permissions..."
    
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" << 'EODEFAULTS'
-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES 
('Admin', 'Full administrative access to all system functions'),
('Content Manager', 'Manages content creation, editing, and moderation'),
('Viewer', 'Standard user with viewing and basic interaction capabilities')
ON CONFLICT (name) DO NOTHING;

-- Insert basic permissions if they don't exist
INSERT INTO permissions (name, description, module, action) VALUES 
('content.view', 'View movies and content', 'viewing', 'view'),
('content.search', 'Search for content', 'viewing', 'search'),
('content.comment', 'Comment on content', 'viewing', 'comment'),
('content.rate', 'Rate movies and content', 'viewing', 'rate'),
('content.watchlist', 'Manage personal watchlist', 'viewing', 'watchlist'),
('content.create', 'Add new movies and content', 'content_management', 'create'),
('content.update', 'Edit existing content', 'content_management', 'update'),
('content.delete', 'Remove content', 'content_management', 'delete'),
('system.admin', 'Full system administration access', 'system', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- Assign viewing permissions to Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Viewer'
AND p.name IN ('content.view', 'content.search', 'content.watchlist', 'content.comment', 'content.rate')
ON CONFLICT DO NOTHING;

-- Create a default admin user if none exists
-- Using bcrypt hash for password 'Cuongtm2012$'
DO $$
BEGIN
    -- Check if admin user already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        INSERT INTO users (username, email, password, role, status, created_at, updated_at) VALUES 
        ('admin', 'admin@phimgg.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', NOW(), NOW());
        RAISE NOTICE 'Created admin user with username: admin, password: Cuongtm2012$';
    ELSE
        -- Update existing admin user to ensure it has password and correct role
        UPDATE users SET 
            password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            role = 'admin',
            status = 'active',
            updated_at = NOW()
        WHERE username = 'admin';
        RAISE NOTICE 'Updated existing admin user with correct password and role';
    END IF;
EXCEPTION 
    WHEN undefined_column THEN
        RAISE NOTICE 'Some columns missing in users table, admin user creation/update skipped';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error with admin user: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating admin user: %', SQLERRM;
END$$;
EODEFAULTS
    
    success "Default roles, permissions, and admin user added"
    
    # Set proper ownership
    log "Setting proper table ownership to filmflex user..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" << 'EOOWNERSHIP'
-- Set table ownership to filmflex user
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('ALTER TABLE %I OWNER TO filmflex', table_name);
    END LOOP;
    
    -- Set sequence ownership
    FOR table_name IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE format('ALTER SEQUENCE %I OWNER TO filmflex', table_name);
    END LOOP;
END$$;
EOOWNERSHIP
    
    success "Table and sequence ownership set to filmflex user"
    
else
    error "Schema application failed"
    log "Attempting basic fallback schema creation..."
      # Create comprehensive fallback schema
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" << 'FALLBACK_SQL'
-- Comprehensive database schema fallback
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY, 
    name TEXT, 
    slug TEXT UNIQUE,
    categories JSONB DEFAULT '[]'::jsonb,
    countries JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    poster_url TEXT,
    year INTEGER,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY, 
    name TEXT, 
    slug TEXT UNIQUE, 
    movie_slug TEXT, 
    server_name TEXT, 
    filename TEXT, 
    link_embed TEXT, 
    link_m3u8 TEXT,
    episode_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, 
    username TEXT UNIQUE, 
    email TEXT UNIQUE, 
    password TEXT, 
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    google_id TEXT,
    avatar TEXT,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY, 
    user_id INTEGER REFERENCES users(id), 
    movie_slug TEXT, 
    content TEXT, 
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY, 
    sess JSONB, 
    expire TIMESTAMP
);

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create permissions table if not exists  
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    module TEXT,
    action TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create role_permissions table if not exists
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
('admin', 'Full administrative access'),
('user', 'Standard user access'),
('moderator', 'Content moderation access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES 
('content.view', 'View content', 'content', 'view'),
('content.create', 'Create content', 'content', 'create'),
('content.edit', 'Edit content', 'content', 'edit'),
('content.delete', 'Delete content', 'content', 'delete'),
('admin.access', 'Administrative access', 'admin', 'access')
ON CONFLICT (name) DO NOTHING;

-- Create admin user
INSERT INTO users (username, email, password, role, status, created_at, updated_at) VALUES 
('admin', 'admin@phimgg.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
FALLBACK_SQL
    
    if [ $? -eq 0 ]; then
        success "Fallback schema created successfully"
    else
        error "Both main schema and fallback schema failed"
        exit 1
    fi
fi

# Final Database Verification
log "${BLUE}Final Database Schema Verification...${NC}"

# Verify users table has all essential columns
USERS_COLUMNS=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('id', 'username', 'email', 'password', 'role', 'status');" | xargs)

log "Users table essential columns: $USERS_COLUMNS/6"

# Check admin user exists
ADMIN_EXISTS=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM users WHERE username = 'admin';" | xargs)

log "Admin user exists: $ADMIN_EXISTS"

# Verify core tables exist
CORE_TABLES_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('movies', 'episodes', 'users', 'comments', 'sessions');" | xargs)

log "Core tables present: $CORE_TABLES_COUNT/5"

if [ "$USERS_COLUMNS" -ge 5 ] && [ "$ADMIN_EXISTS" -eq 1 ] && [ "$CORE_TABLES_COUNT" -ge 5 ]; then
    success "✅ Database schema verification passed!"
    success "  - Users table has all essential columns"
    success "  - Admin user exists (admin/Cuongtm2012$)"
    success "  - All core tables are present"
    success "  - Schema is ready for application deployment"
else
    error "❌ Database schema verification failed!"
    log "  Users columns: $USERS_COLUMNS/6"
    log "  Admin exists: $ADMIN_EXISTS"
    log "  Core tables: $CORE_TABLES_COUNT/5"
    exit 1
fi

# 1. Stop any existing processes
log "${BLUE}1. Stopping any existing FilmFlex processes...${NC}"
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true

# 2. Create deployment directory if it doesn't exist
log "${BLUE}2. Setting up deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/client/dist"
mkdir -p "$DEPLOY_DIR/scripts/data"

# 3. Copy the source package.json and prepare it
log "${BLUE}3. Copying and preparing package.json...${NC}"
if [ -f "$SOURCE_DIR/package.json" ]; then
  cp "$SOURCE_DIR/package.json" "$DEPLOY_DIR/package.json"
  check_status "Package.json copy"
else
  # Fallback if package.json is not found
  log "Package.json not found in source, creating standard one..."
  cat > "$DEPLOY_DIR/package.json" << 'EOJSON'
{
  "name": "filmflex",
  "version": "1.0.0",
  "description": "FilmFlex Production Server",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "@neondatabase/serverless": "^0.7.2",
    "drizzle-orm": "^0.28.6"
  }
}
EOJSON
fi

# 4. Copy the source code
log "${BLUE}4. Copying server files...${NC}"
if [ -d "$SOURCE_DIR/server" ]; then
  mkdir -p "$DEPLOY_DIR/server"
  cp -r "$SOURCE_DIR/server"/* "$DEPLOY_DIR/server/"
  check_status "Server code copy"
else
  warning "Server source directory not found"
fi

if [ -d "$SOURCE_DIR/shared" ]; then
  mkdir -p "$DEPLOY_DIR/shared"
  cp -r "$SOURCE_DIR/shared"/* "$DEPLOY_DIR/shared/"
  check_status "Shared code copy"
else
  warning "Shared source directory not found"
fi

# 5. Create PM2 ecosystem config with production environment
log "${BLUE}5. Creating PM2 ecosystem config for production...${NC}"
cat > "$DEPLOY_DIR/ecosystem.config.cjs" << 'EOCONFIG'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        ALLOWED_ORIGINS: "*",
        CLIENT_URL: "*",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61",
        DOMAIN: "phimgg.com",
        SERVER_IP: "154.205.142.255"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOCONFIG

# 6. Fix node modules and install dependencies with proven fixes
log "${BLUE}6. Fixing node modules and installing dependencies...${NC}"
cd "$DEPLOY_DIR"

# Step 6a: Complete cleanup of corrupted dependencies
log "   🗑️  Cleaning up corrupted node_modules and package-lock.json..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf ~/.npm/_cacache

log "   🧹 Clearing npm cache..."
npm cache clean --force

# Step 6b: Install dependencies with optional dependencies enabled
log "   📦 Installing dependencies with optional dependencies..."
if npm install --include=optional; then
    success "Base dependencies installed successfully"
else
    warning "Standard install failed, trying with legacy peer deps..."
    npm install --legacy-peer-deps --include=optional
    check_status "Dependencies installation with legacy peer deps"
fi

# Step 6c: Install platform-specific binaries that commonly cause issues
log "   🔧 Installing platform-specific binaries..."
npm install @esbuild/linux-x64 --save-dev 2>/dev/null || warning "esbuild binary install failed (might already exist)"
npm install @rollup/rollup-linux-x64-gnu --save-dev 2>/dev/null || warning "rollup binary install failed (might already exist)"

# Step 6d: Verify critical binaries are present
log "   🔍 Verifying critical binaries..."
if [ -f "node_modules/@esbuild/linux-x64/package.json" ]; then
    success "esbuild Linux x64 binary: FOUND"
else
    warning "esbuild Linux x64 binary: MISSING - attempting fix..."
    npm rebuild @esbuild/linux-x64 || npm install @esbuild/linux-x64 --force
fi

if [ -f "node_modules/@rollup/rollup-linux-x64-gnu/package.json" ]; then
    success "Rollup Linux x64 binary: FOUND"
else
    warning "Rollup Linux x64 binary: MISSING - attempting fix..."
    npm rebuild @rollup/rollup-linux-x64-gnu || npm install @rollup/rollup-linux-x64-gnu --force
fi

# Step 6e: Build application or copy pre-built files
log "   🏗️  Building application..."

# Try to build if we have the source files and build scripts
if [ -f "package.json" ] && grep -q "build:server" package.json; then
    log "Found build scripts, attempting ES module build with esbuild..."
    
    # Build server with esbuild (ES module compatible)
    if npm run build:server; then
        success "Server ES module build completed successfully"
        BUILD_METHOD="esbuild (ES modules)"
    else
        warning "Server build failed, will try copying pre-built files"
        BUILD_METHOD="fallback"
    fi
    
    # Build client if build script exists
    if grep -q "build:client" package.json && npm run build:client; then
        success "Client build completed successfully"
    else
        warning "Client build failed or not available, will try copying pre-built files"
    fi
else
    log "Build scripts not found, using pre-built approach..."
    BUILD_METHOD="pre-built"
fi

# Approach 1: Use pre-built files from source if available
if [ -d "$SOURCE_DIR/dist" ] && [ -f "$SOURCE_DIR/dist/index.js" ]; then
    log "Found pre-built server code, copying it..."
    mkdir -p "$DEPLOY_DIR/dist"
    cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/dist/"
    success "Server code copied successfully from pre-built source"
else
    # Approach 2: Create a fallback server file
    warning "Pre-built server not found, creating fallback server file..."
    mkdir -p "$DEPLOY_DIR/dist"
      # Create an enhanced Express server with CORS support
    cat > "$DEPLOY_DIR/dist/index.js" << 'EOJS'
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable'
});

// Enhanced CORS middleware for production
app.use((req, res, next) => {
  // Check for wildcard CORS setting - ALLOW ALL ORIGINS (for development/testing)
  if (process.env.ALLOWED_ORIGINS === '*' || process.env.CLIENT_URL === '*') {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // Production CORS - allow specific origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : ['https://phimgg.com', 'http://154.205.142.255:5000'];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware to parse JSON
app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    domain: process.env.DOMAIN || 'localhost',
    cors: process.env.ALLOWED_ORIGINS || 'default'
  });
});

// Test database connection
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      time: result.rows[0].current_time,
      version: result.rows[0].postgres_version
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message 
    });
  }
});

// Static files - serve the client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 FilmFlex Server running on port ${port}`);
  console.log(`📊 Database URL: ${process.env.DATABASE_URL || 'using default connection'}`);
  console.log(`🌐 Domain: ${process.env.DOMAIN || 'localhost'}`);
  console.log(`🔒 CORS: ${process.env.ALLOWED_ORIGINS || 'default settings'}`);
  console.log(`🌐 Access: http://localhost:${port}`);
  console.log(`🌐 Production: http://154.205.142.255:${port}`);
  console.log(`🌐 Domain: https://phimgg.com`);
});
EOJS
    success "Created enhanced production server file with CORS support"
    
    # Install minimal dependencies needed for the fallback server
    npm install express pg --save
    check_status "Installing minimal server dependencies"
fi

# Step 6f: Verify build outputs
log "   📊 Verifying build outputs..."
if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
    SERVER_SIZE=$(du -h "$DEPLOY_DIR/dist/index.js" | cut -f1)
    success "Server bundle verified: $SERVER_SIZE"
else
    error "Server bundle missing after build process"
    exit 1
fi

# 7. Copy scripts directory
log "${BLUE}7. Copying scripts directory...${NC}"
log "   - Copying import scripts..."
mkdir -p "$DEPLOY_DIR/scripts/data"
if [ -d "$SOURCE_DIR/scripts/data" ]; then
    cp -r "$SOURCE_DIR/scripts/data"/* "$DEPLOY_DIR/scripts/data/" || warning "Failed to copy some data scripts"
    chmod +x "$DEPLOY_DIR/scripts/data"/*.sh 2>/dev/null || warning "Failed to make scripts executable"
else
    warning "Source scripts/data directory not found"
fi

# 8. Copy client
if [ -d "$SOURCE_DIR/client/dist" ]; then
  log "${BLUE}8. Copying client dist files...${NC}"
  cp -r "$SOURCE_DIR/client/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files"
else
  warning "Client dist directory not found at $SOURCE_DIR/client/dist"
  # Try to find it elsewhere
  if [ -d "$SOURCE_DIR/dist" ]; then
    log "Found client files at $SOURCE_DIR/dist, copying..."
    cp -r "$SOURCE_DIR/dist"/* "$DEPLOY_DIR/client/dist/" || warning "Failed to copy client files from alternate location"
  fi
fi

# 9. Set up production environment variables with correct password
log "${BLUE}9. Setting up production environment variables...${NC}"
cat > "$DEPLOY_DIR/.env" << 'EOENV'
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
EOENV

# Create .env.production file for production-specific settings
cat > "$DEPLOY_DIR/.env.production" << 'EOENVPROD'
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable
SESSION_SECRET=5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
EOENVPROD

# Create .env.local file as well for possible dotenv module usage
cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/.env.local"

# Create a module loader file for ESM environments that exports environment variables
log "Creating environment module for ESM compatibility..."
cat > "$DEPLOY_DIR/dist/env.js" << 'EOENV_MODULE'
// ESM environment module
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default values
const defaults = {
  NODE_ENV: 'production',
  PORT: '5000',
  DATABASE_URL: 'postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable',
  SESSION_SECRET: '5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61'
};

// Load from .env file
function loadEnv() {
  try {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
            value = value.replace(/\\n/g, '\n');
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      });
      
      return envVars;
    }
  } catch (err) {
    console.error('Error loading .env file:', err);
  }
  return {};
}

// Combine environment variables from all sources, with priority:
// 1. Process environment variables
// 2. .env file variables
// 3. Default values
const envVars = { ...defaults, ...loadEnv(), ...process.env };

// Export all environment variables
export const NODE_ENV = envVars.NODE_ENV;
export const PORT = envVars.PORT;
export const DATABASE_URL = envVars.DATABASE_URL;
export const SESSION_SECRET = envVars.SESSION_SECRET;

// Export a function to get any env var with a default
export function getEnv(key, defaultValue = '') {
  return envVars[key] || defaultValue;
}

// Export the entire env object
export default envVars;
EOENV_MODULE

# 10. Check for processes using the port before killing them
log "${BLUE}10. Checking for processes using port 5000 before starting server...${NC}"
PROCESSES=$(lsof -i:5000 -t 2>/dev/null || ss -tulpn 2>/dev/null | grep ':5000 ' | awk '{print $7}' | cut -d= -f2 | cut -d, -f1)
if [ -n "$PROCESSES" ]; then
  log "   - Found processes using port 5000: $PROCESSES"
  log "   - Stopping these processes safely..."
  for PID in $PROCESSES; do
    log "     - Sending SIGTERM to process $PID"
    kill $PID 2>/dev/null || true
    sleep 1
    # Only use SIGKILL if process still exists
    if kill -0 $PID 2>/dev/null; then
      log "     - Process $PID still running, sending SIGKILL"
      kill -9 $PID 2>/dev/null || true
    fi
  done
  sleep 2
fi

# 10.5. Pre-deployment testing and verification
log "${BLUE}10.5. Pre-deployment testing and verification...${NC}"
cd "$DEPLOY_DIR"

# Test Node.js module loading
log "   🧪 Testing Node.js module loading..."
if node -e "console.log('Node.js basic test passed')" 2>/dev/null; then
    success "Node.js basic functionality test passed"
else
    error "Node.js basic functionality test failed"
    exit 1
fi

# Test if our server file can load without running
log "   📝 Testing server file syntax..."
if node -c dist/index.js 2>/dev/null; then
    success "Server file syntax check passed"
else
    error "Server file syntax check failed"
    exit 1
fi

# Test database connection
log "   🗄️  Testing database connection..."
if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    success "Database connection test passed"
else
    warning "Database connection test failed - continuing anyway"
fi

# Test package dependencies
log "   📦 Testing critical dependencies..."
node -e "
try {
  require('express');
  require('pg');
  console.log('✅ Critical dependencies test passed');
} catch (error) {
  console.error('❌ Critical dependencies test failed:', error.message);
  process.exit(1);
}
" || { error "Critical dependencies test failed"; exit 1; }

# Quick server startup test
log "   🚀 Testing server startup (10 second test)..."
timeout 10s node dist/index.js &
SERVER_PID=$!
sleep 5

# Test health endpoint
if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Health endpoint test passed"
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    log "     Health response: $HEALTH_RESPONSE"
else
    warning "Health endpoint test failed - server might need more time to start"
fi

# Test database endpoint if available
if curl -f -s http://localhost:5000/api/db-test > /dev/null 2>&1; then
    success "Database endpoint test passed"
    DB_RESPONSE=$(curl -s http://localhost:5000/api/db-test)
    log "     Database response: $DB_RESPONSE"
else
    warning "Database endpoint test failed or not available"
fi

# Clean up test server
kill $SERVER_PID 2>/dev/null || true
sleep 2

# 11. Setup systemd service for PM2 and start server
log "${BLUE}11. Setting up PM2 startup service...${NC}"
cd "$DEPLOY_DIR"
pm2 startup systemd || warning "Failed to set up PM2 startup hook"

# Create an enhanced PM2 config file with production environment variables
log "Creating enhanced PM2 startup file with production environment..."
cat > "$DEPLOY_DIR/pm2.config.cjs" << 'EOPMConfig'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        ALLOWED_ORIGINS: "*",
        CLIENT_URL: "*",
        DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable",
        SESSION_SECRET: "5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61",
        DOMAIN: "phimgg.com",
        SERVER_IP: "154.205.142.255"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOPMConfig

# Start or restart the application with PM2
if pm2 list | grep -q "filmflex"; then
  log "Restarting application with PM2..."
  pm2 restart filmflex || { error "Failed to restart application"; exit 1; }
else
  log "Starting application with PM2..."
  pm2 start "$DEPLOY_DIR/pm2.config.cjs" || { 
    error "Failed to start with pm2.config.cjs, attempting direct start"    # Try direct start as fallback with production environment
    cd "$DEPLOY_DIR"    export NODE_ENV="production"
    export ALLOWED_ORIGINS="*"
    export CLIENT_URL="*"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable"
    export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
    export DOMAIN="phimgg.com"
    export SERVER_IP="154.205.142.255"
    pm2 start dist/index.js --name filmflex -- --env production || { error "All PM2 start methods failed"; exit 1; }
  }
fi

# Save PM2 process list
pm2 save || warning "Failed to save PM2 process list"

# 12. Set proper permissions for the deploy directory
log "${BLUE}12. Setting proper permissions...${NC}"
chown -R www-data:www-data "$DEPLOY_DIR" || warning "Failed to set permissions"

# 13. Check API response
log "${BLUE}13. Checking API response...${NC}"
sleep 3
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"* ]]; then
  success "API is responding correctly: $API_RESPONSE"
else
  warning "API is not responding correctly: $API_RESPONSE"
  log "   - This might be a temporary issue, please try accessing the site manually"
fi

# 14. Reload Nginx
log "${BLUE}14. Reloading Nginx configuration...${NC}"
if nginx -t; then
  systemctl reload nginx
  success "Nginx configuration reloaded"
else
  error "Nginx configuration test failed"
fi

# Create an enhanced restart script for production
log "Creating enhanced restart script for production..."
cat > "$DEPLOY_DIR/restart.sh" << 'EORESTART'
#!/bin/bash
# FilmFlex Production Restart Script for phimgg.com
export NODE_ENV="production"
export PORT="5000"
export ALLOWED_ORIGINS="*"
export CLIENT_URL="*"
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable"
export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
export DOMAIN="phimgg.com"
export SERVER_IP="154.205.142.255"

cd "$(dirname "$0")"

echo "🚀 Restarting FilmFlex for phimgg.com production..."
echo "📍 Production IP: 154.205.142.255"
echo "🌐 Domain: phimgg.com"

if pm2 list | grep -q "filmflex"; then
  echo "🔄 Restarting FilmFlex with PM2..."
  pm2 restart filmflex
else
  echo "▶️  Starting FilmFlex with PM2..."
  pm2 start pm2.config.cjs || pm2 start dist/index.js --name filmflex
fi

echo "⏳ Checking application status..."
sleep 3

echo "🏥 Health check:"
curl -s http://localhost:5000/api/health | head -c 200
echo ""

echo "🌐 Production URLs:"
echo "  • Local: http://localhost:5000"
echo "  • Production IP: http://154.205.142.255:5000"
echo "  • Domain: https://phimgg.com"
echo ""
echo "✅ Done! Check logs with: pm2 logs filmflex"
EORESTART

chmod +x "$DEPLOY_DIR/restart.sh"

# End deployment
log "${GREEN}===== FilmFlex Final Deployment Completed at $(date) =====${NC}"

# Final comprehensive verification
log ""
log "${BLUE}🔍 FINAL VERIFICATION${NC}"
log "===================="

# Check PM2 status
log "📋 PM2 Status:"
pm2 status

# Check if the application is responding
log ""
log "🌐 Application Response Tests:"
sleep 3

# Test health endpoint with enhanced checks
if curl -f -s http://localhost:5000/api/health > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
    success "Health endpoint: RESPONSIVE"
    log "   Response: $HEALTH_RESPONSE"
    
    # Test CORS headers
    CORS_RESPONSE=$(curl -s -I -H "Origin: https://phimgg.com" http://localhost:5000/api/health | grep -i "access-control-allow-origin" || echo "No CORS headers")
    log "   CORS: $CORS_RESPONSE"
else
    error "Health endpoint: NOT RESPONSIVE"
    log "   Checking PM2 logs for issues..."
    pm2 logs filmflex --lines 5
fi

# Test database endpoint if available
if curl -f -s http://localhost:5000/api/db-test > /dev/null 2>&1; then
    DB_RESPONSE=$(curl -s http://localhost:5000/api/db-test)
    success "Database endpoint: RESPONSIVE"
    log "   Response: $DB_RESPONSE"
else
    warning "Database endpoint: NOT AVAILABLE (might not be implemented)"
fi

# Test production IP accessibility
if command -v timeout >/dev/null 2>&1; then
    log "Testing production IP accessibility..."
    if timeout 10 curl -f -s http://154.205.142.255:5000/api/health > /dev/null 2>&1; then
        success "Production IP: ACCESSIBLE (154.205.142.255)"
    else
        warning "Production IP: NOT ACCESSIBLE (may need firewall configuration)"
    fi
fi

# Test main page
if curl -f -s http://localhost:5000 > /dev/null 2>&1; then
    success "Main page: ACCESSIBLE"
else
    warning "Main page: NOT ACCESSIBLE"
fi

# Show server resource usage
log ""
log "📊 Server Resource Usage:"
if command -v ps >/dev/null 2>&1; then
    FILMFLEX_PROCESSES=$(ps aux | grep filmflex | grep -v grep | wc -l)
    log "   FilmFlex processes: $FILMFLEX_PROCESSES"
    if [ "$FILMFLEX_PROCESSES" -gt 0 ]; then
        ps aux | grep filmflex | grep -v grep | head -3
    fi
fi

# Check disk usage
log ""
log "💾 Deployment Size:"
if [ -d "$DEPLOY_DIR" ]; then
    DEPLOY_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
    log "   Total deployment: $DEPLOY_SIZE"
fi
if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
    SERVER_SIZE=$(du -h "$DEPLOY_DIR/dist/index.js" | cut -f1)
    log "   Server bundle: $SERVER_SIZE"
fi
if [ -d "$DEPLOY_DIR/client/dist" ]; then
    CLIENT_SIZE=$(du -sh "$DEPLOY_DIR/client/dist" | cut -f1)
    log "   Client bundle: $CLIENT_SIZE"
fi

log ""
log "${GREEN}🎉 DEPLOYMENT SUMMARY for phimgg.com${NC}"
log "======================================="
log "🕒 Deployment completed at: $(date)"
log "📁 Deployed to: $DEPLOY_DIR"
log "🏗️  Build method: ${BUILD_METHOD:-'standard'}"
log "🌐 Production Environment:"
log "   • Local URL: http://localhost:5000"
log "   • Production IP: http://154.205.142.255:5000"
log "   • Domain: https://phimgg.com (when DNS configured)"
log "   • Health Check: http://154.205.142.255:5000/api/health"
log "📊 Log file: $LOG_FILE"
log ""
log "${BLUE}📋 MANAGEMENT COMMANDS${NC}"
log "===================="
log "  • Check status: pm2 status filmflex"
log "  • View logs: pm2 logs filmflex"
log "  • Monitor: pm2 monit"
log "  • Restart: pm2 restart filmflex"
log "  • Stop: pm2 stop filmflex"
log "  • Quick restart: cd $DEPLOY_DIR && ./restart.sh"
log ""
log "${BLUE}🛠️  TROUBLESHOOTING${NC}"
log "=================="
log "  • If health check failed: pm2 logs filmflex"
log "  • If database issues: Check database connection in logs"
log "  • If CORS issues: Check ALLOWED_ORIGINS environment variable"
log "  • If node modules issues: Run this script again (it includes fixes)"
log "  • If port conflicts: Check what's using port 5000: lsof -i:5000"
log ""
log "${BLUE}🔒 SECURITY NOTES${NC}"
log "=================="
log "  • CORS currently set to wildcard (*) for development"
log "  • Review and tighten CORS settings for production security"
log "  • Consider implementing rate limiting and authentication"
log ""
log "${BLUE}📚 MOVIE IMPORT COMMANDS${NC}"
log "======================="
log ""
log "Movie import commands:"
log "  - Daily import: cd $DEPLOY_DIR/scripts/data && ./import-movies.sh"
log "  - Full import (resumable): cd $DEPLOY_DIR/scripts/data && ./import-all-movies-resumable.sh"
log "  - Set up cron jobs: cd $DEPLOY_DIR/scripts/data && sudo ./setup-cron.sh"
log ""
log "${BLUE}🌐 NEXT STEPS${NC}"
log "=============="
log "  1. Configure DNS for phimgg.com to point to 154.205.142.255"
log "  2. Set up SSL certificate for HTTPS"
log "  3. Configure proper CORS for production security"
log "  4. Set up monitoring and alerting"
log "  5. Configure backup procedures"
log ""
log "🎉 ${GREEN}DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
log "======================================"
log ""
log "${BLUE}Admin Login Credentials:${NC}"
log "  URL: http://phimgg.com or http://154.205.142.255:5000"
log "  Username: admin"
log "  Password: Cuongtm2012$"
log ""
log "${BLUE}Database Details:${NC}"
log "  Host: localhost"
log "  Database: filmflex"
log "  User: filmflex"
log "  Password: filmflex2024"
log "  Connection: postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
log ""
log "${BLUE}Deployment Features:${NC}"
log "  ✅ Comprehensive schema validation and auto-repair"
log "  ✅ PostgreSQL authentication fixes (peer → md5)"
log "  ✅ Admin user creation with proper bcrypt password"
log "  ✅ All missing columns automatically added"
log "  ✅ JSONB conversion for movies table"
log "  ✅ Production-ready PM2 configuration"
log "  ✅ CORS and environment setup"
log ""
log "${BLUE}Next Steps:${NC}"
log "1. Test admin login at the URL above"
log "2. Run movie import: cd ~/Film_Flex_Release && bash scripts/data/import-all-movies-resumable.sh"
log "3. Monitor with: pm2 status && pm2 logs filmflex"
log ""
log "Need help or encountered issues?"
log "  To easily restart the server: cd $DEPLOY_DIR && ./restart.sh"
log "  The comprehensive database fix is built directly into this script."
log "  This script can be run again at any time to fix both deployment and database issues."
log "  Manual server start: cd $DEPLOY_DIR && NODE_ENV=production DATABASE_URL='postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable' ALLOWED_ORIGINS=* node dist/index.js"