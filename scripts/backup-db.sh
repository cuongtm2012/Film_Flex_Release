#!/bin/bash
# Database backup script for FilmFlex
# Run this script daily via cron to maintain database backups

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/var/backups/filmflex"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="filmflex_${DATE}.sql"
RETENTION_DAYS=14

# Database credentials - get from environment if available
DB_USER=${PGUSER:-"filmflex"}
DB_PASSWORD=${PGPASSWORD:-"Cuongtm2012$"}
DB_NAME=${PGDATABASE:-"filmflex"}
DB_HOST=${PGHOST:-"localhost"}
DB_PORT=${PGPORT:-"5432"}

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log function
log() {
  echo -e "$(date +"%Y-%m-%d %H:%M:%S") - $1"
  echo "$(date +"%Y-%m-%d %H:%M:%S") - $1" >> "$BACKUP_DIR/backup.log"
}

# Backup function
backup_database() {
  log "${GREEN}Starting database backup...${NC}"
  
  # Create the backup
  PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -F c -b -v -f "$BACKUP_DIR/$BACKUP_FILE" "$DB_NAME"
  
  if [ $? -eq 0 ]; then
    log "${GREEN}Backup completed successfully: $BACKUP_FILE${NC}"
    # Compress the backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    log "${GREEN}Backup compressed: ${BACKUP_FILE}.gz${NC}"
    return 0
  else
    log "${RED}Backup failed!${NC}"
    return 1
  fi
}

# Clean old backups
clean_old_backups() {
  log "${YELLOW}Cleaning backups older than $RETENTION_DAYS days...${NC}"
  find "$BACKUP_DIR" -type f -name "filmflex_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  log "${GREEN}Old backups cleaned.${NC}"
}

# Main execution
log "======== STARTING BACKUP PROCESS ========"

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
  log "${RED}Error: pg_dump command not found. Please install PostgreSQL client tools.${NC}"
  exit 1
fi

# Run backup
backup_database
BACKUP_STATUS=$?

# Clean old backups if backup was successful
if [ $BACKUP_STATUS -eq 0 ]; then
  clean_old_backups
  
  # Calculate total size of backups
  TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
  log "${GREEN}Total backup size: $TOTAL_SIZE${NC}"
  
  # Count number of backups
  BACKUP_COUNT=$(find "$BACKUP_DIR" -type f -name "filmflex_*.sql.gz" | wc -l)
  log "${GREEN}Total number of backups: $BACKUP_COUNT${NC}"
  
  log "======== BACKUP PROCESS COMPLETED SUCCESSFULLY ========"
  exit 0
else
  log "${RED}======== BACKUP PROCESS FAILED ========${NC}"
  exit 1
fi