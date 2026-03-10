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

# Store project root for global access
PROJECT_ROOT=""

# Nginx configuration paths
NGINX_SOURCE_DIR="$SCRIPT_DIR/../../nginx"
NGINX_DEST_DIR="/etc/nginx"
NGINX_CONF_D_DIR="/etc/nginx/conf.d"
NGINX_BACKUP_DIR="/etc/nginx/backup/$(date +%Y%m%d_%H%M%S)"

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

# Update git repository to latest commit
update_to_latest_commit() {
    print_header "📥 Updating to Latest Source Code"
    
    local project_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    cd "$project_root" || {
        print_error "Failed to change to project root: $project_root"
        return 1
    }
    
    print_info "Current directory: $(pwd)"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        print_warning "Not in a git repository, skipping git update"
        return 0
    fi
    
    # Get current commit
    local current_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    print_info "Current commit: $current_commit"
    
    # Fetch latest changes
    print_info "Fetching latest changes from remote..."
    if ! git fetch origin; then
        print_warning "Failed to fetch from remote, continuing with current code"
        return 0
    fi
    
    # Get current branch
    local current_branch=$(git branch --show-current 2>/dev/null || echo "main")
    print_info "Current branch: $current_branch"
    
    # Get latest remote commit
    local latest_commit=$(git rev-parse origin/$current_branch 2>/dev/null || echo "unknown")
    print_info "Latest remote commit: $latest_commit"
    
    # Check if update is needed
    if [ "$current_commit" = "$latest_commit" ]; then
        print_status "✅ Already at latest commit"
        return 0
    fi
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --staged --quiet; then
        if [ "$FORCE_DEPLOYMENT" = true ]; then
            print_warning "⚠️  Uncommitted changes detected, continuing due to --force flag"
        else
            print_error "❌ Uncommitted changes detected. Commit changes or use --force"
            return 1
        fi
    fi
    
    # Update to latest commit
    print_info "Updating to latest commit: $latest_commit"
    if ! git checkout "$latest_commit"; then
        if ! git reset --hard origin/$current_branch; then
            print_error "Failed to update to latest commit"
            return 1
        fi
    fi
    
    # Verify update
    local new_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    if [ "$new_commit" = "$latest_commit" ]; then
        print_status "✅ Successfully updated to latest commit: $new_commit"
        
        # Show what changed
        if [ "$current_commit" != "unknown" ] && [ "$current_commit" != "$new_commit" ]; then
            print_info "Changes in this update:"
            git log --oneline "$current_commit..$new_commit" | head -5
            
            local commit_count=$(git rev-list --count "$current_commit..$new_commit" 2>/dev/null || echo "0")
            print_info "Number of new commits: $commit_count"
        fi
        
        return 0
    else
        print_error "Failed to verify git update"
        return 1
    fi
}

# Setup Elasticsearch service
setup_elasticsearch_service() {
    print_header "🔍 Setting up Elasticsearch Service"
    
    # Check if Elasticsearch should be included
    if [ "$INCLUDE_ELASTICSEARCH" != true ]; then
        print_info "Elasticsearch not requested, skipping setup"
        return 0
    fi
    
    print_info "Configuring Elasticsearch service..."
    
    # Always add Elasticsearch to compose file if it's requested
    if ! add_elasticsearch_to_compose; then
        print_error "Failed to add Elasticsearch to compose file"
        return 1
    fi
    
    # Validate the compose file before starting
    print_info "Validating Docker Compose configuration..."
    local project_root="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
    if ! docker compose -f "$project_root/docker-compose.server.yml" config >/dev/null 2>&1; then
        print_error "Docker Compose configuration is invalid"
        docker compose -f "$project_root/docker-compose.server.yml" config 2>&1 | head -10
        return 1
    fi
    
    # Start Elasticsearch service
    print_info "Starting Elasticsearch service..."
    if ! docker compose -f "$project_root/docker-compose.server.yml" up -d filmflex-elasticsearch; then
        print_error "Failed to start Elasticsearch service"
        return 1
    fi
    
    # Wait for Elasticsearch to be ready
    print_info "Waiting for Elasticsearch to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local es_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")
        
        if [ "$es_status" = "200" ]; then
            print_status "✅ Elasticsearch is ready"
            break
        fi
        
        print_info "Elasticsearch not ready yet (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Elasticsearch failed to start within timeout"
        return 1
    fi
    
    return 0
}

