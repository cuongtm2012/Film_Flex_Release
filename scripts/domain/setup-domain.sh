#!/bin/bash

# FilmFlex Domain Setup Script
# This script automates the setup of a new domain for FilmFlex

# Exit on any error
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex Domain Setup Script"
echo "========================================"
echo -e "${NC}"

# Ask for domain name if not provided
if [ -z "$1" ]; then
  read -p "Enter domain name (without www): " DOMAIN_NAME
else
  DOMAIN_NAME=$1
fi

# Make sure domain is provided
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}Error: Domain name is required${NC}"
  exit 1
fi

# Define variables
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
WWW_DOMAIN="www.${DOMAIN_NAME}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
APP_DIR="/var/www/filmflex"
ENV_FILE="${APP_DIR}/.env"
LOG_DIR="/var/log/filmflex"
CONFIG_FILE="${NGINX_AVAILABLE}/${DOMAIN_NAME}"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="${LOG_DIR}/domain-setup.log"

# Create log directory if it doesn't exist
mkdir -p $LOG_DIR

# Log start of script
echo "[$DATE] Starting domain setup for ${DOMAIN_NAME}" | tee -a "$LOG_FILE"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo -e "${RED}This script must be run as root${NC}" | tee -a "$LOG_FILE"
   exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}" | tee -a "$LOG_FILE"
    apt-get update
    apt-get install -y nginx
fi

# Get server IP if not already detected
if [ -z "$SERVER_IP" ]; then
  echo -e "${YELLOW}Could not automatically detect server IP. Please enter manually:${NC}"
  read -p "Enter server IP: " SERVER_IP
  
  if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Error: Server IP is required${NC}" | tee -a "$LOG_FILE"
    exit 1
  fi
fi

echo -e "${GREEN}Setting up domain ${DOMAIN_NAME} with server IP ${SERVER_IP}${NC}" | tee -a "$LOG_FILE"

# Create Nginx configuration file
echo -e "${BLUE}Creating Nginx configuration...${NC}" | tee -a "$LOG_FILE"

cat > $CONFIG_FILE << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} ${WWW_DOMAIN};
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
echo -e "${BLUE}Enabling the site...${NC}" | tee -a "$LOG_FILE"
ln -sf $CONFIG_FILE $NGINX_ENABLED/

# Test nginx configuration
echo -e "${BLUE}Testing Nginx configuration...${NC}" | tee -a "$LOG_FILE"
nginx -t

# Reload nginx
echo -e "${BLUE}Reloading Nginx...${NC}" | tee -a "$LOG_FILE"
systemctl reload nginx

# Update .env file with new domain
echo -e "${BLUE}Updating application configuration...${NC}" | tee -a "$LOG_FILE"

# Check if WEBSITE_DOMAIN exists in .env file
if grep -q "WEBSITE_DOMAIN=" $ENV_FILE; then
  # Replace existing WEBSITE_DOMAIN value
  sed -i "s/WEBSITE_DOMAIN=.*/WEBSITE_DOMAIN=${DOMAIN_NAME}/" $ENV_FILE
else
  # Add WEBSITE_DOMAIN if it doesn't exist
  echo "WEBSITE_DOMAIN=${DOMAIN_NAME}" >> $ENV_FILE
fi

# Restart the application
echo -e "${BLUE}Restarting the application...${NC}" | tee -a "$LOG_FILE"
cd $APP_DIR
pm2 restart filmflex || echo -e "${YELLOW}Warning: Could not restart PM2 application 'filmflex'. Please restart manually.${NC}" | tee -a "$LOG_FILE"

