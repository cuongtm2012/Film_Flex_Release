#!/bin/bash

# FilmFlex Movie Data Import Script Wrapper
# This script runs the movie data import script in both development and production

# Exit immediately if a command exits with a non-zero status
set -e

# Figure out if we're in development or production
if [ -f "/var/www/filmflex/.env" ]; then
  # Production environment
  APP_DIR="/var/www/filmflex"
  LOG_DIR="/var/log/filmflex"
  ENV="production"
else
  # Development environment
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
  LOG_DIR="$APP_DIR/log"
  ENV="development"
fi

SCRIPT_NAME="import-movies-sql.cjs"
LOG_FILE="${LOG_DIR}/data-import.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Print start message
echo "[$DATE] Starting FilmFlex movie data import..." | tee -a "$LOG_FILE"

# Make sure the required packages are installed
echo "[$DATE] Installing required packages..." | tee -a "$LOG_FILE"
npm install -g axios dotenv pg

# Change to application directory
cd "$APP_DIR"

# Make sure the script is executable
chmod +x "$APP_DIR/scripts/data/${SCRIPT_NAME}"

# Check if deep scan is requested
DEEP_SCAN_FLAG=""
if [[ "$*" == *"--deep-scan"* ]]; then
  echo "[$DATE] Deep scan requested..." | tee -a "$LOG_FILE"
  DEEP_SCAN_FLAG="--deep-scan"
elif [[ $(date +%u) -eq 6 ]]; then
  # Automatically do deep scan on Saturdays (day 6)
  echo "[$DATE] Saturday detected, performing automatic deep scan..." | tee -a "$LOG_FILE"
  DEEP_SCAN_FLAG="--deep-scan"
fi

# Run the import script
echo "[$DATE] Running import script..." | tee -a "$LOG_FILE"
NODE_ENV=$ENV node "$APP_DIR/scripts/data/${SCRIPT_NAME}" $DEEP_SCAN_FLAG 2>&1 | tee -a "$LOG_FILE"

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "[$DATE] FilmFlex movie data import completed successfully" | tee -a "$LOG_FILE"
else
  echo "[$DATE] FilmFlex movie data import failed" | tee -a "$LOG_FILE"
  exit 1
fi

# Exit with success
exit 0