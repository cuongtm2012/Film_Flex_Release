#!/bin/bash

# FilmFlex Cron Job Setup Script
# This script sets up scheduled tasks for automatic data import

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
APP_DIR="/var/www/filmflex"
CRON_FILE="/etc/cron.d/filmflex-data-import"
USER="root"  # User to run the cron job as
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Print start message
echo "Setting up FilmFlex cron jobs..."

# Make scripts executable
echo "Making scripts executable..."
chmod +x $SCRIPT_DIR/*.sh $SCRIPT_DIR/*.cjs

# Create cron job file
echo "Creating cron job entry..."
cat > $CRON_FILE << EOF
# FilmFlex Data Import Cron Jobs
# Run normal movie data import twice daily at 6 AM and 6 PM (page 1 only)
0 6,18 * * 0-5 $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-movies.sh

# Run a deep scan every Saturday
# This will automatically scan multiple pages to ensure all new content is captured
0 6,18 * * 6 $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-movies.sh --deep-scan

# Keep an empty line at the end of the file
EOF

# Set proper permissions
chmod 644 $CRON_FILE

# Restart cron service
systemctl restart cron

# Print completion message
echo "Cron job successfully created at $CRON_FILE"
echo "Movies will be imported at 6:00 AM and 6:00 PM daily"

# Ask if user wants to run the import now
read -p "Do you want to run the data import now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Running data import now..."
  cd $APP_DIR
  bash $SCRIPT_DIR/import-movies.sh
fi

# Exit with success
exit 0