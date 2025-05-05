#!/bin/bash
# FilmFlex database backup script
set -e

# Configuration
DB_NAME="filmflex"
DB_USER="filmflex"
BACKUP_DIR="/var/backups/filmflex"
BACKUP_COUNT=7  # Number of daily backups to keep

# Timestamp for the backup file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform database backup
echo "Creating database backup: ${BACKUP_FILE}"
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Set appropriate permissions
chmod 600 $BACKUP_FILE

# Delete old backups (keep only the latest BACKUP_COUNT backups)
echo "Cleaning up old backups, keeping last $BACKUP_COUNT backups"
ls -tp $BACKUP_DIR/*.sql.gz | grep -v '/$' | tail -n +$((BACKUP_COUNT+1)) | xargs -I {} rm -- {}

echo "Backup completed: $BACKUP_FILE"

# Optionally: Transfer backup to an offsite location
# scp $BACKUP_FILE user@remote-server:/path/to/backup/