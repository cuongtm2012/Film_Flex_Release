#!/bin/bash

# Manual deployment script for FilmFlex
# Use this script when the regular deployment process fails
# This script takes a more direct approach to deploy the application

# Configuration
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/manual-deploy-$TIMESTAMP.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Start logging
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== Manual FilmFlex Deployment Started at $(date) ====="
echo "Source: $SOURCE_DIR"
echo "Destination: $DEPLOY_DIR"

# Step 1: Ensure required packages are installed
echo "1. Ensuring required packages are installed..."
npm list -g pm2 || npm install -g pm2
apt-get update && apt-get install -y nodejs npm postgresql-client netstat-nat

# Step 2: Stop existing PM2 process if running
echo "2. Stopping existing PM2 process if running..."
if pm2 list | grep -q "filmflex"; then
  echo "   - Stopping filmflex process..."
  pm2 stop filmflex
  pm2 delete filmflex
fi

# Step 3: Prepare deployment directory
echo "3. Preparing deployment directory..."
mkdir -p "$DEPLOY_DIR"
chown -R www-data:www-data "$DEPLOY_DIR"

# Step 4: Copy server files directly
echo "4. Copying server files directly..."
cp "$SOURCE_DIR/scripts/deployment/filmflex-server.js" "$DEPLOY_DIR/filmflex-server.js"
cp "$SOURCE_DIR/scripts/deployment/direct-run.sh" "$DEPLOY_DIR/direct-run.sh"
chmod +x "$DEPLOY_DIR/filmflex-server.js"
chmod +x "$DEPLOY_DIR/direct-run.sh"

# Step 5: Install required dependencies
echo "5. Installing required dependencies..."
cd "$DEPLOY_DIR"
npm init -y
npm install express pg

# Step 6: Copy .env file if it exists
echo "6. Setting up environment..."
if [ -f "$SOURCE_DIR/.env" ]; then
  cp "$SOURCE_DIR/.env" "$DEPLOY_DIR/.env"
else
  echo "   - No .env file found in source directory"
  echo "   - Creating minimal .env file..."
  cat << EOL > "$DEPLOY_DIR/.env"
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
EOL
fi

# Step 7: Start the server using PM2
echo "7. Starting the server with PM2..."
cd "$DEPLOY_DIR"
pm2 start "$DEPLOY_DIR/filmflex-server.js" --name filmflex
pm2 save

# Step 8: Verify the server is running
echo "8. Verifying server status..."
sleep 5
if pm2 list | grep -q "online" | grep -q "filmflex"; then
  echo "   ✓ Server started successfully"
else
  echo "   ! Server may not have started properly"
  echo "   - Trying direct run approach..."
  pm2 stop filmflex
  pm2 delete filmflex
  pm2 start "$DEPLOY_DIR/direct-run.sh" --name filmflex --interpreter bash
  pm2 save
fi

# Step 9: Check server response
echo "9. Checking server response..."
sleep 5
HEALTH_CHECK=$(curl -s http://localhost:5000/api/health)
if [[ $HEALTH_CHECK == *"status"*"ok"* ]]; then
  echo "   ✓ Server is responding correctly"
else
  echo "   ! Server is not responding to health check"
  echo "   - Response: $HEALTH_CHECK"
fi

# Step 10: Reload Nginx
echo "10. Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "===== Manual Deployment Complete at $(date) ====="
echo "Check server status with: curl http://localhost:5000/api/health"
echo "Check website: https://phimgg.com"
echo "Logs: $LOG_FILE"
echo "PM2 logs: pm2 logs filmflex"