# Print DNS setup instructions
echo -e "\n${GREEN}==== Domain Setup Instructions ====${NC}"
echo -e "${YELLOW}1. Add these DNS records in your domain provider (GoDaddy):"
echo -e "   Type: A, Name: @, Value: ${SERVER_IP}, TTL: 1 Hour"
echo -e "   Type: CNAME, Name: www, Value: ${DOMAIN_NAME}, TTL: 1 Hour${NC}"
echo
echo -e "${YELLOW}2. Wait for DNS propagation (24-48 hours)"
echo -e "   You can check propagation with: curl -H 'Host: ${DOMAIN_NAME}' http://${SERVER_IP}${NC}"
echo
echo -e "${GREEN}3. Once DNS has propagated, you can set up SSL with:${NC}"
echo -e "   sudo certbot --nginx -d ${DOMAIN_NAME} -d ${WWW_DOMAIN}"
echo

# Create a cron job to check DNS propagation and set up SSL
echo -e "${BLUE}Setting up automated SSL installation...${NC}" | tee -a "$LOG_FILE"

# Create check-dns-setup-ssl.sh script
SSL_SETUP_SCRIPT="${APP_DIR}/scripts/domain/check-dns-setup-ssl.sh"
mkdir -p "${APP_DIR}/scripts/domain"

cat > $SSL_SETUP_SCRIPT << EOF
#!/bin/bash

# Define variables
DOMAIN="${DOMAIN_NAME}"
WWW_DOMAIN="${WWW_DOMAIN}"
SERVER_IP="${SERVER_IP}"
LOG_FILE="${LOG_DIR}/ssl-setup.log"
DATE=\$(date '+%Y-%m-%d %H:%M:%S')

# Function to check if domain resolves to our server
check_dns() {
  local resolved_ip=\$(host -t A \$DOMAIN | grep "has address" | head -n1 | awk '{print \$NF}' || echo "")
  
  if [ "\$resolved_ip" = "\$SERVER_IP" ]; then
    return 0
  else
    echo "[\$DATE] DNS check failed. \$DOMAIN resolves to \$resolved_ip (expecting \$SERVER_IP)" >> "\$LOG_FILE"
    return 1
  fi
}

# Function to set up SSL certificate
setup_ssl() {
  echo "[\$DATE] DNS propagated for \$DOMAIN. Setting up SSL certificate..." >> "\$LOG_FILE"
  
  # Install certbot if needed
  if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
  fi
  
  # Obtain SSL certificate
  certbot --nginx -d \$DOMAIN -d \$WWW_DOMAIN --non-interactive --agree-tos --email admin@\$DOMAIN
  
  if [ \$? -eq 0 ]; then
    echo "[\$DATE] SSL certificate successfully installed for \$DOMAIN" >> "\$LOG_FILE"
    
    # Remove this script from cron
    crontab -l | grep -v "check-dns-setup-ssl.sh" | crontab -
    
    # Send notification (optional)
    echo "[\$DATE] Domain \$DOMAIN is now fully set up with SSL" >> "\$LOG_FILE"
  else
    echo "[\$DATE] Failed to install SSL certificate. Will retry later." >> "\$LOG_FILE"
  fi
}

# Main script logic
echo "[\$DATE] Checking DNS propagation for \$DOMAIN..." >> "\$LOG_FILE"

if check_dns; then
  setup_ssl
else
  echo "[\$DATE] DNS not yet propagated for \$DOMAIN. Will check again later." >> "\$LOG_FILE"
fi
EOF

# Make the script executable
chmod +x $SSL_SETUP_SCRIPT

# Install host command if not available
if ! command -v host &> /dev/null; then
  apt-get update
  apt-get install -y dnsutils
fi

# Set up cron job to check DNS propagation every 6 hours
(crontab -l 2>/dev/null || echo "") | grep -v "check-dns-setup-ssl.sh" | { cat; echo "0 */6 * * * ${SSL_SETUP_SCRIPT} > /dev/null 2>&1"; } | crontab -

echo -e "${GREEN}Setup complete for ${DOMAIN_NAME}!${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}A cron job has been set up to automatically install SSL once DNS propagates.${NC}" | tee -a "$LOG_FILE"
echo -e "${GREEN}You can check the status in ${LOG_DIR}/ssl-setup.log${NC}" | tee -a "$LOG_FILE"

# All done!
exit 0