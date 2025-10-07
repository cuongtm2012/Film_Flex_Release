#!/bin/bash

# Enhanced FilmFlex Cron Job Management Script
# Install, manage, and monitor enhanced cron jobs for better content discovery

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
ENHANCED_CRON_CONFIG="$PROJECT_ROOT/scripts/deployment/enhanced-cron.conf"
CRON_DEST="/etc/cron.d/filmflex-imports"
LOG_DIR="/var/log/filmflex"
LOCK_DIR="/var/lock/filmflex"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }
header() { echo -e "${CYAN}🎯 $1${NC}"; }

print_banner() {
    echo -e "${CYAN}"
    echo "=================================================================="
    echo "    Enhanced FilmFlex Cron Job Management System"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Project Root: $PROJECT_ROOT"
    echo "Cron Config:  $CRON_DEST"
    echo "Log Directory: $LOG_DIR"
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root for cron management"
        echo "Please run: sudo $0 $*"
        exit 1
    fi
}

# Detect cron service name
detect_cron_service() {
    if systemctl list-unit-files | grep -q "^cron\.service"; then
        echo "cron"
    elif systemctl list-unit-files | grep -q "^crond\.service"; then
        echo "crond"
    else
        echo "unknown"
    fi
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p "$LOG_DIR" "$LOCK_DIR"
    chown -R root:root "$LOG_DIR" "$LOCK_DIR"
    chmod 755 "$LOG_DIR" "$LOCK_DIR"
    
    # Create log files if they don't exist
    touch "$LOG_DIR/cron-install.log"
    chmod 644 "$LOG_DIR/cron-install.log"
    
    success "Directories created successfully"
}

# Make all scripts executable
make_scripts_executable() {
    log "Making scripts executable..."
    
    local scripts=(
        "scripts/deployment/cron-docker-wrapper.sh"
        "scripts/maintenance/health-check.sh"
        "scripts/maintenance/rotate-logs.sh"
        "scripts/maintenance/log-db-stats.sh"
        "scripts/maintenance/track-import-success.sh"
    )
    
    local made_executable=0
    local not_found=0
    
    for script in "${scripts[@]}"; do
        local script_path="$PROJECT_ROOT/$script"
        if [ -f "$script_path" ]; then
            chmod +x "$script_path"
            success "Made executable: $script"
            made_executable=$((made_executable + 1))
        else
            warning "Script not found: $script"
            not_found=$((not_found + 1))
        fi
    done
    
    info "Summary: $made_executable made executable, $not_found not found"
}

# Create enhanced cron configuration if it doesn't exist
create_enhanced_cron_config() {
    log "Creating enhanced cron configuration..."
    
    cat > "$ENHANCED_CRON_CONFIG" << 'EOF'
# Enhanced FilmFlex Cron Job Configuration
# Optimized for better content discovery and import success

# Environment variables for cron jobs
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SHELL=/bin/bash
HOME=/root

# 1. Regular imports - Weekday mornings and evenings
0 6,18 * * 1-5 root /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh regular >/dev/null 2>&1

# 2. Weekend imports - Enhanced scanning on weekends
0 10 * * 6,0 root /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh weekend >/dev/null 2>&1

# 3. Deep discovery - Saturday early morning comprehensive scan
0 4 * * 6 root /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh deep >/dev/null 2>&1

# 4. Weekly comprehensive scan - First Sunday of month
0 1 1-7 * 0 root /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh comprehensive >/dev/null 2>&1

# 5. Targeted content discovery - Mid-week focused scan
0 14 * * 3 root /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh targeted >/dev/null 2>&1

# 6. Health monitoring - Every 4 hours
0 */4 * * * root /root/Film_Flex_Release/scripts/maintenance/health-check.sh --critical >/dev/null 2>&1

# 7. Database statistics - Daily at 2 AM
0 2 * * * root /root/Film_Flex_Release/scripts/maintenance/log-db-stats.sh >/dev/null 2>&1

# 8. Log rotation - Daily at midnight
0 0 * * * root /root/Film_Flex_Release/scripts/maintenance/rotate-logs.sh >/dev/null 2>&1

# 9. Database optimization - Weekly maintenance on Sunday
0 3 * * 0 root docker exec filmflex-postgres psql -U filmflex -d filmflex -c "VACUUM ANALYZE;" >/dev/null 2>&1

# 10. Log cleanup - Remove old logs daily
30 0 * * * root find /var/log/filmflex -name "*.log" -type f -mtime +30 -delete >/dev/null 2>&1
EOF

    success "Enhanced cron configuration created: $ENHANCED_CRON_CONFIG"
}

