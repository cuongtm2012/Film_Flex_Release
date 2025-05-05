#!/bin/bash
# FilmFlex Local Deployment Script (for running directly on the server)
set -e

# Configuration
APP_NAME="filmflex"
APP_PATH="/var/www/filmflex"
ENV_FILE=".env.production"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting local deployment of ${APP_NAME}...${NC}"

# Step 1: Make scripts executable
chmod +x ./scripts/*.sh

# Step 2: Run server setup
echo -e "${YELLOW}Setting up server environment...${NC}"
# Update system packages
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib build-essential

# Install Node.js and npm (LTS version)
echo -e "${YELLOW}Installing Node.js and npm...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
echo -e "${YELLOW}Installing PM2...${NC}"
npm install -g pm2

# Set up application directory
echo -e "${YELLOW}Setting up application directory...${NC}"
mkdir -p ${APP_PATH}
mkdir -p /var/log/filmflex

# Set up Nginx
echo -e "${YELLOW}Setting up Nginx...${NC}"
systemctl enable nginx
systemctl start nginx

# Step 3: Database setup
# Create PostgreSQL user and database
echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
DB_USER="filmflex"
DB_PASSWORD="FilmFlexPassword"
DB_NAME="filmflex"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH CREATEDB;" || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || true

# Step 4: Setup PM2 and systemd
# Set up PM2 to start on boot
echo -e "${YELLOW}Setting up PM2 to start on boot...${NC}"
pm2 startup

# Create systemd service for the application
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/filmflex.service << 'SERVICE'
[Unit]
Description=FilmFlex Application
After=network.target postgresql.service

[Service]
Type=forking
User=root
WorkingDirectory=/var/www/filmflex
ExecStart=/usr/local/bin/pm2 start ecosystem.config.js
ExecReload=/usr/local/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/local/bin/pm2 stop ecosystem.config.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

# Reload systemd
systemctl daemon-reload
systemctl enable filmflex.service

# Step 5: Create production .env file
if [ ! -f "${ENV_FILE}" ]; then
  echo -e "${YELLOW}Creating production environment file...${NC}"
  cat > ${ENV_FILE} << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:FilmFlexPassword@localhost:5432/filmflex
SESSION_SECRET=$(openssl rand -hex 32)
EOF
else
  echo -e "${YELLOW}Production environment file already exists.${NC}"
fi

# Step 6: Copy files to the application directory
echo -e "${YELLOW}Copying application files...${NC}"
cp -r . ${APP_PATH}/
cp ${ENV_FILE} ${APP_PATH}/.env

# Step 7: Setup Nginx
echo -e "${YELLOW}Setting up Nginx configuration...${NC}"
cp nginx/filmflex.conf /etc/nginx/sites-available/filmflex
if [ ! -f "/etc/nginx/sites-enabled/filmflex" ]; then
  ln -s /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
fi
nginx -t && systemctl restart nginx

# Step 8: Install dependencies and build
echo -e "${YELLOW}Installing dependencies and building the application...${NC}"
cd ${APP_PATH}
npm ci
npm run build

# Step 9: Start the application
echo -e "${YELLOW}Starting the application...${NC}"
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

# Step 10: Setup database backup
echo -e "${YELLOW}Setting up database backups...${NC}"
# Copy backup script
mkdir -p /etc/filmflex/scripts
cp scripts/backup-db.sh /etc/filmflex/scripts/
chmod +x /etc/filmflex/scripts/backup-db.sh

# Create cron job for daily backups at 2 AM
(crontab -l 2>/dev/null || true; echo "0 2 * * * /etc/filmflex/scripts/backup-db.sh > /var/log/filmflex-backup.log 2>&1") | crontab -

echo -e "${GREEN}Local deployment completed successfully!${NC}"
echo -e "${YELLOW}Your FilmFlex application is now accessible at http://localhost:5000${NC}"
echo -e "${YELLOW}You can also access it via the server's IP: http://$(hostname -I | awk '{print $1}'):5000${NC}"