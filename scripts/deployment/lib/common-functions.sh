#!/bin/bash

# PhimGG Deployment Common Functions Library
# Shared utilities for all deployment scripts

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Common print functions
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
    echo -e "${CYAN}📦 $1${NC}"
}

print_bold() {
    echo -e "${BOLD}$1${NC}"
}

# Common domain configuration function
configure_domain() {
    local domain_name="phimgg.com"
    local server_ip="38.54.14.154"
    
    print_header "🌐 Domain Configuration for $domain_name"
    echo ""
    
    # Check DNS resolution
    print_info "Checking DNS resolution for $domain_name..."
    local resolved_ip=""
    
    if command -v dig >/dev/null 2>&1; then
        resolved_ip=$(dig +short A "$domain_name" | head -1)
    elif command -v nslookup >/dev/null 2>&1; then
        resolved_ip=$(nslookup "$domain_name" | grep -A1 "Name:" | tail -1 | awk '{print $2}' 2>/dev/null)
    fi
    
    if [ -z "$resolved_ip" ]; then
        print_warning "Could not resolve DNS for $domain_name"
        print_info "Manual DNS check: dig +short A $domain_name"
    elif [ "$resolved_ip" = "$server_ip" ]; then
        print_status "DNS correctly points to server ($resolved_ip)"
    else
        print_warning "DNS mismatch: Domain points to $resolved_ip, server is $server_ip"
        print_info "Update DNS A record to point $domain_name to $server_ip"
    fi
    
    # Check SSL certificate
    print_info "Checking SSL certificate for $domain_name..."
    if [ -f "/etc/letsencrypt/live/$domain_name/fullchain.pem" ]; then
        print_status "SSL certificate found"
        
        # Check certificate expiry
        local cert_days=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain_name/cert.pem" 2>/dev/null | cut -d= -f2 | xargs -I {} date -d {} +%s)
        local current_days=$(date +%s)
        local days_left=$(( (cert_days - current_days) / 86400 ))
        
        if [ "$days_left" -gt 30 ]; then
            print_status "SSL certificate valid for $days_left days"
        elif [ "$days_left" -gt 0 ]; then
            print_warning "SSL certificate expires in $days_left days - consider renewal"
        else
            print_error "SSL certificate has expired!"
        fi
    else
        print_warning "SSL certificate not found"
        print_info "Generate with: certbot --nginx -d $domain_name -d www.$domain_name"
    fi
    
    # Check Nginx configuration
    print_info "Checking Nginx configuration for $domain_name..."
    local nginx_config_found=false
    
    for config_path in "/etc/nginx/sites-available/$domain_name" "/etc/nginx/conf.d/$domain_name.conf" "/etc/nginx/sites-enabled/$domain_name"; do
        if [ -f "$config_path" ]; then
            print_status "Nginx config found: $config_path"
            nginx_config_found=true
            break
        fi
    done
    
    if [ "$nginx_config_found" = false ]; then
        print_warning "Nginx configuration not found for $domain_name"
        print_info "Create Nginx config or run: ./scripts/deployment/setup-nginx.sh"
    fi
    
    return 0
}