# Install enhanced cron jobs
install_enhanced_cron() {
    header "Installing Enhanced FilmFlex Cron Jobs"
    
    # Check if running as root
    check_root
    
    # Setup directories
    setup_directories
    
    # Make scripts executable
    make_scripts_executable
    
    # Create config if it doesn't exist
    if [ ! -f "$ENHANCED_CRON_CONFIG" ]; then
        warning "Enhanced cron configuration not found, creating it..."
        create_enhanced_cron_config
    fi
    
    # Backup existing cron if it exists
    if [ -f "$CRON_DEST" ]; then
        local backup_file="$CRON_DEST.backup.$(date +%s)"
        cp "$CRON_DEST" "$backup_file"
        log "Backed up existing cron to: $backup_file"
    fi
    
    # Install new cron configuration
    log "Installing enhanced cron configuration..."
    cp "$ENHANCED_CRON_CONFIG" "$CRON_DEST"
    chmod 644 "$CRON_DEST"
    success "Enhanced cron jobs installed to $CRON_DEST"
    
    # Restart cron service
    local cron_service=$(detect_cron_service)
    log "Detected cron service: $cron_service"
    
    if [ "$cron_service" != "unknown" ]; then
        if systemctl restart "$cron_service" 2>/dev/null; then
            success "Cron service ($cron_service) restarted successfully"
        else
            warning "Failed to restart cron service, but configuration is installed"
        fi
        
        # Enable service on boot
        systemctl enable "$cron_service" >/dev/null 2>&1 || true
    else
        warning "Could not detect cron service, manual restart may be required"
    fi
    
    # Initialize tracking files
    echo "0" > /tmp/import_failed_count
    
    # Log installation
    echo "[$(date)] Enhanced cron system installed successfully" >> "$LOG_DIR/cron-install.log"
    
    success "Enhanced cron system installation completed!"
    
    # Show installed jobs
    echo ""
    log "Installed cron jobs:"
    grep -E "^[0-9]|^[*]" "$CRON_DEST" | while IFS= read -r line; do
        echo "  $line"
    done
}

