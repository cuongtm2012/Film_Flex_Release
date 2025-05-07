#!/bin/bash

# FilmFlex Deployment Checker
# This script checks the status of the deployed application
# Usage: ./scripts/deployment/check-deploy.sh

DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
SITE_URL="https://phimgg.com"

echo "===== FilmFlex Deployment Checker ====="

# Check PM2 status
echo "1. Checking PM2 status..."
if pm2 list | grep -q "filmflex"; then
  echo "   ✓ FilmFlex application is running in PM2"
  pm2 status filmflex
else
  echo "   ✗ FilmFlex application is NOT running in PM2"
  echo "   Try starting it with: pm2 start $DEPLOY_DIR/start.sh --name filmflex"
fi

# Check Nginx configuration
echo "2. Checking Nginx configuration..."
if nginx -t &>/dev/null; then
  echo "   ✓ Nginx configuration is valid"
else
  echo "   ✗ Nginx configuration has errors"
  nginx -t
fi

# Check Nginx sites
echo "3. Checking Nginx site configuration..."
if [ -f /etc/nginx/sites-enabled/phimgg.com ]; then
  echo "   ✓ Nginx site configuration exists"
else
  echo "   ✗ Nginx site configuration is missing"
  echo "   Check /etc/nginx/sites-available and create the proper symlink"
fi

# Check website connectivity
echo "4. Checking website connectivity..."
if curl -s --head $SITE_URL | grep -q "200 OK\|301 Moved\|302 Found"; then
  echo "   ✓ Website is responding"
else
  echo "   ✗ Website is not responding properly"
  echo "   HTTP response:"
  curl -s --head $SITE_URL
fi

# Check for application logs
echo "5. Checking for recent application logs..."
if [ -d "$LOG_DIR" ]; then
  echo "   Recent logs (last 20 lines):"
  ls -la $LOG_DIR
  for log in $(find $LOG_DIR -type f -name "*.log" | head -1); do
    echo "   === $log ==="
    tail -20 $log
  done
else
  echo "   ✗ Log directory not found"
  echo "   Checking PM2 logs instead:"
  pm2 logs --lines 20 filmflex
fi

# Check for fallback.js existence
echo "6. Checking fallback file..."
if [ -f "$DEPLOY_DIR/index.js" ]; then
  echo "   ✓ Fallback file exists"
else
  echo "   ✗ Fallback file not found"
fi

# Check nginx upstream configuration
echo "7. Checking Nginx upstream..."
if grep -r "localhost:5000" /etc/nginx/sites-available/; then
  echo "   ✓ Nginx upstream configuration found"
else
  echo "   ✗ Nginx upstream configuration not found"
  echo "   Recommended upstream configuration:"
  echo "   location / {"
  echo "     proxy_pass http://localhost:5000;"
  echo "     proxy_http_version 1.1;"
  echo "     proxy_set_header Upgrade \$http_upgrade;"
  echo "     proxy_set_header Connection 'upgrade';"
  echo "     proxy_set_header Host \$host;"
  echo "     proxy_cache_bypass \$http_upgrade;"
  echo "   }"
fi

# Check Node.js and npm versions
echo "8. Checking Node.js and npm versions..."
node -v
npm -v

# Check if npm packages are installed
echo "9. Checking for required npm packages..."
cd $DEPLOY_DIR
npm list express
npm list tsx
npm list ts-node

# Check file permissions
echo "10. Checking file permissions..."
ls -la $DEPLOY_DIR/client/dist | head -5
ls -la $DEPLOY_DIR/start.sh 2>/dev/null || echo "   ✗ start.sh not found"

echo "===== Deployment Check Complete ====="
echo "If you're still having issues, check PM2 logs: pm2 logs filmflex"