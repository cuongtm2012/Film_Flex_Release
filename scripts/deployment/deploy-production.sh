#!/bin/bash

echo "🚀 FilmFlex Production Deployment Script"
echo "=========================================="
echo "📅 Date: $(date)"
echo "🌐 Target: Production Server (38.54.14.154)"
echo "🎬 Database: 5,005+ Movies Pre-loaded"
echo ""

# Color codes for output (fallback if common functions not available)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Basic print functions (fallback)
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

print_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

print_mode() {
    echo -e "${BLUE}📦 $1${NC}"
}

# Try to load common functions if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/lib/common-functions.sh" ]; then
    source "$SCRIPT_DIR/lib/common-functions.sh"
    print_info "Loaded common functions library"
else
    print_warning "Common functions library not found, using fallback functions"
fi

# Default deployment mode
DEPLOYMENT_MODE=""
DEPLOY_DATABASE=false
DEPLOY_APP=false
MODE_NAME=""

# Parse command line arguments
show_usage() {
    echo "Usage: $0 [--full|--app-only] [OPTIONS]"
    echo ""
    echo "DEPLOYMENT MODES:"
    echo "  --full        Full deployment (Database + Application)"
    echo "  --app-only    Application-only deployment (faster updates)"
    echo ""
    echo "OPTIONS:"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 --full         # Deploy everything (database + app)"
    echo "  $0 --app-only     # Deploy only the application"
    echo ""
    echo "DESCRIPTION:"
    echo "  --full: Redeploys both PostgreSQL and FilmFlex containers"
    echo "          Use for fresh setup or major updates"
    echo "          Includes database initialization and health checks"
    echo ""
    echo "  --app-only: Updates only the FilmFlex application container"
    echo "              Use for code updates and quick releases" 
    echo "              Keeps existing database container running"
    echo ""
}

# Parse arguments
while [ $# -gt 0 ]; do
    case $1 in
        --full)
            DEPLOYMENT_MODE="full"
            DEPLOY_DATABASE=true
            DEPLOY_APP=true
            MODE_NAME="Full Deployment"
            shift
            ;;
        --app-only)
            DEPLOYMENT_MODE="app-only"
            DEPLOY_DATABASE=false
            DEPLOY_APP=true
            MODE_NAME="App-Only Deployment"
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# If no mode specified, show interactive selection
if [ -z "$DEPLOYMENT_MODE" ]; then
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
    while true; do
        printf "Please select deployment mode (1 or 2): "
        read selection
        case $selection in
            1)
                DEPLOYMENT_MODE="full"
                DEPLOY_DATABASE=true
                DEPLOY_APP=true
                MODE_NAME="Full Deployment"
                break
                ;;
            2)
                DEPLOYMENT_MODE="app-only"
                DEPLOY_DATABASE=false
                DEPLOY_APP=true
                MODE_NAME="App-Only Deployment"
                break
                ;;
            *)
                print_warning "Invalid selection. Please enter 1 or 2."
                ;;
        esac
    done
fi

print_status "Selected: $MODE_NAME"

# Show configuration summary
echo ""
print_header "Deployment Configuration:"
print_info "• Mode: $MODE_NAME"
print_info "• Database: $([ "$DEPLOY_DATABASE" = true ] && echo "Will be deployed/restarted" || echo "Will remain running (no changes)")"
print_info "• Application: Will be deployed/updated with latest code"
print_info "• Source: Latest code from main branch"
echo ""

# Confirmation prompt
printf "Continue with $MODE_NAME? (y/N): "
read -r reply
if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
    print_info "Deployment cancelled by user."
    exit 0
fi

# Basic prerequisite checks
print_info "Checking prerequisites..."

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version >/dev/null 2>&1; then
    print_error "Docker Compose is not available"
    exit 1
fi

print_status "Prerequisites check passed"

