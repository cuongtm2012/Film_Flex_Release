#!/bin/bash
# Telegram Alert System for PhimGG
# Sends alerts to @PhimGG_bot when server issues are detected

set -e

# Configuration
TELEGRAM_BOT_TOKEN="8631860754:AAFE1INzNDTqj8-9SglI6-NHwBiZAU6Wu4g"
TELEGRAM_CHAT_ID=""  # Will auto-detect or use admin chat ID
LOG_FILE="/var/log/phimgg-alert.log"
STATE_FILE="/tmp/phimgg-alert-state.json"

# Colors for log output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Send Telegram message
send_telegram() {
    local message="$1"
    local parse_mode="${2:-markdown}"  # markdown or html
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" == "YOUR_BOT_TOKEN_HERE" ]; then
        log "WARN" "Telegram bot token not configured. Skipping alert."
        return 1
    fi
    
    local response
    response=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=${parse_mode}" \
        -d "disable_web_page_preview=true")
    
    local ok=$(echo "$response" | grep -o '"ok":true' || echo "")
    if [ -n "$ok" ]; then
        log "INFO" "Telegram message sent successfully"
        return 0
    else
        log "ERROR" "Failed to send Telegram message: $response"
        return 1
    fi
}

# Get Chat ID from bot updates (first time setup)
get_chat_id() {
    local updates
    updates=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates")
    
    # Extract chat_id from the response
    local chat_id=$(echo "$updates" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
    
    if [ -n "$chat_id" ]; then
        echo "$chat_id"
        return 0
    fi
    return 1
}

# Check if we need to send recovery message
should_send_recovery() {
    local check_name="$1"
    local current_status="$2"  # "up" or "down"
    
    if [ ! -f "$STATE_FILE" ]; then
        echo "no"
        return
    fi
    
    local previous_status=$(grep "${check_name}=" "$STATE_FILE" 2>/dev/null | cut -d'=' -f2)
    
    if [ "$previous_status" == "down" ] && [ "$current_status" == "up" ]; then
        echo "yes"
    else
        echo "no"
    fi
}

# Update state file
update_state() {
    local check_name="$1"
    local status="$2"
    
    if [ ! -f "$STATE_FILE" ]; then
        touch "$STATE_FILE"
    fi
    
    if grep -q "^${check_name}=" "$STATE_FILE" 2>/dev/null; then
        sed -i "s/^${check_name}=.*/${check_name}=${status}/" "$STATE_FILE"
    else
        echo "${check_name}=${status}" >> "$STATE_FILE"
    fi
}

# Check API Health
check_api() {
    log "INFO" "Checking API health..."
    
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" "https://phimgg.com/api/health")
    http_code=$(echo "$response" | tail -1)
    
    if [ "$http_code" == "200" ]; then
        local uptime=$(echo "$response" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
        log "INFO" "API is UP (uptime: ${uptime}s)"
        echo "up"
        return 0
    else
        log "ERROR" "API is DOWN (HTTP: $http_code)"
        echo "down"
        return 1
    fi
}

# Check Redis
check_redis() {
    log "INFO" "Checking Redis..."
    
    if docker exec filmflex-redis redis-cli ping 2>/dev/null | grep -q PONG; then
        log "INFO" "Redis is UP"
        echo "up"
        return 0
    else
        log "ERROR" "Redis is DOWN"
        echo "down"
        return 1
    fi
}

# Check PostgreSQL
check_postgres() {
    log "INFO" "Checking PostgreSQL..."
    
    if docker exec filmflex-postgres pg_isready -U filmflex -d filmflex > /dev/null 2>&1; then
        log "INFO" "PostgreSQL is UP"
        echo "up"
        return 0
    else
        log "ERROR" "PostgreSQL is DOWN"
        echo "down"
        return "down"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    log "INFO" "Checking Docker containers..."
    
    local unhealthy=0
    local containers=$(docker ps --format '{{.Names}}: {{.Status}}')
    
    while IFS= read -r line; do
        if echo "$line" | grep -qi "unhealthy\|exited\|restarting"; then
            log "ERROR" "Container issue: $line"
            unhealthy=$((unhealthy + 1))
        fi
    done <<< "$containers"
    
    if [ $unhealthy -eq 0 ]; then
        log "INFO" "All containers are healthy"
        echo "up"
        return 0
    else
        log "ERROR" "$unhealthy container(s) have issues"
        echo "down"
        return 1
    fi
}

# Check disk space
check_disk() {
    log "INFO" "Checking disk space..."
    
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        log "ERROR" "Disk usage is critical: ${usage}%"
        echo "critical"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "WARN" "Disk usage is high: ${usage}%"
        echo "warning"
        return 0
    else
        log "INFO" "Disk usage: ${usage}%"
        echo "ok"
        return 0
    fi
}

# Check memory
check_memory() {
    log "INFO" "Checking memory..."
    
    local usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    if [ "$usage" -gt 90 ]; then
        log "ERROR" "Memory usage is critical: ${usage}%"
        echo "critical"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "WARN" "Memory usage is high: ${usage}%"
        echo "warning"
        return 0
    else
        log "INFO" "Memory usage: ${usage}%"
        echo "ok"
        return 0
    fi
}

# Send alert message
send_alert() {
    local severity="$1"  # critical, error, warning
    local check_name="$2"
    local message="$3"
    
    local emoji
    case $severity in
        critical) emoji="🚨" ;;
        error) emoji="❌" ;;
        warning) emoji="⚠️" ;;
        *) emoji="📢" ;;
    esac
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local telgram_message="${emoji} *PhimGG Alert*

