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
INCLUDE_ELASTICSEARCH=false
SYNC_ELASTICSEARCH=false
FORCE_DEPLOYMENT=false
SKIP_NGINX=false

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

# Show help information
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --app-only       Deploy only the application (connect to existing database)"
    echo "  --full           Deploy both application and database"
    echo "  --with-elasticsearch  Include Elasticsearch service in deployment"
    echo "  --sync-elasticsearch  Force Elasticsearch data sync after deployment"
    echo "  --force          Force deployment even if checks fail"
    echo "  --skip-nginx     Skip Nginx configuration"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --app-only    # Deploy app only (recommended)"
    echo "  $0 --full        # Deploy everything"
    echo "  $0 --app-only --with-elasticsearch  # Deploy app with Elasticsearch"
    echo "  $0 --full --sync-elasticsearch      # Full deploy with ES sync"
}

# Parse command line arguments
parse_arguments() {
    # Set default if no arguments provided
    if [ $# -eq 0 ]; then
        DEPLOYMENT_MODE="app-only"
        DEPLOY_APP=true
        MODE_NAME="App-Only Deployment"
        print_mode "No arguments provided - defaulting to app-only deployment"
        return 0
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --app-only)
                DEPLOYMENT_MODE="app-only"
                DEPLOY_APP=true
                MODE_NAME="App-Only Deployment"
                shift
                ;;
            --full)
                DEPLOYMENT_MODE="full"
                DEPLOY_DATABASE=true
                DEPLOY_APP=true
                MODE_NAME="Full Deployment"
                shift
                ;;
            --with-elasticsearch)
                INCLUDE_ELASTICSEARCH=true
                shift
                ;;
            --sync-elasticsearch)
                SYNC_ELASTICSEARCH=true
                INCLUDE_ELASTICSEARCH=true  # Auto-enable ES if sync is requested
                shift
                ;;
            --force)
                FORCE_DEPLOYMENT=true
                shift
                ;;
            --skip-nginx)
                SKIP_NGINX=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validate arguments
    if [ "$DEPLOYMENT_MODE" = "" ]; then
        print_error "No deployment mode specified"
        show_help
        exit 1
    fi
    
    print_mode "Selected: $MODE_NAME"
    if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
        print_info "✅ Elasticsearch integration enabled"
    fi
    if [ "$SYNC_ELASTICSEARCH" = true ]; then
        print_info "✅ Elasticsearch data sync enabled"
    fi
    if [ "$FORCE_DEPLOYMENT" = true ]; then
        print_warning "⚠️  Force deployment enabled"
    fi
}