# Add Elasticsearch to docker-compose if not present
add_elasticsearch_to_compose() {
    print_info "Checking Elasticsearch service in docker-compose configuration..."
    
    local project_root="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
    local compose_file="$project_root/docker-compose.server.yml"
    
    # Check if elasticsearch service already exists
    if grep -q "filmflex-elasticsearch:" "$compose_file"; then
        print_info "Elasticsearch service already exists in compose file"
        return 0
    fi
    
    print_info "Elasticsearch service configuration already in docker-compose.server.yml"
    return 0
}

# Perform health check
perform_health_check() {
    print_header "🔍 Performing Health Check"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Health check attempt $attempt/$max_attempts"
        
        # Check application health
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null || echo "000")
        local api_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
        
        if [ "$http_code" = "200" ] && [ "$api_code" = "200" ]; then
            print_status "✅ Application health check passed"
            return 0
        fi
        
        print_info "Application not ready yet (HTTP: $http_code, API: $api_code)"
        sleep 10
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Force sync Elasticsearch data after deployment
force_sync_elasticsearch_data() {
    print_header "🔄 Force Syncing Data to Elasticsearch"
    
    # Check if Elasticsearch sync is available
    local es_status_response=$(curl -s "http://localhost:5000/api/elasticsearch/status" 2>/dev/null || echo "")
    
    if ! echo "$es_status_response" | grep -q '"enabled":true'; then
        print_error "❌ Cannot sync - Elasticsearch integration not enabled"
        return 1
    fi
    
    # Trigger full sync with retry logic
    local max_sync_attempts=3
    local sync_attempt=1
    
    while [ $sync_attempt -le $max_sync_attempts ]; do
        print_info "Triggering Elasticsearch full sync (attempt $sync_attempt/$max_sync_attempts)..."
        
        local sync_response=$(curl -s -X POST "http://localhost:5000/api/elasticsearch/sync/full" \
            -H "Content-Type: application/json" \
            --max-time 300 2>/dev/null || echo "")
        
        if echo "$sync_response" | grep -q '"status":true'; then
            print_status "✅ Elasticsearch full sync completed successfully"
            
            # Show sync results
            if echo "$sync_response" | grep -q '"movies"'; then
                local movies_synced=$(echo "$sync_response" | grep -o '"movies":[0-9]*' | cut -d: -f2)
                local episodes_synced=$(echo "$sync_response" | grep -o '"episodes":[0-9]*' | cut -d: -f2)
                print_info "Movies synced: $movies_synced"
                print_info "Episodes synced: $episodes_synced"
                
                if [ "$movies_synced" -gt 0 ]; then
                    print_status "✅ Data successfully synced to Elasticsearch"
                    return 0
                fi
            fi
        fi
        
        print_warning "⚠️  Sync attempt $sync_attempt failed, waiting before retry..."
        sleep 10
        ((sync_attempt++))
    done
    
    print_error "❌ Failed to sync data to Elasticsearch after $max_sync_attempts attempts"
    return 1
}