${severity^^}: ${check_name}
${message}

⏰ Time: ${timestamp}
🌐 Server: phimgg.com"
    
    send_telegram "$telgram_message"
}

# Send recovery message
send_recovery() {
    local check_name="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local message="✅ *PhimGG Recovery*

${check_name} is back online!

⏰ Time: ${timestamp}"
    
    send_telegram "$message"
}

# Main monitoring function
run_monitoring() {
    log "INFO" "========== Starting PhimGG Health Check =========="
    
    local has_error=0
    local error_details=""
    
    # Check API
    local api_status
    api_status=$(check_api)
    if [ "$api_status" == "down" ]; then
        has_error=1
        error_details="${error_details}\n• API: DOWN"
        
        if [ "$(should_send_recovery "api" "up")" == "yes" ]; then
            send_recovery "API"
        fi
        update_state "api" "down"
    else
        if [ "$(should_send_recovery "api" "up")" == "yes" ]; then
            send_recovery "API"
        fi
        update_state "api" "up"
    fi
    
    # Check Redis
    local redis_status
    redis_status=$(check_redis)
    if [ "$redis_status" == "down" ]; then
        has_error=1
        error_details="${error_details}\n• Redis: DOWN"
        
        if [ "$(should_send_recovery "redis" "up")" == "yes" ]; then
            send_recovery "Redis"
        fi
        update_state "redis" "down"
    else
        if [ "$(should_send_recovery "redis" "up")" == "yes" ]; then
            send_recovery "Redis"
        fi
        update_state "redis" "up"
    fi
    
    # Check PostgreSQL
    local postgres_status
    postgres_status=$(check_postgres)
    if [ "$postgres_status" == "down" ]; then
        has_error=1
        error_details="${error_details}\n• PostgreSQL: DOWN"
        
        if [ "$(should_send_recovery "postgres" "up")" == "yes" ]; then
            send_recovery "PostgreSQL"
        fi
        update_state "postgres" "down"
    else
        if [ "$(should_send_recovery "postgres" "up")" == "yes" ]; then
            send_recovery "PostgreSQL"
        fi
        update_state "postgres" "up"
    fi
    
    # Check Containers
    local container_status
    container_status=$(check_containers)
    if [ "$container_status" == "down" ]; then
        has_error=1
        error_details="${error_details}\n• Containers: Issues detected"
        
        if [ "$(should_send_recovery "containers" "up")" == "yes" ]; then
            send_recovery "Containers"
        fi
        update_state "containers" "down"
    else
        if [ "$(should_send_recovery "containers" "up")" == "yes" ]; then
            send_recovery "Containers"
        fi
        update_state "containers" "up"
    fi
    
    # Check Disk
    local disk_status
    disk_status=$(check_disk)
    if [ "$disk_status" == "critical" ]; then
        has_error=1
        error_details="${error_details}\n• Disk: CRITICAL (>90%)"
        update_state "disk" "critical"
    elif [ "$disk_status" == "warning" ]; then
        error_details="${error_details}\n• Disk: Warning (>80%)"
        update_state "disk" "warning"
    else
        update_state "disk" "ok"
    fi
    
    # Check Memory
    local mem_status
    mem_status=$(check_memory)
    if [ "$mem_status" == "critical" ]; then
        has_error=1
        error_details="${error_details}\n• Memory: CRITICAL (>90%)"
        update_state "memory" "critical"
    elif [ "$mem_status" == "warning" ]; then
        error_details="${error_details}\n• Memory: Warning (>80%)"
        update_state "memory" "warning"
    else
        update_state "memory" "ok"
    fi
    
    # Send alert if there are errors
    if [ $has_error -eq 1 ]; then
        send_alert "error" "System Check Failed" "$error_details"
    fi
    
    log "INFO" "========== Health Check Completed =========="
    
    return $has_error
}