# Show enhanced status with detailed information
show_enhanced_status() {
    header "Enhanced FilmFlex Cron System Status"
    echo ""
    
    # Check if cron jobs are installed
    if [ -f "$CRON_DEST" ]; then
        success "Enhanced cron jobs are installed"
        local job_count=$(grep -c "^[0-9*]" "$CRON_DEST" 2>/dev/null || echo "0")
        info "Total active jobs: $job_count"
    else
        warning "Enhanced cron jobs are not installed"
        echo "Run: sudo $0 install"
        return 1
    fi
    
    # Check cron service status
    local cron_service=$(detect_cron_service)
    echo ""
    log "Cron service status:"
    if systemctl is-active --quiet "$cron_service" 2>/dev/null; then
        success "Cron service ($cron_service) is running"
    else
        error "Cron service ($cron_service) is not running"
        echo "Try: sudo systemctl start $cron_service"
    fi
    
    # Show recent cron activity from system logs
    echo ""
    log "Recent cron job activity:"
    if [ -f "/var/log/syslog" ]; then
        grep "filmflex\|cron-import\|Film_Flex_Release" /var/log/syslog 2>/dev/null | tail -5 | while read -r line; do
            echo "  $line"
        done
    elif [ -f "/var/log/cron" ]; then
        grep "filmflex\|cron-import\|Film_Flex_Release" /var/log/cron 2>/dev/null | tail -5 | while read -r line; do
            echo "  $line"
        done
    else
        info "No cron activity logs found in /var/log/syslog or /var/log/cron"
    fi
    
    # Check Docker containers
    echo ""
    log "Docker container status:"
    if command -v docker >/dev/null 2>&1; then
        if docker ps | grep -q "filmflex-app"; then
            success "FilmFlex app container is running"
        else
            error "FilmFlex app container is not running"
        fi
        
        if docker ps | grep -q "filmflex-postgres"; then
            success "FilmFlex database container is running"
        else
            error "FilmFlex database container is not running"
        fi
    else
        warning "Docker not found or not accessible"
    fi
    
    # Check recent import logs
    echo ""
    log "Recent import activity:"
    if ls "$LOG_DIR"/cron-import-*.log >/dev/null 2>&1; then
        local recent_logs=$(find "$LOG_DIR" -name "cron-import-*.log" -mtime -1 | wc -l)
        success "Found $recent_logs recent import logs"
        
        # Show latest log summary
        local latest_log=$(find "$LOG_DIR" -name "cron-import-*.log" -mtime -1 | sort -r | head -1)
        if [ -f "$latest_log" ]; then
            info "Latest import: $(basename "$latest_log")"
            if grep -q "SUCCESS" "$latest_log"; then
                success "Latest import completed successfully"
            elif grep -q "ERROR" "$latest_log"; then
                error "Latest import failed"
            else
                info "Latest import status unclear"
            fi
        fi
    else
        info "No recent import logs found (jobs may not have run yet)"
    fi
    
    # Show import effectiveness if tracking is available
    echo ""
    if [ -f "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" ]; then
        log "Import effectiveness analysis:"
        bash "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" analyze 2>/dev/null || warning "Import analysis failed"
    fi
}

