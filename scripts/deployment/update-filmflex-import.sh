#!/bin/bash

# FilmFlex Data Import Deployment Script
# This script updates the data import scripts on the production server

# Exit on error
set -e

# Define variables
PROD_SERVER="38.54.115.156"
PROD_USER="root"
PROD_APP_DIR="/var/www/filmflex"
SCRIPTS_DIR="scripts/data"

# Files to deploy
FILES=(
  "import-movies-sql.cjs"
  "import-movies.sh"
  "setup-cron.sh"
)

echo "Deploying FilmFlex data import scripts to production server..."

# Ensure local scripts are executable
chmod +x $SCRIPTS_DIR/*.sh $SCRIPTS_DIR/*.cjs

# Create directory on remote server if it doesn't exist
ssh $PROD_USER@$PROD_SERVER "mkdir -p $PROD_APP_DIR/$SCRIPTS_DIR"

# Copy script files to production server
for file in "${FILES[@]}"; do
  echo "Copying $file to production..."
  scp $SCRIPTS_DIR/$file $PROD_USER@$PROD_SERVER:$PROD_APP_DIR/$SCRIPTS_DIR/
done

# Make scripts executable on remote server
ssh $PROD_USER@$PROD_SERVER "chmod +x $PROD_APP_DIR/$SCRIPTS_DIR/*.sh $PROD_APP_DIR/$SCRIPTS_DIR/*.cjs"

# Set up cron job on production server
echo "Setting up cron job on production server..."
ssh $PROD_USER@$PROD_SERVER "cd $PROD_APP_DIR && sudo bash $SCRIPTS_DIR/setup-cron.sh"

echo "FilmFlex data import scripts have been deployed successfully!"
echo "Automatic data import is now scheduled to run at 6 AM and 6 PM daily."

exit 0