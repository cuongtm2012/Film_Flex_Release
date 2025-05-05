#!/bin/bash
# FilmFlex Server Setup Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
DB_USER="filmflex"
DB_PASSWORD="FilmFlexPassword"
DB_NAME="filmflex"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting server setup for ${APP_NAME}...${NC}"

# Step 1: Basic server setup
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
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
  mkdir -p /var/www/filmflex
  mkdir -p /var/log/filmflex

  # Set up Nginx
  echo -e "${YELLOW}Setting up Nginx...${NC}"
  systemctl enable nginx
  systemctl start nginx
EOF

# Step 2: Database setup
ssh ${REMOTE_USER}@${REMOTE_HOST} << EOF
  # Create PostgreSQL user and database
  echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true
  sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH CREATEDB;" || true
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || true
EOF

# Step 3: Setup PM2 and systemd
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
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
EOF

echo -e "${GREEN}Server setup completed successfully!${NC}"