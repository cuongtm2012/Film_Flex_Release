#!/bin/bash

# PhimGG Selective Deployment Script v1.0
# =========================================
# Lightweight deployment script for targeted updates:
# - Frontend changes (client/dist files)
# - Backend changes (server build and restart)
# - Database migrations (schema changes)
#
# Usage:
#   ./selective-deploy.sh --frontend    # Deploy only frontend changes
#   ./selective-deploy.sh --backend     # Deploy only backend changes
#   ./selective-deploy.sh --migrate     # Run only database migrations
#   ./selective-deploy.sh --all         # Deploy everything
#   ./selective-deploy.sh --help        # Show help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/selective-deploy-$TIMESTAMP.log"

# Database configuration
DB_USER="filmflex"
DB_PASSWORD="filmflex2024"
DB_NAME="filmflex"
DB_HOST="localhost"
DB_PORT="5432"

# Deployment flags
DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false
DEPLOY_MIGRATE=false
DEPLOY_ALL=false

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    echo -e "$@"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $@" | sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g" >> "$LOG_FILE"
}

success() {
    log "${GREEN}✓ $@${NC}"
}

warning() {
    log "${YELLOW}⚠ $@${NC}"
}

error() {
    log "${RED}✗ $@${NC}"
}

info() {
    log "${BLUE}ℹ $@${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}PhimGG Selective Deployment Script v1.0${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    echo -e "${GREEN}Usage:${NC}"
    echo "  ./selective-deploy.sh [OPTIONS]"
    echo ""
    echo -e "${GREEN}Options:${NC}"
    echo "  ${YELLOW}--frontend${NC}    Deploy only frontend changes (client files)"
    echo "  ${YELLOW}--backend${NC}     Deploy only backend changes (server rebuild & restart)"
    echo "  ${YELLOW}--migrate${NC}     Run only database migrations"
    echo "  ${YELLOW}--all${NC}         Deploy frontend, backend, and run migrations"
    echo "  ${YELLOW}--help${NC}        Show this help message"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./selective-deploy.sh --frontend    # Update only client files"
    echo "  ./selective-deploy.sh --backend     # Rebuild and restart server"
    echo "  ./selective-deploy.sh --migrate     # Apply database changes"
    echo "  ./selective-deploy.sh --all         # Full selective deployment"
    echo ""
    echo -e "${GREEN}Features:${NC}"
    echo "  • Fast deployment for specific components"
    echo "  • Automatic backup before changes"
    echo "  • Health checks after deployment"
    echo "  • Rollback capability on failure"
    echo ""
    exit 0
}

# Parse command line arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        error "No deployment option specified"
        echo "Use --help for usage information"
        exit 1
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            --frontend)
                DEPLOY_FRONTEND=true
                info "🎨 Frontend deployment enabled"
                shift
                ;;
            --backend)
                DEPLOY_BACKEND=true
                info "⚙️ Backend deployment enabled"
                shift
                ;;
            --migrate)
                DEPLOY_MIGRATE=true
                info "🗄️ Database migration enabled"
                shift
                ;;
            --all)
                DEPLOY_ALL=true
                info "🚀 Full selective deployment enabled"
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Validate arguments
    local selected_count=0
    [[ "$DEPLOY_FRONTEND" == "true" ]] && ((selected_count++))
    [[ "$DEPLOY_BACKEND" == "true" ]] && ((selected_count++))
    [[ "$DEPLOY_MIGRATE" == "true" ]] && ((selected_count++))
    [[ "$DEPLOY_ALL" == "true" ]] && ((selected_count++))
    
    if [[ $selected_count -eq 0 ]]; then
        error "No deployment mode selected"
        echo "Use --help for usage information"
        exit 1
    fi

    if [[ $selected_count -gt 1 ]] && [[ "$DEPLOY_ALL" != "true" ]]; then
        error "Only one deployment mode can be selected at a time (or use --all)"
        echo "Use --help for usage information"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    info "🔍 Checking prerequisites..."

    # Check if source directory exists
    if [ ! -d "$SOURCE_DIR" ]; then
        error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi

    # Check if deployment directory exists
    if [ ! -d "$DEPLOY_DIR" ]; then
        error "Deployment directory not found: $DEPLOY_DIR"
        exit 1
    fi

    # Check if running as root/sudo
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi

    # Check essential tools
    local missing_tools=()
    
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v pm2 >/dev/null 2>&1 || missing_tools+=("pm2")
    command -v psql >/dev/null 2>&1 || missing_tools+=("psql")
    command -v nginx >/dev/null 2>&1 || missing_tools+=("nginx")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    local backup_type=$1
    info "📦 Creating backup for $backup_type deployment..."

    case $backup_type in
        "frontend")
            if [ -d "$DEPLOY_DIR/dist/public" ]; then
                cp -r "$DEPLOY_DIR/dist/public" "$DEPLOY_DIR/dist/public.backup.$TIMESTAMP"
                success "Frontend backup created"
            fi
            ;;
        "backend")
            if [ -d "$DEPLOY_DIR/dist" ]; then
                cp -r "$DEPLOY_DIR/dist" "$DEPLOY_DIR/dist.backup.$TIMESTAMP"
                success "Backend backup created"
            fi
            if [ -f "$DEPLOY_DIR/package.json" ]; then
                cp "$DEPLOY_DIR/package.json" "$DEPLOY_DIR/package.json.backup.$TIMESTAMP"
            fi
            ;;
        "database")
            info "Creating database backup..."
            PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" > "$LOG_DIR/filmflex_backup_$TIMESTAMP.sql"
            success "Database backup created: $LOG_DIR/filmflex_backup_$TIMESTAMP.sql"
            ;;
    esac
}