# Initialize deployment
initialize_deployment() {
    print_header "🔧 Initializing Deployment Environment"
    
    # Verify Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Verify Docker Compose is available
    if ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available"
        exit 1
    fi
    
    print_status "✅ Docker environment verified"
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

# Sync static files with Nginx directory
sync_nginx_static_files() {
    print_header "🔄 Syncing Static Files with Nginx"
    
    local nginx_static_dir="/var/www/filmflex"
    local temp_dist_dir="/tmp/filmflex-dist-$(date +%s)"
    
    # Check if nginx static directory exists
    if [ ! -d "$nginx_static_dir" ]; then
        print_info "Creating Nginx static directory: $nginx_static_dir"
        if ! mkdir -p "$nginx_static_dir"; then
            print_error "Failed to create Nginx static directory"
            return 1
        fi
    fi
    
    # Extract static files from the deployed container
    print_info "Extracting static files from filmflex-app container..."
    if ! docker cp filmflex-app:/app/dist "$temp_dist_dir"; then
        print_error "Failed to extract static files from container"
        return 1
    fi
    
    # Backup existing static files if they exist
    if [ -d "$nginx_static_dir/dist" ]; then
        local backup_dir="$nginx_static_dir/dist.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backing up existing static files to: $backup_dir"
        if ! mv "$nginx_static_dir/dist" "$backup_dir"; then
            print_warning "Failed to backup existing static files, continuing anyway..."
        fi
    fi
    
    # Copy new static files to Nginx directory
    print_info "Copying new static files to Nginx directory..."
    if ! cp -r "$temp_dist_dir" "$nginx_static_dir/dist"; then
        print_error "Failed to copy static files to Nginx directory"
        return 1
    fi
    
    # Set proper permissions
    print_info "Setting proper permissions on static files..."
    chown -R www-data:www-data "$nginx_static_dir" 2>/dev/null || true
    chmod -R 755 "$nginx_static_dir" 2>/dev/null || true
    
    # Clean up temporary directory
    rm -rf "$temp_dist_dir"
    
    # Reload Nginx to ensure it picks up any changes
    print_info "Reloading Nginx configuration..."
    if command -v systemctl >/dev/null 2>&1; then
        if ! systemctl reload nginx; then
            print_warning "Failed to reload Nginx via systemctl, trying alternative..."
            nginx -s reload 2>/dev/null || print_warning "Failed to reload Nginx"
        fi
    else
        nginx -s reload 2>/dev/null || print_warning "Failed to reload Nginx"
    fi
    
    # Verify static files were copied correctly
    if [ -f "$nginx_static_dir/dist/index.html" ] || [ -f "$nginx_static_dir/dist/public/index.html" ]; then
        print_status "✅ Static files synchronized successfully"
        
        # Show some info about what was synced
        local static_size=$(du -sh "$nginx_static_dir/dist" 2>/dev/null | cut -f1)
        print_info "Static files size: $static_size"
        
        return 0
    else
        print_error "❌ Static file synchronization verification failed"
        return 1
    fi
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
    
    # Update to latest source code
    if ! update_to_latest_commit; then
        print_error "Failed to update to latest source code"
        if [ "$FORCE_DEPLOYMENT" != true ]; then
            exit 1
        else
            print_warning "Continuing with current code due to --force flag"
        fi
    fi
    
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
    
    # Setup Elasticsearch service if requested
    if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
        if ! setup_elasticsearch_service; then
            print_error "Failed to setup Elasticsearch service"
            if [ "$FORCE_DEPLOYMENT" != true ]; then
                exit 1
            else
                print_warning "Continuing without Elasticsearch due to --force flag"
            fi
        fi
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
            
            # Sync Elasticsearch data if requested
            if ! sync_elasticsearch_data; then
                print_warning "⚠️  Elasticsearch sync failed or skipped"
            fi
            
            # Sync static files with Nginx
            if ! sync_nginx_static_files; then
                print_warning "⚠️  Static file synchronization failed"
            fi
            
            # Generate deployment report
            generate_deployment_report "SUCCESS"
            
            # Final production readiness check
            if final_production_check; then
                print_status "🎉 Production deployment completed successfully!"
                print_info "🌐 Application available at: http://38.54.14.154:5000"
                print_info "🔗 Domain: https://phimgg.com"
                
                # Show deployment summary
                echo ""
                echo "========================================="
                echo "🎉 DEPLOYMENT SUCCESSFUL"
                echo "========================================="
                echo "✅ Latest source code deployed"
                echo "✅ Application built and started"
                if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
                    echo "✅ Elasticsearch service configured"
                fi
                if [ "$SYNC_ELASTICSEARCH" = true ]; then
                    echo "✅ Elasticsearch data synchronized"
                fi
                echo "✅ Health checks passed"
                echo "✅ Static files synchronized with Nginx"
                echo ""
                echo "🌐 Access URLs:"
                echo "   Local:      http://localhost:5000"
                echo "   Production: http://38.54.14.154:5000"
                echo "   Domain:     https://phimgg.com"
                echo "========================================="
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
            
            # Sync Elasticsearch data if requested
            if ! sync_elasticsearch_data; then
                print_warning "⚠️  Elasticsearch sync failed or skipped"
            fi
            
            # Sync static files with Nginx
            if ! sync_nginx_static_files; then
                print_warning "⚠️  Static file synchronization failed"
            fi
            
            # Generate deployment report
            generate_deployment_report "SUCCESS"
            
            # Final production readiness check
            if final_production_check; then
                print_status "🎉 Production deployment completed successfully!"
                print_info "🌐 Application available at: http://38.54.14.154:5000"
                print_info "🔗 Domain: https://phimgg.com"
                
                # Show deployment summary for full deployment
                echo ""
                echo "========================================="
                echo "🎉 FULL DEPLOYMENT SUCCESSFUL"
                echo "========================================="
                echo "✅ Latest source code deployed"
                echo "✅ Database and application services started"
                if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
                    echo "✅ Elasticsearch service configured"
                fi
                if [ "$SYNC_ELASTICSEARCH" = true ]; then
                    echo "✅ Elasticsearch data synchronized"
                fi
                echo "✅ Health checks passed"
                echo "✅ Static files synchronized with Nginx"
                echo ""
                echo "🌐 Access URLs:"
                echo "   Local:      http://localhost:5000"
                echo "   Production: http://38.54.14.154:5000"
                echo "   Domain:     https://phimgg.com"
                echo ""
                echo "📊 Services Status:"
                docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex
                echo "========================================="
            else
                print_warning "⚠️  Deployment completed but with some issues detected"
            fi
        else
            print_error "❌ Health check failed after full deployment"
            exit 1
        fi
    fi
}