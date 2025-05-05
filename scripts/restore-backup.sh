#!/bin/bash
# FilmFlex Database Restore Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
DB_USER="filmflex"
DB_NAME="filmflex"
BACKUP_DIR="/var/backups/filmflex"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No backup file specified.${NC}"
  echo -e "Usage: ./restore-backup.sh <backup-filename>"
  echo -e "Example: ./restore-backup.sh filmflex_20250505-123045.sql.gz"
  exit 1
fi

BACKUP_FILE=$1

echo -e "${GREEN}Starting database restore for ${APP_NAME}...${NC}"

# Step 1: Check if the backup file exists on the server
ssh ${REMOTE_USER}@${REMOTE_HOST} << EOF
  if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file ${BACKUP_DIR}/${BACKUP_FILE} not found on server.${NC}"
    echo -e "Available backups:"
    ls -l ${BACKUP_DIR}
    exit 1
  fi

  # Create a new backup of the current database state before restoring
  echo -e "${YELLOW}Creating backup of current database state...${NC}"
  /etc/filmflex/scripts/backup-db.sh

  # Stop the application
  echo -e "${YELLOW}Stopping the application...${NC}"
  pm2 stop filmflex

  # Restore the database
  echo -e "${YELLOW}Restoring database from ${BACKUP_FILE}...${NC}"
  gunzip -c ${BACKUP_DIR}/${BACKUP_FILE} | sudo -u postgres psql ${DB_NAME}

  # Restart the application
  echo -e "${YELLOW}Restarting the application...${NC}"
  pm2 start filmflex
EOF

echo -e "${GREEN}Database restore completed successfully!${NC}"
echo -e "${YELLOW}Remember to verify that the application is working correctly.${NC}"