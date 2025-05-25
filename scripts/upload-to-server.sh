#!/bin/bash

# File Upload Deployment Script for FilmFlex
# Run this script to upload and deploy files from your local machine

set -e

# Configuration
SERVER="root@178.16.137.130"
LOCAL_PROJECT_DIR="/Users/jack/Desktop/1.PROJECT/Film_Flex_Release"
UPLOAD_DIR="/tmp/filmflex-upload"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        error "Please run this script from the FilmFlex project root directory"
        exit 1
    fi
}

# Build the project
build_project() {
    log "Building project locally..."
    npm run build
    
    if [ ! -d "dist" ]; then
        error "Build failed - dist directory not found"
        exit 1
    fi
}

# Create deployment package
create_package() {
    log "Creating deployment package..."
    
    # Create temporary package
    TEMP_DIR=$(mktemp -d)
    PACKAGE_NAME="filmflex-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Copy essential files
    tar -czf "$TEMP_DIR/$PACKAGE_NAME" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=cypress \
        --exclude=tests \
        --exclude=docs \
        --exclude=reports \
        --exclude=results \
        --exclude=client/logs \
        --exclude=client/node_modules \
        dist/ \
        package.json \
        package-lock.json \
        ecosystem.config.cjs \
        public/ \
        client/dist/ \
        2>/dev/null || {
            # If tar fails, try with basic files
            log "Creating basic package..."
            tar -czf "$TEMP_DIR/$PACKAGE_NAME" \
                dist/ \
                package.json \
                ecosystem.config.cjs
        }
    
    echo "$TEMP_DIR/$PACKAGE_NAME"
}

# Upload and deploy
upload_and_deploy() {
    PACKAGE_PATH=$1
    
    log "Uploading package to server..."
    
    # Upload package
    scp "$PACKAGE_PATH" "$SERVER:/tmp/"
    
    # Extract on server
    PACKAGE_NAME=$(basename "$PACKAGE_PATH")
    ssh "$SERVER" "
        # Remove old upload directory
        rm -rf $UPLOAD_DIR
        mkdir -p $UPLOAD_DIR
        
        # Extract package
        cd $UPLOAD_DIR
        tar -xzf /tmp/$PACKAGE_NAME
        
        # Clean up
        rm -f /tmp/$PACKAGE_NAME
        
        echo 'Files uploaded successfully to $UPLOAD_DIR'
        ls -la $UPLOAD_DIR/
    "
    
    log "✅ Files uploaded successfully!"
    log "Now run the deployment script on your server:"
    echo -e "${BLUE}ssh $SERVER${NC}"
    echo -e "${BLUE}bash /tmp/production-deploy.sh${NC}"
    echo -e "Then choose option 2 (Deploy from uploaded files)"
}

# Main function
main() {
    check_directory
    build_project
    
    PACKAGE_PATH=$(create_package)
    upload_and_deploy "$PACKAGE_PATH"
    
    # Cleanup
    rm -f "$PACKAGE_PATH"
    
    log "🎉 Upload completed! Now run the deployment script on your server."
}

main "$@"