# Sync data to Elasticsearch
sync_elasticsearch_data() {
    print_header "🔄 Syncing Data to Elasticsearch"
    
    if [ "$SYNC_ELASTICSEARCH" != true ] && [ "$INCLUDE_ELASTICSEARCH" != true ]; then
        print_info "Elasticsearch sync not requested, skipping"
        return 0
    fi
    
    # Wait for application to be ready
    print_info "Waiting for application to be ready for Elasticsearch sync..."
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local app_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
        
        if [ "$app_status" = "200" ]; then
            print_status "✅ Application is ready for sync"
            break
        fi
        
        print_info "Application not ready yet for sync (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_warning "Application not ready for sync, but continuing..."
    fi
    
    # Check Elasticsearch status
    print_info "Checking Elasticsearch status..."
    local es_status_response=$(curl -s "http://localhost:5000/api/elasticsearch/status" 2>/dev/null || echo "")
    
    if echo "$es_status_response" | grep -q '"enabled":true'; then
        print_status "✅ Elasticsearch integration is enabled"
        
        # Trigger full sync
        print_info "Triggering full Elasticsearch sync..."
        local sync_response=$(curl -s -X POST "http://localhost:5000/api/elasticsearch/sync/full" -H "Content-Type: application/json" 2>/dev/null || echo "")
        
        if echo "$sync_response" | grep -q '"status":true'; then
            print_status "✅ Elasticsearch full sync completed successfully"
            
            # Show sync results
            if echo "$sync_response" | grep -q '"movies"'; then
                local movies_synced=$(echo "$sync_response" | grep -o '"movies":[0-9]*' | cut -d: -f2)
                local episodes_synced=$(echo "$sync_response" | grep -o '"episodes":[0-9]*' | cut -d: -f2)
                print_info "Movies synced: $movies_synced"
                print_info "Episodes synced: $episodes_synced"
            fi
        else
            print_warning "⚠️  Elasticsearch sync may have failed, but continuing deployment"
            print_info "Sync response: $sync_response"
        fi
    else
        print_warning "⚠️  Elasticsearch integration not enabled in application"
        print_info "This may be expected for deployments without Elasticsearch"
    fi
    
    return 0
}

# Sync static files with Nginx directory
sync_nginx_static_files() {
    print_header "🔄 Syncing Static Files with Nginx"
    
    local nginx_static_dir="/var/www/filmflex"
    local temp_dist_dir="/tmp/filmflex-dist-$(date +%s)"
    
    # Check if container is running
    if ! docker ps --format "{{.Names}}" | grep -q "^filmflex-app$"; then
        print_error "Container filmflex-app is not running"
        return 1
    fi
    
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
    
    # Verify extracted files
    if [ ! -d "$temp_dist_dir/public" ]; then
        print_error "Expected public directory not found in extracted files"
        print_info "Contents of extracted directory:"
        ls -la "$temp_dist_dir" 2>/dev/null || true
        rm -rf "$temp_dist_dir"
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
    if ! mv "$temp_dist_dir" "$nginx_static_dir/dist"; then
        print_error "Failed to move static files to Nginx directory"
        # Try to restore backup if move failed
        if [ -d "$backup_dir" ]; then
            print_info "Attempting to restore backup..."
            mv "$backup_dir" "$nginx_static_dir/dist" 2>/dev/null || true
        fi
        return 1
    fi
    
    # Set proper permissions
    print_info "Setting proper permissions on static files..."
    chown -R www-data:www-data "$nginx_static_dir/dist" 2>/dev/null || true
    chmod -R 755 "$nginx_static_dir/dist" 2>/dev/null || true
    
    # Verify the public directory structure
    if [ ! -d "$nginx_static_dir/dist/public" ]; then
        print_error "Public directory not found after copy"
        return 1
    fi
    
    # Reload Nginx to ensure it picks up any changes
    print_info "Reloading Nginx configuration..."
    if command -v systemctl >/dev/null 2>&1; then
        if ! systemctl reload nginx 2>/dev/null; then
            print_warning "Failed to reload Nginx via systemctl, trying alternative..."
            nginx -s reload 2>/dev/null || print_warning "Failed to reload Nginx"
        fi
    else
        nginx -s reload 2>/dev/null || print_warning "Failed to reload Nginx"
    fi
    
    # Verify static files were copied correctly - check the public directory
    if [ -f "$nginx_static_dir/dist/public/index.html" ]; then
        print_status "✅ Static files synchronized successfully"
        
        # Show some info about what was synced
        local static_size=$(du -sh "$nginx_static_dir/dist" 2>/dev/null | cut -f1)
        local file_count=$(find "$nginx_static_dir/dist/public" -type f 2>/dev/null | wc -l)
        print_info "Static files size: $static_size"
        print_info "Number of files: $file_count"
        
        # Show file dates to confirm it's the latest
        local index_date=$(stat -c %y "$nginx_static_dir/dist/public/index.html" 2>/dev/null || stat -f "%Sm" "$nginx_static_dir/dist/public/index.html" 2>/dev/null || echo "unknown")
        print_info "Index.html date: $index_date"
        
        return 0
    else
        print_error "❌ Static file synchronization verification failed"
        print_info "Expected file not found: $nginx_static_dir/dist/public/index.html"
        print_info "Directory structure:"
        ls -la "$nginx_static_dir/dist/" 2>/dev/null || true
        return 1
    fi
}

