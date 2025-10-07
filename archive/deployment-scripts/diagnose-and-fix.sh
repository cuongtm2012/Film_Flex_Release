#!/bin/bash

# Comprehensive PhimGG Diagnostic and Fix Script
echo "🔧 PhimGG Diagnostic and Fix Script"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Step 1: Current Container Status${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${BLUE}🔍 Step 2: Checking Individual Container Logs${NC}"
echo -e "${YELLOW}--- Nginx Logs ---${NC}"
docker logs filmflex-nginx --tail 20

echo -e "\n${YELLOW}--- App Logs ---${NC}"
docker logs filmflex-app --tail 20

echo -e "\n${YELLOW}--- PostgreSQL Logs ---${NC}"
docker logs filmflex-postgres --tail 10

echo -e "\n${BLUE}🔌 Step 3: Testing Direct Connections${NC}"
echo -e "${YELLOW}Testing app direct connection...${NC}"
curl -s http://localhost:5000/api/health && echo -e "${GREEN}✅ App health check passed${NC}" || echo -e "${RED}❌ App health check failed${NC}"

echo -e "\n${YELLOW}Testing database connection from host...${NC}"
PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex -c "SELECT 1;" 2>/dev/null && echo -e "${GREEN}✅ Database connection successful${NC}" || echo -e "${RED}❌ Database connection failed${NC}"

echo -e "\n${BLUE}🛠️ Step 4: Fixing Issues${NC}"
echo -e "${YELLOW}Restarting containers with proper order...${NC}"

# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Start only postgres first
echo -e "${YELLOW}Starting PostgreSQL first...${NC}"
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for postgres to be healthy
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec filmflex-postgres pg_isready -U filmflex -d filmflex > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Start the app
echo -e "\n${YELLOW}Starting PhimGG app...${NC}"
docker-compose -f docker-compose.prod.yml up -d app

# Wait for app to be healthy
echo -e "${YELLOW}Waiting for app to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ App is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Start nginx last
echo -e "\n${YELLOW}Starting Nginx...${NC}"
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait a bit for nginx
sleep 5

echo -e "\n${BLUE}📊 Step 5: Final Status Check${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${BLUE}🧪 Step 6: Testing All Endpoints${NC}"
echo -e "${YELLOW}Testing direct app (port 5000)...${NC}"
curl -s http://localhost:5000/api/health && echo -e "${GREEN}✅ Direct app works${NC}" || echo -e "${RED}❌ Direct app failed${NC}"

echo -e "\n${YELLOW}Testing through Nginx (port 8080)...${NC}"
curl -s http://localhost:8080/api/health && echo -e "${GREEN}✅ Nginx proxy works${NC}" || echo -e "${RED}❌ Nginx proxy failed${NC}"

echo -e "\n${YELLOW}Testing database query through app...${NC}"
curl -s http://localhost:5000/api/movies | head -c 100 && echo -e "\n${GREEN}✅ Database query works${NC}" || echo -e "${RED}❌ Database query failed${NC}"

echo -e "\n${BLUE}🎉 Diagnostic Complete!${NC}"
echo -e "${YELLOW}📋 Access URLs:${NC}"
echo -e "  Direct App: ${GREEN}http://localhost:5000${NC}"
echo -e "  Via Nginx:  ${GREEN}http://localhost:8080${NC}"
echo -e "  Health Check: ${GREEN}curl http://localhost:5000/api/health${NC}"

echo -e "\n${YELLOW}📋 Useful Commands:${NC}"
echo -e "  View all logs: ${GREEN}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Restart all: ${GREEN}docker-compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Check status: ${GREEN}docker-compose -f docker-compose.prod.yml ps${NC}"