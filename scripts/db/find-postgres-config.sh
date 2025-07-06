#!/bin/bash
# Quick PostgreSQL Config Finder
# Run this first to locate pg_hba.conf before running the main fix script

echo "=== Finding PostgreSQL Configuration ==="

echo "1. Getting config file path from PostgreSQL:"
CONFIG_FILE=$(sudo -u postgres psql -t -c "SHOW config_file;" 2>/dev/null | tr -d ' ')
echo "Config file: $CONFIG_FILE"

if [ -n "$CONFIG_FILE" ]; then
    CONFIG_DIR=$(dirname "$CONFIG_FILE")
    PG_HBA_PATH="$CONFIG_DIR/pg_hba.conf"
    echo "Expected pg_hba.conf path: $PG_HBA_PATH"
    
    if [ -f "$PG_HBA_PATH" ]; then
        echo "✅ Found pg_hba.conf at: $PG_HBA_PATH"
    else
        echo "❌ pg_hba.conf not found at expected location"
    fi
fi

echo ""
echo "2. Searching system for pg_hba.conf files:"
sudo find /etc /var /usr -name 'pg_hba.conf' 2>/dev/null

echo ""
echo "3. PostgreSQL version and data directory:"
sudo -u postgres psql -c "SELECT version();" 2>/dev/null | head -1
sudo -u postgres psql -t -c "SHOW data_directory;" 2>/dev/null

echo ""
echo "4. Common PostgreSQL config locations to check:"
COMMON_PATHS=(
    "/etc/postgresql/*/main/pg_hba.conf"
    "/var/lib/pgsql/data/pg_hba.conf"
    "/usr/local/pgsql/data/pg_hba.conf"
    "/var/lib/postgresql/data/pg_hba.conf"
)

for path in "${COMMON_PATHS[@]}"; do
    if ls $path 2>/dev/null; then
        echo "Found: $path"
    fi
done
