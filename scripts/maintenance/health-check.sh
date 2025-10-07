#!/bin/bash

# PhimGG System Health Check Script
# Checks system resources and container health before major imports

set -e

# Configuration
LOG_DIR="/var/log/filmflex"
HEALTH_LOG="$LOG_DIR/health-check.log"
APP_CONTAINER="filmflex-app"
DB_CONTAINER="filmflex-postgres"

mkdir -p "$LOG_DIR"

log() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH] $1" | tee -a "$HEALTH_LOG"
}
error() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH-ERROR] $1" | tee -a "$HEALTH_LOG"
}

# Check system resources
check_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    log "System Status - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%, Load: ${load_avg}"
    
    # Health thresholds
    local health_score=0
    
    # CPU check
    if (( $(echo "${cpu_usage:-0} < 70" | bc -l) )); then
        ((health_score++))
    else
        error "High CPU usage: ${cpu_usage}%"
    fi
    
    # Memory check
    if [ "${memory_usage:-100}" -lt 80 ]; then
        ((health_score++))
    else
        error "High memory usage: ${memory_usage}%"
    fi
    
    # Disk check
    if [ "${disk_usage:-100}" -lt 85 ]; then
        ((health_score++))
    else
        error "High disk usage: ${disk_usage}%"
    fi
    
    # Load average check (assuming single core, adjust if needed)
    if (( $(echo "${load_avg:-10} < 2.0" | bc -l) )); then
        ((health_score++))
    else
        error "High load average: ${load_avg}"
    fi
    
    log "Health score: $health_score/4"
    return $((4 - health_score))
}

# Check Docker containers
check_docker() {
    local docker_score=0
    
    # App container
    if docker ps --format "{{.Names}}" | grep -q "$APP_CONTAINER"; then
        ((docker_score++))
        log "App container running: OK"
    else
        error "App container not running"
    fi
    
    # DB container
    if docker ps --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
        ((docker_score++))
        log "DB container running: OK"
    else
        error "DB container not running"
    fi
    
    # Database connectivity
    if docker exec "$DB_CONTAINER" pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
        ((docker_score++))
        log "Database connectivity: OK"
    else
        error "Database not ready"
    fi
    
    log "Docker score: $docker_score/3"
    return $((3 - docker_score))
}

# Check disk space for logs
check_log_space() {
    local log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    local available_space=$(df "$LOG_DIR" | awk 'NR==2 {print $4}')
    
    log "Log directory size: $log_size, Available space: ${available_space}KB"
    
    # Clean old logs if space is low
    if [ "$available_space" -lt 1048576 ]; then  # Less than 1GB
        log "Low disk space, cleaning old logs..."
        find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete
        log "Old logs cleaned"
    fi
}

# Main health check
main() {
    log "==================== HEALTH CHECK START ===================="
    
    local overall_health=0
    
    # System resources
    check_resources
    overall_health=$((overall_health + $?))
    
    # Docker containers
    check_docker
    overall_health=$((overall_health + $?))
    
    # Log space
    check_log_space
    
    log "Overall health score: $((7 - overall_health))/7"
    
    if [ $overall_health -eq 0 ]; then
        log "✅ System is healthy for imports"
        exit 0
    elif [ $overall_health -le 2 ]; then
        log "⚠️ System has minor issues but can proceed"
        exit 0
    else
        error "❌ System health is poor, imports should be delayed"
        exit 1
    fi
}

main "$@"