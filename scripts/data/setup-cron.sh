#!/bin/bash

# FilmFlex Cron Setup Script
# This script sets up cron jobs for FilmFlex data import at 6AM and 6PM every day

# Exit on error
set -e

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root"
  exit 1
fi

# Define variables
APP_DIR="/var/www/filmflex"
SCRIPT_DIR="$APP_DIR/scripts/data"
CRON_FILE="/etc/cron.d/filmflex-data-import"
SCRIPT_PATH="$SCRIPT_DIR/import-movies.sh"

# Make the scripts executable
echo "Making scripts executable..."
chmod +x "$SCRIPT_PATH"
chmod +x "$SCRIPT_DIR/import-movies.js"

# Create cron job file
echo "Creating cron job entry..."
cat > "$CRON_FILE" << EOF
# FilmFlex Data Import Cron Jobs
# Run at 6:00 AM and 6:00 PM every day

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=root

# Import movie data at 6:00 AM
0 6 * * * root $SCRIPT_PATH > /dev/null 2>&1

# Import movie data at 6:00 PM
0 18 * * * root $SCRIPT_PATH > /dev/null 2>&1
EOF

# Set proper permissions
chown root:root "$CRON_FILE"
chmod 644 "$CRON_FILE"

# Verify the cron job was created
if [ -f "$CRON_FILE" ]; then
  echo "Cron job successfully created at $CRON_FILE"
  echo "Movies will be imported at 6:00 AM and 6:00 PM daily"
else
  echo "Failed to create cron job"
  exit 1
fi

# Run the import script once immediately (optional)
echo "Do you want to run the data import now? (y/n)"
read -r run_now

if [[ "$run_now" =~ ^[Yy]$ ]]; then
  echo "Running data import now..."
  bash "$SCRIPT_PATH"
  echo "Initial data import complete"
else
  echo "Skipping initial data import"
  echo "First automatic import will run at the next scheduled time"
fi

echo "Cron setup completed successfully"