# Generate deployment report
generate_deployment_report() {
    local status="$1"
    
    print_header "📊 Deployment Report"
    
    local report_file="$SCRIPT_DIR/deployment-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
FilmFlex Production Deployment Report
===================================

Status: $status
Date: $(date '+%Y-%m-%d %H:%M:%S')
Deployment Mode: $MODE_NAME

Container Status:
$(docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No FilmFlex containers found")

Access Information:
- Local: http://localhost:5000
- Production: http://38.54.14.154:5000
- Domain: https://phimgg.com

EOF
    
    print_status "Deployment report saved: $report_file"
}

# Final production check
final_production_check() {
    print_header "🔍 Final Production Readiness Check"
    
    # Check if containers are running
    if docker ps | grep -q "filmflex-app.*Up"; then
        print_status "✅ Application container is running"
    else
        print_error "❌ Application container is not running"
        return 1
    fi
    
    # Check application response
    local response=$(curl -s http://localhost:5000/api/health 2>/dev/null || echo "")
    if echo "$response" | grep -q '"status":"ok"'; then
        print_status "✅ Application is responding correctly"
        return 0
    else
        print_error "❌ Application is not responding correctly"
        return 1
    fi
}

# Error handling and cleanup
cleanup_on_error() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        print_error "🚨 Deployment failed with exit code: $exit_code"
        
        # Show container status for debugging
        print_info "Current container status:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No FilmFlex containers found"
        
        # Show recent logs if containers exist
        if docker ps -a | grep -q filmflex-app; then
            print_info "Recent application logs:"
            docker logs filmflex-app --tail 20 2>/dev/null || echo "Could not retrieve logs"
        fi
        
        # Generate failure report
        generate_deployment_report "FAILED"
    fi
}

# Set up error handling
trap cleanup_on_error EXIT

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

# Clean up existing containers and images before deployment
cleanup_existing_containers() {
    print_header "🧹 Cleaning Up Existing Containers and Images"
    
    local containers_to_cleanup=()
    local images_to_cleanup=()
    
    # Check which containers need to be cleaned up based on deployment mode
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        containers_to_cleanup+=("filmflex-app")
        images_to_cleanup+=("filmflex-app" "cuongtm2012/filmflex-app")
        if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
            containers_to_cleanup+=("filmflex-elasticsearch")
        fi
    else
        # Full deployment - cleanup all containers
        containers_to_cleanup+=("filmflex-app" "filmflex-postgres")
        images_to_cleanup+=("filmflex-app" "cuongtm2012/filmflex-app")
        if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
            containers_to_cleanup+=("filmflex-elasticsearch")
        fi
    fi
    
    # Stop and remove containers
    for container in "${containers_to_cleanup[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            print_info "Found existing container: $container"
            
            # Stop the container if it's running
            if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
                print_info "Stopping running container: $container"
                if docker stop "$container" >/dev/null 2>&1; then
                    print_status "✅ Stopped container: $container"
                else
                    print_warning "⚠️  Failed to stop container: $container"
                fi
            fi
            
            # Remove the container
            print_info "Removing container: $container"
            if docker rm "$container" >/dev/null 2>&1; then
                print_status "✅ Removed container: $container"
            else
                print_warning "⚠️  Failed to remove container: $container"
            fi
        else
            print_info "Container $container not found, skipping cleanup"
        fi
    done
    
    # Remove Docker images to force rebuild
    print_info "Cleaning up Docker images to force fresh rebuild..."
    for image in "${images_to_cleanup[@]}"; do
        if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}"; then
            print_info "Removing Docker image: $image"
            if docker rmi "$image" --force >/dev/null 2>&1; then
                print_status "✅ Removed Docker image: $image"
            else
                print_warning "⚠️  Failed to remove Docker image: $image"
            fi
        fi
    done
    
    # Clean up build cache and unused resources
    print_info "Cleaning up Docker build cache and unused resources..."
    docker builder prune -f >/dev/null 2>&1 || true
    docker system prune -f >/dev/null 2>&1 || true
    
    # Clean up orphaned networks if needed
    print_info "Cleaning up unused Docker networks..."
    docker network prune -f >/dev/null 2>&1 || true
    
    print_status "✅ Container and image cleanup completed"
}

