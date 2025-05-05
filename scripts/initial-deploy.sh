#!/bin/bash
# FilmFlex Initial Deployment Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
LOCAL_ENV_FILE=".env.production"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting initial deployment of ${APP_NAME} to ${REMOTE_HOST}...${NC}"

# Step 1: Make scripts executable
chmod +x ./scripts/*.sh

# Step 2: Run server setup
echo -e "${YELLOW}Setting up server environment...${NC}"
./scripts/server-setup.sh

# Step 3: Create production .env file
if [ ! -f "${LOCAL_ENV_FILE}" ]; then
  echo -e "${YELLOW}Creating production environment file...${NC}"
  cat > ${LOCAL_ENV_FILE} << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:FilmFlexPassword@localhost:5432/filmflex
SESSION_SECRET=$(openssl rand -hex 32)
EOF
else
  echo -e "${YELLOW}Production environment file already exists.${NC}"
fi

# Step 4: Copy env file to server
echo -e "${YELLOW}Copying environment file to server...${NC}"
scp ${LOCAL_ENV_FILE} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_APP_PATH}/.env

# Step 5: Deploy application
echo -e "${YELLOW}Deploying application...${NC}"
./scripts/deploy.sh

# Step 6: Setup Nginx
echo -e "${YELLOW}Setting up Nginx configuration...${NC}"
scp nginx/filmflex.conf ${REMOTE_USER}@${REMOTE_HOST}:/etc/nginx/sites-available/filmflex

# Step 7: Create cron job for database backup
echo -e "${YELLOW}Setting up database backups...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  # Copy backup script
  mkdir -p /etc/filmflex/scripts
  cat > /etc/filmflex/scripts/backup-db.sh << 'SCRIPT'
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
SCRIPT

  # Make script executable
  chmod +x /etc/filmflex/scripts/backup-db.sh

  # Create cron job for daily backups at 2 AM
  (crontab -l 2>/dev/null || true; echo "0 2 * * * /etc/filmflex/scripts/backup-db.sh > /var/log/filmflex-backup.log 2>&1") | crontab -
EOF

echo -e "${GREEN}Initial deployment completed successfully!${NC}"
echo -e "${YELLOW}Your FilmFlex application is now accessible at http://${REMOTE_HOST}${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure a domain name to point to your server's IP"
echo -e "2. Setup SSL with Let's Encrypt (run 'certbot --nginx -d yourdomain.com')"
echo -e "3. Initialize GitHub repository and add deployment secrets for CI/CD"