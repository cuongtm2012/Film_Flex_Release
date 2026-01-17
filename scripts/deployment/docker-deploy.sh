#!/bin/bash
# Docker-based deployment script for FilmFlex
# This replaces the PM2-based deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DEPLOY_DIR="/var/www/filmflex"
NETWORK_NAME="filmflex-network"
APP_IMAGE="filmflex-app:latest"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${GREEN}🚀 Starting Docker-based deployment...${NC}"

# Step 1: Create Docker network if not exists
echo -e "${YELLOW}📡 Ensuring Docker network exists...${NC}"
docker network create $NETWORK_NAME 2>/dev/null || echo "Network already exists"

# Step 2: Stop and remove old container
echo -e "${YELLOW}🛑 Stopping old container...${NC}"
docker stop filmflex-app 2>/dev/null || true
docker rm filmflex-app 2>/dev/null || true

# Step 3: Build new Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
cd $DEPLOY_DIR

# Create temporary Dockerfile for production
cat > Dockerfile.prod << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Copy dist folder
COPY dist/ ./dist/

# Create package.json for ES modules
RUN echo '{"type":"module"}' > dist/package.json

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S filmflex -u 1001
RUN chown -R filmflex:nodejs /app

USER filmflex
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
EOF

# Build image
docker build -f Dockerfile.prod -t $APP_IMAGE .

# Step 4: Start new container
echo -e "${YELLOW}🚀 Starting new container...${NC}"
docker run -d \
  --name filmflex-app \
  --network $NETWORK_NAME \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://filmflex:filmflex2024@filmflex-postgres:5432/filmflex \
  -e ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200 \
  -e ELASTICSEARCH_ENABLED=true \
  -e ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
  -e SESSION_SECRET=filmflex_production_secret_2024 \
  -e PUBLIC_URL=http://38.54.14.154:5000 \
  -e PORT=5000 \
  --restart unless-stopped \
  $APP_IMAGE

# Step 5: Wait for container to be healthy
echo -e "${YELLOW}⏳ Waiting for container to be healthy...${NC}"
sleep 10

# Step 6: Check container status
if docker ps | grep -q filmflex-app; then
  echo -e "${GREEN}✅ Container is running!${NC}"
  
  # Show logs
  echo -e "${YELLOW}📋 Container logs:${NC}"
  docker logs filmflex-app --tail 20
  
  # Test health endpoint
  echo -e "${YELLOW}🏥 Testing health endpoint...${NC}"
  sleep 5
  if curl -f http://localhost:5000/api/health 2>/dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    exit 0
  else
    echo -e "${RED}❌ Health check failed${NC}"
    docker logs filmflex-app --tail 50
    exit 1
  fi
else
  echo -e "${RED}❌ Container failed to start${NC}"
  docker logs filmflex-app --tail 50
  exit 1
fi
