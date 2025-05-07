#!/bin/bash

# FilmFlex Deployment Check Script
# This script checks the deployment status of the FilmFlex application
# and helps diagnose common issues

# Configuration
APP_DIR="/var/www/filmflex"
NGINX_CONF="/etc/nginx/sites-available/phimgg.com"
LOG_DIR="/var/log/filmflex"

# Colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

echo "===== FilmFlex Deployment Checker ====="

# Check PM2 status
echo "1. Checking PM2 status..."
if pm2 list | grep -q "filmflex"; then
  echo -e "   ${GREEN}✓ FilmFlex application is running in PM2${NC}"
  pm2 status filmflex
else
  echo -e "   ${RED}✗ FilmFlex application is not running in PM2${NC}"
  echo "   Try running: pm2 start $APP_DIR/filmflex-server.js"
fi

# Check Nginx configuration
echo "2. Checking Nginx configuration..."
if nginx -t &> /dev/null; then
  echo -e "   ${GREEN}✓ Nginx configuration is valid${NC}"
else
  echo -e "   ${RED}✗ Nginx configuration has errors${NC}"
  nginx -t
fi

# Check for Nginx site configuration
echo "3. Checking Nginx site configuration..."
if [ -f "$NGINX_CONF" ]; then
  echo -e "   ${GREEN}✓ Nginx site configuration exists${NC}"
else
  echo -e "   ${RED}✗ Nginx site configuration not found${NC}"
  echo "   Expected location: $NGINX_CONF"
fi

# Check website connectivity
echo "4. Checking website connectivity..."
if curl -s --head https://phimgg.com | grep "200 OK" > /dev/null; then
  echo -e "   ${GREEN}✓ Website is responding properly${NC}"
else
  echo -e "   ${RED}✗ Website is not responding properly${NC}"
  echo "   HTTP response:"
  curl -i https://phimgg.com | head -n 10
fi

# Check direct API access
echo "5. Checking direct API access..."
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"*"ok"* ]]; then
  echo -e "   ${GREEN}✓ API server is accessible${NC}"
  echo "   Response: $API_RESPONSE"
else
  echo -e "   ${RED}✗ API server is not accessible${NC}"
  echo "   Trying secondary check..."
  
  # Check if port 5000 is open
  if netstat -tuln | grep ":5000" > /dev/null; then
    echo -e "   ${YELLOW}! Port 5000 is open but API not responding properly${NC}"
  else
    echo -e "   ${RED}✗ Port 5000 is not open${NC}"
  fi
fi

# Check for recent application logs
echo "6. Checking for recent application logs..."
echo "   Recent logs (last 20 lines):"
ls -la "$LOG_DIR"

# Show most recently modified log file
RECENT_LOG=$(find "$LOG_DIR" -type f -name "*.log" -printf "%T@ %p\n" | sort -nr | head -n1 | cut -d' ' -f2-)
if [ -n "$RECENT_LOG" ]; then
  echo "   === Most recent log: $RECENT_LOG ==="
  tail -n 20 "$RECENT_LOG"
else
  echo -e "   ${RED}✗ No log files found${NC}"
fi

# Check PM2 logs
echo "7. Checking PM2 logs for FilmFlex..."
pm2 logs filmflex --lines 20 --nostream

# Check for server files
echo "8. Checking server files..."
if [ -f "$APP_DIR/filmflex-server.js" ]; then
  echo -e "   ${GREEN}✓ FilmFlex server file exists${NC}"
else
  echo -e "   ${RED}✗ FilmFlex server file not found${NC}"
  echo "   Expected location: $APP_DIR/filmflex-server.js"
fi

# Check Nginx upstream configuration
echo "9. Checking Nginx upstream..."
grep -n "proxy_pass" /etc/nginx/sites-available/* | grep "localhost"
if [ $? -eq 0 ]; then
  echo -e "   ${GREEN}✓ Nginx upstream configuration found${NC}"
else
  echo -e "   ${RED}✗ Nginx upstream configuration not found${NC}"
  echo "   Check your Nginx configuration"
fi

# Check Node.js and npm versions
echo "10. Checking Node.js and npm versions..."
node -v
npm -v

# Check for required npm packages
echo "11. Checking for required npm packages..."
cd "$APP_DIR"
npm list express
npm list pg

# Check file permissions
echo "12. Checking file permissions..."
echo "   === Checking server files ==="
ls -la "$APP_DIR/filmflex-server.js" 2>/dev/null || echo "   File not found: $APP_DIR/filmflex-server.js"
ls -la "$APP_DIR/direct-run.sh" 2>/dev/null || echo "   File not found: $APP_DIR/direct-run.sh"

# Check database connection
echo "13. Checking database connectivity..."
if [ -n "$DATABASE_URL" ]; then
  echo "   Database URL is set in environment"
  if command -v pg_isready > /dev/null; then
    pg_isready -d "${DATABASE_URL}" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo -e "   ${GREEN}✓ Database is accessible${NC}"
    else
      echo -e "   ${RED}✗ Database is not accessible${NC}"
    fi
  else
    echo -e "   ${YELLOW}! pg_isready not available, skipping direct DB check${NC}"
  fi
else
  echo -e "   ${RED}✗ DATABASE_URL not set in environment${NC}"
  echo "   Check your .env file"
fi

echo "===== Deployment Check Complete ====="
echo "If you're still having issues, try running the direct script:"
echo "cd $APP_DIR && node filmflex-server.js"