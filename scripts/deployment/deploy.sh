#!/bin/bash

# FilmFlex Deployment Script
# Usage: ./scripts/deployment/deploy.sh

echo "===== FilmFlex Deployment Script ====="
echo "Starting deployment process..."

# Step 1: Get the latest code
echo "1. Pulling latest changes from git repository..."
git pull

# Step 2: Install dependencies (if needed)
echo "2. Checking and installing dependencies..."
npm install

# Step 3: Build the application
echo "3. Building the application..."
npm run build

# Step 4: Set correct permissions
echo "4. Setting file permissions..."
chown -R www-data:www-data client/dist
chmod -R 755 client/dist

# Step 5: Clear any caches
echo "5. Clearing application caches..."
rm -rf .cache/* || true

# Step 6: Restart the application
echo "6. Restarting the application with PM2..."
pm2 restart filmflex

# Step 7: Verify the application status
echo "7. Verifying the application status..."
pm2 status filmflex

echo "===== Deployment Complete ====="
echo "Your site should now be updated. Please check https://phimgg.com"