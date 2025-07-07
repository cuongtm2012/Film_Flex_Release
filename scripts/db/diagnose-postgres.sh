#!/bin/bash
# PostgreSQL Diagnostic Script
# Version: 1.0
# Description: Diagnoses PostgreSQL configuration for phimgg.com production

echo "=== PostgreSQL Diagnostic Script ==="
echo "Server: phimgg.com (154.205.142.255)"
echo "Date: $(date)"
echo ""

echo "1. PostgreSQL Service Status:"
sudo systemctl status postgresql --no-pager | head -10
echo ""

echo "2. PostgreSQL Version and Basic Info:"
sudo -u postgres psql -c "SELECT version();"
echo ""

echo "3. PostgreSQL Configuration File Location:"
CONFIG_FILE=$(sudo -u postgres psql -t -c "SHOW config_file;" 2>/dev/null | tr -d ' ')
echo "Main config file: $CONFIG_FILE"

if [ -n "$CONFIG_FILE" ]; then
    CONFIG_DIR=$(dirname "$CONFIG_FILE")
    echo "Config directory: $CONFIG_DIR"
    
    echo ""
    echo "4. Files in config directory:"
    ls -la "$CONFIG_DIR"
    
    echo ""
    echo "5. Looking for pg_hba.conf:"
    PG_HBA_PATH="$CONFIG_DIR/pg_hba.conf"
    if [ -f "$PG_HBA_PATH" ]; then
        echo "Found pg_hba.conf at: $PG_HBA_PATH"
        echo ""
        echo "6. Current pg_hba.conf authentication settings:"
        sudo cat "$PG_HBA_PATH" | grep -E '^(local|host)' | head -10
    else
        echo "pg_hba.conf not found at expected location: $PG_HBA_PATH"
        echo ""
        echo "6. Searching for pg_hba.conf files:"
        sudo find /etc /var -name 'pg_hba.conf' 2>/dev/null | head -5
    fi
else
    echo "Could not determine config file location"
    echo ""
    echo "4. Searching for PostgreSQL config files:"
    sudo find /etc /var -name 'postgresql.conf' 2>/dev/null | head -5
    echo ""
    echo "5. Searching for pg_hba.conf files:"
    sudo find /etc /var -name 'pg_hba.conf' 2>/dev/null | head -5
fi

echo ""
echo "7. PostgreSQL Data Directory:"
sudo -u postgres psql -t -c "SHOW data_directory;" 2>/dev/null

echo ""
echo "8. Current PostgreSQL Users:"
sudo -u postgres psql -c '\du'

echo ""
echo "9. Current Databases:"
sudo -u postgres psql -c '\l'

echo ""
echo "10. PostgreSQL Process Information:"
ps aux | grep postgres | grep -v grep

echo ""
echo "11. PostgreSQL Port and Connections:"
sudo -u postgres psql -c "SHOW port;"
sudo -u postgres psql -c "SHOW listen_addresses;"

echo ""
echo "=== Diagnostic Complete ==="
