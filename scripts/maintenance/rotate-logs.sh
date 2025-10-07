#!/bin/bash

# PhimGG Log Rotation Script
# Rotates and compresses old log files to save disk space

set -e

LOG_DIR="/var/log/filmflex"
ARCHIVE_DIR="$LOG_DIR/archive"
MAX_SIZE_MB=100
DAYS_TO_KEEP=90

mkdir -p "$ARCHIVE_DIR"

log() { 
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [LOG-ROTATE] $1" | tee -a "$LOG_DIR/maintenance.log"
}

# Rotate large log files
rotate_large_logs() {
    local rotated_count=0
    
    find "$LOG_DIR" -name "*.log" -type f -size +"${MAX_SIZE_MB}M" | while read -r logfile; do
        local basename=$(basename "$logfile" .log)
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local archived_name="$ARCHIVE_DIR/${basename}_${timestamp}.log.gz"
        
        log "Rotating large log file: $logfile ($(du -h "$logfile" | cut -f1))"
        
        # Compress and move to archive
        gzip -c "$logfile" > "$archived_name"
        
        # Truncate original file instead of deleting to avoid breaking file handles
        > "$logfile"
        
        ((rotated_count++))
        log "Archived to: $archived_name"
    done
    
    log "Rotated $rotated_count large log files"
}

# Archive old logs
archive_old_logs() {
    local archived_count=0
    
    # Archive logs older than 7 days
    find "$LOG_DIR" -name "*.log" -type f -mtime +7 | while read -r logfile; do
        local basename=$(basename "$logfile")
        if [[ "$basename" != "maintenance.log" ]]; then  # Keep maintenance log active
            local timestamp=$(date +%Y%m%d -r "$logfile")
            local archived_name="$ARCHIVE_DIR/${basename%.log}_${timestamp}.log.gz"
            
            log "Archiving old log: $logfile"
            gzip -c "$logfile" > "$archived_name"
            rm "$logfile"
            
            ((archived_count++))
        fi
    done
    
    log "Archived $archived_count old log files"
}

# Clean very old archives
clean_old_archives() {
    local cleaned_count=0
    cleaned_count=$(find "$ARCHIVE_DIR" -name "*.gz" -type f -mtime +$DAYS_TO_KEEP -delete -print | wc -l)
    log "Cleaned $cleaned_count very old archive files (older than $DAYS_TO_KEEP days)"
}

# Show disk usage summary
show_disk_usage() {
    local current_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    local archive_size=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)
    local available_space=$(df "$LOG_DIR" | awk 'NR==2 {print $4}')
    
    log "Log directory size: $current_size"
    log "Archive size: $archive_size" 
    log "Available disk space: $((available_space / 1024))MB"
}

main() {
    log "==================== LOG ROTATION START ===================="
    
    show_disk_usage
    rotate_large_logs
    archive_old_logs
    clean_old_archives
    show_disk_usage
    
    log "==================== LOG ROTATION END ===================="
}

main "$@"