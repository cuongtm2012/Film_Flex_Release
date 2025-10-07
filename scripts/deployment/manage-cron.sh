#!/bin/bash

# Enhanced PhimGG Cron Job Management Script
# Install, manage, and monitor enhanced cron jobs for better content discovery

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
ENHANCED_CRON_CONFIG="$PROJECT_ROOT/scripts/deployment/enhanced-cron.conf"
ORIGINAL_CRON_CONFIG="$PROJECT_ROOT/scripts/deployment/filmflex-cron.conf"
CRON_DEST="/etc/cron.d/filmflex-imports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

print_banner() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "    Enhanced PhimGG Cron Job Management System"
    echo "======================================================"
    echo -e "${NC}"
    echo "Project Root: $PROJECT_ROOT"
    echo ""
}

# Make all scripts executable including enhanced ones
make_scripts_executable() {
    log "Making scripts executable..."
    
    local scripts=(
        "scripts/deployment/enhanced-cron-wrapper.sh"
        "scripts/deployment/cron-docker-wrapper.sh"
        "scripts/deployment/retry-failed-imports.sh" 
        "scripts/maintenance/health-check.sh"
        "scripts/maintenance/rotate-logs.sh"
        "scripts/maintenance/log-db-stats.sh"
        "scripts/maintenance/track-import-success.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$PROJECT_ROOT/$script"
        if [ -f "$script_path" ]; then
            chmod +x "$script_path"
            success "Made executable: $script"
        else
            warning "Script not found: $script"
        fi
    done
}

# Install enhanced cron jobs
install_enhanced_cron() {
    log "Installing Enhanced PhimGG cron jobs..."
    
    if [ ! -f "$ENHANCED_CRON_CONFIG" ]; then
        error "Enhanced cron configuration file not found: $ENHANCED_CRON_CONFIG"
        if [ -f "$ORIGINAL_CRON_CONFIG" ]; then
            warning "Falling back to original configuration"
            local config_to_use="$ORIGINAL_CRON_CONFIG"
        else
            error "No cron configuration found"
            return 1
        fi
    else
        local config_to_use="$ENHANCED_CRON_CONFIG"
        success "Using enhanced cron configuration"
    fi
    
    # Create log and lock directories
    sudo mkdir -p /var/log/filmflex /var/lock/filmflex
    sudo chown -R root:root /var/log/filmflex /var/lock/filmflex
    
    # Backup existing cron if it exists
    if [ -f "$CRON_DEST" ]; then
        sudo cp "$CRON_DEST" "$CRON_DEST.backup.$(date +%s)"
        log "Backed up existing cron configuration"
    fi
    
    # Install enhanced cron configuration
    sudo cp "$config_to_use" "$CRON_DEST"
    success "Enhanced cron jobs installed to $CRON_DEST"
    
    # Restart cron service
    sudo systemctl reload cron
    success "Cron service reloaded"
    
    # Initialize tracking files
    touch /tmp/import_failed_count
    echo "0" > /tmp/import_failed_count
    
    log "Installed enhanced cron jobs:"
    cat "$CRON_DEST" | grep -v "^#" | grep -v "^$" | while IFS= read -r line; do
        echo "  $line"
    done
}

# Show enhanced status with import effectiveness
show_enhanced_status() {
    log "Enhanced PhimGG Cron Job Status:"
    echo ""
    
    if [ -f "$CRON_DEST" ]; then
        success "Enhanced cron jobs are installed"
        echo ""
        log "Active enhanced cron jobs:"
        cat "$CRON_DEST" | grep -v "^#" | grep -v "^$" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        warning "Enhanced cron jobs are not installed"
    fi
    
    echo ""
    log "Recent import effectiveness:"
    if [ -f "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" ]; then
        bash "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" analyze 2>/dev/null || warning "Import analysis failed"
    else
        warning "Import tracking script not found"
    fi
    
    echo ""
    log "Recent enhanced import activity (last 5 entries):"
    if ls /var/log/filmflex/*enhanced-import*.log >/dev/null 2>&1; then
        find /var/log/filmflex -name "*enhanced-import*.log" -mtime -1 | sort -r | head -5 | while read -r logfile; do
            if [ -f "$logfile" ]; then
                echo "  $(basename "$logfile"): $(tail -1 "$logfile" 2>/dev/null || echo "No content")"
            fi
        done
    else
        info "No enhanced import logs found yet (will appear after first run)"
    fi
    
    echo ""
    log "System health status:"
    if [ -f "$PROJECT_ROOT/scripts/maintenance/health-check.sh" ]; then
        bash "$PROJECT_ROOT/scripts/maintenance/health-check.sh" --critical 2>/dev/null || warning "Health check reported issues"
    else
        warning "Health check script not found"
    fi
}

# Test enhanced import system
test_enhanced_import() {
    local import_type="${1:-regular}"
    
    log "Testing enhanced import system with type: $import_type"
    
    local enhanced_wrapper="$PROJECT_ROOT/scripts/deployment/enhanced-cron-wrapper.sh"
    if [ ! -f "$enhanced_wrapper" ]; then
        error "Enhanced import wrapper not found: $enhanced_wrapper"
        return 1
    fi
    
    log "Running test import (this may take a few minutes)..."
    if timeout 600 bash "$enhanced_wrapper" "$import_type" test; then
        success "Enhanced import test completed successfully"
        
        # Show results
        log "Checking test results..."
        if [ -f "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" ]; then
            bash "$PROJECT_ROOT/scripts/maintenance/track-import-success.sh" analyze
        fi
    else
        error "Enhanced import test failed or timed out"
        return 1
    fi
}

# Show detailed import logs with filtering
show_enhanced_logs() {
    local log_type="${1:-enhanced}"
    local lines="${2:-50}"
    
    case "$log_type" in
        "enhanced"|"import")
            log "Recent enhanced import logs (last $lines lines):"
            if ls /var/log/filmflex/*enhanced-import*.log >/dev/null 2>&1; then
                find /var/log/filmflex -name "*enhanced-import*.log" -mtime -7 | sort -r | head -1 | xargs tail -n "$lines" 2>/dev/null || warning "No recent enhanced import logs"
            else
                warning "No enhanced import logs found"
            fi
            ;;
        "tracking"|"stats")
            log "Import effectiveness tracking (last $lines lines):"
            if [ -f "/var/log/filmflex/import-tracking.log" ]; then
                tail -n "$lines" /var/log/filmflex/import-tracking.log
            else
                warning "Import tracking log not found"
            fi
            ;;
        "success"|"effectiveness")
            log "Import success statistics:"
            if [ -f "/var/log/filmflex/import-success-stats.json" ]; then
                cat /var/log/filmflex/import-success-stats.json | jq . 2>/dev/null || cat /var/log/filmflex/import-success-stats.json
            else
                warning "Import success statistics not available"
            fi
            ;;
        "errors"|"failures")
            log "Recent import errors and failures:"
            grep -r "ERROR\|FAILED" /var/log/filmflex/*enhanced-import*.log 2>/dev/null | tail -n "$lines" || warning "No recent errors found"
            ;;
        *)
            log "All recent enhanced logs (last $lines lines each):"
            for logfile in /var/log/filmflex/*enhanced*.log; do
                if [ -f "$logfile" ]; then
                    echo ""
                    echo "=== $(basename "$logfile") ==="
                    tail -n "$lines" "$logfile"
                fi
            done
            ;;
    esac
}

# Enhanced usage information
show_enhanced_usage() {
    echo "Usage: $0 {install|remove|status|logs|test|reset|help} [options]"
    echo ""
    echo "Enhanced Commands:"
    echo "  install                      Install enhanced cron jobs with better content discovery"
    echo "  remove                       Remove all PhimGG cron jobs"  
    echo "  status                       Show enhanced status with import effectiveness"
    echo "  logs [type] [lines]          Show enhanced logs"
    echo "    - enhanced/import          Recent enhanced import logs"
    echo "    - tracking/stats           Import effectiveness tracking"
    echo "    - success/effectiveness    Success statistics (JSON)"
    echo "    - errors/failures          Recent errors and failures"
    echo "  test [type]                  Test enhanced import system"
    echo "    - regular                  Test regular enhanced import"
    echo "    - deep                     Test deep discovery import"
    echo "    - targeted-new             Test targeted new content import"
    echo "  reset                        Reset import failure counters and statistics"
    echo "  help                         Show this enhanced help message"
    echo ""
    echo "Examples:"
    echo "  $0 install                           # Install enhanced cron system"
    echo "  $0 status                            # Show enhanced status with effectiveness"
    echo "  $0 logs enhanced 100                 # Show last 100 enhanced import log lines"
    echo "  $0 logs success                      # Show import success statistics"
    echo "  $0 test targeted-new                 # Test targeted new content discovery"
    echo "  $0 reset                             # Reset all counters and statistics"
    echo ""
    echo "Enhanced Features:"
    echo "  • Smart content discovery strategies"
    echo "  • Multiple import approaches (regular, deep, targeted)"
    echo "  • Import effectiveness tracking and optimization"
    echo "  • Automatic fallback strategies for failed imports"
    echo "  • Enhanced logging and monitoring"
    echo "  • Database optimization and maintenance"
    echo ""
}

# Reset import statistics and counters
reset_import_stats() {
    log "Resetting import statistics and counters..."
    
    # Reset failure counter
    echo "0" > /tmp/import_failed_count
    success "Reset import failure counter"
    
    # Clear tracking statistics
    if [ -f "/var/log/filmflex/import-success-stats.json" ]; then
        rm "/var/log/filmflex/import-success-stats.json"
        success "Cleared import success statistics"
    fi
    
    # Rotate old enhanced import logs
    find /var/log/filmflex -name "*enhanced-import*.log" -mtime +1 -exec mv {} {}.old \; 2>/dev/null || true
    success "Rotated old enhanced import logs"
    
    log "All import statistics and counters have been reset"
}

# Main execution
main() {
    print_banner
    
    case "${1:-help}" in
        "install")
            make_scripts_executable
            install_enhanced_cron
            show_enhanced_status
            info "Enhanced cron system installed! Next import will use enhanced strategies."
            ;;
        "remove")
            if [ -f "$CRON_DEST" ]; then
                sudo rm "$CRON_DEST"
                success "Removed enhanced cron jobs"
                sudo systemctl reload cron
                success "Cron service reloaded"
            else
                warning "No cron jobs found to remove"
            fi
            ;;
        "status")
            show_enhanced_status
            ;;
        "logs")
            show_enhanced_logs "$2" "$3"
            ;;
        "test")
            test_enhanced_import "$2"
            ;;
        "reset")
            reset_import_stats
            ;;
        "help"|*)
            show_enhanced_usage
            ;;
    esac
}

main "$@"