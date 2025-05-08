#!/bin/bash

# FilmFlex Database Recreation Script
# This script completely reinstalls PostgreSQL and sets up a fresh database

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define paths
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y%m%d%H%M%S')
LOG_FILE="${LOG_DIR}/database-recreate-${DATE}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Database Recreation"
echo "========================================"
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Log start of deployment
echo "Starting database recreation at $(date)" | tee -a "$LOG_FILE"

# Stop PM2 processes first
echo -e "${BLUE}Stopping any existing FilmFlex processes...${NC}" | tee -a "$LOG_FILE"
pm2 delete filmflex 2>/dev/null || true

# First, completely remove PostgreSQL
echo -e "${BLUE}Removing existing PostgreSQL installation...${NC}" | tee -a "$LOG_FILE"
systemctl stop postgresql 2>/dev/null || true
apt-get purge -y postgresql\* 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true
rm -rf /etc/postgresql/ /var/lib/postgresql/ /var/log/postgresql/ 2>/dev/null || true
echo -e "${GREEN}PostgreSQL completely removed${NC}" | tee -a "$LOG_FILE"

# Install PostgreSQL fresh
echo -e "${BLUE}Installing PostgreSQL...${NC}" | tee -a "$LOG_FILE"
apt-get update | tee -a "$LOG_FILE"
apt-get install -y postgresql postgresql-contrib | tee -a "$LOG_FILE"

# Wait for PostgreSQL to start
echo -e "${BLUE}Starting PostgreSQL service...${NC}" | tee -a "$LOG_FILE"
systemctl start postgresql | tee -a "$LOG_FILE"
systemctl enable postgresql | tee -a "$LOG_FILE"
sleep 5

# Check if PostgreSQL is running
if systemctl is-active postgresql >/dev/null 2>&1; then
  echo -e "${GREEN}PostgreSQL is running${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Failed to start PostgreSQL. Please check the logs.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Create database and user
echo -e "${BLUE}Creating filmflex user and database...${NC}" | tee -a "$LOG_FILE"
sudo -u postgres psql -c "CREATE USER filmflex WITH PASSWORD 'filmflex2024';" | tee -a "$LOG_FILE"
sudo -u postgres psql -c "CREATE DATABASE filmflex OWNER filmflex;" | tee -a "$LOG_FILE"

# Test connection
echo -e "${BLUE}Testing database connection...${NC}" | tee -a "$LOG_FILE"
if PGPASSWORD=filmflex2024 psql -U filmflex -d filmflex -h localhost -c "SELECT 1;" >/dev/null 2>&1; then
  echo -e "${GREEN}Database connection successful${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Failed to connect to database. Please check your credentials.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Update .env file
echo -e "${BLUE}Updating .env file...${NC}" | tee -a "$LOG_FILE"
echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex" > "$APP_DIR/.env"
chown www-data:www-data "$APP_DIR/.env"

# Start server with the working database
echo -e "${BLUE}Starting server...${NC}" | tee -a "$LOG_FILE"
cd "$APP_DIR" && NODE_ENV=production pm2 start filmflex-server.cjs --name "filmflex" | tee -a "$LOG_FILE"
pm2 save | tee -a "$LOG_FILE"

# Create simple database schema
echo -e "${BLUE}Creating initial database tables...${NC}" | tee -a "$LOG_FILE"
PGPASSWORD=filmflex2024 psql -U filmflex -d filmflex -h localhost << 'EOF' | tee -a "$LOG_FILE"
-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  poster TEXT,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  title TEXT,
  server_name TEXT,
  server_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug);
CREATE INDEX IF NOT EXISTS episodes_movie_id_idx ON episodes(movie_id);
EOF

echo -e "${GREEN}Database setup completed at $(date)${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}You can now run the import script to populate the database${NC}"
echo 
echo "Next step: Run the movie import script"
echo "cd ~/Film_Flex_Release && sudo bash scripts/data/import-movies.sh"
echo
echo "For more information, check the log: $LOG_FILE"