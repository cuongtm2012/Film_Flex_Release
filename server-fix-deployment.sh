#!/bin/bash
# Quick Fix Deployment Script for FilmFlex Production Server
# This script will deploy the route fixes to resolve the recommended movies endpoint

echo "=== FilmFlex Production Fix Deployment ==="
echo "Server: 38.54.115.156"
echo "Issue: /api/movies/recommended endpoint returning 'Failed to fetch recommended movies'"
echo ""

# Step 1: Check current server status
echo "[1/6] Checking current server status..."
curl -s http://localhost:5000/api/health
echo ""
echo "Testing broken endpoint..."
curl -s http://localhost:5000/api/movies/recommended
echo ""

# Step 2: Navigate to project directory
echo "[2/6] Navigating to project directory..."
cd /root/Film_Flex_Release
pwd

# Step 3: Check current git status
echo "[3/6] Checking git status..."
git status
echo ""
echo "Current branch:"
git branch
echo ""
echo "Last 3 commits:"
git log --oneline -3

# Step 4: Pull latest changes from Production branch
echo "[4/6] Pulling latest changes..."
git fetch origin
git checkout Production
git pull origin Production

echo "After pull - Last 3 commits:"
git log --oneline -3

# Step 5: Build and deploy
echo "[5/6] Building and deploying..."

# Stop the current application
echo "Stopping current application..."
pm2 stop filmflex

# Install dependencies (in case of any changes)
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Step 6: Verify the fix
echo "[6/6] Verifying deployment..."
sleep 5

echo "PM2 Status:"
pm2 status

echo ""
echo "Testing health endpoint:"
curl -s http://localhost:5000/api/health
echo ""

echo "Testing FIXED recommended movies endpoint:"
curl -s http://localhost:5000/api/movies/recommended?page=1&limit=5
echo ""

echo "Testing without query parameters:"
curl -s http://localhost:5000/api/movies/recommended
echo ""

echo "=== Deployment Complete ==="
echo "If you see movie data above, the fix was successful!"
echo "The hero section on your homepage should now work properly."