# Function to get existing database network
get_database_network() {
    local db_network=$(docker inspect filmflex-postgres --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
    if [ -n "$db_network" ]; then
        echo "$db_network"
    else
        echo "bridge"
    fi
}

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
    
    # Check if database is running and get its network
    if docker ps | grep -q filmflex-postgres; then
        print_status "Database container is running - will be preserved"
        DB_NETWORK=$(get_database_network)
        print_info "Database is on network: $DB_NETWORK"
    else
        print_warning "Database container is not running - consider Full Deployment mode"
        printf "Continue with App-Only deployment anyway? (y/N): "
        read -r reply
        if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
            print_info "Switching to Full Deployment mode..."
            DEPLOY_DATABASE=true
            MODE_NAME="Full Deployment (Auto-switched)"
        fi
    fi
fi

# Clean up Docker system
docker system prune -f 2>/dev/null || true

# Update to latest code if in git repository
if git rev-parse --git-dir >/dev/null 2>&1; then
    print_info "Updating to latest main branch code..."
    git stash 2>/dev/null || true
    git fetch origin || print_warning "Git fetch failed"
    git checkout main 2>/dev/null || git checkout -b main origin/main 2>/dev/null
    git reset --hard origin/main 2>/dev/null && print_status "Updated to latest main branch"
    git clean -fd 2>/dev/null || true
else
    print_warning "Not a Git repository - using current code"
fi

# Create Docker Compose configuration based on deployment mode
print_info "Creating Docker Compose configuration for $MODE_NAME..."

if [ "$DEPLOY_DATABASE" = true ]; then
    # Full deployment configuration
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
    # App-only deployment configuration - connect to existing database network
    # First, detect the existing database network
    DB_NETWORK=${DB_NETWORK:-"bridge"}
    print_info "Connecting app to existing database network: $DB_NETWORK"
    
    cat > docker-compose.server.yml << COMPOSE_EOF
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
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    network_mode: "$DB_NETWORK"

volumes:
  app_logs:
    driver: local
COMPOSE_EOF
fi

print_status "Docker Compose configuration created for $MODE_NAME"

# Pull/build images
print_info "Starting deployment process..."
if [ "$DEPLOY_DATABASE" = true ]; then
    print_info "Pulling all Docker images..."
    docker compose -f docker-compose.server.yml pull
else
    print_info "Pulling application Docker image..."
    docker pull cuongtm2012/filmflex-app:latest
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
    
    for i in $(seq 1 10); do
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
    
    # For app-only deployment, we need to connect to the existing network
    print_info "Connecting new app container to existing database network..."
    docker compose -f docker-compose.server.yml up -d --force-recreate app
    
    # Wait for container to start
    sleep 20
    
    # Additional verification - ensure app can connect to database
    print_info "Verifying database connectivity..."
    for i in $(seq 1 5); do
        if docker exec filmflex-app nc -z filmflex-postgres 5432 2>/dev/null; then
            print_status "App can connect to database"
            break
        elif [ $i -eq 5 ]; then
            print_error "App cannot connect to database after 5 attempts"
            print_info "Checking container logs for details..."
            docker logs filmflex-app --tail 10
        else
            print_info "Waiting for database connection... (attempt $i/5)"
            sleep 10
        fi
    done
fi

# Test application
print_info "Testing application endpoints..."
sleep 15

LOCAL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")

if [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_status "Local application responding (HTTP $LOCAL_HTTP_CODE)"
else
    print_warning "Local application not responding (HTTP $LOCAL_HTTP_CODE)"
    print_info "Checking application logs..."
    docker logs filmflex-app --tail 20
fi

if [ "$API_HTTP_CODE" = "200" ]; then
    print_status "API health endpoint responding (HTTP $API_HTTP_CODE)"
else
    print_warning "API health endpoint not responding (HTTP $API_HTTP_CODE)"
fi

# Check Nginx
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
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

# Basic health check
echo ""
print_header "Post-Deployment Health Check"

health_passed=true

# Check Docker containers
if docker ps --format "table {{.Names}}" | grep -q "^filmflex-app$"; then
    print_status "Application container is running"
else
    print_error "Application container not found"
    health_passed=false
fi

if [ "$DEPLOY_DATABASE" = true ]; then
    if docker ps --format "table {{.Names}}" | grep -q "^filmflex-postgres$"; then
        print_status "Database container is running"
    else
        print_error "Database container not found"
        health_passed=false
    fi
elif docker ps --format "table {{.Names}}" | grep -q "^filmflex-postgres$"; then
    print_status "Database container is running (preserved)"
else
    print_error "Database container not found"
    health_passed=false
fi

# Test endpoints
if [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_status "Application is responding"
else
    print_error "Application not responding"
    health_passed=false
fi

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
print_info "• Health Check: $([ "$health_passed" = true ] && echo "PASSED" || echo "ISSUES DETECTED")"

echo ""
print_info "Management Commands:"
print_info "• View logs: docker compose -f docker-compose.server.yml logs -f"
print_info "• Restart services: docker compose -f docker-compose.server.yml restart"
print_info "• Check containers: docker compose -f docker-compose.server.yml ps"

# Final status
if [ "$LOCAL_HTTP_CODE" = "200" ] && [ "$health_passed" = true ]; then
    print_status "✅ $MODE_NAME SUCCESS: All systems operational!"
elif [ "$LOCAL_HTTP_CODE" = "200" ]; then
    print_warning "⚠️  $MODE_NAME PARTIAL: App works but health issues detected"
else
    print_error "❌ $MODE_NAME FAILED: Application not responding"
    exit 1
fi

print_status "Deployment completed! 🎬"