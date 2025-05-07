#!/bin/bash

# FilmFlex Final Deployment Script
# This script is designed to fix the module type issue that's causing the 502 error
# It handles CommonJS vs ESM conflicts by explicitly using .cjs extension

# Configuration
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="$LOG_DIR/final-deploy-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Start logging
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== FilmFlex Final Deployment Started at $(date) ====="
echo "Source directory: $SOURCE_DIR"
echo "Deploy directory: $DEPLOY_DIR"

# Step 1: Stop existing PM2 process
echo "1. Stopping any existing FilmFlex processes..."
if pm2 list | grep -q "filmflex"; then
  echo "   - Stopping and deleting existing filmflex process"
  pm2 stop filmflex
  pm2 delete filmflex
fi

# Step 2: Prepare deployment directory
echo "2. Setting up deployment directory..."
mkdir -p "$DEPLOY_DIR"
chown -R www-data:www-data "$DEPLOY_DIR"

# Step 3: Create proper package.json without "type": "module"
echo "3. Creating proper package.json without ESM type..."
cat << 'EOL' > "$DEPLOY_DIR/package.json"
{
  "name": "filmflex-server",
  "version": "1.0.0",
  "description": "FilmFlex Production Server",
  "main": "filmflex-server.cjs",
  "scripts": {
    "start": "node filmflex-server.cjs"
  },
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.15.0"
  }
}
EOL

# Step 4: Copy CommonJS server file to deployment directory
echo "4. Copying CommonJS server file..."
cp "$SOURCE_DIR/scripts/deployment/filmflex-server.cjs" "$DEPLOY_DIR/filmflex-server.cjs"
chmod +x "$DEPLOY_DIR/filmflex-server.cjs"

# Step a start script for the application
echo "5. Creating start script..."
cat << 'EOL' > "$DEPLOY_DIR/start.sh"
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node filmflex-server.cjs
EOL
chmod +x "$DEPLOY_DIR/start.sh"

# Step 6: Install dependencies
echo "6. Installing dependencies..."
cd "$DEPLOY_DIR"
npm install

# Step 7: Setup environment variables
echo "7. Setting up environment variables..."
if [ -f "$SOURCE_DIR/.env" ]; then
  cp "$SOURCE_DIR/.env" "$DEPLOY_DIR/.env"
else
  cat << 'EOL' > "$DEPLOY_DIR/.env"
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
EOL
fi

# Step 8: Start the server with PM2
echo "8. Starting server with PM2..."
cd "$DEPLOY_DIR"
pm2 start filmflex-server.cjs --name filmflex
pm2 save

# Step 9: Check if server is running
echo "9. Verifying server status..."
sleep 5
if pm2 list | grep -q "online" | grep -q "filmflex"; then
  echo "   ✓ Server started successfully!"
  pm2 status filmflex
else
  echo "   ! Server failed to start properly"
  echo "   - Starting with direct method..."
  pm2 stop filmflex
  pm2 delete filmflex
  pm2 start "$DEPLOY_DIR/start.sh" --name filmflex
  pm2 save
  
  sleep 5
  if pm2 list | grep -q "online" | grep -q "filmflex"; then
    echo "   ✓ Server started successfully with start.sh!"
  else
    echo "   ! All automatic methods failed"
    echo "   - Please try manually running: node $DEPLOY_DIR/filmflex-server.cjs"
  fi
fi

# Step 10: Check server response
echo "10. Checking API response..."
RESPONSE=$(curl -s http://localhost:5000/api/health || echo "Failed to connect")
if [[ "$RESPONSE" == *"status"*"ok"* ]]; then
  echo "   ✓ API is responding correctly: $RESPONSE"
else
  echo "   ! API is not responding correctly: $RESPONSE"
fi

# Step 11: Reload Nginx
echo "11. Reloading Nginx configuration..."
nginx -t && systemctl reload nginx

echo "===== Final Deployment Completed at $(date) ====="
echo
echo "To check the status, use these commands:"
echo "  - Server status: pm2 status filmflex"
echo "  - Server logs: pm2 logs filmflex"
echo "  - API check: curl http://localhost:5000/api/health"
echo "  - Web check: Visit https://phimgg.com"
echo
echo "If issues persist, run: node $DEPLOY_DIR/filmflex-server.cjs"