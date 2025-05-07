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
  echo "   Recent logs (last 5 lines):"
  ls -la $LOG_DIR
  for log in $(find $LOG_DIR -type f -name "*.log" | head -1); do
    echo "   === $log ==="
    tail -5 $log
  done
else
  echo "   ✗ Log directory not found"
fi

# Check Node.js and npm versions
echo "6. Checking Node.js and npm versions..."
node -v
npm -v

# Check file permissions
echo "7. Checking file permissions..."
ls -la $DEPLOY_DIR/client/dist | head -5
ls -la $DEPLOY_DIR/start.sh 2>/dev/null || echo "   ✗ start.sh not found"

echo "===== Deployment Check Complete ====="
echo "If you're still having issues, check PM2 logs: pm2 logs filmflex"