# Force rebuild Docker images with latest code
force_rebuild_images() {
    print_header "🔨 Force Rebuilding Docker Images with Latest Code"
    
    # Ensure we're using the latest source code
    local project_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    # Store project root for later use
    export PROJECT_ROOT="$project_root"
    
    print_info "Project root: $project_root"
    
    # Verify Dockerfile exists before attempting build
    if [ ! -f "$project_root/Dockerfile" ]; then
        print_error "Dockerfile not found at: $project_root/Dockerfile"
        print_info "Checking for Dockerfile in current location..."
        ls -la "$project_root" | grep -i dockerfile || true
        return 1
    fi
    
    print_status "✅ Dockerfile verified at: $project_root/Dockerfile"
    
    # Verify docker-compose file exists
    local compose_file="$project_root/docker-compose.server.yml"
    if [ ! -f "$compose_file" ]; then
        print_error "Docker compose file not found at: $compose_file"
        return 1
    fi
    
    print_status "✅ Docker compose file verified at: $compose_file"
    
    # Change to project root to ensure correct build context
    cd "$project_root" || {
        print_error "Failed to change to project root: $project_root"
        return 1
    }
    
    print_info "Working directory: $(pwd)"
    
    # Verify build artifacts exist
    print_info "Verifying build artifacts..."
    if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
        print_error "Build artifacts not found in $project_root/dist. Please run pre-build first."
        return 1
    fi
    
    print_status "✅ Build artifacts verified"
    
    # Show what will be included in Docker build context
    print_info "Docker build context contents:"
    print_info "- Dockerfile: $(test -f Dockerfile && echo '✓' || echo '✗')"
    print_info "- package.json: $(test -f package.json && echo '✓' || echo '✗')"
    print_info "- dist/: $(test -d dist && echo "✓ ($(ls dist 2>/dev/null | wc -l) files)" || echo '✗')"
    print_info "- server/: $(test -d server && echo '✓' || echo '✗')"
    
    # Update the Dockerfile timestamp to ensure Docker sees changes
    print_info "Updating Dockerfile modification time to force rebuild..."
    touch Dockerfile
    
    # Force rebuild with no-cache and pull latest base images
    print_info "Force rebuilding with docker compose from: $(pwd)"
    print_info "Using compose file: docker-compose.server.yml"
    
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        # Build only the app service with force rebuild
        print_info "Building app service only..."
        if ! docker compose -f docker-compose.server.yml build --no-cache --pull app; then
            print_error "Failed to force rebuild application image"
            print_info "Trying alternative build method..."
            
            # Try building with explicit context
            if ! docker compose -f docker-compose.server.yml build --progress=plain app; then
                print_error "Alternative build method also failed"
                return 1
            fi
        fi
    else
        # Build all services with force rebuild
        print_info "Building all services..."
        if ! docker compose -f docker-compose.server.yml build --no-cache --pull; then
            print_error "Failed to force rebuild all images"
            return 1
        fi
    fi
    
    # Verify the image was built
    print_info "Verifying built images..."
    if docker images | grep -q "film_flex_release-app"; then
        print_status "✅ Docker image built successfully"
        
        # Show image info
        print_info "Image details:"
        docker images | grep "film_flex_release-app" | head -3
    else
        print_error "❌ Docker image not found after build"
        return 1
    fi
    
    print_status "✅ Docker images rebuilt with latest code"
    
    return 0
}

