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

# Nginx configuration paths
NGINX_SOURCE_DIR="$SCRIPT_DIR/../../nginx"
NGINX_DEST_DIR="/etc/nginx"
NGINX_CONF_D_DIR="/etc/nginx/conf.d"
NGINX_BACKUP_DIR="/etc/nginx/backup/$(date +%Y%m%d_%H%M%S)"

# Enhanced deployment logging and reporting
setup_deployment_logging() {
    # Create deployment logs directory with proper permissions
    local log_dir="$(pwd)/logs/deployment"
    
    # Try to create directory, fallback to /tmp if permissions fail
    if ! mkdir -p "$log_dir" 2>/dev/null; then
        print_warning "Cannot create logs in $(pwd)/logs - using /tmp/filmflex-logs"
        log_dir="/tmp/filmflex-logs"
        mkdir -p "$log_dir" 2>/dev/null || log_dir="/tmp"
    fi
    
    # Create deployment log file with timestamp
    DEPLOYMENT_LOG="$log_dir/deployment-$(date +%Y%m%d_%H%M%S).log"
    
    # Test if we can write to the log file
    if ! touch "$DEPLOYMENT_LOG" 2>/dev/null; then
        print_warning "Cannot write to $DEPLOYMENT_LOG - using console only"
        DEPLOYMENT_LOG=""
    fi
    
    # Function to log both to console and file
    log_deployment() {
        local message="$1"
        local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
        
        if [ -n "$DEPLOYMENT_LOG" ] && [ -w "$DEPLOYMENT_LOG" ]; then
            echo "$timestamp - $message" >> "$DEPLOYMENT_LOG" 2>/dev/null || true
        fi
        
        # Always log to console
        echo "$timestamp - $message" >&2
    }
    
    if [ -n "$DEPLOYMENT_LOG" ]; then
        print_info "Deployment logging initialized: $DEPLOYMENT_LOG"
    else
        print_info "Deployment logging: console only (file logging disabled)"
    fi
    
    log_deployment "FilmFlex $MODE_NAME started"
}

# Pre-build application before Docker build
pre_build_application() {
    print_header "🔨 Pre-building Application"
    
    local project_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    # Change to project root
    cd "$project_root" || {
        print_error "Failed to change to project root: $project_root"
        return 1
    }
    
    print_info "Building application in: $(pwd)"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in project root"
        return 1
    fi
    
    # Clean npm cache to avoid conflicts
    print_info "Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
    
    # Remove node_modules and package-lock.json to ensure fresh install
    print_info "Cleaning previous installation..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Install ALL dependencies including devDependencies
    print_info "Installing all dependencies (including dev dependencies)..."
    if ! npm install --include=dev; then
        print_error "Failed to install dependencies"
        print_info "Trying alternative installation method..."
        
        # Try with legacy peer deps flag
        if ! npm install --include=dev --legacy-peer-deps; then
            print_error "Failed to install dependencies with legacy peer deps"
            return 1
        fi
    fi
    
    # Verify critical build dependencies
    print_info "Verifying build dependencies..."
    local missing_deps=()
    
    if [ ! -d "node_modules/@vitejs/plugin-react" ]; then
        missing_deps+=("@vitejs/plugin-react")
    fi
    
    if [ ! -d "node_modules/vite" ]; then
        missing_deps+=("vite")
    fi
    
    if [ ! -d "node_modules/esbuild" ]; then
        missing_deps+=("esbuild")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_warning "Missing critical dependencies: ${missing_deps[*]}"
        print_info "Installing missing dependencies individually..."
        
        for dep in "${missing_deps[@]}"; do
            print_info "Installing $dep..."
            if ! npm install "$dep" --save-dev; then
                print_error "Failed to install $dep"
                return 1
            fi
        done
    fi
    
    # Clean previous build
    if [ -d "dist" ]; then
        print_info "Cleaning previous build..."
        rm -rf dist
    fi
    
    # Set Node environment for build
    export NODE_ENV=production
    
    # Build the application with verbose output
    print_info "Building application..."
    if ! npm run build 2>&1; then
        print_error "Failed to build application"
        print_info "Trying alternative build approach..."
        
        # Try building client and server separately
        print_info "Building client first..."
        if ! npm run build:client; then
            print_error "Failed to build client"
            return 1
        fi
        
        print_info "Building server..."
        if ! npm run build:server; then
            print_error "Failed to build server"
            return 1
        fi
    fi
    
    # Verify build output
    if [ ! -d "dist" ]; then
        print_error "Build completed but dist directory not found"
        return 1
    fi
    
    if [ ! -f "dist/index.js" ]; then
        print_error "Build completed but dist/index.js not found"
        print_info "Contents of dist directory:"
        ls -la dist/ 2>/dev/null || print_info "dist directory is empty"
        return 1
    fi
    
    print_status "✅ Application built successfully"
    print_info "Build output:"
    ls -la dist/ | head -10
    
    # Verify build size
    local dist_size=$(du -sh dist 2>/dev/null | cut -f1)
    print_info "Build size: $dist_size"
    
    # Return to deployment script directory
    cd "$SCRIPT_DIR" || {
        print_error "Failed to return to deployment script directory"
        return 1
    }
    
    return 0
}

