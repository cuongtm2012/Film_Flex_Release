#!/bin/bash
# Complete setup script for notification queue system using Docker

set -e  # Exit on error

echo "========================================"
echo "Notification Queue System Setup (Docker)"
echo "========================================"

# 1. Check Docker is running
echo ""
echo "Step 1: Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "✗ Docker not found. Please install Docker first."
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "✗ Docker daemon is not running. Please start Docker."
    exit 1
fi

echo "✓ Docker is running"

# 2. Start Redis container
echo ""
echo "Step 2: Starting Redis container..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker exec filmflex-redis redis-cli ping > /dev/null 2>&1; then
        echo "✓ Redis is running and ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "✗ Redis failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# 3. Update .env file if needed
echo ""
echo "Step 3: Updating .env configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
fi

# Update Redis config in .env
if ! grep -q "REDIS_HOST" .env; then
    echo "" >> .env
    echo "# Redis Configuration for Notification Queue" >> .env
    echo "REDIS_HOST=redis" >> .env
    echo "REDIS_PORT=6379" >> .env
    echo "REDIS_PASSWORD=" >> .env
    echo "✓ Redis config added to .env"
else
    # Update existing values
    sed -i 's/^REDIS_HOST=.*/REDIS_HOST=redis/' .env
    echo "✓ Redis config updated in .env"
fi

# 4. Install npm dependencies if needed
echo ""
echo "Step 4: Checking npm dependencies..."
if [ ! -d "node_modules/bull" ]; then
    echo "Installing Bull queue dependencies..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# 5. Run database migration
echo ""
echo "Step 5: Running database migration..."

# Check if postgres container is running
if ! docker ps | grep -q filmflex-postgres; then
    echo "Starting PostgreSQL container..."
    docker-compose up -d postgres
    sleep 5
fi

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run migration through Docker
MIGRATION_CHECK=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_recipients')")

if [ "$MIGRATION_CHECK" = "t" ]; then
    echo "⚠ Migration already applied (notification_recipients table exists)"
    read -p "Do you want to re-run migration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✓ Skipping migration"
    else
        docker exec -i filmflex-postgres psql -U filmflex -d filmflex < migrations/20250108_notification_recipients.sql
        echo "✓ Migration re-applied"
    fi
else
    docker exec -i filmflex-postgres psql -U filmflex -d filmflex < migrations/20250108_notification_recipients.sql
    echo "✓ Migration completed successfully"
fi

# 6. Build and restart application
echo ""
echo "Step 6: Building and restarting application..."

# Build the application
npm run build
echo "✓ Application built"

# Rebuild and restart app container
docker-compose build app
docker-compose up -d app

# Wait for app to be healthy
echo "Waiting for application to be ready..."
for i in {1..60}; do
    if docker exec filmflex-app curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✓ Application is running and healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "⚠ Application health check timeout"
        echo "Check logs with: docker-compose logs app"
    fi
    sleep 2
done

echo ""
echo "========================================"
echo "✓ Setup completed successfully!"
echo "========================================"
echo ""
echo "Services Status:"
docker-compose ps
echo ""
echo "Notification Queue System is ready to use"
echo ""
echo "Useful commands:"
echo "  - Check Redis: docker exec filmflex-redis redis-cli ping"
echo "  - View app logs: docker-compose logs -f app"
echo "  - View Redis logs: docker-compose logs -f redis"
echo "  - Restart services: docker-compose restart"
echo "  - Stop services: docker-compose down"
echo ""
echo "Dashboard URL: http://$(hostname -I | awk '{print $1}')/admin/notifications"
echo ""
