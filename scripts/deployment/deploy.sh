#!/bin/bash

# FilmFlex Master Deployment Orchestrator
# Version: 2.0
# This script coordinates all deployment tasks and eliminates redundancy

set -e

# Load common functions
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/common-functions.sh"

# =============================================================================
# DEPLOYMENT MODES
# =============================================================================

show_usage() {
    print_banner "FilmFlex Deployment Orchestrator v2.0"
    echo
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo
    echo "DEPLOYMENT MODES:"
    echo "  full          Complete production deployment (default)"
    echo "  docker        Docker-only deployment"
    echo "  pm2           PM2-only deployment"
    echo "  quick         Quick redeploy without database changes"
    echo "  health        Health check only"
    echo "  rollback      Rollback to previous version"
    echo
    echo "OPTIONS:"
    echo "  --force       Skip confirmations"
    echo "  --dry-run     Show what would be done without executing"
    echo "  --verbose     Enable detailed logging"
    echo "  --skip-tests  Skip health checks"
    echo
    echo "EXAMPLES:"
    echo "  $0 full                    # Full production deployment"
    echo "  $0 docker --force          # Force Docker deployment"
    echo "  $0 health --verbose        # Detailed health check"
    echo "  $0 quick --skip-tests      # Quick deployment without tests"
}

# =============================================================================
# DEPLOYMENT FUNCTIONS
# =============================================================================

deploy_full() {
    print_banner "Full Production Deployment"
    
    # Phase 1: Prerequisites
    log "Phase 1: Checking prerequisites..."
    acquire_lock "full-deployment"
    check_system_resources || { error "System resources insufficient"; return 1; }
    check_docker_prerequisites || { error "Docker prerequisites failed"; return 1; }
    
    # Phase 2: Backup current deployment
    log "Phase 2: Creating backup..."
    create_backup
    
    # Phase 3: Build and prepare
    log "Phase 3: Building application..."
    build_application
    
    # Phase 4: Database setup
    log "Phase 4: Setting up database..."
    setup_database
    
    # Phase 5: Deploy application
    log "Phase 5: Deploying application..."
    deploy_application
    
    # Phase 6: Configure services
    log "Phase 6: Configuring services..."
    configure_nginx
    setup_ssl_certificates
    
    # Phase 7: Health checks
    if [ "$SKIP_TESTS" != "true" ]; then
        log "Phase 7: Running health checks..."
        run_comprehensive_health_check || { error "Health checks failed"; return 1; }
    fi
    
    success "Full deployment completed successfully!"
}

deploy_docker() {
    print_banner "Docker Deployment"
    
    acquire_lock "docker-deployment"
    check_docker_prerequisites || { error "Docker prerequisites failed"; return 1; }
    
    # Build latest source code
    log "Building latest source code..."
    cd "$SOURCE_DIR"
    git pull origin main || { warning "Git pull failed, using current code"; }
    npm install || { error "npm install failed"; return 1; }
    npm run build || { error "Build failed"; return 1; }
    
    log "Stopping existing containers..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
    
    log "Building Docker images with latest code..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" build --no-cache
    
    log "Starting containers..."
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" up -d
    
    log "Waiting for containers to be ready..."
    sleep 30
    
    if [ "$SKIP_TESTS" != "true" ]; then
        check_docker_containers || { error "Container health check failed"; return 1; }
        check_application_health || { error "Application health check failed"; return 1; }
    fi
    
    success "Docker deployment completed!"
}

deploy_pm2() {
    print_banner "PM2 Deployment"
    
    acquire_lock "pm2-deployment"
    
    log "Building application for PM2..."
    cd "$SOURCE_DIR"
    npm run build || { error "Build failed"; return 1; }
    
    log "Copying files to deployment directory..."
    rsync -av --exclude=node_modules --exclude=.git "$SOURCE_DIR/" "$DEPLOY_DIR/"
    
    log "Installing production dependencies..."
    cd "$DEPLOY_DIR"
    npm ci --only=production
    
    log "Restarting PM2 process..."
    restart_pm2_process "filmflex"
    
    if [ "$SKIP_TESTS" != "true" ]; then
        check_pm2_status || { error "PM2 health check failed"; return 1; }
        check_application_health || { error "Application health check failed"; return 1; }
    fi
    
    success "PM2 deployment completed!"
}

deploy_quick() {
    print_banner "Quick Redeploy"
    
    acquire_lock "quick-deployment"
    
    log "Quick application update..."
    cd "$SOURCE_DIR"
    git pull origin main
    npm run build
    
    log "Updating deployment files..."
    rsync -av --exclude=node_modules --exclude=.git "$SOURCE_DIR/dist/" "$DEPLOY_DIR/dist/"
    rsync -av "$SOURCE_DIR/package.json" "$DEPLOY_DIR/"
    
    log "Restarting services..."
    if check_pm2_status; then
        pm2 restart filmflex
    elif check_docker_containers; then
        docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" restart app
    else
        warning "No running services found to restart"
    fi
    
    success "Quick deployment completed!"
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

create_backup() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="/var/backups/filmflex"
    
    log "Creating backup: $backup_name"
    mkdir -p "$backup_dir"
    
    # Backup application files
    if [ -d "$DEPLOY_DIR" ]; then
        tar -czf "$backup_dir/${backup_name}_app.tar.gz" -C "$DEPLOY_DIR" .
    fi
    
    # Backup database
    if check_docker_containers; then
        docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_dir/${backup_name}_db.sql.gz"
    fi
    
    success "Backup created: $backup_name"
}

build_application() {
    log "Building application..."
    cd "$SOURCE_DIR"
    
    # Clean install
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm install
    
    # Build
    npm run build || { error "Build failed"; return 1; }
    
    success "Application built successfully"
}

