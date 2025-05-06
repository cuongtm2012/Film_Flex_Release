#!/bin/bash

# FilmFlex Cron Job Setup Script
# This script sets up scheduled tasks for automatic data import

# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
APP_DIR="/var/www/filmflex"
CRON_FILE="/etc/cron.d/filmflex-data-import"
USER="root"  # User to run the cron job as

# Print start message
echo "Setting up FilmFlex cron jobs..."

# Create cron job file
cat > $CRON_FILE << EOF
# FilmFlex Data Import Cron Jobs
# Run movie data import twice daily at 6 AM and 6 PM
0 6,18 * * * $USER cd $APP_DIR && bash $APP_DIR/scripts/data/import-movies.sh

# Keep an empty line at the end of the file
EOF

# Set proper permissions
chmod 644 $CRON_FILE

# Restart cron service
systemctl restart cron

# Print completion message
echo "FilmFlex cron jobs have been set up successfully!"
echo "Movie data will be automatically imported at 6 AM and 6 PM daily."
echo "Cron job configuration is stored at: $CRON_FILE"

# Exit with success
exit 0