# Common health check function (simplified)
perform_basic_health_check() {
    print_header "🏥 Basic Health Status Check"
    
    local overall_health=true
    local health_issues=()
    
    # Check Docker daemon
    if docker info >/dev/null 2>&1; then
        print_status "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        health_issues+=("Docker daemon down")
        overall_health=false
    fi
    
    # Check application container
    if docker ps --format "table {{.Names}}" | grep -q "^filmflex-app$"; then
        print_status "Application container is running"
    else
        print_error "Application container not found"
        health_issues+=("App container missing")
        overall_health=false
    fi
    
    # Check database container
    if docker ps --format "table {{.Names}}" | grep -q "^filmflex-postgres$"; then
        print_status "Database container is running"
    else
        print_error "Database container not found"
        health_issues+=("DB container missing")
        overall_health=false
    fi
    
    # Test endpoints
    local local_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
    if [ "$local_response" = "200" ]; then
        print_status "Application is responding (HTTP $local_response)"
    else
        print_error "Application not responding (HTTP $local_response)"
        health_issues+=("App not responding")
        overall_health=false
    fi
    
    # Summary
    if [ "$overall_health" = true ] && [ ${#health_issues[@]} -eq 0 ]; then
        print_status "🎉 Basic health check passed - System is healthy!"
        return 0
    else
        print_error "❌ Health issues detected:"
        for issue in "${health_issues[@]}"; do
            echo "   • $issue"
        done
        return 1
    fi
}

# Git management functions
ensure_main_branch() {
    if git rev-parse --git-dir > /dev/null 2>&1; then
        print_info "Ensuring latest main branch code..."
        
        # Stash changes
        git stash 2>/dev/null || true
        
        # Fetch latest
        git fetch origin || print_warning "Git fetch failed"
        
        # Switch to main
        if git checkout main 2>/dev/null; then
            print_status "Switched to main branch"
        else
            git checkout -b main origin/main 2>/dev/null || print_warning "Could not create main branch"
        fi
        
        # Hard reset to latest
        if git reset --hard origin/main 2>/dev/null; then
            print_status "Updated to latest main branch"
            git clean -fd 2>/dev/null || true
            return 0
        else
            print_error "Failed to update to latest main branch"
            return 1
        fi
    else
        print_warning "Not a Git repository"
        return 1
    fi
}

# Container management functions
check_container_status() {
    local container_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        local status=$(docker inspect "$container_name" --format='{{.State.Status}}' 2>/dev/null)
        echo "$status"
        return 0
    else
        echo "not_found"
        return 1
    fi
}

# Test endpoint function
test_endpoint() {
    local endpoint=$1
    local expected_code=${2:-200}
    local max_retries=${3:-3}
    
    for i in $(seq 1 $max_retries); do
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
        
        if [ "$response_code" = "$expected_code" ]; then
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            sleep 2
        fi
    done
    
    return 1
}

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
    print_info "Checking system resources..."
    
    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        print_status "Disk usage: ${disk_usage}% (healthy)"
    else
        print_warning "Disk usage: ${disk_usage}% (high)"
        return 1
    fi
    
    # Check memory usage
    local memory_info=$(free | awk 'NR==2{printf "%.0f %.0f", $3*100/$2, $2/1024/1024}')
    local memory_percent=$(echo $memory_info | awk '{print $1}')
    local total_memory=$(echo $memory_info | awk '{print $2}')
    
    if [ "$memory_percent" -lt 90 ]; then
        print_status "Memory usage: ${memory_percent}% of ${total_memory}GB (healthy)"
    else
        print_warning "Memory usage: ${memory_percent}% of ${total_memory}GB (high)"
        return 1
    fi
    
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
    print_info "Checking Docker containers..."
    
    local containers_healthy=true
    
    # Check app container
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "filmflex-app.*Up"; then
        print_status "FilmFlex app container is running"
    else
        print_error "FilmFlex app container is not running properly"
        containers_healthy=false
    fi
    
    # Check database container
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "filmflex-postgres.*Up"; then
        print_status "FilmFlex database container is running"
    else
        print_error "FilmFlex database container is not running properly"
        containers_healthy=false
    fi
    
    return $([ "$containers_healthy" = true ] && echo 0 || echo 1)
}

get_database_stats() {
    local movies=0
    local episodes=0
    
    if docker exec filmflex-postgres psql -U filmflex -d filmflex -c "\dt" >/dev/null 2>&1; then
        movies=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
        episodes=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | tr -d ' ' || echo "0")
    fi
    
    echo "${movies}|${episodes}"
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
    print_info "Checking Nginx status..."
    
    # Check if nginx service is running
    if systemctl is-active --quiet nginx 2>/dev/null; then
        print_status "Nginx service is active"
        
        # Check if nginx configuration is valid
        if nginx -t 2>/dev/null; then
            print_status "Nginx configuration is valid"
            
            # Check if nginx is listening on standard ports using ss
            local http_listening=$(ss -tln | grep -c ":80 ")
            local https_listening=$(ss -tln | grep -c ":443 ")
            
            if [ "$http_listening" -gt 0 ]; then
                print_status "Nginx listening on HTTP port 80"
            else
                print_warning "Nginx not listening on HTTP port 80"
                return 1
            fi
            
            if [ "$https_listening" -gt 0 ]; then
                print_status "Nginx listening on HTTPS port 443"
            else
                print_warning "Nginx not listening on HTTPS port 443"
            fi
            
            return 0
        else
            print_error "Nginx configuration has errors"
            return 1
        fi
    else
        print_error "Nginx service is not running"
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
    local domain="${1:-phimgg.com}"
    
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        # Check certificate expiry
        local cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/cert.pem" 2>/dev/null | cut -d= -f2)
        if [ ! -z "$cert_expiry" ]; then
            # Check if certificate expires within 30 days
            if openssl x509 -checkend 2592000 -noout -in "/etc/letsencrypt/live/$domain/cert.pem" 2>/dev/null; then
                return 0
            else
                return 1
            fi
        fi
    fi
    return 1
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