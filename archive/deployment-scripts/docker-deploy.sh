#!/bin/bash

# FilmFlex Docker Build and Deploy Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="filmflex"
TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-""}  # Set this to your registry URL
COMPOSE_FILE="docker-compose.yml"

echo -e "${BLUE}🐳 FilmFlex Docker Build and Deploy Script${NC}"
echo "=================================="

# Function to print colored output
log() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
    exit 1
fi

log "Docker is running"

# Detect architecture and choose appropriate Dockerfile
ARCH=$(uname -m)
DOCKERFILE="Dockerfile"

if [[ "$ARCH" == "arm64" ]] || [[ "$(uname -s)" == "Darwin" && "$ARCH" == "arm64" ]]; then
    warn "Detected ARM64 architecture (Apple Silicon)"
    if [[ -f "Dockerfile.arm64" ]]; then
        DOCKERFILE="Dockerfile.arm64"
        log "Using ARM64-optimized Dockerfile"
    else
        warn "ARM64 Dockerfile not found, using standard Dockerfile with platform override"
        DOCKERFILE="Dockerfile"
    fi
fi

# Build the Docker image
echo -e "\n${BLUE}📦 Building Docker image with $DOCKERFILE...${NC}"

# Add platform specification for ARM64 builds
BUILD_ARGS=""
if [[ "$ARCH" == "arm64" ]] && [[ "$DOCKERFILE" == "Dockerfile" ]]; then
    BUILD_ARGS="--platform linux/amd64"
    warn "Building for AMD64 platform to avoid native binary issues"
fi

if docker build $BUILD_ARGS -f $DOCKERFILE -t ${IMAGE_NAME}:${TAG} .; then
    log "Docker image built successfully: ${IMAGE_NAME}:${TAG}"
else
    error "Failed to build Docker image"
    echo -e "\n${YELLOW}Troubleshooting tips:${NC}"
    echo "1. Try building locally first: npm run build"
    echo "2. Clear Docker cache: docker system prune -a"
    echo "3. For ARM64 Macs, use: docker build --platform linux/amd64 -t filmflex:latest ."
    exit 1
fi

# Tag for registry if specified
if [ -n "$REGISTRY" ]; then
    echo -e "\n${BLUE}🏷️  Tagging image for registry...${NC}"
    docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}
    log "Image tagged: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
fi

# Push to registry if specified
if [ -n "$REGISTRY" ] && [ "$2" = "--push" ]; then
    echo -e "\n${BLUE}📤 Pushing to registry...${NC}"
    if docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}; then
        log "Image pushed successfully to ${REGISTRY}"
    else
        error "Failed to push image to registry"
        exit 1
    fi
fi

# Start services with Docker Compose
echo -e "\n${BLUE}🚀 Starting services with Docker Compose...${NC}"
if docker-compose -f ${COMPOSE_FILE} up -d; then
    log "Services started successfully"
else
    error "Failed to start services"
    exit 1
fi

# Wait for services to be healthy
echo -e "\n${BLUE}🏥 Checking service health...${NC}"
sleep 10

# Check if app is responding
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    log "Application is healthy and responding"
else
    warn "Application may not be fully ready yet. Check logs with: docker-compose logs app"
fi

echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo "Application: http://localhost:5000"
echo "Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose logs -f app"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart app"