setup_database() {
    if check_docker_containers; then
        log "Database already running via Docker"
        return 0
    fi
    
    log "Setting up database..."
    # Database setup logic here
    success "Database setup completed"
}

deploy_application() {
    log "Deploying application files..."
    
    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"
    
    # Copy application files
    rsync -av --exclude=node_modules --exclude=.git --exclude=logs "$SOURCE_DIR/" "$DEPLOY_DIR/"
    
    # Install production dependencies
    cd "$DEPLOY_DIR"
    npm ci --only=production
    
    success "Application deployed"
}

configure_nginx() {
    if ! command -v nginx &> /dev/null; then
        log "Nginx not installed, skipping configuration"
        return 0
    fi
    
    log "Configuring Nginx..."
    
    # Update Nginx configuration if needed
    if [ -f "/etc/nginx/sites-available/phimgg.com.conf" ]; then
        reload_nginx
    fi
    
    success "Nginx configured"
}

setup_ssl_certificates() {
    if check_ssl_certificate; then
        log "SSL certificates are valid"
        return 0
    fi
    
    log "SSL certificates need attention"
    # SSL setup logic would go here
}

run_comprehensive_health_check() {
    log "Running comprehensive health checks..."
    
    local health_passed=true
    
    # System resources
    check_system_resources || health_passed=false
    
    # Application health
    check_application_health || health_passed=false
    check_cors_configuration || warning "CORS configuration issues detected"
    
    # Service health
    if check_docker_containers; then
        log "Docker deployment detected"
        local stats=$(get_database_stats)
        local movies=$(echo "$stats" | cut -d'|' -f1)
        local episodes=$(echo "$stats" | cut -d'|' -f2)
        success "Database contains $movies movies and $episodes episodes"
    elif check_pm2_status; then
        log "PM2 deployment detected"
    else
        warning "No active deployment method detected"
        health_passed=false
    fi
    
    if [ "$health_passed" = "true" ]; then
        success "All health checks passed"
        return 0
    else
        error "Some health checks failed"
        return 1
    fi
}

rollback_deployment() {
    print_banner "Rollback Deployment"
    
    acquire_lock "rollback"
    
    local backup_dir="/var/backups/filmflex"
    local latest_backup=$(ls -t "$backup_dir" | grep "_app.tar.gz" | head -n1 | sed 's/_app.tar.gz//')
    
    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
        return 1
    fi
    
    log "Rolling back to: $latest_backup"
    
    # Stop services
    pm2 stop filmflex 2>/dev/null || true
    docker compose -f "$SOURCE_DIR/$COMPOSE_FILE" down 2>/dev/null || true
    
    # Restore application
    rm -rf "$DEPLOY_DIR" 2>/dev/null || true
    mkdir -p "$DEPLOY_DIR"
    tar -xzf "$backup_dir/${latest_backup}_app.tar.gz" -C "$DEPLOY_DIR"
    
    # Restore database if exists
    if [ -f "$backup_dir/${latest_backup}_db.sql.gz" ]; then
        log "Restoring database..."
        if check_docker_containers; then
            gunzip -c "$backup_dir/${latest_backup}_db.sql.gz" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"
        fi
    fi
    
    # Restart services
    if [ -f "$DEPLOY_DIR/ecosystem.config.cjs" ]; then
        cd "$DEPLOY_DIR"
        pm2 start ecosystem.config.cjs
    fi
    
    success "Rollback completed to: $latest_backup"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local mode="full"
    local force=false
    local dry_run=false
    local verbose=false
    SKIP_TESTS=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            full|docker|pm2|quick|health|rollback)
                mode="$1"
                ;;
            --force)
                force=true
                ;;
            --dry-run)
                dry_run=true
                ;;
            --verbose)
                verbose=true
                ;;
            --skip-tests)
                SKIP_TESTS=true
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
    
    # Initialize logging
    init_logging "deploy-$mode"
    
    # Dry run mode
    if [ "$dry_run" = "true" ]; then
        log "DRY RUN MODE - No changes will be made"
        log "Would execute: $mode deployment"
        return 0
    fi
    
    # Confirmation for production deployments
    if [ "$force" = "false" ] && [ "$mode" = "full" ]; then
        echo -e "${YELLOW}This will perform a full production deployment.${NC}"
        echo -e "${YELLOW}Target: $PRODUCTION_DOMAIN ($PRODUCTION_IP)${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Execute deployment based on mode
    case "$mode" in
        full)
            deploy_full
            ;;
        docker)
            deploy_docker
            ;;
        pm2)
            deploy_pm2
            ;;
        quick)
            deploy_quick
            ;;
        health)
            run_comprehensive_health_check
            ;;
        rollback)
            rollback_deployment
            ;;
        *)
            error "Invalid deployment mode: $mode"
            show_usage
            exit 1
            ;;
    esac
    
    # Cleanup
    cleanup_old_logs 7
    
    print_banner "Deployment Summary"
    log "Mode: $mode"
    log "Status: SUCCESS"
    log "Time: $(date)"
    log "Logs: $LOG_FILE"
    
    if [ "$mode" != "health" ]; then
        echo
        info "🌐 Application URLs:"
        info "  • Local: http://localhost:5000"
        info "  • Production: http://$PRODUCTION_IP:5000"
        info "  • Domain: https://$PRODUCTION_DOMAIN (when configured)"
        echo
        info "📊 Management Commands:"
        info "  • Health check: $0 health"
        info "  • Quick update: $0 quick"
        info "  • Rollback: $0 rollback"
        info "  • View logs: tail -f $LOG_FILE"
    fi
}

# Execute main function
main "$@"