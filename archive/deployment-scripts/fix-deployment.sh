#!/bin/bash

# Fix deployment issues and redeploy FilmFlex
echo "🔧 Fixing deployment issues..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check and stop conflicting services
echo -e "${YELLOW}🔍 Checking for port conflicts...${NC}"

# Check what's using port 5432
PORT_5432=$(sudo netstat -tulpn | grep :5432 | head -1)
if [ ! -z "$PORT_5432" ]; then
    echo -e "${YELLOW}Found service using port 5432:${NC}"
    echo "$PORT_5432"
    
    # Try to stop PostgreSQL service
    echo -e "${YELLOW}🛑 Stopping PostgreSQL service...${NC}"
    sudo systemctl stop postgresql 2>/dev/null || echo "PostgreSQL service not found or already stopped"
    sudo systemctl disable postgresql 2>/dev/null || echo "PostgreSQL service not found"
fi

# Check what's using port 5000
PORT_5000=$(sudo netstat -tulpn | grep :5000 | head -1)
if [ ! -z "$PORT_5000" ]; then
    echo -e "${YELLOW}Found service using port 5000:${NC}"
    echo "$PORT_5000"
fi

# Step 2: Clean up any existing Docker containers
echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker container prune -f

# Step 3: Remove any conflicting containers
echo -e "${YELLOW}🗑️ Removing any filmflex containers...${NC}"
docker ps -a | grep filmflex | awk '{print $1}' | xargs -r docker rm -f

# Step 4: Verify ports are free
echo -e "${YELLOW}✅ Verifying ports are available...${NC}"
if sudo netstat -tulpn | grep -q :5432; then
    echo -e "${RED}❌ Port 5432 still in use. Manual intervention required.${NC}"
    echo "Please run: sudo lsof -ti:5432 | xargs -r sudo kill -9"
    exit 1
fi

if sudo netstat -tulpn | grep -q :5000; then
    echo -e "${RED}❌ Port 5000 still in use. Manual intervention required.${NC}"
    echo "Please run: sudo lsof -ti:5000 | xargs -r sudo kill -9"
    exit 1
fi

echo -e "${GREEN}✅ Ports 5432 and 5000 are now available!${NC}"

# Step 5: Start deployment
echo -e "${YELLOW}🚀 Starting fresh deployment...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 6: Monitor startup
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

# Check status
echo -e "${YELLOW}📊 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}🎉 Deployment fix completed!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "  View logs: ${GREEN}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Check health: ${GREEN}curl http://localhost:5000/api/health${NC}"