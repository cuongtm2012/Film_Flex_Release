#!/bin/bash

# FilmFlex Cron Job Management Script
# Install, manage, and monitor cron jobs for FilmFlex imports

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
CRON_CONFIG="$PROJECT_ROOT/scripts/deployment/filmflex-cron.conf"
CRON_DEST="/etc/cron.d/filmflex-imports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

print_banner() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "    FilmFlex Cron Job Management System"
    echo "======================================================"
    echo -e "${NC}"
    echo "Project Root: $PROJECT_ROOT"
    echo ""
}

# Make all scripts executable
make_scripts_executable() {
    log "Making scripts executable..."
    
    local scripts=(
        "scripts/deployment/cron-docker-wrapper.sh"
        "scripts/deployment/retry-failed-imports.sh" 
        "scripts/maintenance/health-check.sh"
        "scripts/maintenance/rotate-logs.sh"
        "scripts/maintenance/log-db-stats.sh"
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

# Install cron jobs
install_cron() {
    log "Installing FilmFlex cron jobs..."
    
    if [ ! -f "$CRON_CONFIG" ]; then
        error "Cron configuration file not found: $CRON_CONFIG"
        return 1
    fi
    
    # Create log and lock directories
    sudo mkdir -p /var/log/filmflex /var/lock/filmflex
    sudo chown -R root:root /var/log/filmflex /var/lock/filmflex
    
    # Install cron configuration
    sudo cp "$CRON_CONFIG" "$CRON_DEST"
    success "Cron jobs installed to $CRON_DEST"
    
    # Restart cron service
    sudo systemctl reload cron
    success "Cron service reloaded"
    
    log "Installed cron jobs:"
    sudo crontab -l | grep filmflex || echo "No user crontab entries found"
    echo ""
    log "System cron jobs:"
    cat "$CRON_DEST" | grep -v "^#" | grep -v "^$"
}

# Remove cron jobs
remove_cron() {
    log "Removing FilmFlex cron jobs..."
    
    if [ -f "$CRON_DEST" ]; then
        sudo rm "$CRON_DEST"
        success "Removed system cron jobs"
        sudo systemctl reload cron
        success "Cron service reloaded"
    else
        warning "No system cron jobs found to remove"
    fi
}

# Show current cron status
show_status() {
    log "FilmFlex Cron Job Status:"
    echo ""
    
    if [ -f "$CRON_DEST" ]; then
        success "System cron jobs are installed"
        echo ""
        log "Active cron jobs:"
        cat "$CRON_DEST" | grep -v "^#" | grep -v "^$" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        warning "System cron jobs are not installed"
    fi
    
    echo ""
    log "Recent import activity (last 10 entries):"
    if [ -f "/var/log/filmflex/cron-imports.log" ]; then
        tail -n 10 /var/log/filmflex/cron-imports.log | while IFS= read -r line; do
            echo "  $line"
        done
    else
        warning "No import logs found"
    fi
    
    echo ""
    log "System health status:"
    if [ -f "$PROJECT_ROOT/scripts/maintenance/health-check.sh" ]; then
        bash "$PROJECT_ROOT/scripts/maintenance/health-check.sh" || warning "Health check reported issues"
    else
        warning "Health check script not found"
    fi
}

# Show logs with filtering
show_logs() {
    local log_type="${1:-all}"
    local lines="${2:-50}"
    
    case "$log_type" in
        "imports"|"import")
            log "Recent import logs (last $lines lines):"
            if [ -f "/var/log/filmflex/cron-imports.log" ]; then
                tail -n "$lines" /var/log/filmflex/cron-imports.log
            else
                warning "Import log not found"
            fi
            ;;
        "errors"|"error")
            log "Recent error logs (last $lines lines):"
            if [ -f "/var/log/filmflex/cron-errors.log" ]; then
                tail -n "$lines" /var/log/filmflex/cron-errors.log
            else
                warning "Error log not found"
            fi
            ;;
        "health")
            log "Recent health check logs (last $lines lines):"
            if [ -f "/var/log/filmflex/health-check.log" ]; then
                tail -n "$lines" /var/log/filmflex/health-check.log
            else
                warning "Health log not found"
            fi
            ;;
        "stats"|"db")
            log "Recent database statistics (last $lines lines):"
            if [ -f "/var/log/filmflex/db-stats.log" ]; then
                tail -n "$lines" /var/log/filmflex/db-stats.log
            else
                warning "Database stats log not found"
            fi
            ;;
        *)
            log "All recent logs (last $lines lines each):"
            for logfile in /var/log/filmflex/*.log; do
                if [ -f "$logfile" ]; then
                    echo ""
                    echo "=== $(basename "$logfile") ==="
                    tail -n "$lines" "$logfile"
                fi
            done
            ;;
    esac
}

# Test a specific import type
test_import() {
    local import_type="${1:-regular}"
    
    log "Testing $import_type import..."
    
    if [ -f "$PROJECT_ROOT/scripts/deployment/cron-docker-wrapper.sh" ]; then
        bash "$PROJECT_ROOT/scripts/deployment/cron-docker-wrapper.sh" "$import_type"
    else
        error "Cron wrapper script not found"
        return 1
    fi
}

# Show usage information
show_usage() {
    echo "Usage: $0 {install|remove|status|logs|test|help} [options]"
    echo ""
    echo "Commands:"
    echo "  install              Install cron jobs and make scripts executable"
    echo "  remove               Remove all FilmFlex cron jobs"  
    echo "  status               Show current cron job status and recent activity"
    echo "  logs [type] [lines]  Show logs (types: imports, errors, health, stats, all)"
    echo "  test [type]          Test import (types: regular, weekend, deep, comprehensive)"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install                    # Install all cron jobs"
    echo "  $0 status                     # Show current status"
    echo "  $0 logs imports 100           # Show last 100 import log lines"  
    echo "  $0 test regular               # Test regular import"
    echo ""
}

# Main execution
main() {
    print_banner
    
    case "${1:-help}" in
        "install")
            make_scripts_executable
            install_cron
            show_status
            ;;
        "remove")
            remove_cron
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2" "$3"
            ;;
        "test")
            test_import "$2"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

main "$@"