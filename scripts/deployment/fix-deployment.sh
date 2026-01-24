#!/bin/bash

###############################################################################
# FilmFlex Post-Deployment Fix Script
# 
# Purpose: Fix missing ENCRYPTION_KEY and SESSION_SECRET after GitHub Actions
#          deployment by recreating container with correct environment variables
#
# Usage: ./fix-deployment.sh
#
# Run this script after every GitHub Actions deployment to restore OAuth/SSO
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production secrets
ENCRYPTION_KEY="8649861dce96bd331b012b8f330d5d075d4307758a23d27182fd008e726938c3"
SESSION_SECRET="filmflex_production_secret_2024_phimgg_secure_key_change_this"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  FilmFlex Post-Deployment Fix                             ║${NC}"
echo -e "${BLUE}║  Fixing missing ENCRYPTION_KEY and SESSION_SECRET         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check if container exists
echo -e "${YELLOW}[1/5]${NC} Checking current container status..."
if docker ps -a --format "{{.Names}}" | grep -q "^filmflex-app$"; then
    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' filmflex-app)
    echo -e "${GREEN}✓${NC} Container exists (Status: $CONTAINER_STATUS)"
else
    echo -e "${RED}✗${NC} Container 'filmflex-app' not found!"
    exit 1
fi

# Step 2: Stop and remove container
echo -e "${YELLOW}[2/5]${NC} Stopping and removing current container..."
docker stop filmflex-app > /dev/null 2>&1
docker rm filmflex-app > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Container stopped and removed"

# Step 3: Recreate container with correct env vars
echo -e "${YELLOW}[3/5]${NC} Creating new container with ENCRYPTION_KEY..."
CONTAINER_ID=$(docker run -d \
  --name filmflex-app \
  --network film_flex_release_filmflex-network \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e DATABASE_URL=postgresql://filmflex:filmflex2024@filmflex-postgres:5432/filmflex \
  -e SESSION_SECRET="$SESSION_SECRET" \
  -e ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  -e ALLOWED_ORIGINS="https://phimgg.com,https://www.phimgg.com,http://phimgg.com,http://www.phimgg.com" \
  -e CLIENT_URL="https://phimgg.com" \
  -e DOMAIN="phimgg.com" \
  -e SERVER_IP=38.54.14.154 \
  -e USE_CLOUDFLARE_OAUTH="false" \
  -e USE_CLOUDFLARE_EMAIL="false" \
  -e ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200 \
  -e ELASTICSEARCH_ENABLED=true \
  --restart unless-stopped \
  cuongtm2012/filmflex-app:latest)

echo -e "${GREEN}✓${NC} Container created: ${CONTAINER_ID:0:12}"

# Step 4: Wait for container to start
echo -e "${YELLOW}[4/5]${NC} Waiting for container to start..."
sleep 5

# Check if container is running
if docker ps --format "{{.Names}}" | grep -q "^filmflex-app$"; then
    echo -e "${GREEN}✓${NC} Container is running"
else
    echo -e "${RED}✗${NC} Container failed to start!"
    echo -e "${RED}Showing logs:${NC}"
    docker logs filmflex-app --tail 20
    exit 1
fi

# Step 5: Verify environment variables and OAuth
echo -e "${YELLOW}[5/5]${NC} Verifying configuration..."

# Check ENCRYPTION_KEY
if docker exec filmflex-app printenv ENCRYPTION_KEY | grep -q "$ENCRYPTION_KEY"; then
    echo -e "${GREEN}✓${NC} ENCRYPTION_KEY is set correctly"
else
    echo -e "${RED}✗${NC} ENCRYPTION_KEY is missing or incorrect!"
fi

# Check SESSION_SECRET
if docker exec filmflex-app printenv SESSION_SECRET | grep -q "$SESSION_SECRET"; then
    echo -e "${GREEN}✓${NC} SESSION_SECRET is set correctly"
else
    echo -e "${RED}✗${NC} SESSION_SECRET is missing or incorrect!"
fi

# Wait a bit more for OAuth initialization
echo ""
echo -e "${BLUE}Waiting for OAuth initialization...${NC}"
sleep 8

# Check OAuth logs
echo ""
echo -e "${BLUE}OAuth Initialization Status:${NC}"
docker logs filmflex-app 2>&1 | grep -E "(OAuth|Google|Facebook)" | tail -10 || echo "No OAuth logs yet"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deployment Fix Complete!                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Check OAuth status: docker logs filmflex-app 2>&1 | grep OAuth"
echo "  2. Test Google login: curl -I http://localhost:5000/api/auth/google"
echo "  3. Test Facebook login: curl -I http://localhost:5000/api/auth/facebook"
echo "  4. Test DeepSeek AI: curl -X POST http://localhost:5000/api/ai/chat -H 'Content-Type: application/json' -d '{\"message\":\"test\"}'"
echo ""
echo -e "${YELLOW}Note:${NC} Run this script after every GitHub Actions deployment"
echo ""
