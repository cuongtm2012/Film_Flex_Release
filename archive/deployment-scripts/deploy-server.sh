#!/bin/bash

# PhimGG Docker Hub Server Deployment Script
# Server: 38.54.14.154

echo "🚀 PhimGG Docker Hub Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed successfully${NC}"
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Installing Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed successfully${NC}"
fi

echo -e "${BLUE}📋 Stopping any existing containers...${NC}"
docker-compose -f docker-compose.server.yml down 2>/dev/null || true

echo -e "${BLUE}🐳 Pulling latest images from Docker Hub...${NC}"
docker pull cuongtm2012/filmflex-app:latest
docker pull cuongtm2012/filmflex-postgres:latest

echo -e "${BLUE}🚀 Starting PhimGG application...${NC}"
docker-compose -f docker-compose.server.yml up -d

echo -e "${BLUE}📊 Waiting for services to be healthy...${NC}"
sleep 30

echo -e "${BLUE}🔍 Checking container status...${NC}"
docker-compose -f docker-compose.server.yml ps

echo -e "${BLUE}🔧 Checking application health...${NC}"
if curl -f http://localhost:5000 &>/dev/null; then
    echo -e "${GREEN}✅ PhimGG application is running successfully!${NC}"
    echo -e "${GREEN}🌐 Access your app at: http://38.54.14.154:5000${NC}"
else
    echo -e "${YELLOW}⚠️  Application may still be starting up...${NC}"
    echo -e "${BLUE}📝 Check logs with: docker-compose -f docker-compose.server.yml logs${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  • View logs: docker-compose -f docker-compose.server.yml logs -f"
echo "  • Stop app: docker-compose -f docker-compose.server.yml down"
echo "  • Restart: docker-compose -f docker-compose.server.yml restart"
echo "  • Update: ./deploy-server.sh"