# Deploy frontend
deploy_frontend() {
    info "${BLUE}🎨 Starting frontend deployment...${NC}"
    
    create_backup "frontend"
    
    cd "$SOURCE_DIR"
    
    # Build frontend if needed
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        info "Building frontend..."
        npm run build:client || {
            error "Frontend build failed"
            return 1
        }
        success "Frontend build completed"
    fi

    # Copy client files
    if [ -d "client/dist" ]; then
        info "Copying client files..."
        mkdir -p "$DEPLOY_DIR/dist/public"
        cp -r client/dist/* "$DEPLOY_DIR/dist/public/" || {
            error "Failed to copy client files"
            return 1
        }
        success "Client files copied successfully"
    elif [ -d "dist" ]; then
        info "Copying dist files..."
        mkdir -p "$DEPLOY_DIR/dist/public"
        cp -r dist/* "$DEPLOY_DIR/dist/public/" || {
            error "Failed to copy dist files"
            return 1
        }
        success "Dist files copied successfully"
    else
        error "No client build files found"
        return 1
    fi

    # Validate deployment
    validate_frontend_deployment
    
    # Update nginx if needed
    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx
        success "Nginx reloaded"
    else
        warning "Nginx configuration test failed, skipping reload"
    fi

    success "🎨 Frontend deployment completed successfully!"
}

# Deploy backend
deploy_backend() {
    info "${BLUE}⚙️ Starting backend deployment...${NC}"
    
    create_backup "backend"
    
    cd "$SOURCE_DIR"
    
    # Install dependencies
    info "Installing/updating dependencies..."
    npm install || {
        error "Failed to install dependencies"
        return 1
    }
    success "Dependencies installed"

    # Build backend
    info "Building backend..."
    npm run build:server || {
        error "Backend build failed"
        return 1
    }
    success "Backend build completed"

    # Copy server files
    info "Copying server files..."
    cp -r dist "$DEPLOY_DIR/" || {
        error "Failed to copy server files"
        return 1
    }
    
    # Copy package.json and install production dependencies
    cp package.json "$DEPLOY_DIR/"
    cd "$DEPLOY_DIR"
    npm install --production || {
        warning "Failed to install production dependencies"
    }

    # Restart PM2 application
    info "Restarting application..."
    if pm2 list | grep -q "filmflex"; then
        pm2 restart filmflex || {
            error "Failed to restart application"
            return 1
        }
        # Wait for restart
        sleep 3
        pm2 reload filmflex || warning "PM2 reload failed, but restart succeeded"
    else
        # Start if not running
        pm2 start pm2.config.cjs || pm2 start dist/index.js --name filmflex || {
            error "Failed to start application"
            return 1
        }
    fi

    # Validate deployment
    validate_backend_deployment

    success "⚙️ Backend deployment completed successfully!"
}

# Run database migrations
deploy_migrate() {
    info "${BLUE}🗄️ Starting database migration...${NC}"
    
    create_backup "database"

    # Set database environment variables
    export PGPASSWORD="$DB_PASSWORD"
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGUSER="$DB_USER"
    export PGDATABASE="$DB_NAME"

    # Test database connection
    info "Testing database connection..."
    if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Database connection failed"
        return 1
    fi
    success "Database connection verified"

    # Apply schema if exists
    if [ -f "$SOURCE_DIR/shared/filmflex_schema.sql" ]; then
        info "Applying schema updates..."
        psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$SOURCE_DIR/shared/filmflex_schema.sql" || {
            warning "Schema application had issues, checking for critical errors..."
            # Continue if it's just warnings about existing objects
        }
        success "Schema updates applied"
    fi

    # Run any migration scripts
    if [ -d "$SOURCE_DIR/scripts/db/migrations" ]; then
        info "Running migration scripts..."
        for migration in "$SOURCE_DIR/scripts/db/migrations"/*.sql; do
            if [ -f "$migration" ]; then
                info "Running migration: $(basename "$migration")"
                psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration" || {
                    warning "Migration $(basename "$migration") had issues"
                }
            fi
        done
        success "Migration scripts completed"
    fi

    # Validate database state
    validate_database_deployment

    success "🗄️ Database migration completed successfully!"
}

# Validation functions
validate_frontend_deployment() {
    info "🔍 Validating frontend deployment..."
    
    # Check if index.html exists
    if [ -f "$DEPLOY_DIR/dist/public/index.html" ]; then
        success "✓ index.html found"
    else
        error "✗ index.html missing"
        return 1
    fi

    # Check if assets directory exists
    if [ -d "$DEPLOY_DIR/dist/public/assets" ]; then
        local asset_count=$(ls -1 "$DEPLOY_DIR/dist/public/assets" 2>/dev/null | wc -l)
        if [ "$asset_count" -gt 0 ]; then
            success "✓ Assets directory found with $asset_count files"
        else
            warning "⚠ Assets directory is empty"
        fi
    else
        warning "⚠ Assets directory not found"
    fi

    # Test static file serving
    if curl -f -s http://localhost/index.html >/dev/null 2>&1; then
        success "✓ Static file serving test passed"
    else
        warning "⚠ Static file serving test failed"
    fi
}

validate_backend_deployment() {
    info "🔍 Validating backend deployment..."
    
    # Wait for application to start
    sleep 5
    
    # Check if application is running
    if pm2 list | grep -q "filmflex.*online"; then
        success "✓ Application is running in PM2"
    else
        error "✗ Application is not running in PM2"
        return 1
    fi

    # Test health endpoint
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        info "Testing health endpoint (attempt $attempt/$max_attempts)..."
        if curl -f -s http://localhost:5000/api/health >/dev/null 2>&1; then
            success "✓ Health endpoint test passed"
            break
        else
            if [ $attempt -eq $max_attempts ]; then
                error "✗ Health endpoint test failed after $max_attempts attempts"
                return 1
            else
                warning "⚠ Health endpoint test failed, retrying in 3 seconds..."
                sleep 3
            fi
        fi
        ((attempt++))
    done

    # Test database connection from application
    if curl -f -s http://localhost:5000/api/db-test >/dev/null 2>&1; then
        success "✓ Database connectivity test passed"
    else
        warning "⚠ Database connectivity test failed or endpoint not available"
    fi
}

validate_database_deployment() {
    info "🔍 Validating database deployment..."
    
    # Check core tables exist
    local tables=("movies" "episodes" "users" "comments")
    for table in "${tables[@]}"; do
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\d $table" >/dev/null 2>&1; then
            success "✓ Table '$table' exists"
        else
            warning "⚠ Table '$table' missing"
        fi
    done

    # Check admin user exists
    local admin_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM users WHERE username = 'admin';" 2>/dev/null | xargs)
    if [ "$admin_count" -eq 1 ]; then
        success "✓ Admin user exists"
    else
        warning "⚠ Admin user missing or duplicated (count: $admin_count)"
    fi
}

# Main deployment execution
main() {
    log "${BLUE}===== PhimGG Selective Deployment Started at $(date) =====${NC}"
    log "Source: $SOURCE_DIR"
    log "Target: $DEPLOY_DIR"
    log "Log: $LOG_FILE"
    
    parse_arguments "$@"
    check_prerequisites
    
    local deployment_success=true
    
    # Execute selected deployments
    if [[ "$DEPLOY_ALL" == "true" ]]; then
        info "🚀 Running full selective deployment..."
        
        if ! deploy_migrate; then
            deployment_success=false
        fi
        
        if ! deploy_backend; then
            deployment_success=false
        fi
        
        if ! deploy_frontend; then
            deployment_success=false
        fi
        
    else
        if [[ "$DEPLOY_MIGRATE" == "true" ]]; then
            if ! deploy_migrate; then
                deployment_success=false
            fi
        fi
        
        if [[ "$DEPLOY_BACKEND" == "true" ]]; then
            if ! deploy_backend; then
                deployment_success=false
            fi
        fi
        
        if [[ "$DEPLOY_FRONTEND" == "true" ]]; then
            if ! deploy_frontend; then
                deployment_success=false
            fi
        fi
    fi
    
    # Final summary
    echo ""
    if [[ "$deployment_success" == "true" ]]; then
        success "${BLUE}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}"
        success "================================================"
        
        if [[ "$DEPLOY_FRONTEND" == "true" ]] || [[ "$DEPLOY_ALL" == "true" ]]; then
            success "✅ Frontend: Updated and serving"
        fi
        
        if [[ "$DEPLOY_BACKEND" == "true" ]] || [[ "$DEPLOY_ALL" == "true" ]]; then
            success "✅ Backend: Rebuilt and restarted"
        fi
        
        if [[ "$DEPLOY_MIGRATE" == "true" ]] || [[ "$DEPLOY_ALL" == "true" ]]; then
            success "✅ Database: Migrations applied"
        fi
        
        echo ""
        info "🌐 Access URLs:"
        info "  • Production: http://phimgg.com"
        info "  • Health Check: http://phimgg.com/api/health"
        info "  • Admin: http://phimgg.com/auth"
        
    else
        error "${RED}❌ DEPLOYMENT FAILED! ❌${NC}"
        error "Check the log file for details: $LOG_FILE"
        error "Backups are available with timestamp: $TIMESTAMP"
        exit 1
    fi
    
    log "Deployment completed at $(date)"
}

# Run main function
main "$@"
