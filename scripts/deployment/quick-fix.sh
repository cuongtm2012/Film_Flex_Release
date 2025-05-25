#!/bin/bash

# FilmFlex Quick Deployment Fix Script
# Run this on your production server to quickly fix common deployment issues

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== FilmFlex Quick Fix Started at $(date) =====${NC}"

DEPLOY_DIR="/var/www/filmflex"

# Function to check and report status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
    fi
}

echo -e "${BLUE}1. Stopping old processes...${NC}"
pm2 stop filmflex 2>/dev/null || true
pm2 delete filmflex 2>/dev/null || true
pkill -f "node.*filmflex" 2>/dev/null || true
check_status "Stopped old processes"

echo -e "${BLUE}2. Checking deployment directory...${NC}"
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${RED}Deployment directory not found. Re-running deployment...${NC}"
    cd /root/Film_Flex_Release/scripts/deployment
    ./final-deploy.sh
    exit $?
fi

echo -e "${BLUE}3. Setting environment variables...${NC}"
export NODE_ENV=production
export PORT=5000
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
export SESSION_SECRET="5841abaec918d944cd79481791440643540a3ac9ec33800500ea3ac03d543d61"
check_status "Environment variables set"

echo -e "${BLUE}4. Starting FilmFlex with PM2...${NC}"
cd "$DEPLOY_DIR"

# Try multiple start methods
if [ -f "pm2.config.cjs" ]; then
    pm2 start pm2.config.cjs
    check_status "Started with pm2.config.cjs"
elif [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs
    check_status "Started with ecosystem.config.cjs"
else
    pm2 start dist/index.js --name filmflex --env production
    check_status "Started with direct command"
fi

echo -e "${BLUE}5. Saving PM2 configuration...${NC}"
pm2 save
check_status "PM2 configuration saved"

echo -e "${BLUE}6. Restarting Nginx...${NC}"
nginx -t && systemctl restart nginx
check_status "Nginx restarted"

echo -e "${BLUE}7. Testing API response...${NC}"
sleep 3
API_RESPONSE=$(curl -s http://localhost:5000/api/health)
if [[ $API_RESPONSE == *"status"* ]]; then
    echo -e "${GREEN}✓ API is responding: $API_RESPONSE${NC}"
else
    echo -e "${RED}✗ API not responding properly: $API_RESPONSE${NC}"
fi

echo -e "${BLUE}8. Checking external access...${NC}"
EXTERNAL_RESPONSE=$(curl -s -w "%{http_code}" https://phimgg.com/api/health)
if [[ $EXTERNAL_RESPONSE == *"200"* ]]; then
    echo -e "${GREEN}✓ External access working${NC}"
else
    echo -e "${YELLOW}! External access may have issues: $EXTERNAL_RESPONSE${NC}"
fi

echo -e "${BLUE}9. Current status:${NC}"
pm2 status
echo ""
echo -e "${GREEN}Quick fix completed!${NC}"
echo ""
echo "If the website still shows old version:"
echo "1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Check if CDN cache needs clearing"
echo "3. Wait a few minutes for changes to propagate"
echo ""
echo "To check logs: pm2 logs filmflex"
echo "To restart: pm2 restart filmflex"