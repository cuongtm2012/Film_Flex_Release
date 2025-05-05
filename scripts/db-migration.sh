#!/bin/bash
# FilmFlex Database Migration Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting database migration for ${APP_NAME}...${NC}"

# Step 1: Create a backup first
echo -e "${YELLOW}Creating database backup before migration...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  /etc/filmflex/scripts/backup-db.sh
EOF

# Step 2: Run the migration on the server
echo -e "${YELLOW}Running database migration...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  cd ${REMOTE_APP_PATH}
  npm run db:push
EOF

echo -e "${GREEN}Database migration completed successfully!${NC}"