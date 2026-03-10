#!/bin/bash

###############################################################################
# FilmFlex Complete Deployment Script
# 
# Purpose: Full deployment workflow including code pull, image rebuild, and
#          container recreation with correct environment variables
#
# Usage: ./full-deploy.sh
#
# This script combines all necessary steps to ensure a complete deployment
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  FilmFlex Complete Deployment                             ║${NC}"
echo -e "${BLUE}║  Pull → Build → Deploy → Verify                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Pull latest code
echo -e "${YELLOW}[1/4]${NC} Pulling latest code from GitHub..."
cd ~/Film_Flex_Release
git pull

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to pull code from GitHub"
    exit 1
fi
echo -e "${GREEN}✓${NC} Code updated successfully"

# Step 2: Verify critical files exist
echo -e "${YELLOW}[2/4]${NC} Verifying code files..."

REQUIRED_FILES=(
    "server/routes/ai-routes.ts"
    "server/routes.ts"
    "server/oauth-init.ts"
    "server/oauth-routes.ts"
    "scripts/deployment/fix-deployment.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} Missing required file: $file"
        echo -e "${RED}Code may not be fully updated. Aborting deployment.${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC} All required files present"

# Step 3: Rebuild Docker image
echo -e "${YELLOW}[3/4]${NC} Rebuilding Docker image (this may take a few minutes)..."
echo -e "${BLUE}Building with --no-cache to ensure fresh build...${NC}"

docker build --no-cache -t cuongtm2012/filmflex-app:latest -f Dockerfile .

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Docker build failed"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker image built successfully"

# Step 4: Deploy with fix script
echo -e "${YELLOW}[4/4]${NC} Deploying container with environment variables..."

if [ ! -x "./scripts/deployment/fix-deployment.sh" ]; then
    chmod +x ./scripts/deployment/fix-deployment.sh
fi

./scripts/deployment/fix-deployment.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Deployment failed"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Complete Deployment Successful!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo "  • Code: Updated from GitHub"
echo "  • Image: Rebuilt with latest code"
echo "  • Container: Recreated with ENCRYPTION_KEY"
echo "  • OAuth: Initialized and verified"
echo ""
echo -e "${BLUE}Quick Tests:${NC}"
echo "  Google OAuth:  curl -I http://localhost:5000/api/auth/google"
echo "  Facebook OAuth: curl -I http://localhost:5000/api/auth/facebook"
echo "  DeepSeek AI:    curl -X POST http://localhost:5000/api/ai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\"}'"
echo ""
