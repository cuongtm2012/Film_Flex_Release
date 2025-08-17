#!/bin/bash
# Docker Import Script - Generated Sun Aug 17 20:04:40 +07 2025
# Run this script locally to import to your Docker container

CONTAINER_NAME="filmflex-postgres"
DB_USER="filmflex"
DB_NAME="filmflex"

if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ $CONTAINER_NAME container is not running!"
    exit 1
fi

echo "📋 Importing schema..."
docker cp filmflex_schema.sql $CONTAINER_NAME:/tmp/
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -f /tmp/filmflex_schema.sql

echo "💾 Importing data..."
docker cp filmflex_data_clean_20250817_200439.sql $CONTAINER_NAME:/tmp/
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -f /tmp/filmflex_data_clean_20250817_200439.sql

echo "✅ Import completed!"
