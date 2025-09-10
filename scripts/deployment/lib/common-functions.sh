#!/bin/bash

# FilmFlex Deployment Common Functions Library
# Version: 1.0
# This file contains shared functions used across all deployment scripts

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

# Color codes for consistent output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export PURPLE='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m'

# Production environment configuration
export PRODUCTION_IP="38.54.14.154"
export PRODUCTION_DOMAIN="phimgg.com"
export DEPLOY_DIR="/var/www/filmflex"
export SOURCE_DIR="$HOME/Film_Flex_Release"
export LOG_DIR="/var/log/filmflex"
export LOCK_DIR="/var/lock/filmflex"

# Docker configuration
export APP_CONTAINER="filmflex-app"
export DB_CONTAINER="filmflex-postgres"
export COMPOSE_FILE="docker-compose.server.yml"

# Database configuration
export DB_NAME="filmflex"
export DB_USER="filmflex"
export DB_PASSWORD="filmflex2024"

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

# Initialize logging
init_logging() {
    local script_name="${1:-deployment}"
    export LOG_FILE="$LOG_DIR/${script_name}-$(date +%Y%m%d-%H%M%S).log"
    
    mkdir -p "$LOG_DIR" "$LOCK_DIR"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] === Starting $script_name ===" >> "$LOG_FILE"
}

# Logging functions with consistent formatting
log() { 
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE" 2>/dev/null || true
}

success() { 
    echo -e "${GREEN}✓ $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE" 2>/dev/null || true
}

warning() { 
    echo -e "${YELLOW}⚠ $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() { 
    echo -e "${RED}✗ $1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
}

