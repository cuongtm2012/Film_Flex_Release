#!/bin/bash
# Simple setup for notification system on production server
# Run this from /root/Film_Flex_Release directory

set -e
cd /root/Film_Flex_Release

echo "=========================================="
echo "Notification System Setup"
echo "=========================================="

# Step 1: Check Redis
echo ""
echo "Step 1: Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running"
else
    echo "✗ Redis not running. Please install it first."
    exit 1
fi

# Step 2: Update .env file
echo ""
echo "Step 2: Updating .env configuration..."
if [ ! -f .env ]; then
    echo "✗ .env file not found!"
    exit 1
fi

# Add Redis config if not exists
if ! grep -q "REDIS_HOST" .env; then
    cat >> .env << EOF

# Redis Configuration for Notification Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EOF
    echo "✓ Added Redis config to .env"
else
    echo "✓ Redis config already in .env"
fi

# Step 3: Install npm dependencies
echo ""
echo "Step 3: Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"

# Step 4: Run database migration via Docker
echo ""
echo "Step 4: Running database migration..."

# Check if migration already exists
CHECK=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_recipients')")

if [ "$CHECK" = "t" ]; then
    echo "⚠ Migration already applied"
    read -p "Re-run migration? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker exec -i filmflex-postgres psql -U filmflex -d filmflex < migrations/20250108_notification_recipients.sql
        echo "✓ Migration re-applied"
    else
        echo "✓ Skipped migration"
    fi
else
    docker exec -i filmflex-postgres psql -U filmflex -d filmflex < migrations/20250108_notification_recipients.sql
    echo "✓ Migration completed"
fi

# Step 5: Build application
echo ""
echo "Step 5: Building application..."
npm run build
echo "✓ Build completed"

# Step 6: Restart application
echo ""
echo "Step 6: Restarting application..."
docker-compose restart app

# Wait for app to be healthy
echo "Waiting for app to start..."
sleep 10

if docker exec filmflex-app curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✓ Application is healthy"
else
    echo "⚠ Application may not be fully ready yet"
    echo "Check logs: docker-compose logs app"
fi

echo ""
echo "=========================================="
echo "✓ Setup completed!"
echo "=========================================="
echo ""
echo "Services:"
docker-compose ps
echo ""
echo "Next steps:"
echo "  - Check app logs: docker-compose logs -f app"
echo "  - Test Redis: redis-cli ping"
echo "  - Access dashboard: http://38.54.14.154/admin/notifications"
echo ""
