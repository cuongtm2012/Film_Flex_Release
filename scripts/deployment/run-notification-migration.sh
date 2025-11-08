#!/bin/bash
# Run notification system migration

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')

echo "=== Running Notification System Migration ==="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"

# Set PGPASSWORD for non-interactive mode
export PGPASSWORD=$DB_PASS

# Run migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/20250108_notification_recipients.sql

if [ $? -eq 0 ]; then
    echo "=== Migration completed successfully ==="
else
    echo "=== Migration failed ==="
    exit 1
fi