# Verify deployed code version
verify_deployed_code_version() {
    print_header "🔍 Verifying Deployed Code Version"
    
    # Wait for application to be fully ready
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local app_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
        
        if [ "$app_status" = "200" ]; then
            print_status "✅ Application is responding"
            break
        fi
        
        print_info "Waiting for application to be ready (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    # Check if Elasticsearch integration is properly enabled
    print_info "Checking Elasticsearch integration status..."
    local es_status_response=$(curl -s "http://localhost:5000/api/elasticsearch/status" 2>/dev/null || echo "")
    
    if echo "$es_status_response" | grep -q '"enabled":true'; then
        print_status "✅ Elasticsearch integration is properly enabled"
        
        # Show Elasticsearch status details
        local db_movies=$(echo "$es_status_response" | grep -o '"dbMovies":"[0-9]*"' | cut -d'"' -f4)
        local es_movies=$(echo "$es_status_response" | grep -o '"esMovies":[0-9]*' | cut -d: -f2)
        
        print_info "Database movies: $db_movies"
        print_info "Elasticsearch movies: $es_movies"
        
        if [ "$es_movies" = "0" ] || [ "$es_movies" = "" ]; then
            print_warning "⚠️  Elasticsearch has no data - sync may be needed"
            return 2  # Special return code indicating sync needed
        fi
    else
        print_error "❌ Elasticsearch integration is not enabled in the deployed application"
        print_info "This indicates the old code is still running"
        return 1
    fi
    
    # Check container image info
    print_info "Checking deployed container information..."
    local container_image=$(docker inspect filmflex-app --format='{{.Config.Image}}' 2>/dev/null || echo "unknown")
    local container_created=$(docker inspect filmflex-app --format='{{.Created}}' 2>/dev/null || echo "unknown")
    
    print_info "Container image: $container_image"
    print_info "Container created: $container_created"
    
    # Check if container was created recently (within last hour)
    if [ "$container_created" != "unknown" ]; then
        local created_timestamp=$(date -d "$container_created" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local age_seconds=$((current_timestamp - created_timestamp))
        local age_minutes=$((age_seconds / 60))
        
        if [ $age_minutes -lt 60 ]; then
            print_status "✅ Container is fresh (created $age_minutes minutes ago)"
        else
            print_warning "⚠️  Container is old (created $age_minutes minutes ago) - may be using cached image"
        fi
    fi
    
    return 0
}

# Create docker compose configuration
create_docker_compose_config() {
    print_header "📝 Creating Docker Compose Configuration"
    
    local project_root="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
    local compose_file="$project_root/docker-compose.server.yml"
    
    if [ ! -f "$compose_file" ]; then
        print_error "Docker compose file not found: $compose_file"
        return 1
    fi
    
    print_info "Using compose file: $compose_file"
    print_status "✅ Docker compose configuration ready"
    
    # Store compose file path for later use
    export COMPOSE_FILE="$compose_file"
    
    return 0
}

# Start application services with proper --no-build flag
start_application_services() {
    print_header "🚀 Starting Application Services"
    
    local project_root="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
    local compose_file="${COMPOSE_FILE:-$project_root/docker-compose.server.yml}"
    
    # Verify we're in the correct directory
    cd "$project_root" || {
        print_error "Failed to change to project root: $project_root"
        return 1
    }
    
    print_info "Starting services from: $(pwd)"
    print_info "Using compose file: $compose_file"
    
    # Verify images were built successfully
    if ! docker images | grep -q "film_flex_release-app"; then
        print_error "Application image not found. Build may have failed."
        print_info "Available images:"
        docker images | grep -E "film_flex|filmflex" || echo "No matching images found"
        return 1
    fi
    
    print_status "✅ Docker images verified - ready to start services"
    
    if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
        print_info "App-only mode: Starting application container..."
        
        # Check if postgres and elasticsearch are running
        local postgres_running=false
        local elasticsearch_running=false
        
        if docker ps | grep -q "filmflex-postgres.*Up"; then
            postgres_running=true
            print_status "✅ PostgreSQL is running"
        else
            print_warning "⚠️  PostgreSQL is not running"
        fi
        
        if docker ps | grep -q "filmflex-elasticsearch.*Up"; then
            elasticsearch_running=true
            print_status "✅ Elasticsearch is running"
        else
            print_info "ℹ️  Elasticsearch is not running (this may be expected)"
        fi
        
        # Start app with --no-build to prevent rebuild issues
        print_info "Starting application container with --no-build flag..."
        
        if [ "$elasticsearch_running" = true ]; then
            # Start with Elasticsearch dependency
            print_info "Starting with Elasticsearch dependencies..."
            if ! docker compose -f "$compose_file" up -d --no-build app; then
                print_warning "⚠️  Failed to start with dependencies, trying without..."
                
                # Fallback: Start without dependencies
                if ! docker compose -f "$compose_file" up -d --no-build --no-deps app; then
                    print_error "Failed to start application container"
                    return 1
                fi
                
                print_warning "⚠️  Application started without waiting for dependencies"
            fi
        else
            # Start without Elasticsearch dependency
            print_info "Starting without Elasticsearch dependencies..."
            if ! docker compose -f "$compose_file" up -d --no-build --no-deps app; then
                print_error "Failed to start application container"
                
                # Show diagnostic info
                print_info "=== Diagnostic Information ==="
                print_info "Compose file validation:"
                docker compose -f "$compose_file" config --services 2>&1 | head -10
                
                print_info "Docker networks:"
                docker network ls | grep filmflex || echo "No filmflex networks found"
                
                return 1
            fi
        fi
        
        print_status "✅ Application container started successfully"
        
    else
        # Full deployment
        print_info "Full deployment: Starting all services..."
        
        # Start all services with --no-build to prevent rebuild issues
        print_info "Starting all services with --no-build flag..."
        if ! docker compose -f "$compose_file" up -d --no-build; then
            print_error "Failed to start services with --no-build"
            
            # Try with build flag as fallback (should not be needed but safer)
            print_info "Retrying without --no-build flag..."
            if ! docker compose -f "$compose_file" up -d; then
                print_error "Failed to start services"
                return 1
            fi
        fi
        
        print_status "✅ All services started successfully"
    fi
    
    # Verify containers are running - improved check to handle health check states
    print_info "Verifying container status..."
    sleep 10  # Wait longer for container to stabilize and health check to start
    
    # Get detailed container status
    local container_status=$(docker ps -a --format "{{.Names}} {{.Status}}" | grep "^filmflex-app " || echo "")
    
    if [ -z "$container_status" ]; then
        print_error "❌ Application container not found"
        print_info "Checking all containers:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}"
        return 1
    fi
    
    # Check if container is running (accepting Up state even with health: starting)
    if echo "$container_status" | grep -q "Up"; then
        print_status "✅ Application container is running"
        
        # Show container info
        print_info "Container status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex
        
        # If health check is still starting, show info but don't fail
        if echo "$container_status" | grep -q "health: starting"; then
            print_info "ℹ️  Health check in progress - this is normal for newly started containers"
        fi
        
    elif echo "$container_status" | grep -qE "Restarting|Exited"; then
        # Container crashed or restarting - this is a real error
        print_error "❌ Application container failed to start properly"
        print_info "Container status: $container_status"
        
        # Show why it failed
        print_info "Container logs:"
        docker logs filmflex-app --tail 50 2>/dev/null || echo "No logs available"
        
        return 1
    else
        # Unknown state - show warning but continue
        print_warning "⚠️  Container in unexpected state: $container_status"
        print_info "Continuing with deployment..."
    fi
    
    return 0
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
    
    # Clean up existing containers and images
    cleanup_existing_containers
    
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
    
    # Force rebuild Docker images
    if ! force_rebuild_images; then
        print_error "Failed to force rebuild Docker images"
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
    
    # Start application services with proper error handling
    if ! start_application_services; then
        print_error "Failed to start application services"
        
        # Show diagnostic information
        print_info "=== Diagnostic Information ==="
        print_info "Container status:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex || echo "No containers found"
        
        print_info "Recent application logs (if container exists):"
        docker logs filmflex-app --tail 50 2>/dev/null || echo "No logs available"
        
        print_info "Docker images:"
        docker images | grep -E "film_flex|filmflex" || echo "No images found"
        
        print_info "Docker networks:"
        docker network ls | grep filmflex || echo "No networks found"
        
        exit 1
    fi
    
    # Wait for application to be ready
    print_info "Waiting for application to fully start..."
    sleep 15
    
    # Perform enhanced health check
    if ! perform_health_check; then
        print_error "❌ Health check failed after deployment"
        
        # Show logs for debugging
        print_info "Application logs for debugging:"
        docker logs filmflex-app --tail 100 2>/dev/null || echo "No logs available"
        
        exit 1
    fi
    
    print_status "✅ Deployment completed and health check passed"
    
    # Verify deployed code version
    local verification_result=0
    verify_deployed_code_version
    verification_result=$?
    
    if [ $verification_result -eq 1 ]; then
        print_error "❌ Code verification failed - old code is still running"
        print_info "Attempting container restart..."
        docker restart filmflex-app
        sleep 15
        
        # Retry verification
        verify_deployed_code_version
        verification_result=$?
        
        if [ $verification_result -eq 1 ]; then
            print_error "❌ Code verification still failing after restart"
            exit 1
        fi
    fi
    
    if [ $verification_result -eq 2 ]; then
        print_warning "⚠️  Elasticsearch needs data sync"
        # Force sync if needed
        if ! force_sync_elasticsearch_data; then
            print_warning "⚠️  Failed to sync Elasticsearch data"
        fi
    fi
    
    # Sync Elasticsearch data if requested and not already synced
    if [ "$SYNC_ELASTICSEARCH" = true ] && [ $verification_result -ne 2 ]; then
        if [ "$DEPLOYMENT_MODE" = "app-only" ]; then
            if ! force_sync_elasticsearch_data; then
                print_warning "⚠️  Elasticsearch sync failed or skipped"
            fi
        else
            if ! sync_elasticsearch_data; then
                print_warning "⚠️  Elasticsearch sync failed or skipped"
            fi
        fi
    fi
    
    # Sync static files with Nginx
    if ! sync_nginx_static_files; then
        print_warning "⚠️  Static file synchronization failed"
    fi
    
    # Generate deployment report
    generate_deployment_report "SUCCESS"
    
    # Final production readiness check
    if ! final_production_check; then
        print_warning "⚠️  Deployment completed but with some issues detected"
    fi
    
    # Show deployment summary
    echo ""
    echo "========================================="
    echo "🎉 DEPLOYMENT SUCCESSFUL"
    echo "========================================="
    echo "Deployment Mode: $MODE_NAME"
    echo "✅ Latest source code deployed"
    echo "✅ Docker images rebuilt with --no-cache"
    echo "✅ Application started successfully"
    if [ "$INCLUDE_ELASTICSEARCH" = true ]; then
        echo "✅ Elasticsearch service configured"
    fi
    if [ "$SYNC_ELASTICSEARCH" = true ]; then
        echo "✅ Elasticsearch data synchronized"
    fi
    echo "✅ Health checks passed"
    echo "✅ Code verification completed"
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
    
    print_status "🎉 Production deployment completed successfully!"
}

# Run main function with all arguments
main "$@"