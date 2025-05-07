#!/bin/bash

# Direct Run Script for FilmFlex
# This script runs the FilmFlex server directly without PM2
# It can be used for debugging or as a last resort

# Configuration
APP_DIR="/var/www/filmflex"
SERVER_FILE="$APP_DIR/filmflex-server.js"
LOG_DIR="/var/log/filmflex"
LOG_FILE="$LOG_DIR/direct-run-$(date +%Y%m%d).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Make sure we have the right environment
export NODE_ENV=production
export PATH="$PATH:/usr/local/bin:/usr/bin"

# Log startup information
echo "Starting FilmFlex direct run at $(date)" | tee -a "$LOG_FILE"
echo "Working directory: $APP_DIR" | tee -a "$LOG_FILE"
echo "Server file: $SERVER_FILE" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Node version: $(node -v)" | tee -a "$LOG_FILE"
echo "NPM version: $(npm -v)" | tee -a "$LOG_FILE"

# Check if server file exists
if [ ! -f "$SERVER_FILE" ]; then
  echo "ERROR: Server file not found: $SERVER_FILE" | tee -a "$LOG_FILE"
  echo "Copying server file from source..." | tee -a "$LOG_FILE"
  cp "$HOME/Film_Flex_Release/scripts/deployment/filmflex-server.js" "$SERVER_FILE" || {
    echo "Failed to copy server file" | tee -a "$LOG_FILE"
    exit 1
  }
  chmod +x "$SERVER_FILE"
fi

# Change to app directory
cd "$APP_DIR" || {
  echo "Failed to change to app directory: $APP_DIR" | tee -a "$LOG_FILE"
  exit 1
}

# Check for required dependencies
echo "Checking for required dependencies..." | tee -a "$LOG_FILE"
npm list express pg || {
  echo "Installing required dependencies..." | tee -a "$LOG_FILE"
  npm install express pg | tee -a "$LOG_FILE"
}

# Finally run the server
echo "Starting server..." | tee -a "$LOG_FILE"
exec node "$SERVER_FILE" 2>&1 | tee -a "$LOG_FILE"