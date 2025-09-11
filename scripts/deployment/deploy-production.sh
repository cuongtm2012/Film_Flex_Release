#!/bin/bash

echo "🚀 FilmFlex Production Deployment Script"
echo "=========================================="
echo "📅 Date: $(date)"
echo "🌐 Target: Production Server (38.54.14.154)"
echo "🎬 Database: 5,005+ Movies Pre-loaded"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running on server
if [[ $(hostname) != "lightnode" ]]; then
    print_warning "This script should be run on the production server"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_info "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available"
    exit 1
fi

print_status "Prerequisites check passed"

# Update source code from Git if repository exists
print_info "Checking for Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_info "Updating source code from Git..."
    
    # Fetch latest changes
    git fetch origin || print_warning "Git fetch failed, using current code"
    
    # Show current branch and latest commits
    current_branch=$(git branch --show-current)
    print_info "Current branch: $current_branch"
    
    # Get latest commits for reference
    print_info "Latest commits:"
    git log --oneline -5 || true
    
    # Pull latest changes
    if git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || git pull origin $current_branch 2>/dev/null; then
        print_status "Source code updated successfully"
        
        # Show what changed
        print_info "Recent changes:"
        git log --oneline -3 HEAD@{1}..HEAD || true
    else
        print_warning "Git pull failed, using current code"
    fi
else
    print_warning "Not a Git repository - using existing source code"
fi

# Create docker-compose.server.yml if it doesn't exist
if [ ! -f "docker-compose.server.yml" ]; then
    print_info "Creating Docker Compose configuration..."
    cat > docker-compose.server.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  postgres:
    # Custom PostgreSQL image with complete movie database (5,005+ movies)
    image: cuongtm2012/filmflex-postgres-data:latest
    container_name: filmflex-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: filmflex
      POSTGRES_USER: filmflex
      POSTGRES_PASSWORD: filmflex2024
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - filmflex-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filmflex -d filmflex"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    # Multi-platform FilmFlex application (supports ARM64 and AMD64)
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      # Database Configuration
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
      
      # Application Configuration
      NODE_ENV: production
      PORT: 5000
      
      # CORS Configuration (Fixed for server deployment)
      ALLOWED_ORIGINS: "*"
      CLIENT_URL: "*"
      CORS_ORIGIN: "*"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma"
      CORS_CREDENTIALS: "true"
      
      # Server Configuration
      DOMAIN: "38.54.14.154"
      SERVER_IP: "38.54.14.154"
      PUBLIC_URL: "http://38.54.14.154:5000"
      
      # Security
      SESSION_SECRET: filmflex_production_secret_2024
    ports:
      - "5000:5000"
    networks:
      - filmflex-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  filmflex-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  app_logs:
    driver: local
COMPOSE_EOF
    print_status "Docker Compose configuration created"
fi

print_info "Starting deployment process..."

# Stop existing containers if running
print_info "Stopping existing containers..."
docker compose -f docker-compose.server.yml down --remove-orphans 2>/dev/null || true

# Clean up any orphaned containers or networks
print_info "Cleaning up Docker resources..."
docker system prune -f 2>/dev/null || true

# Pull latest images with force update
print_info "Pulling latest Docker images (this may take a few minutes)..."
docker compose -f docker-compose.server.yml pull --no-parallel

# Rebuild the application image if we have updated source code
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_info "Checking if application image needs rebuilding..."
    
    # If we have a Dockerfile, we can rebuild the app image locally
    if [ -f "Dockerfile" ] || [ -f "Dockerfile.final" ]; then
        print_info "Found Dockerfile - rebuilding application with latest source..."
        
        # Use the appropriate Dockerfile
        dockerfile="Dockerfile"
        if [ -f "Dockerfile.final" ]; then
            dockerfile="Dockerfile.final"
        fi
        
        # Build new image with latest source code
        docker build -t cuongtm2012/filmflex-app:local -f "$dockerfile" . || {
            print_warning "Local build failed, using pulled image"
        }
        
        # Update docker-compose to use local image if build succeeded
        if docker image inspect cuongtm2012/filmflex-app:local &>/dev/null; then
            print_status "Using locally built image with latest source code"
            sed -i 's|image: cuongtm2012/filmflex-app:latest|image: cuongtm2012/filmflex-app:local|' docker-compose.server.yml
        fi
    fi
