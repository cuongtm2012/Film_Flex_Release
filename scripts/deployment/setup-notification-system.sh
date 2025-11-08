#!/bin/bash
# Complete setup script for notification queue system on server

set -e  # Exit on error

echo "========================================"
echo "Notification Queue System Setup"
echo "========================================"

# 1. Install Redis
echo ""
echo "Step 1: Installing Redis..."
sudo apt update
sudo apt install -y redis-server

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis installed and running"
else
    echo "✗ Redis installation failed"
    exit 1
fi

# 2. Add Redis config to .env if not exists
echo ""
echo "Step 2: Checking .env configuration..."
if ! grep -q "REDIS_HOST" .env; then
    echo "" >> .env
    echo "# Redis Configuration for Notification Queue" >> .env
    echo "REDIS_HOST=localhost" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "REDIS_PASSWORD=" >> .env
    echo "✓ Redis config added to .env"
else
    echo "✓ Redis config already exists in .env"
fi

# 3. Install npm dependencies if needed
echo ""
echo "Step 3: Checking npm dependencies..."
if [ ! -d "node_modules/bull" ]; then
    echo "Installing Bull queue dependencies..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# 4. Run database migration
echo ""
echo "Step 4: Running database migration..."

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Extract DB credentials
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')

export PGPASSWORD=$DB_PASS

# Check if migration already ran
MIGRATION_CHECK=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_recipients')")

if [ "$MIGRATION_CHECK" = "t" ]; then
    echo "⚠ Migration already applied (notification_recipients table exists)"
    read -p "Do you want to re-run migration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✓ Skipping migration"
    else
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/20250108_notification_recipients.sql
        echo "✓ Migration re-applied"
    fi
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/20250108_notification_recipients.sql
    echo "✓ Migration completed successfully"
fi

# 5. Build application
echo ""
echo "Step 5: Building application..."
npm run build
echo "✓ Application built"

# 6. Restart application
echo ""
echo "Step 6: Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart filmflex || pm2 start dist/index.js --name filmflex
    echo "✓ Application restarted with PM2"
else
    echo "⚠ PM2 not found. Please restart application manually"
    echo "  Run: node dist/index.js"
fi

echo ""
echo "========================================"
echo "✓ Setup completed successfully!"
echo "========================================"
echo ""
echo "Notification Queue System is ready to use"
echo ""
echo "Next steps:"
echo "1. Check Redis: redis-cli ping"
echo "2. View logs: pm2 logs filmflex"
echo "3. Access dashboard: http://your-domain/admin/notifications"
echo ""
