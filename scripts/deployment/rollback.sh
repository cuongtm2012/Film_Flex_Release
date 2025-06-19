#!/bin/bash

# FilmFlex Emergency Rollback Script
# Quickly rollback to previous deployment

set -e

DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="/var/backups/filmflex"

echo "🚨 Emergency Rollback Starting..."

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_* 2>/dev/null | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backup found!"
    exit 1
fi

echo "📦 Rolling back to: $LATEST_BACKUP"

# Stop app
pm2 stop filmflex 2>/dev/null || true

# Restore backup
rm -rf "$DEPLOY_DIR.old" 2>/dev/null || true
mv "$DEPLOY_DIR" "$DEPLOY_DIR.old" 2>/dev/null || true
cp -r "$LATEST_BACKUP" "$DEPLOY_DIR"

# Set permissions
chown -R www-data:www-data "$DEPLOY_DIR"

# Start app
cd "$DEPLOY_DIR"
pm2 start ecosystem.config.js --env production 2>/dev/null || pm2 restart filmflex

echo "✅ Rollback completed!"
echo "🔍 Check status: pm2 status"
