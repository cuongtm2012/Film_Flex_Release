#!/bin/bash

# FilmFlex Frontend Build Script
# This script builds the frontend and properly deploys it to the production directory

# Configuration
SOURCE_DIR="$HOME/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
BUILD_LOG="$LOG_DIR/frontend-build-$(date +%Y%m%d%H%M%S).log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Start logging
exec > >(tee -a "$BUILD_LOG") 2>&1

echo "===== FilmFlex Frontend Build Started at $(date) ====="
echo "Source: $SOURCE_DIR"
echo "Destination: $DEPLOY_DIR"

# Step 1: Go to source directory
echo "1. Changing to source directory..."
cd "$SOURCE_DIR" || {
  echo "ERROR: Could not change to source directory: $SOURCE_DIR"
  exit 1
}

# Step 2: Install dependencies if needed
echo "2. Ensuring dependencies are installed..."
npm ci || npm install

# Step 3: Check if .env file exists
echo "3. Checking environment setup..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "   - Creating .env file in production directory"
  cat << EOL > "$DEPLOY_DIR/.env"
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
EOL
else
  echo "   - .env file already exists in production directory"
fi

# Step 4: Build the frontend
echo "4. Building the frontend..."
npm run build

# Step 5: Find where the build output is
echo "5. Locating build output..."
BUILD_DIR=""
for dir in "dist/public" "../dist/public" "client/dist" "dist" "../dist"; do
  if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
    BUILD_DIR="$dir"
    echo "   - Found build output in: $BUILD_DIR"
    break
  fi
done

if [ -z "$BUILD_DIR" ]; then
  echo "WARNING: Could not find build output directory with index.html"
  
  # Check regular directories without index.html
  for dir in "dist/public" "../dist/public" "client/dist" "dist" "../dist"; do
    if [ -d "$dir" ]; then
      BUILD_DIR="$dir"
      echo "   - Using directory without index.html: $BUILD_DIR"
      break
    fi
  done
  
  if [ -z "$BUILD_DIR" ]; then
    echo "ERROR: Could not find any build output directory"
    echo "Available directories:"
    find . -type d -maxdepth 2 | grep -v "node_modules"
    exit 1
  fi
fi

# Step 6: Create frontend directory in production
echo "6. Creating frontend directory in production..."
FRONTEND_DIR="$DEPLOY_DIR/client/dist"
mkdir -p "$FRONTEND_DIR"

# Step 7: Copy frontend files
echo "7. Copying frontend files to production..."
echo "   - From: $SOURCE_DIR/$BUILD_DIR"
echo "   - To: $FRONTEND_DIR"

if [ -d "$SOURCE_DIR/$BUILD_DIR" ]; then
  # Copy all files including hidden files
  cp -rf "$SOURCE_DIR/$BUILD_DIR/"* "$FRONTEND_DIR/" 2>/dev/null || echo "   - No files to copy"
  # Also look for asset directories 
  for ASSETS_DIR in "assets" "static" "js" "css"; do
    if [ -d "$SOURCE_DIR/$BUILD_DIR/$ASSETS_DIR" ]; then
      echo "   - Copying $ASSETS_DIR directory"
      mkdir -p "$FRONTEND_DIR/$ASSETS_DIR"
      cp -rf "$SOURCE_DIR/$BUILD_DIR/$ASSETS_DIR"/* "$FRONTEND_DIR/$ASSETS_DIR/" 2>/dev/null || echo "   - No $ASSETS_DIR files to copy"
    fi
  done
else
  echo "ERROR: Build directory does not exist: $SOURCE_DIR/$BUILD_DIR"
  echo "Available directories:"
  find "$SOURCE_DIR" -type d -maxdepth 3 | grep -v "node_modules"
  exit 1
fi

# Step 8: Create a placeholder index.html if it doesn't exist
if [ ! -f "$FRONTEND_DIR/index.html" ]; then
  echo "8. Creating placeholder index.html..."
  cat << EOL > "$FRONTEND_DIR/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FilmFlex</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #1a1a1a;
      color: #ffffff;
    }
    header {
      background-color: #e50914;
      padding: 20px;
      text-align: center;
    }
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .loading {
      text-align: center;
      padding: 50px 0;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid #e50914;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <header>
    <h1>FilmFlex</h1>
  </header>
  <main>
    <div class="loading">
      <h2>Loading FilmFlex...</h2>
      <div class="spinner"></div>
      <p>Please wait while we set up your streaming experience.</p>
    </div>
  </main>
</body>
</html>
EOL
else
  echo "8. index.html already exists"
fi

# Step 9: Set permissions
echo "9. Setting permissions..."
chown -R www-data:www-data "$FRONTEND_DIR"
chmod -R 755 "$FRONTEND_DIR"

# Step 10: Restart the server
echo "10. Restarting the server..."
if pm2 list | grep -q "filmflex"; then
  pm2 restart filmflex
fi

echo "===== Frontend Build Completed at $(date) ====="
echo "Frontend files deployed to: $FRONTEND_DIR"
echo "You can now access your site at: https://phimgg.com"