info() { 
    echo -e "${CYAN}ℹ $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# =============================================================================
# SYSTEM RESOURCE MONITORING
# =============================================================================

check_system_resources() {
    log "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || echo "0")
    
    # Memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}' 2>/dev/null || echo "0")
    
    # Disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    
    log "Resources - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
    
    # Resource thresholds
    if (( $(echo "$cpu_usage > 90" | bc -l 2>/dev/null || echo "0") )) || [ "$memory_usage" -gt 90 ] || [ "$disk_usage" -gt 90 ]; then
        warning "High resource usage detected - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
        return 1
    fi
    
    success "System resources OK"
    return 0
}

# =============================================================================
# DOCKER FUNCTIONS
# =============================================================================

check_docker_prerequisites() {
    log "Checking Docker prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        return 1
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose is not available"
        return 1
    fi
    
    success "Docker prerequisites OK"
    return 0
}

check_docker_containers() {
    log "Checking Docker container health..."
    
    # Check if containers are running
    if ! docker ps --format "table {{.Names}}" | grep -q "$APP_CONTAINER"; then
        warning "App container '$APP_CONTAINER' is not running"
        return 1
    fi
    
    if ! docker ps --format "table {{.Names}}" | grep -q "$DB_CONTAINER"; then
        warning "Database container '$DB_CONTAINER' is not running" 
        return 1
    fi
    
    # Check database connectivity
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        warning "Database is not ready"
        return 1
    fi
    
    success "All containers healthy"
    return 0
}

get_database_stats() {
    local stats=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            COALESCE((SELECT COUNT(*) FROM movies), 0) as movies,
            COALESCE((SELECT COUNT(*) FROM episodes), 0) as episodes
    " 2>/dev/null | tr -d ' ' || echo "0|0")
    
    echo "$stats"
}

# =============================================================================
# APPLICATION HEALTH CHECKS
# =============================================================================

check_application_health() {
    local url="${1:-http://localhost:5000}"
    local timeout="${2:-10}"
    
    log "Checking application health at $url..."
    
    # Test basic connectivity
    if curl -f -s --max-time "$timeout" "$url/api/health" >/dev/null 2>&1; then
        success "Application health check passed"
        return 0
    elif curl -f -s --max-time "$timeout" "$url/" >/dev/null 2>&1; then
        success "Application responding (root endpoint)"
        return 0
    else
        warning "Application health check failed"
        return 1
    fi
}

check_cors_configuration() {
    local url="${1:-http://localhost:5000}"
    
    log "Testing CORS configuration..."
    
    local cors_test=$(curl -s -I -H "Origin: https://phimgg.com" "$url/api/health" | grep -i "access-control-allow-origin" || echo "No CORS headers")
    
    if [[ "$cors_test" == *"access-control-allow-origin"* ]]; then
        success "CORS headers configured: $cors_test"
        return 0
    else
        warning "CORS headers not detected: $cors_test"
        return 1
    fi
}

# =============================================================================
# PM2 PROCESS MANAGEMENT
# =============================================================================

check_pm2_status() {
    log "Checking PM2 process status..."
    
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 is not installed"
        return 1
    fi
    
    if pm2 list | grep filmflex | grep -q online; then
        success "PM2 process is running"
        return 0
    else
        warning "PM2 process is not running"
        return 1
    fi
}

restart_pm2_process() {
    local process_name="${1:-filmflex}"
    
    log "Restarting PM2 process: $process_name"
    
    # Stop existing process
    pm2 stop "$process_name" 2>/dev/null || true
    pm2 delete "$process_name" 2>/dev/null || true
    
    # Start new process
    if [ -f "$DEPLOY_DIR/ecosystem.config.cjs" ]; then
        pm2 start "$DEPLOY_DIR/ecosystem.config.cjs"
    elif [ -f "$DEPLOY_DIR/pm2.config.cjs" ]; then
        pm2 start "$DEPLOY_DIR/pm2.config.cjs"
    else
        pm2 start "$DEPLOY_DIR/dist/index.js" --name "$process_name"
    fi
    
    sleep 5
    
    if pm2 list | grep "$process_name" | grep -q online; then
        success "PM2 process restarted successfully"
        return 0
    else
        error "Failed to restart PM2 process"
        return 1
    fi
}

# =============================================================================
# LOCK MANAGEMENT
# =============================================================================

acquire_lock() {
    local lock_name="${1:-deployment}"
    local lock_file="$LOCK_DIR/$lock_name.lock"
    local max_wait="${2:-300}"  # 5 minutes default
    local wait_time=0
    
    while [ -f "$lock_file" ] && [ $wait_time -lt $max_wait ]; do
        local lock_pid=$(cat "$lock_file" 2>/dev/null || echo "")
        if [ -n "$lock_pid" ] && ! kill -0 "$lock_pid" 2>/dev/null; then
            log "Removing stale lock file (PID $lock_pid no longer exists)"
            rm -f "$lock_file"
            break
        fi
        
        log "Process already running (PID: $lock_pid), waiting..."
        sleep 30
        wait_time=$((wait_time + 30))
    done
    
    if [ -f "$lock_file" ]; then
        error "Process already running for too long, aborting"
        return 1
    fi
    
    echo $$ > "$lock_file"
    log "Acquired lock: $lock_name (PID: $$)"
    
    # Set trap to release lock on exit
    trap "release_lock '$lock_name'" EXIT INT TERM
    return 0
}

release_lock() {
    local lock_name="${1:-deployment}"
    local lock_file="$LOCK_DIR/$lock_name.lock"
    
    if [ -f "$lock_file" ]; then
        rm -f "$lock_file"
        log "Released lock: $lock_name"
    fi
}

# =============================================================================
# NGINX FUNCTIONS
# =============================================================================

check_nginx_status() {
    log "Checking Nginx status..."
    
    if ! command -v nginx &> /dev/null; then
        warning "Nginx is not installed"
        return 1
    fi
    
    if nginx -t >/dev/null 2>&1; then
        success "Nginx configuration is valid"
    else
        error "Nginx configuration has errors"
        return 1
    fi
    
    if systemctl is-active --quiet nginx; then
        success "Nginx service is running"
        return 0
    else
        warning "Nginx service is not running"
        return 1
    fi
}

reload_nginx() {
    log "Reloading Nginx configuration..."
    
    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx
        success "Nginx reloaded successfully"
        return 0
    else
        error "Cannot reload Nginx - configuration errors"
        return 1
    fi
}

# =============================================================================
# SSL CERTIFICATE FUNCTIONS
# =============================================================================

check_ssl_certificate() {
    local domain="${1:-$PRODUCTION_DOMAIN}"
    
    log "Checking SSL certificate for $domain..."
    
    if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        warning "SSL certificate not found for $domain"
        return 1
    fi
    
    # Check certificate expiration
    local expiry_date=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/fullchain.pem" | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -lt 30 ]; then
        warning "SSL certificate expires in $days_until_expiry days"
        return 1
    else
        success "SSL certificate valid for $days_until_expiry days"
        return 0
    fi
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_banner() {
    local title="$1"
    local width=60
    
    echo -e "${BLUE}"
    printf "═%.0s" $(seq 1 $width)
    echo
    printf "  %-$(($width-4))s  \n" "$title"
    printf "═%.0s" $(seq 1 $width)
    echo -e "${NC}"
}

cleanup_old_logs() {
    local days="${1:-7}"
    
    log "Cleaning up logs older than $days days..."
    
    find "$LOG_DIR" -name "*.log" -mtime +$days -delete 2>/dev/null || true
    
    success "Log cleanup completed"
}

# =============================================================================
# INITIALIZATION
# =============================================================================

# Ensure directories exist
mkdir -p "$LOG_DIR" "$LOCK_DIR"

# Export all functions for use in other scripts
export -f log success warning error info
export -f check_system_resources check_docker_prerequisites check_docker_containers
export -f get_database_stats check_application_health check_cors_configuration
export -f check_pm2_status restart_pm2_process
export -f acquire_lock release_lock
export -f check_nginx_status reload_nginx check_ssl_certificate
export -f print_banner cleanup_old_logs init_logging