# Show detailed logs with smart filtering
show_logs() {
    local log_type="${1:-recent}"
    local lines="${2:-50}"
    
    header "FilmFlex Cron Logs - Type: $log_type"
    echo ""
    
    case "$log_type" in
        "recent"|"import")
            log "Recent import logs (last $lines lines):"
            if ls "$LOG_DIR"/cron-import-*.log >/dev/null 2>&1; then
                local latest_log=$(find "$LOG_DIR" -name "cron-import-*.log" | sort -r | head -1)
                if [ -f "$latest_log" ]; then
                    info "Showing: $(basename "$latest_log")"
                    echo ""
                    tail -n "$lines" "$latest_log" | while IFS= read -r line; do
                        # Color code log lines
                        if echo "$line" | grep -q "SUCCESS"; then
                            echo -e "${GREEN}$line${NC}"
                        elif echo "$line" | grep -q "ERROR"; then
                            echo -e "${RED}$line${NC}"
                        elif echo "$line" | grep -q "WARNING"; then
                            echo -e "${YELLOW}$line${NC}"
                        else
                            echo "$line"
                        fi
                    done
                else
                    warning "No import logs found"
                fi
            else
                warning "No import logs found in $LOG_DIR"
            fi
            ;;
        "health")
            log "Health check logs (last $lines lines):"
            if ls "$LOG_DIR"/health-check-*.log >/dev/null 2>&1; then
                local latest_health=$(find "$LOG_DIR" -name "health-check-*.log" | sort -r | head -1)
                if [ -f "$latest_health" ]; then
                    info "Showing: $(basename "$latest_health")"
                    echo ""
                    tail -n "$lines" "$latest_health"
                else
                    warning "No health check logs found"
                fi
            else
                warning "No health check logs found"
            fi
            ;;
        "tracking"|"stats")
            log "Import tracking statistics:"
            if [ -f "$LOG_DIR/import-tracking.log" ]; then
                tail -n "$lines" "$LOG_DIR/import-tracking.log"
            else
                warning "Import tracking log not found"
            fi
            ;;
        "success"|"effectiveness")
            log "Import success statistics:"
            if [ -f "$LOG_DIR/import-success-stats.json" ]; then
                if command -v jq >/dev/null 2>&1; then
                    cat "$LOG_DIR/import-success-stats.json" | jq .
                else
                    cat "$LOG_DIR/import-success-stats.json"
                fi
            else
                warning "Import success statistics not available"
            fi
            ;;
        "errors"|"failures")
            log "Recent import errors and failures:"
            if ls "$LOG_DIR"/cron-import-*.log >/dev/null 2>&1; then
                grep -h "ERROR\|FAILED\|failed" "$LOG_DIR"/cron-import-*.log 2>/dev/null | tail -n "$lines" || warning "No recent errors found"
            else
                warning "No import logs to check for errors"
            fi
            ;;
        "system"|"cron")
            log "System cron logs:"
            if [ -f "/var/log/syslog" ]; then
                grep "cron\|CRON" /var/log/syslog | grep "filmflex\|Film_Flex_Release" | tail -n "$lines"
            elif [ -f "/var/log/cron" ]; then
                grep "filmflex\|Film_Flex_Release" /var/log/cron | tail -n "$lines"
            else
                warning "No system cron logs found"
            fi
            ;;
        "all")
            log "All recent logs (last $lines lines each):"
            for logfile in "$LOG_DIR"/*.log; do
                if [ -f "$logfile" ]; then
                    echo ""
                    echo "=== $(basename "$logfile") ==="
                    tail -n "$lines" "$logfile"
                fi
            done
            ;;
        *)
            warning "Unknown log type: $log_type"
            echo "Available types: recent, health, tracking, success, errors, system, all"
            ;;
    esac
}

# Test import system
test_import_system() {
    local import_type="${1:-regular}"
    
    header "Testing FilmFlex Import System"
    log "Testing import type: $import_type"
    
    local cron_wrapper="$PROJECT_ROOT/scripts/deployment/cron-docker-wrapper.sh"
    if [ ! -f "$cron_wrapper" ]; then
        error "Cron wrapper script not found: $cron_wrapper"
        return 1
    fi
    
    if [ ! -x "$cron_wrapper" ]; then
        chmod +x "$cron_wrapper"
        log "Made cron wrapper executable"
    fi
    
    log "Running test import (this may take a few minutes)..."
    if timeout 300 bash "$cron_wrapper" "$import_type" test; then
        success "Import test completed successfully"
        
        # Show test results
        echo ""
        log "Checking test results..."
        if [ -f "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" ]; then
            bash "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" analyze 2>/dev/null || warning "Could not analyze test results"
        fi
    else
        error "Import test failed or timed out"
        return 1
    fi
}

# List all cron jobs
list_cron_jobs() {
    header "Current FilmFlex Cron Jobs"
    echo ""
    
    if [ -f "$CRON_DEST" ]; then
        log "Active cron jobs in $CRON_DEST:"
        echo ""
        
        local job_num=1
        grep -E "^[0-9]|^[*]" "$CRON_DEST" | while IFS= read -r line; do
            echo -e "${CYAN}[$job_num]${NC} $line"
            job_num=$((job_num + 1))
        done
        
        echo ""
        local total_jobs=$(grep -c "^[0-9*]" "$CRON_DEST" 2>/dev/null || echo "0")
        info "Total active jobs: $total_jobs"
    else
        warning "No cron jobs installed"
        echo "Run: sudo $0 install"
    fi
}

# Remove cron jobs
remove_cron_jobs() {
    header "Removing FilmFlex Cron Jobs"
    
    check_root
    
    if [ -f "$CRON_DEST" ]; then
        # Create backup before removal
        local backup_file="$CRON_DEST.removed.$(date +%s)"
        cp "$CRON_DEST" "$backup_file"
        log "Backed up cron jobs to: $backup_file"
        
        # Remove cron file
        rm "$CRON_DEST"
        success "Removed cron jobs from $CRON_DEST"
        
        # Restart cron service
        local cron_service=$(detect_cron_service)
        if [ "$cron_service" != "unknown" ]; then
            if systemctl restart "$cron_service" 2>/dev/null; then
                success "Cron service ($cron_service) restarted"
            else
                warning "Failed to restart cron service"
            fi
        fi
        
        # Clean up tracking files
        rm -f /tmp/import_failed_count
        
        success "FilmFlex cron jobs removed successfully"
    else
        warning "No cron jobs found to remove"
    fi
}

# Reset import statistics and counters
reset_import_stats() {
    header "Resetting Import Statistics"
    
    log "Resetting import statistics and counters..."
    
    # Reset failure counter
    echo "0" > /tmp/import_failed_count
    success "Reset import failure counter"
    
    # Clear tracking statistics
    if [ -f "$LOG_DIR/import-success-stats.json" ]; then
        rm "$LOG_DIR/import-success-stats.json"
        success "Cleared import success statistics"
    fi
    
    # Archive old logs
    if ls "$LOG_DIR"/cron-import-*.log >/dev/null 2>&1; then
        local archive_dir="$LOG_DIR/archive/$(date +%Y%m%d)"
        mkdir -p "$archive_dir"
        mv "$LOG_DIR"/cron-import-*.log "$archive_dir/" 2>/dev/null || true
        success "Archived old import logs to $archive_dir"
    fi
    
    log "All import statistics and counters have been reset"
}

# Show usage information
show_usage() {
    echo "Usage: $0 {install|remove|status|logs|test|list|reset|help} [options]"
    echo ""
    echo "Commands:"
    echo "  install                      Install enhanced cron jobs"
    echo "  remove                       Remove all FilmFlex cron jobs"
    echo "  status                       Show comprehensive system status"
    echo "  logs [type] [lines]          Show logs with filtering"
    echo "  test [type]                  Test import system"
    echo "  list                         List all current cron jobs"
    echo "  reset                        Reset statistics and counters"
    echo "  help                         Show this help message"
    echo ""
    echo "Log Types:"
    echo "  recent/import               Recent import logs (default)"
    echo "  health                      Health check logs"
    echo "  tracking/stats              Import tracking logs"
    echo "  success/effectiveness       Success statistics (JSON)"
    echo "  errors/failures             Error logs only"
    echo "  system/cron                 System cron logs"
    echo "  all                         All log files"
    echo ""
    echo "Import Types for Testing:"
    echo "  regular                     Regular import (default)"
    echo "  weekend                     Weekend enhanced import"
    echo "  deep                        Deep discovery import"
    echo "  comprehensive               Comprehensive scan"
    echo "  targeted                    Targeted content import"
    echo ""
    echo "Examples:"
    echo "  sudo $0 install                     # Install cron system"
    echo "  $0 status                           # Show system status"
    echo "  $0 logs recent 100                  # Show last 100 import log lines"
    echo "  $0 logs errors                      # Show only error logs"
    echo "  sudo $0 test regular                # Test regular import"
    echo "  $0 list                             # List all cron jobs"
    echo "  sudo $0 reset                       # Reset all statistics"
    echo ""
    echo "Enhanced Features:"
    echo "  • Multiple import strategies for better content discovery"
    echo "  • Comprehensive health monitoring and logging"
    echo "  • Import effectiveness tracking and statistics"
    echo "  • Automatic error handling and retry mechanisms"
    echo "  • Database optimization and maintenance"
    echo "  • Smart log rotation and cleanup"
    echo ""
}

# Main execution
main() {
    print_banner
    
    case "${1:-help}" in
        "install")
            install_enhanced_cron
            ;;
        "remove")
            remove_cron_jobs
            ;;
        "status")
            show_enhanced_status
            ;;
        "logs")
            show_logs "$2" "$3"
            ;;
        "test")
            test_import_system "$2"
            ;;
        "list")
            list_cron_jobs
            ;;
        "reset")
            reset_import_stats
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

main "$@"