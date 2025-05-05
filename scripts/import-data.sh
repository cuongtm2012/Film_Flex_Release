#!/bin/bash
# FilmFlex Data Import Script
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

echo -e "${GREEN}Starting movie data import for ${APP_NAME}...${NC}"

# Run the import on the server
echo -e "${YELLOW}Running movie data import...${NC}"
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  cd ${REMOTE_APP_PATH}
  # Create a screen session for the import process
  screen -dmS import bash -c "
    cd ${REMOTE_APP_PATH} && \
    npx tsx scripts/import.ts 1 2252 > /var/log/filmflex-import.log 2>&1
  "
  
  echo "Import started in a screen session. You can check progress with:"
  echo "ssh ${REMOTE_USER}@${REMOTE_HOST} 'tail -f /var/log/filmflex-import.log'"
  echo "To attach to the screen session: ssh ${REMOTE_USER}@${REMOTE_HOST} 'screen -r import'"
EOF

echo -e "${GREEN}Import process started successfully!${NC}"
echo -e "${YELLOW}This process will run in the background and may take several hours.${NC}"
echo -e "${YELLOW}You can check the progress by running:${NC}"
echo -e "ssh ${REMOTE_USER}@${REMOTE_HOST} 'tail -f /var/log/filmflex-import.log'"