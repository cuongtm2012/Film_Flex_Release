#!/bin/bash

echo "🚀 FilmFlex Production Deployment Script"
echo "=========================================="
echo "📅 Date: $(date)"
echo "🌐 Target: Production Server (38.54.14.154)"
echo "🎬 Database: 5,005+ Movies Pre-loaded"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common-functions.sh"

# Initialize logging
init_logging "deploy-production"

# Deployment mode selection
echo ""
print_header "Select Deployment Mode:"
echo ""
print_mode "1) Full Deployment (Database + Application)"
echo "   ├─ Redeploys both PostgreSQL and FilmFlex containers"
echo "   ├─ Use for fresh setup or major updates"
echo "   ├─ Includes database initialization and health checks"
echo "   └─ Takes longer but ensures complete environment refresh"
echo ""
print_mode "2) App-Only Deployment (Application Only)"
echo "   ├─ Updates only the FilmFlex application container"
echo "   ├─ Use for code updates and quick releases"
echo "   ├─ Keeps existing database container running"
echo "   └─ Faster deployment for routine updates"
echo ""

# Get user selection with validation
DEPLOYMENT_MODE=""
while [[ ! "$DEPLOYMENT_MODE" =~ ^[12]$ ]]; do
    read -p "Please select deployment mode (1 or 2): " DEPLOYMENT_MODE
    if [[ ! "$DEPLOYMENT_MODE" =~ ^[12]$ ]]; then
        print_warning "Invalid selection. Please enter 1 or 2."
    fi
done

# Set deployment flags based on selection
if [ "$DEPLOYMENT_MODE" = "1" ]; then
    DEPLOY_DATABASE=true
    DEPLOY_APP=true
    MODE_NAME="Full Deployment"
    print_status "Selected: Full Deployment (Database + Application)"
else
    DEPLOY_DATABASE=false
    DEPLOY_APP=true
    MODE_NAME="App-Only Deployment"
    print_status "Selected: App-Only Deployment (Application Only)"
fi

echo ""
print_header "Deployment Configuration:"
print_info "• Mode: $MODE_NAME"
print_info "• Database: $([ "$DEPLOY_DATABASE" = true ] && echo "Will be deployed/restarted" || echo "Will remain running (no changes)")"
print_info "• Application: Will be deployed/updated with latest code"
print_info "• Source: Latest code from main branch"
echo ""

# Confirmation prompt
read -p "Continue with $MODE_NAME? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled by user."
    exit 0
fi

# Acquire deployment lock
acquire_lock "deployment" 300

# Check prerequisites
print_info "Checking prerequisites..."
check_docker_prerequisites || exit 1
print_status "Prerequisites check passed"

# Conditional cleanup based on deployment mode
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Full cleanup - stopping all containers and removing images..."
    docker compose -f docker-compose.server.yml down --remove-orphans 2>/dev/null || true
    docker stop filmflex-app filmflex-postgres 2>/dev/null || true
    docker rm filmflex-app filmflex-postgres 2>/dev/null || true
    
    # Remove old images to force fresh pull
    print_info "Removing old images to force fresh download..."
    docker rmi cuongtm2012/filmflex-app:latest 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-app:local 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-postgres-data:latest 2>/dev/null || true
else
    print_info "App-only cleanup - stopping only application container..."
    docker stop filmflex-app 2>/dev/null || true
    docker rm filmflex-app 2>/dev/null || true
    
    # Remove only app images to force fresh pull
    print_info "Removing old application images to force update..."
    docker rmi cuongtm2012/filmflex-app:latest 2>/dev/null || true
    docker rmi cuongtm2012/filmflex-app:local 2>/dev/null || true
    
    # Check if database is running
    if docker ps | grep -q filmflex-postgres; then
        print_status "Database container is running - will be preserved"
    else
        print_warning "Database container is not running - consider Full Deployment mode"
        read -p "Continue with App-Only deployment anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Switching to Full Deployment mode..."
            DEPLOY_DATABASE=true
            MODE_NAME="Full Deployment (Auto-switched)"
        fi
    fi
fi

# Clean up Docker system
docker system prune -f 2>/dev/null || true

# Configure domain settings
print_info "Configuring domain settings for phimgg.com..."
configure_domain

# Ensure latest main branch code
ensure_main_branch || {
    print_warning "Could not update to latest main branch - continuing with current code"
}

# Create Docker Compose configuration based on deployment mode
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Creating full Docker Compose configuration (Database + App)..."
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
      - "127.0.0.1:5432:5432"
    networks:
      - filmflex-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U filmflex -d filmflex"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
      NODE_ENV: production
      PORT: 5000
      DOMAIN: "phimgg.com"
      SERVER_DOMAIN: "phimgg.com"
      PUBLIC_URL: "https://phimgg.com"
      CLIENT_URL: "https://phimgg.com"
      BASE_URL: "https://phimgg.com"
      ALLOWED_ORIGINS: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000,https://38.54.14.154:5000,http://localhost:5000"
      CORS_ORIGIN: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Forwarded-For,X-Forwarded-Proto"
      CORS_CREDENTIALS: "true"
      HOST: "0.0.0.0"
      SERVER_IP: "38.54.14.154"
      SESSION_SECRET: filmflex_production_secret_2024
      TRUST_PROXY: "true"
      APP_VERSION: "$(date +%s)"
      CACHE_BUSTER: "$(date +%Y%m%d_%H%M%S)"
    ports:
      - "127.0.0.1:5000:5000"
    networks:
      - filmflex-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
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
else
    print_info "Creating app-only Docker Compose configuration..."
    cat > docker-compose.server.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  app:
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://filmflex:filmflex2024@filmflex-postgres:5432/filmflex
      NODE_ENV: production
      PORT: 5000
      DOMAIN: "phimgg.com"
      SERVER_DOMAIN: "phimgg.com"
      PUBLIC_URL: "https://phimgg.com"
      CLIENT_URL: "https://phimgg.com"
      BASE_URL: "https://phimgg.com"
      ALLOWED_ORIGINS: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000,https://38.54.14.154:5000,http://localhost:5000"
      CORS_ORIGIN: "https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com,http://38.54.14.154:5000"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Forwarded-For,X-Forwarded-Proto"
      CORS_CREDENTIALS: "true"
      HOST: "0.0.0.0"
      SERVER_IP: "38.54.14.154"
      SESSION_SECRET: filmflex_production_secret_2024
      TRUST_PROXY: "true"
      APP_VERSION: "$(date +%s)"
      CACHE_BUSTER: "$(date +%Y%m%d_%H%M%S)"
    ports:
      - "127.0.0.1:5000:5000"
    external_links:
      - "filmflex-postgres:postgres"
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  app_logs:
    driver: local
