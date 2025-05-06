#!/bin/bash

# FilmFlex Movie Data Import Script Wrapper
# This script wrapper runs the movie data import script in a production environment

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
APP_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
SCRIPT_NAME="import-movies-sql.js"
LOG_FILE="${LOG_DIR}/data-import.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print start message
echo "[$DATE] Starting FilmFlex movie data import..." | tee -a "$LOG_FILE"

# Make sure the required packages are installed
if ! npm list -g node-fetch > /dev/null 2>&1; then
  echo "[$DATE] Installing required packages..." | tee -a "$LOG_FILE"
  npm install -g node-fetch dotenv pg
fi

# Change to application directory
cd "$APP_DIR"

# Make sure the script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Run the import script
echo "[$DATE] Running import script..." | tee -a "$LOG_FILE"
NODE_ENV=production node "$APP_DIR/scripts/data/${SCRIPT_NAME}" 2>&1 | tee -a "$LOG_FILE"

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "[$DATE] FilmFlex movie data import completed successfully" | tee -a "$LOG_FILE"
else
  echo "[$DATE] FilmFlex movie data import failed" | tee -a "$LOG_FILE"
  exit 1
fi

# Exit with success
exit 0