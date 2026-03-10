#!/bin/bash

# Log Rotation Script for FilmFlex
# Manages log file rotation and cleanup

set -e

LOG_DIR="/var/log/filmflex"
BACKUP_DIR="/var/backups/filmflex-logs"
MAX_LOG_SIZE="100M"
KEEP_DAYS=30
KEEP_ROTATED=5

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_rotate() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "[$timestamp] ${GREEN}✅ $message${NC}" ;;
        "WARNING") echo -e "[$timestamp] ${YELLOW}⚠️  $message${NC}" ;;
        *) echo -e "[$timestamp] ${BLUE}ℹ️  $message${NC}" ;;
    esac
}

# Create directories
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

log_rotate "INFO" "Starting log rotation for FilmFlex"

# Rotate large log files
find "$LOG_DIR" -name "*.log" -size +"$MAX_LOG_SIZE" -type f | while read -r logfile; do
    if [ -f "$logfile" ]; then
        local basename=$(basename "$logfile" .log)
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local rotated_name="${basename}_${timestamp}.log"
        
        # Move to backup directory
        mv "$logfile" "$BACKUP_DIR/$rotated_name"
        
        # Compress the rotated log
        gzip "$BACKUP_DIR/$rotated_name" 2>/dev/null || true
        
        log_rotate "SUCCESS" "Rotated large log: $(basename "$logfile") -> $rotated_name.gz"
        
        # Create new empty log file
        touch "$logfile"
        chmod 644 "$logfile"
    fi
done

# Remove old logs
find "$LOG_DIR" -name "*.log" -mtime +$KEEP_DAYS -type f -delete 2>/dev/null || true
log_rotate "INFO" "Removed logs older than $KEEP_DAYS days"

# Remove old rotated logs
find "$BACKUP_DIR" -name "*.log.gz" -mtime +$((KEEP_DAYS * 2)) -type f -delete 2>/dev/null || true

# Keep only recent rotated logs
find "$BACKUP_DIR" -name "*.log.gz" -type f | sort -r | tail -n +$((KEEP_ROTATED + 1)) | xargs rm -f 2>/dev/null || true

log_rotate "SUCCESS" "Log rotation completed"