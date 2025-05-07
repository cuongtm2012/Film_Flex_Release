#!/bin/bash

# FilmFlex DNS Check and SSL Setup Script
# This script checks DNS propagation and automatically sets up SSL certificates

# Define variables
DOMAIN="${1:-phimgg.com}"
WWW_DOMAIN="www.${DOMAIN}"
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
LOG_DIR="/var/log/filmflex"
LOG_FILE="${LOG_DIR}/ssl-setup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to check if domain resolves to our server
check_dns() {
  local resolved_ip=$(host -t A $DOMAIN | grep "has address" | head -n1 | awk '{print $NF}' || echo "")
  
  if [ "$resolved_ip" = "$SERVER_IP" ]; then
    return 0
  else
    echo "[$DATE] DNS check failed. $DOMAIN resolves to $resolved_ip (expecting $SERVER_IP)" >> "$LOG_FILE"
    return 1
  fi
}

# Function to set up SSL certificate
setup_ssl() {
  echo "[$DATE] DNS propagated for $DOMAIN. Setting up SSL certificate..." >> "$LOG_FILE"
  
  # Install certbot if needed
  if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
  fi
  
  # Obtain SSL certificate
  certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
  
  if [ $? -eq 0 ]; then
    echo "[$DATE] SSL certificate successfully installed for $DOMAIN" >> "$LOG_FILE"
    echo "[$DATE] Domain $DOMAIN is now fully set up with SSL" >> "$LOG_FILE"
    return 0
  else
    echo "[$DATE] Failed to install SSL certificate. Will try again later." >> "$LOG_FILE"
    return 1
  fi
}

# Main script logic
echo "[$DATE] Checking DNS propagation for $DOMAIN..." >> "$LOG_FILE"

if check_dns; then
  echo "[$DATE] DNS has propagated for $DOMAIN!" >> "$LOG_FILE"
  setup_ssl
else
  echo "[$DATE] DNS not yet propagated for $DOMAIN. Please wait 24-48 hours and try again." >> "$LOG_FILE"
  echo "Waiting for DNS propagation... This can take 24-48 hours."
  echo "You can check status with: cat $LOG_FILE"
fi