#!/bin/bash
# PostgreSQL Authentication Fix Script
# Version: 1.0
# Description: Fixes peer authentication issues for phimgg.com production

set -e

echo "=== PostgreSQL Authentication Fix Script ==="
echo "Server: phimgg.com (154.205.142.255)"
echo "Date: $(date)"
echo ""

# Function to display current authentication configuration
check_current_auth() {
    echo "1. Checking current PostgreSQL authentication configuration..."
    echo "Current pg_hba.conf entries:"
    sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -E '^(local|host)' | head -10
    echo ""
    
    echo "Current PostgreSQL users:"
    sudo -u postgres psql -c '\du'
    echo ""
}

# Function to backup current configuration
backup_config() {
    echo "2. Creating backup of pg_hba.conf..."
    
    # Get the exact config file path from PostgreSQL
    echo "Finding PostgreSQL configuration file..."
    CONFIG_FILE=$(sudo -u postgres psql -t -c "SHOW config_file;" 2>/dev/null | tr -d ' ')
    if [ -z "$CONFIG_FILE" ]; then
        echo "ERROR: Could not get config file path from PostgreSQL"
        exit 1
    fi
    
    # Get the directory and construct pg_hba.conf path
    CONFIG_DIR=$(dirname "$CONFIG_FILE")
    CONFIG_PATH="$CONFIG_DIR/pg_hba.conf"
    
    echo "PostgreSQL config directory: $CONFIG_DIR"
    echo "Looking for pg_hba.conf at: $CONFIG_PATH"
    
    if [ ! -f "$CONFIG_PATH" ]; then
        # Try alternative locations
        echo "Config file not found, trying alternative locations..."
        
        # Get PostgreSQL version
        PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" 2>/dev/null | grep -oE 'PostgreSQL [0-9]+\.[0-9]+' | grep -oE '[0-9]+\.[0-9]+')
        PG_MAJOR=$(echo "$PG_VERSION" | cut -d. -f1)
        
        echo "PostgreSQL version: $PG_VERSION (major: $PG_MAJOR)"
        
        # Try different common paths
        CONFIG_PATHS=(
            "/etc/postgresql/$PG_MAJOR/main/pg_hba.conf"
            "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
            "/etc/postgresql/main/pg_hba.conf"
            "/var/lib/pgsql/data/pg_hba.conf"
            "/usr/local/pgsql/data/pg_hba.conf"
            "/var/lib/postgresql/data/pg_hba.conf"
            "/var/lib/postgresql/$PG_MAJOR/main/pg_hba.conf"
        )
        
        CONFIG_PATH=""
        for path in "${CONFIG_PATHS[@]}"; do
            echo "Checking: $path"
            if [ -f "$path" ]; then
                CONFIG_PATH="$path"
                echo "Found pg_hba.conf at: $path"
                break
            fi
        done
        
        if [ -z "$CONFIG_PATH" ]; then
            echo "ERROR: Could not find pg_hba.conf file"
            echo "Please run: sudo find /etc /var -name 'pg_hba.conf' 2>/dev/null"
            exit 1
        fi
    fi
    
    echo "Using pg_hba.conf at: $CONFIG_PATH"
    sudo cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backup created successfully"
    echo ""
    
    # Export CONFIG_PATH for use in other functions
    export CONFIG_PATH
}

# Function to update authentication method
update_auth_method() {
    echo "3. Updating authentication method to md5..."
    
    # Use the CONFIG_PATH from backup_config function
    if [ -z "$CONFIG_PATH" ] || [ ! -f "$CONFIG_PATH" ]; then
        echo "ERROR: pg_hba.conf file not found or not accessible: $CONFIG_PATH"
        exit 1
    fi
    
    echo "Updating $CONFIG_PATH"
    echo "Current configuration before changes:"
    sudo cat "$CONFIG_PATH" | grep -E '^(local|host)' | head -10
    echo ""
    
    # Update local connections to use md5 instead of peer (but keep postgres user as peer for system access)
    sudo sed -i '/^local.*postgres.*peer$/!s/^local\s\+all\s\+all\s\+peer$/local   all             all                                     md5/' "$CONFIG_PATH"
    
    # Ensure host connections use md5 or scram-sha-256 (but change ident to md5)
    sudo sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+ident$/host    all             all             127.0.0.1\/32            md5/' "$CONFIG_PATH"
    sudo sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+ident$/host    all             all             ::1\/128                 md5/' "$CONFIG_PATH"
    
    echo "Authentication method updated"
    echo "Current configuration after changes:"
    sudo cat "$CONFIG_PATH" | grep -E '^(local|host)' | head -10
    echo ""
}

# Function to create application database user
create_app_user() {
    echo "4. Creating application database user..."
    
    # First ensure the database exists
    sudo -u postgres psql -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'filmflex') THEN
                CREATE DATABASE filmflex;
                RAISE NOTICE 'Database filmflex created';
            ELSE
                RAISE NOTICE 'Database filmflex already exists';
            END IF;
        END
        \$\$;
    "
    
    # Create filmflex user with password
    sudo -u postgres psql -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'filmflex') THEN
                CREATE USER filmflex WITH PASSWORD 'filmflex2024!';
                RAISE NOTICE 'User filmflex created';
            ELSE
                ALTER USER filmflex WITH PASSWORD 'filmflex2024!';
                RAISE NOTICE 'User filmflex password updated';
            END IF;
            
            -- Grant privileges
            GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
            ALTER USER filmflex CREATEDB;
            RAISE NOTICE 'Privileges granted to filmflex user';
        END
        \$\$;
    "
    
    echo "User 'filmflex' created/updated with password"
    echo ""
}

# Function to restart PostgreSQL service
restart_postgresql() {
    echo "5. Restarting PostgreSQL service..."
    sudo systemctl restart postgresql
    
    # Wait for service to start
    sleep 3
    
    # Check if service is running
    if sudo systemctl is-active --quiet postgresql; then
        echo "PostgreSQL service restarted successfully"
    else
        echo "ERROR: PostgreSQL service failed to restart"
        exit 1
    fi
    echo ""
}

# Function to test connection
test_connection() {
    echo "6. Testing database connection..."
    
    # Test connection with new user
    if PGPASSWORD='filmflex2024!' psql -h localhost -U filmflex -d filmflex -c '\dt' > /dev/null 2>&1; then
        echo "✅ Database connection test PASSED"
        echo "Connection string: postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    else
        echo "❌ Database connection test FAILED"
        echo "Please check the configuration manually"
    fi
    echo ""
}

# Function to display next steps
show_next_steps() {
    echo "=== NEXT STEPS ==="
    echo "1. Update your .env file with the new database connection:"
    echo "   DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    echo ""
    echo "2. Run the database schema fix:"
    echo "   cd /var/www/filmflex"
    echo "   node scripts/data/fix-array-columns.cjs"
    echo ""
    echo "3. Test movie import:"
    echo "   node scripts/data/import-movies-sql.cjs"
    echo ""
}

# Main execution
main() {
    check_current_auth
    backup_config
    update_auth_method
    create_app_user
    restart_postgresql
    test_connection
    show_next_steps
    
    echo "✅ PostgreSQL authentication fix completed!"
}

# Execute main function
main
