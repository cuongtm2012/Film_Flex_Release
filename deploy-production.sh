#!/bin/bash

# FilmFlex Production Deployment Script
# This script pulls the latest images from Docker Hub and deploys on VPS

set -e

echo "🚀 Starting FilmFlex Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install docker-compose.${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Pulling latest images from Docker Hub...${NC}"

# Pull the latest images
docker pull cuongtm2012/filmflex-app:latest
docker pull cuongtm2012/filmflex-postgres:latest
docker pull nginx:alpine

echo -e "${GREEN}✅ Images pulled successfully!${NC}"

# Stop existing containers if running
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Remove old containers and images (optional cleanup)
echo -e "${YELLOW}🧹 Cleaning up old containers...${NC}"
docker container prune -f || true

# Start the services
echo -e "${YELLOW}🚀 Starting FilmFlex services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Check if application is responding
echo -e "${YELLOW}🔍 Testing application health...${NC}"
sleep 5

if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ FilmFlex is running successfully!${NC}"
    echo -e "${GREEN}🌐 Application is available at: http://localhost:5000${NC}"
    echo -e "${GREEN}🗄️  Database is running on: localhost:5432${NC}"
else
    echo -e "${RED}❌ Application health check failed. Check logs:${NC}"
    echo -e "${YELLOW}Run: docker-compose -f docker-compose.prod.yml logs app${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo -e "  View logs: ${GREEN}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Stop services: ${GREEN}docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "  Restart services: ${GREEN}docker-compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Check status: ${GREEN}docker-compose -f docker-compose.prod.yml ps${NC}"