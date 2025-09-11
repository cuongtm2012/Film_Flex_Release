#!/bin/bash

# FilmFlex VPS Production Deployment Script
# Run this script on your VPS to deploy FilmFlex in production

set -e  # Exit on any error

echo "🚀 Starting FilmFlex Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Consider using a non-root user for security.${NC}"
fi

echo -e "${BLUE}📋 Phase 1: Environment Setup${NC}"

# Check Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

if [[ $NODE_VERSION < "v20.0.0" ]]; then
    echo -e "${RED}❌ Node.js version must be 20.0.0 or higher for Wrangler CLI${NC}"
    exit 1
fi

# Check if required tools are installed
command -v wrangler >/dev/null 2>&1 || { echo -e "${RED}❌ Wrangler CLI not found${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}❌ PM2 not found${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  Docker not found - some deployment options won't be available${NC}"; }

echo -e "${GREEN}✅ All required tools are installed${NC}"

echo -e "${BLUE}📦 Phase 2: Installing Dependencies${NC}"

# Install project dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
else
    echo "Dependencies already installed, updating..."
    npm update
fi

echo -e "${BLUE}🔧 Phase 3: Building Application${NC}"

# Build the application
echo "Building FilmFlex application..."
npm run build

echo -e "${BLUE}☁️  Phase 4: Cloudflare Worker Setup${NC}"

# Check if user is logged into Cloudflare
if ! wrangler whoami >/dev/null 2>&1; then
    echo -e "${YELLOW}🔐 Please login to Cloudflare:${NC}"
    wrangler login
else
    echo "✅ Already logged into Cloudflare"
fi

# Setup Cloudflare secrets
echo -e "${YELLOW}🔑 Setting up Cloudflare secrets...${NC}"
echo "Please run the following command to configure your secrets:"
echo -e "${GREEN}./scripts/setup-cloudflare-secrets.sh${NC}"
echo ""
echo "This will set up:"
echo "- Google OAuth credentials"
echo "- Facebook OAuth credentials"  
echo "- SendGrid API key for email service"
echo "- Session secret"
echo ""

read -p "Have you configured Cloudflare secrets? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please configure Cloudflare secrets first, then re-run this script${NC}"
    exit 0
fi

# Deploy Cloudflare Worker
echo "Deploying Cloudflare Worker..."
wrangler deploy

echo -e "${BLUE}🗄️  Phase 5: Database Setup${NC}"

# Check if database is accessible
if [ -f ".env" ]; then
    echo "✅ Environment file found"
    
    # Check if we can connect to database
    echo "Testing database connection..."
    if npm run db:push --silent >/dev/null 2>&1; then
        echo "✅ Database connection successful"
    else
        echo -e "${YELLOW}⚠️  Database connection failed. Please check your DATABASE_URL${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found. Please create one with your production environment variables${NC}"
fi

echo -e "${BLUE}🐳 Phase 6: Deployment Options${NC}"

echo "Choose your deployment method:"
echo "1) Docker Compose (Recommended)"
echo "2) PM2 Process Manager"
echo "3) Manual setup"

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo -e "${BLUE}🐳 Deploying with Docker Compose...${NC}"
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f docker-compose.production.yml up -d --build
            echo -e "${GREEN}✅ FilmFlex deployed with Docker Compose${NC}"
        else
            echo -e "${RED}❌ Docker Compose not found${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${BLUE}⚡ Deploying with PM2...${NC}"
        
        # Stop existing PM2 processes
        pm2 stop filmflex 2>/dev/null || true
        pm2 delete filmflex 2>/dev/null || true
        
        # Start with PM2
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "${GREEN}✅ FilmFlex deployed with PM2${NC}"
        echo "Use 'pm2 list' to check status"
        echo "Use 'pm2 logs filmflex' to view logs"
        ;;
    3)
        echo -e "${BLUE}📝 Manual Setup Instructions${NC}"
        echo "To manually start the application:"
        echo "1. Set NODE_ENV=production"
        echo "2. Run: npm start"
        echo "3. Ensure your reverse proxy (nginx) is configured"
        echo "4. Monitor with your preferred process manager"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}🔍 Phase 7: Verification${NC}"

# Health check
echo "Performing health checks..."

# Check if port 3000 is listening
if netstat -tuln | grep -q ":3000 "; then
    echo "✅ Application is listening on port 3000"
else
    echo -e "${YELLOW}⚠️  Application may not be running on port 3000${NC}"
fi

# Test endpoints if possible
if command -v curl >/dev/null 2>&1; then
    echo "Testing application endpoints..."
    
    # Test health endpoint
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Health endpoint responding"
    else
        echo -e "${YELLOW}⚠️  Health endpoint not responding${NC}"
    fi
fi

echo -e "${GREEN}🎉 FilmFlex Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Next Steps:${NC}"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificates (if not using Cloudflare)"
echo "3. Test OAuth flows: https://yourdomain.com/api/auth/google"
echo "4. Test email service functionality"
echo "5. Monitor logs and performance"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "- Check PM2 status: pm2 list"
echo "- View logs: pm2 logs filmflex"
echo "- Restart app: pm2 restart filmflex"
echo "- Check Docker: docker ps"
echo "- View Cloudflare Worker logs: wrangler tail"
echo ""
echo -e "${GREEN}🎬 FilmFlex is now running in production!${NC}"