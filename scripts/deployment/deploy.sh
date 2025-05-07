#!/bin/bash

# FilmFlex Deployment Script
# This script handles deployment from the source repository to the production directory
# Usage: ./scripts/deployment/deploy.sh

# Configuration
SOURCE_DIR="${HOME}/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
BACKUP_DIR="${DEPLOY_DIR}/backups/$(date +%Y%m%d_%H%M%S)"

echo "===== FilmFlex Deployment Script ====="
echo "Starting deployment process..."

# Step 1: Update the source code repository
echo "1. Updating source code repository..."
cd "$SOURCE_DIR"
git pull

# Step 2: Install dependencies and build in source directory
echo "2. Installing dependencies in source directory..."
cd "$SOURCE_DIR"
npm install

echo "3. Building the application in source directory..."
npm run build

# Step 3: Create backup of current deployment (optional)
echo "4. Creating backup of current deployment..."
mkdir -p "$BACKUP_DIR"
if [ -d "$DEPLOY_DIR" ]; then
  # Only backup important files, not node_modules or large directories
  cp -r "$DEPLOY_DIR"/.env "$BACKUP_DIR"/ 2>/dev/null || true
  mkdir -p "$BACKUP_DIR/log"
  cp -r "$DEPLOY_DIR"/log/* "$BACKUP_DIR/log/" 2>/dev/null || true
  
  # Backup scripts/data directory which contains import progress
  mkdir -p "$BACKUP_DIR/scripts/data"
  cp -r "$DEPLOY_DIR"/scripts/data/* "$BACKUP_DIR/scripts/data/" 2>/dev/null || true
fi

# Step 4: Deploy client build and server files
echo "5. Deploying to production directory..."

# Copy client build
echo "   - Copying client build files..."
mkdir -p "$DEPLOY_DIR/client/dist"
cp -r "$SOURCE_DIR/client/dist"/* "$DEPLOY_DIR/client/dist/"

# Copy server files
echo "   - Copying server files..."
mkdir -p "$DEPLOY_DIR/server"
cp -r "$SOURCE_DIR/server"/* "$DEPLOY_DIR/server/"

# Copy shared files
echo "   - Copying shared files..."
mkdir -p "$DEPLOY_DIR/shared"
cp -r "$SOURCE_DIR/shared"/* "$DEPLOY_DIR/shared/"

# Copy scripts directory (preserving data subdirectory)
echo "   - Copying scripts directory (preserving data)..."
mkdir -p "$DEPLOY_DIR/scripts"
# Temporarily move data directory if it exists
if [ -d "$DEPLOY_DIR/scripts/data" ]; then
  mv "$DEPLOY_DIR/scripts/data" "$DEPLOY_DIR/scripts/data_temp"
fi
cp -r "$SOURCE_DIR/scripts"/* "$DEPLOY_DIR/scripts/"
# Move data directory back
if [ -d "$DEPLOY_DIR/scripts/data_temp" ]; then
  # If both exist, merge them
  if [ -d "$DEPLOY_DIR/scripts/data" ]; then
    cp -r "$DEPLOY_DIR/scripts/data_temp"/* "$DEPLOY_DIR/scripts/data/"
  else
    mv "$DEPLOY_DIR/scripts/data_temp" "$DEPLOY_DIR/scripts/data"
  fi
fi

# Copy root configuration files
echo "   - Copying configuration files..."
cp "$SOURCE_DIR/package.json" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/package-lock.json" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/tsconfig.json" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/vite.config.ts" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/tailwind.config.ts" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/postcss.config.js" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/drizzle.config.ts" "$DEPLOY_DIR/"
cp "$SOURCE_DIR/ecosystem.config.js" "$DEPLOY_DIR/" 2>/dev/null || cp "$SOURCE_DIR/ecosystem.config.cjs" "$DEPLOY_DIR/" 2>/dev/null || echo "Warning: No ecosystem config found"

# Do not copy .env file if it already exists in the deploy directory
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cp "$SOURCE_DIR/.env" "$DEPLOY_DIR/" 2>/dev/null || true
  echo "   - Warning: No .env file found. Make sure to create one in $DEPLOY_DIR"
else
  echo "   - Preserving existing .env file."
fi

# Step 5: Update permissions
echo "6. Setting file permissions..."
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR/client/dist"
chmod +x "$DEPLOY_DIR/scripts/deployment/deploy.sh"
chmod +x "$DEPLOY_DIR/scripts/data/"*.sh 2>/dev/null || true

# Create logs directory if it doesn't exist
mkdir -p "$DEPLOY_DIR/log"
mkdir -p /var/log/filmflex
chown -R www-data:www-data "$DEPLOY_DIR/log"
chown -R www-data:www-data /var/log/filmflex

# Make sure node_modules is properly handled
if [ -d "$DEPLOY_DIR/node_modules" ]; then
  echo "   - Setting permissions for node_modules..."
  chown -R www-data:www-data "$DEPLOY_DIR/node_modules"
  chmod -R 755 "$DEPLOY_DIR/node_modules"
fi

# Step 6: Install production dependencies
echo "7. Installing production dependencies..."
cd "$DEPLOY_DIR"
npm i
# Add a check for Node.js executable path
node_path=$(which node)
echo "   - Using Node.js at: $node_path"

# Create a simple startup script to ensure the right Node.js is used
cat > "$DEPLOY_DIR/start.sh" << EOL
#!/bin/bash
export PATH="$PATH:/usr/local/bin:/usr/bin"
export NODE_ENV=production
cd "$DEPLOY_DIR"

# Setup error logging
mkdir -p /var/log/filmflex
exec > >(tee -a "/var/log/filmflex/filmflex-\$(date +%Y%m%d).log")
exec 2>&1

echo "Starting FilmFlex application at \$(date)"
echo "Using Node.js: $node_path"
echo "Database URL: \${DATABASE_URL:0:25}..."

# Try to transpile the TypeScript code just in case
if command -v npx; then
  echo "Transpiling TypeScript..."
  npx tsc || echo "TypeScript compilation failed, but continuing..."
fi

# Start the server
if [ -f "server/index.js" ]; then
  echo "Starting from server/index.js..."
  $node_path server/index.js
else
  echo "Starting with tsx..."
  # Try to use tsx if available, otherwise fall back to node directly on the TS file
  if command -v npx; then
    echo "Using npx tsx..."
    npx tsx server/index.ts
  else
    echo "Fallback to direct node..."
    $node_path server/index.ts
  fi
fi
EOL
chmod +x "$DEPLOY_DIR/start.sh"

# Step 7: Restart the application
echo "8. Restarting the application with PM2..."
cd "$DEPLOY_DIR"

# Check if app is already running in PM2
if pm2 list | grep -q "filmflex"; then
  echo "   - Stopping existing PM2 process..."
  pm2 stop filmflex
  pm2 delete filmflex
fi

# Start the application with PM2
echo "   - Starting application with PM2..."
if [ -f "$DEPLOY_DIR/ecosystem.config.js" ]; then
  pm2 start ecosystem.config.js
else
  # Fallback to direct start if no ecosystem file
  pm2 start "$DEPLOY_DIR/start.sh" --name filmflex
fi

# Save PM2 configuration
echo "   - Saving PM2 configuration..."
pm2 save

# Step 8: Verify the application status
echo "9. Verifying the application status..."
pm2 status filmflex

echo "===== Deployment Complete ====="
echo "Your site should now be updated. Please check https://phimgg.com"