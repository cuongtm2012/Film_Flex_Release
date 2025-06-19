#!/bin/bash

# FilmFlex Crontab Status Checker
# Comprehensive cron job monitoring for production environments
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
success() { echo -e "${GREEN}✓ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }
debug() { echo -e "${PURPLE}🔧 $1${NC}"; }

echo -e "${PURPLE}=========================================="
echo "    FilmFlex Crontab Status Check"
echo "    $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "==========================================${NC}"
echo

# 1. Check if cron service is running
info "Checking cron service status..."
if systemctl is-active --quiet cron; then
    success "Cron service is running"
elif systemctl is-active --quiet crond; then
    success "Crond service is running"
else
    error "Cron service is not running"
    info "Try: sudo systemctl start cron"
fi
echo

# 2. Show cron service details
info "Cron service details:"
systemctl status cron 2>/dev/null || systemctl status crond 2>/dev/null || warning "Could not get cron service status"
echo

# 3. List all crontabs
info "All user crontabs:"
for user in $(cut -f1 -d: /etc/passwd); do
    if crontab -u $user -l 2>/dev/null | grep -v "^#" | grep -v "^$" >/dev/null 2>&1; then
        echo "User: $user"
        crontab -u $user -l 2>/dev/null | grep -v "^#" | grep -v "^$" | while read line; do
            echo "  $line"
        done
        echo
    fi
done

# 4. Check system-wide crontabs
info "System-wide crontabs:"
if [ -f /etc/crontab ]; then
    echo "=== /etc/crontab ==="
    grep -v "^#" /etc/crontab | grep -v "^$" || echo "No active entries"
    echo
fi

if [ -d /etc/cron.d ]; then
    echo "=== /etc/cron.d/ ==="
    for file in /etc/cron.d/*; do
        if [ -f "$file" ]; then
            echo "File: $(basename $file)"
            grep -v "^#" "$file" | grep -v "^$" | while read line; do
                echo "  $line"
            done
            echo
        fi
    done
fi

# 5. Check FilmFlex specific cron jobs
info "FilmFlex specific cron jobs:"
found_filmflex=false

# Check root crontab for FilmFlex
if crontab -u root -l 2>/dev/null | grep -i filmflex >/dev/null 2>&1; then
    found_filmflex=true
    echo "=== Root crontab (FilmFlex jobs) ==="
    crontab -u root -l 2>/dev/null | grep -i filmflex
    echo
fi

# Check system crontabs for FilmFlex
if [ -d /etc/cron.d ]; then
    for file in /etc/cron.d/*; do
        if [ -f "$file" ] && grep -i filmflex "$file" >/dev/null 2>&1; then
            found_filmflex=true
            echo "=== $(basename $file) (FilmFlex jobs) ==="
            grep -i filmflex "$file"
            echo
        fi
    done
fi

if [ "$found_filmflex" = false ]; then
    warning "No FilmFlex cron jobs found"
fi

# 6. Check cron logs
info "Recent cron activity (last 20 lines):"
if [ -f /var/log/cron ]; then
    tail -20 /var/log/cron
elif [ -f /var/log/syslog ]; then
    tail -20 /var/log/syslog | grep -i cron
elif journalctl -u cron >/dev/null 2>&1; then
    journalctl -u cron --no-pager -n 20
else
    warning "Could not find cron logs"
fi
echo

# 7. Check FilmFlex cron logs
info "FilmFlex cron execution logs:"
if [ -d /var/log/filmflex ]; then
    echo "=== Recent FilmFlex cron logs ==="
    ls -la /var/log/filmflex/cron-* 2>/dev/null | tail -10 || echo "No FilmFlex cron logs found"
    echo
    
    # Show last execution status
    latest_log=$(ls -t /var/log/filmflex/cron-* 2>/dev/null | head -1)
    if [ -n "$latest_log" ]; then
        echo "=== Latest cron execution log ==="
        echo "File: $latest_log"
        echo "Size: $(du -h "$latest_log" | cut -f1)"
        echo "Modified: $(stat -c %y "$latest_log" 2>/dev/null || stat -f %Sm "$latest_log")"
        echo
        echo "Last 10 lines:"
        tail -10 "$latest_log"
        echo
    fi
else
    warning "FilmFlex log directory not found: /var/log/filmflex"
fi

# 8. Check for running FilmFlex processes
info "Current FilmFlex processes:"
ps aux | grep -E "(filmflex|import-movies|import-all)" | grep -v grep || echo "No FilmFlex processes currently running"
echo

# 9. Check next scheduled runs
info "Next scheduled cron jobs:"
if command -v crontab >/dev/null 2>&1; then
    # This is a simple estimation - actual scheduling depends on cron implementation
    echo "Note: Use 'crontab -l' to see scheduled times"
    echo "Current time: $(date)"
    echo
    
    # Show when the next FilmFlex jobs should run based on schedule
    echo "=== FilmFlex Job Schedule ==="
    echo "• Movie import: Daily at 6:00 AM and 6:00 PM"
    echo "• Deep scan: Saturdays at 6:00 AM"
    echo "• Full import: First Sunday of month at 2:00 AM"
    echo "• Log cleanup: Daily at midnight"
    echo
fi

# 10. Validate cron job paths and scripts
info "Validating FilmFlex cron job paths:"
validation_errors=0

# Check if import script exists
if [ ! -f "/root/Film_Flex_Release/scripts/data/import-movies.sh" ]; then
    error "Import script not found: /root/Film_Flex_Release/scripts/data/import-movies.sh"
    ((validation_errors++))
else
    success "Import script exists"
fi

# Check if full import script exists
if [ ! -f "/root/Film_Flex_Release/scripts/data/import-all-movies-resumable.sh" ]; then
    error "Full import script not found: /root/Film_Flex_Release/scripts/data/import-all-movies-resumable.sh"
    ((validation_errors++))
else
    success "Full import script exists"
fi

# Check if source directory exists
if [ ! -d "/root/Film_Flex_Release" ]; then
    error "Source directory not found: /root/Film_Flex_Release"
    ((validation_errors++))
else
    success "Source directory exists"
fi

# Check if log directory exists
if [ ! -d "/var/log/filmflex" ]; then
    warning "Log directory not found: /var/log/filmflex"
    info "Create with: sudo mkdir -p /var/log/filmflex"
    ((validation_errors++))
else
    success "Log directory exists"
fi

if [ $validation_errors -eq 0 ]; then
    success "All cron job paths validated successfully"
else
    warning "$validation_errors validation errors found"
fi
echo

# 11. Cron troubleshooting tips
info "Cron troubleshooting tips:"
echo "• Check cron service: systemctl status cron"
echo "• View cron logs: journalctl -u cron -f"
echo "• Test cron expression: Use online cron expression tester"
echo "• Manual test: Run scripts manually to verify they work"
echo "• Check permissions: Ensure scripts are executable"
echo "• Environment variables: Cron has minimal environment"
echo "• Path issues: Use absolute paths in cron jobs"
echo

success "Crontab status check completed!"
echo -e "${BLUE}For real-time cron monitoring: journalctl -u cron -f${NC}"
echo -e "${BLUE}For FilmFlex logs: tail -f /var/log/filmflex/cron-*.log${NC}"