# Setup function (run once)
setup() {
    log "INFO" "Setting up PhimGG Telegram Alert System..."
    
    # Ensure log file exists
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Get Chat ID
    if [ -z "$TELEGRAM_CHAT_ID" ]; then
        log "INFO" "TELEGRAM_CHAT_ID not set. Sending test message to get Chat ID..."
        log "INFO" "Please send a message to @PhimGG_bot first, then run this script again with:"
        log "INFO" "  export TELEGRAM_CHAT_ID=<your_chat_id>"
        
        # Try to get updates to find chat_id
        local chat_id
        chat_id=$(get_chat_id)
        if [ -n "$chat_id" ]; then
            log "INFO" "Found Chat ID: $chat_id"
            export TELEGRAM_CHAT_ID="$chat_id"
            echo "TELEGRAM_CHAT_ID=$chat_id"
        fi
    fi
    
    # Test message
    send_telegram "✅ *PhimGG Alert System*

Bot đã được kích hoạt thành công!
Bạn sẽ nhận được thông báo khi server có vấn đề.

Use: $0 start | test | setup"
    
    log "INFO" "Setup completed!"
}

# Test function
test() {
    log "INFO" "Running test alert..."
    
    send_alert "warning" "Test Alert" "Đây là tin nhắn test từ PhimGG Alert System"
    
    log "INFO" "Test completed!"
}

# Show usage
usage() {
    echo "PhimGG Telegram Alert System"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup    - Initial setup (run once)"
    echo "  start    - Run health check and send alerts"
    echo "  test     - Send a test alert"
    echo "  status   - Show current system status"
    echo ""
    echo "Environment variables:"
    echo "  TELEGRAM_BOT_TOKEN  - Telegram bot token (required)"
    echo "  TELEGRAM_CHAT_ID   - Telegram chat ID (optional, auto-detect)"
    echo ""
    echo "Example:"
    echo "  export TELEGRAM_BOT_TOKEN='8631860754:AAFE1INzNDTqj8-9SglI6-NHwBiZAU6Wu4g'"
    echo "  export TELEGRAM_CHAT_ID='YOUR_CHAT_ID'"
    echo "  $0 start"
}

# Main
case "${1:-start}" in
    setup)
        setup
        ;;
    start|monitor|check)
        run_monitoring
        ;;
    test)
        test
        ;;
    status)
        echo "=== Current State ==="
        if [ -f "$STATE_FILE" ]; then
            cat "$STATE_FILE"
        else
            echo "No state file found"
        fi
        ;;
    *)
        usage
        ;;
esac