COMPOSE_EOF
fi

print_status "Docker Compose configuration created for $MODE_NAME"

# Pull/build images
print_info "Starting deployment process..."
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Pulling all Docker images (forcing fresh download)..."
    docker compose -f docker-compose.server.yml pull --no-cache
else
    print_info "Pulling only application Docker image (forcing fresh download)..."
    docker pull --no-cache cuongtm2012/filmflex-app:latest
fi

# Build local image if source available
if [ -f "Dockerfile" ] || [ -f "Dockerfile.final" ]; then
    print_info "Building application with latest source code..."
    dockerfile="Dockerfile"
    [ -f "Dockerfile.final" ] && dockerfile="Dockerfile.final"
    
    if docker build --no-cache --pull -t cuongtm2012/filmflex-app:local -f "$dockerfile" .; then
        print_status "Using locally built image with latest source code"
        sed -i 's|image: cuongtm2012/filmflex-app:latest|image: cuongtm2012/filmflex-app:local|' docker-compose.server.yml
    else
        print_warning "Local build failed, using pulled image"
    fi
fi

# Start services
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Starting all FilmFlex services..."
    docker compose -f docker-compose.server.yml up -d --force-recreate --renew-anon-volumes
    
    # Wait and verify database
    print_info "Waiting for database initialization..."
    sleep 30
    
    for i in {1..10}; do
        if docker exec filmflex-postgres pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
            print_status "Database is ready"
            break
        fi
        print_info "Database still initializing... (attempt $i/10)"
        sleep 15
    done
    
    # Get movie count
    MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
    if [ "$MOVIE_COUNT" -gt 0 ]; then
        print_status "Database verified: $MOVIE_COUNT movies loaded"
    fi
else
    print_info "Starting FilmFlex application (app-only deployment)..."
    
    # Check existing database
    if ! docker ps | grep -q filmflex-postgres; then
        print_error "No existing database container found!"
        exit 1
    fi
    
    docker compose -f docker-compose.server.yml up -d --force-recreate app
    sleep 15
fi

# Test application
print_info "Testing application endpoints..."
sleep 10

LOCAL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
DOMAIN_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://phimgg.com 2>/dev/null || echo "000")

if [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_status "Local application responding (HTTP $LOCAL_HTTP_CODE)"
else
    print_warning "Local application not responding (HTTP $LOCAL_HTTP_CODE)"
fi

if [ "$API_HTTP_CODE" = "200" ]; then
    print_status "API health endpoint responding (HTTP $API_HTTP_CODE)"
else
    print_warning "API health endpoint not responding (HTTP $API_HTTP_CODE)"
fi

# Check Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    print_status "Nginx is running"
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
        systemctl reload nginx 2>/dev/null || print_warning "Could not reload Nginx"
    else
        print_warning "Nginx configuration has issues"
    fi
else
    print_warning "Nginx is not running - domain access will not work"
fi

# Post-deployment health check
echo ""
print_header "Post-Deployment Health Check"
perform_basic_health_check
HEALTH_PASSED=$?

# Final summary
echo ""
print_header "🎉 FilmFlex $MODE_NAME Complete!"
print_status "Domain URL: https://phimgg.com"
print_status "Direct Access: http://38.54.14.154:5000"
print_status "Status: Production Ready"

echo ""
print_info "Deployment Summary:"
print_info "• Mode: $MODE_NAME"
print_info "• Source: Latest main branch code"
print_info "• Application: Updated with latest changes"
print_info "• Domain: Configured for phimgg.com"
print_info "• Health Check: $([ $HEALTH_PASSED -eq 0 ] && echo "PASSED" || echo "ISSUES DETECTED")"

echo ""
print_info "Management Commands:"
print_info "• View logs: docker compose -f docker-compose.server.yml logs -f"
print_info "• Restart services: docker compose -f docker-compose.server.yml restart"
print_info "• Health check: ./scripts/deployment/health-check.sh"
print_info "• Domain config: ./scripts/deployment/configure-domain.sh"

# Final status
if [ "$LOCAL_HTTP_CODE" = "200" ] && [ $HEALTH_PASSED -eq 0 ]; then
    print_status "✅ $MODE_NAME SUCCESS: All systems operational!"
elif [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_warning "⚠️  $MODE_NAME PARTIAL: App works but health issues detected"
else
    print_error "❌ $MODE_NAME FAILED: Application not responding"
fi

print_status "Deployment completed! 🎬"