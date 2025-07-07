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
    PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | grep -oP '\d+\.\d+' | head -1)
    CONFIG_PATH="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
    
    sudo cp "$CONFIG_PATH" "$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backup created: $CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    echo ""
}

# Function to update authentication method
update_auth_method() {
    echo "3. Updating authentication method to md5..."
    PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | grep -oP '\d+\.\d+' | head -1)
    CONFIG_PATH="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
    
    # Update local connections to use md5 instead of peer
    sudo sed -i 's/^local\s\+all\s\+all\s\+peer$/local   all             all                                     md5/' "$CONFIG_PATH"
    
    # Ensure host connections use md5
    sudo sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+ident$/host    all             all             127.0.0.1\/32            md5/' "$CONFIG_PATH"
    sudo sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+ident$/host    all             all             ::1\/128                 md5/' "$CONFIG_PATH"
    
    echo "Authentication method updated to md5"
    echo ""
}

# Function to create application database user
create_app_user() {
    echo "4. Creating application database user..."
    
    # Create filmflex user with password
    sudo -u postgres psql -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'filmflex') THEN
                CREATE USER filmflex WITH PASSWORD 'filmflex2024!';
                GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
                ALTER USER filmflex CREATEDB;
            ELSE
                ALTER USER filmflex WITH PASSWORD 'filmflex2024!';
                GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
            END IF;
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
        echo "Connection string: postgresql://filmflex:filmflex2024!@localhost:5432/filmflex"
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
    echo "   DATABASE_URL=postgresql://filmflex:filmflex2024!@localhost:5432/filmflex"
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