# Create docker compose configuration
create_docker_compose_config() {
    print_header "📄 Creating Docker Compose Configuration"
    
    local compose_file="docker-compose.server.yml"
    
    # Remove existing compose file
    if [ -f "$compose_file" ]; then
        print_info "Removing existing docker-compose.server.yml"
        rm -f "$compose_file"
    fi
    
    # Determine the correct build context (project root)
    local project_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    print_info "Project root directory: $project_root"
    
    # Check if Dockerfile exists
    if [ -f "$project_root/Dockerfile.final" ]; then
        local dockerfile="Dockerfile.final"
        print_info "Using Dockerfile.final for build"
    elif [ -f "$project_root/Dockerfile" ]; then
        local dockerfile="Dockerfile"
        print_info "Using Dockerfile for build"
    else
        print_error "No Dockerfile found in project root: $project_root"
        print_info "Available files in project root:"
        ls -la "$project_root" | grep -E "(Dockerfile|\.dockerfile)" || print_info "No Dockerfile variants found"
        return 1
    fi
    
    # Get existing database credentials for app-only deployment
    local db_password="filmflex123"  # default
    local db_user="filmflex"
    local db_name="filmflex"
    
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        print_info "Detecting existing database credentials..."
        
        # Try to get actual database password from existing container
        if docker ps | grep -q filmflex-postgres; then
            local existing_password=$(docker exec filmflex-postgres env 2>/dev/null | grep POSTGRES_PASSWORD | cut -d= -f2)
            local existing_user=$(docker exec filmflex-postgres env 2>/dev/null | grep POSTGRES_USER | cut -d= -f2)
            local existing_db=$(docker exec filmflex-postgres env 2>/dev/null | grep POSTGRES_DB | cut -d= -f2)
            
            if [ -n "$existing_password" ]; then
                db_password="$existing_password"
                print_status "Detected database password: $db_password"
            fi
            
            if [ -n "$existing_user" ]; then
                db_user="$existing_user"
                print_status "Detected database user: $db_user"
            fi
            
            if [ -n "$existing_db" ]; then
                db_name="$existing_db"
                print_status "Detected database name: $db_name"
            fi
        else
            print_warning "Database container not found, using default credentials"
        fi
    fi
    
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        # App-only deployment - connect to existing database network
        if ! get_database_network; then
            print_error "Failed to detect database network for app-only deployment"
            return 1
        fi
        
        print_info "Creating app-only docker-compose configuration..."
        
        # For app-only deployment, we need to handle the network differently
        if [ "$DATABASE_NETWORK" = "bridge" ]; then
            # Use bridge network - no external network needed
            cat > "$compose_file" << EOF
version: '3.8'

services:
  filmflex-app:
    build:
      context: $project_root
      dockerfile: $dockerfile
    container_name: filmflex-app
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://$db_user:$db_password@filmflex-postgres:5432/$db_name
      - DB_HOST=filmflex-postgres
      - DB_PORT=5432
      - DB_NAME=$db_name
      - DB_USER=$db_user
      - DB_PASSWORD=$db_password
    restart: unless-stopped
    volumes:
      - $project_root/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    driver: bridge
EOF
        else
            # Use external network
            cat > "$compose_file" << EOF
version: '3.8'

services:
  filmflex-app:
    build:
      context: $project_root
      dockerfile: $dockerfile
    container_name: filmflex-app
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://$db_user:$db_password@filmflex-postgres:5432/$db_name
      - DB_HOST=filmflex-postgres
      - DB_PORT=5432
      - DB_NAME=$db_name
      - DB_USER=$db_user
      - DB_PASSWORD=$db_password
    restart: unless-stopped
    volumes:
      - $project_root/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    external: true
    name: $DATABASE_NETWORK
EOF
        fi
        
        print_status "App-only docker-compose.server.yml created with network: $DATABASE_NETWORK"
        
    else
        # Full deployment - include database
        print_info "Creating full deployment docker-compose configuration..."
        
        cat > "$compose_file" << EOF
version: '3.8'

services:
  filmflex-postgres:
    image: postgres:15-alpine
    container_name: filmflex-postgres
    environment:
      POSTGRES_DB: $db_name
      POSTGRES_USER: $db_user
      POSTGRES_PASSWORD: $db_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - $project_root/shared:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $db_user -d $db_name"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  filmflex-app:
    build:
      context: $project_root
      dockerfile: $dockerfile
    container_name: filmflex-app
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://$db_user:$db_password@filmflex-postgres:5432/$db_name
      - DB_HOST=filmflex-postgres
      - DB_PORT=5432
      - DB_NAME=$db_name
      - DB_USER=$db_user
      - DB_PASSWORD=$db_password
    depends_on:
      filmflex-postgres:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - $project_root/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
EOF
        
        print_status "Full deployment docker-compose.server.yml created"
    fi
    
    # Verify compose file was created
    if [ ! -f "$compose_file" ]; then
        print_error "Failed to create docker-compose.server.yml"
        return 1
    fi
    
    # Validate compose file syntax
    if ! docker compose -f "$compose_file" config >/dev/null 2>&1; then
        print_error "Invalid docker-compose configuration"
        print_info "Checking configuration:"
        docker compose -f "$compose_file" config
        return 1
    fi
    
    print_status "Docker compose configuration validated successfully"
    return 0
}

