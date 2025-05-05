#!/bin/bash
# FilmFlex Server Setup Script
set -e

# Configuration
APP_NAME="filmflex"
REMOTE_USER="root"
REMOTE_HOST="38.54.115.156"
REMOTE_APP_PATH="/var/www/filmflex"
DOMAIN_NAME="filmflex.com" # Change to your actual domain if you have one

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting server setup for ${APP_NAME}...${NC}"

# Step 1: Connect to the server and set up the environment
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
    # Update system packages
    apt update && apt upgrade -y

    # Install required packages
    apt install -y nginx postgresql postgresql-contrib nodejs npm certbot python3-certbot-nginx

    # Install Node.js LTS using NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm use --lts
    
    # Install PM2 globally
    npm install -g pm2

    # Create app directory
    mkdir -p /var/www/filmflex
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE filmflex;"
    sudo -u postgres psql -c "CREATE USER filmflex WITH ENCRYPTED PASSWORD 'FilmFlexPassword';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;"
    
    # Configure Nginx
    cat > /etc/nginx/sites-available/filmflex << 'NGINX'
server {
    listen 80;
    server_name _;  # Change to your domain when ready

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

    # Enable the site
    ln -sf /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart Nginx
    nginx -t && systemctl restart nginx
    
    # Create systemd service for the application
    cat > /etc/systemd/system/filmflex.service << 'SYSTEMD'
[Unit]
Description=FilmFlex Application
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/filmflex
ExecStart=/usr/bin/env PATH=/root/.nvm/versions/node/$(ls /root/.nvm/versions/node/ | sort -V | tail -n1)/bin:$PATH pm2-runtime start ecosystem.config.js --env production
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
SYSTEMD

    # Reload systemd
    systemctl daemon-reload
    
    # Enable the service to start on boot
    systemctl enable filmflex.service
    
    # Set up the firewall
    ufw allow 22
    ufw allow 80
    ufw allow 443
    ufw --force enable

    echo "Server setup completed successfully!"
EOF

echo -e "${GREEN}Server setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update the database connection string in your .env file"
echo -e "2. Run the deploy script to deploy your application"
echo -e "3. If you have a domain, set it up with nginx and certbot"