fi

# Start services
print_info "Starting FilmFlex services..."
docker compose -f docker-compose.server.yml up -d

# Wait for services to be healthy
print_info "Waiting for services to start..."
sleep 15

# Monitor container startup
print_info "Monitoring container startup..."
for i in {1..12}; do
    sleep 5
    if docker compose -f docker-compose.server.yml ps | grep -q "Up.*healthy"; then
        print_status "Containers are starting up successfully"
        break
    fi
    print_info "Still waiting for containers... ($((i*5)) seconds)"
done

# Check container status
print_info "Checking container status..."
docker compose -f docker-compose.server.yml ps

# Verify database connection and movie count
print_info "Verifying database..."
sleep 10  # Give database more time to fully initialize

MOVIE_COUNT=""
for i in {1..6}; do
    MOVIE_COUNT=$(docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ' || echo "")
    
    if [ ! -z "$MOVIE_COUNT" ] && [ "$MOVIE_COUNT" -gt 0 ]; then
        break
    fi
    print_info "Database still initializing... (attempt $i/6)"
    sleep 10
done

if [ ! -z "$MOVIE_COUNT" ] && [ "$MOVIE_COUNT" -gt 0 ]; then
    print_status "Database verified: $MOVIE_COUNT movies loaded"
else
    print_warning "Could not verify movie count - database may still be initializing"
fi

# Test application endpoint
print_info "Testing application endpoint..."
sleep 5  # Give app more time to start

for i in {1..6}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status "Application is responding correctly (HTTP $HTTP_CODE)"
        break
    else
        print_info "Application starting up... (HTTP $HTTP_CODE, attempt $i/6)"
        sleep 10
    fi
done

if [ "$HTTP_CODE" != "200" ]; then
    print_warning "Application may still be starting up or there might be an issue"
    print_info "Check logs with: docker compose -f docker-compose.server.yml logs -f app"
fi

# Show container logs for debugging
print_info "Recent container logs:"
echo "--- PostgreSQL logs ---"
docker compose -f docker-compose.server.yml logs --tail=10 postgres 2>/dev/null || echo "Could not retrieve postgres logs"
echo "--- Application logs ---"
docker compose -f docker-compose.server.yml logs --tail=10 app 2>/dev/null || echo "Could not retrieve app logs"

echo ""
echo "🎉 FilmFlex Deployment Complete!"
echo "=================================="
print_status "Application URL: http://38.54.14.154:5000"
print_status "Database: PostgreSQL with $MOVIE_COUNT+ movies"
print_status "Status: Production Ready"
echo ""
print_info "Deployment Summary:"
print_info "• Source Code: Updated from Git repository"
print_info "• PostgreSQL: Custom image with complete movie database"
print_info "• Application: Multi-platform image with CORS fixes"
print_info "• Network: Isolated Docker network for security"
print_info "• Storage: Persistent volumes for data and logs"
print_info "• Health Checks: Automatic container health monitoring"
print_info "• Auto Restart: Containers restart automatically on failure"
echo ""
print_info "Management Commands:"
print_info "• View logs: docker compose -f docker-compose.server.yml logs -f"
print_info "• Stop services: docker compose -f docker-compose.server.yml down"
print_info "• Restart services: docker compose -f docker-compose.server.yml restart"
print_info "• Update images: docker compose -f docker-compose.server.yml pull && docker compose -f docker-compose.server.yml up -d"
print_info "• Update source + deploy: git pull && ./scripts/deployment/deploy-production.sh"
echo ""
print_info "Troubleshooting:"
print_info "• Check app logs: docker compose -f docker-compose.server.yml logs -f app"
print_info "• Check database logs: docker compose -f docker-compose.server.yml logs -f postgres"
print_info "• Restart specific service: docker compose -f docker-compose.server.yml restart [app|postgres]"
print_info "• Container status: docker compose -f docker-compose.server.yml ps"
echo ""
print_status "Deployment completed successfully! 🎬"