# Initialize deployment variables
initialize_deployment() {
    # Initialize global variables
    LOCAL_HTTP_CODE="000"
    API_HTTP_CODE="000"
    MOVIE_COUNT="0"
    SKIP_NGINX=${SKIP_NGINX:-false}
    FORCE_DEPLOYMENT=${FORCE_DEPLOYMENT:-false}
    DATABASE_NETWORK=""
    
    # Create logs directory
    mkdir -p logs/deployment 2>/dev/null || true
    
    print_status "Deployment variables initialized"
}

# Main deployment execution
main() {
    print_header "🚀 Starting FilmFlex Production Deployment"
    
    # Initialize deployment
    initialize_deployment
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Setup logging
    setup_deployment_logging
    
    # Pre-build application
    if ! pre_build_application; then
        print_error "Failed to pre-build application"
        exit 1
    fi
    
    # Create docker compose configuration
    if ! create_docker_compose_config; then
        print_error "Failed to create docker compose configuration"
        exit 1
    fi
    
    # For app-only deployments, try to connect to existing database network
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        print_info "App-only deployment detected - attempting to connect to existing database network"
        
        # Build and start only the app service
        print_header "🏗️  Building Application"
        if ! docker compose -f docker-compose.server.yml build filmflex-app; then
            print_error "Failed to build application"
            exit 1
        fi
        
        print_header "🚀 Starting Application"
        if ! docker compose -f docker-compose.server.yml up -d filmflex-app; then
            print_error "Failed to start application"
            exit 1
        fi
        
        # Wait for app to be ready
        print_info "Waiting for application to start..."
        sleep 15
        
        # Perform enhanced health check
        if perform_health_check; then
            print_status "✅ App-only deployment completed successfully"
            
            # Generate deployment report
            generate_deployment_report "SUCCESS"
            
            # Final production readiness check
            if final_production_check; then
                print_status "🎉 Production deployment completed successfully!"
                print_info "🌐 Application available at: http://38.54.14.154:5000"
                print_info "🔗 Domain: https://phimgg.com"
            else
                print_warning "⚠️  Deployment completed but with some issues detected"
            fi
        else
            print_error "❌ Health check failed after app-only deployment"
            exit 1
        fi
        
    else
        # Full deployment
        print_header "🏗️  Building Services"
        if ! docker compose -f docker-compose.server.yml build; then
            print_error "Failed to build services"
            exit 1
        fi
        
        print_header "🚀 Starting Services"
        if ! docker compose -f docker-compose.server.yml up -d; then
            print_error "Failed to start services"
            exit 1
        fi
        
        # Wait for services to be ready
        print_info "Waiting for services to start..."
        sleep 30
        
        # Perform enhanced health check
        if perform_health_check; then
            print_status "✅ Full deployment completed successfully"
            
            # Generate deployment report
            generate_deployment_report "SUCCESS"
            
            # Final production readiness check
            if final_production_check; then
                print_status "🎉 Production deployment completed successfully!"
                print_info "🌐 Application available at: http://38.54.14.154:5000"
                print_info "🔗 Domain: https://phimgg.com"
            else
                print_warning "⚠️  Deployment completed but with some issues detected"
            fi
        else
            print_error "❌ Health check failed after full deployment"
            exit 1
        fi
    fi
}

# Error handling and cleanup
cleanup_on_error() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        print_error "🚨 Deployment failed with exit code: $exit_code"
        
        print_info "Gathering failure information..."
        
        # Show container status
        print_info "Container status:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No FilmFlex containers found"
        
        # Show recent logs
        print_info "Recent application logs:"
        docker logs filmflex-app --tail 10 2>/dev/null || echo "Could not retrieve app logs"
        
        print_info "Recent database logs:"
        docker logs filmflex-postgres --tail 10 2>/dev/null || echo "Could not retrieve database logs"
        
        # Generate failure report
        generate_deployment_report "FAILED"
        
        print_error "❌ Deployment failed. Check logs above for details."
    fi
}

# Set up error handling
trap cleanup_on_error EXIT

# Run main function with all arguments
main "$@"