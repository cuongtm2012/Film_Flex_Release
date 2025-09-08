# 🚀 Production Deployment Guide

**Last Updated**: September 8, 2025  
**Status**: Production Ready  
**Target Server**: 38.54.14.154 (phimgg.com)

## 🎯 **Deployment Methods**

### **Method 1: Automated Deployment (Recommended)**
```bash
# Complete automated deployment
./setup-server-automation.sh

# Or use the production deployment script
./scripts/deployment/final-deploy.sh
```

### **Method 2: Docker Deployment**
```bash
# Using Docker Compose
docker compose -f docker-compose.server.yml up -d

# Check status
docker compose -f docker-compose.server.yml ps
```

### **Method 3: Manual Deployment**
```bash
# Traditional PM2 deployment
./deploy-production.sh
```

## 🔧 **Core Deployment Features**

### **Automated Fixes**
- ✅ **ES Module Issues**: Automatic import path fixing
- ✅ **TypeScript Compilation**: Multiple build strategies
- ✅ **Dependency Management**: Native binary installation
- ✅ **Database Setup**: Complete schema and RBAC
- ✅ **Static Files**: Proper client file deployment
- ✅ **SSL/HTTPS**: Automatic certificate management
- ✅ **Health Checks**: Comprehensive validation

### **Production Environment**
```bash
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex
DOMAIN=phimgg.com
SERVER_IP=38.54.14.154
```

## 📦 **Docker Deployment (Current)**

### **Server Configuration**
```yaml
# docker-compose.server.yml
services:
  app:
    build:
      dockerfile: Dockerfile.final
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
    ports:
      - "5000:5000"
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: filmflex
      POSTGRES_USER: filmflex
      POSTGRES_PASSWORD: filmflex2024
    ports:
      - "5432:5432"
```

### **Deployment Commands**
```bash
# Deploy to production
docker compose -f docker-compose.server.yml up -d

# View logs
docker compose -f docker-compose.server.yml logs -f

# Import movie data
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --max-pages=3

# Database backup
docker compose -f docker-compose.server.yml exec postgres pg_dump -U filmflex filmflex > backup.sql
```

## 🛠️ **PM2 Deployment (Alternative)**

### **Build Process**
```bash
# Install dependencies
npm install

# Build application
npm run build

# Copy to production directory
cp -r dist /var/www/filmflex/
cp -r client/dist /var/www/filmflex/dist/public/
```

### **PM2 Configuration**
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "filmflex",
    script: "dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 5000,
      DATABASE_URL: "postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    }
  }]
};
```

## 🔍 **Deployment Verification**

### **Health Checks**
```bash
# Application status
curl http://localhost:5000/api/health

# Docker containers
docker compose -f docker-compose.server.yml ps

# PM2 processes
pm2 status

# Database connection
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"
```

### **Expected Results**
- ✅ **HTTP 200**: Application responds
- ✅ **Database**: Movies table has data
- ✅ **Static Files**: Assets load correctly
- ✅ **Logs**: No critical errors in logs

## 🚨 **Troubleshooting**

### **Common Issues**

**1. Container Not Starting**
```bash
# Check logs
docker compose -f docker-compose.server.yml logs app

# Restart containers
docker compose -f docker-compose.server.yml restart
```

**2. Database Connection Failed**
```bash
# Check database
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT 1;"

# Reset database
docker compose -f docker-compose.server.yml down -v
docker compose -f docker-compose.server.yml up -d
```

**3. Build Failures**
```bash
# Clean build
npm run clean
npm install
npm run build

# Alternative build
npx esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js
```

**4. Static Files Not Loading**
```bash
# Check file locations
ls -la /var/www/filmflex/dist/public/
ls -la dist/public/

# Fix nginx configuration
nginx -t
systemctl reload nginx
```

## 📊 **Deployment Monitoring**

### **Log Locations**
```bash
# Application logs
docker compose -f docker-compose.server.yml logs -f app

# PM2 logs
pm2 logs filmflex

# Deployment logs
tail -f /var/log/filmflex/deployment.log

# Nginx logs
tail -f /var/log/nginx/error.log
```

### **Performance Monitoring**
```bash
# Docker stats
docker stats

# PM2 monitoring
pm2 monit

# System resources
htop
df -h
```

## 🔄 **Update Deployment**

### **Rolling Updates**
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
docker compose -f docker-compose.server.yml build --no-cache
docker compose -f docker-compose.server.yml up -d

# Or for PM2
./scripts/deployment/final-deploy.sh
```

### **Rollback**
```bash
# Docker rollback
docker compose -f docker-compose.server.yml down
# Restore from backup
docker compose -f docker-compose.server.yml up -d

# PM2 rollback
pm2 delete filmflex
# Restore previous version
pm2 start ecosystem.config.cjs
```

## 🎯 **Production URLs**

| Service | URL |
|---------|-----|
| **Application** | http://38.54.14.154:5000 |
| **Health Check** | http://38.54.14.154:5000/api/health |
| **Domain** | http://phimgg.com (when DNS configured) |
| **Admin** | http://38.54.14.154:5000/admin |

## ✅ **Success Indicators**

After successful deployment:
- 🌐 Application accessible at production URL
- 📊 Health check returns status: "healthy"
- 🗄️ Database contains movie data
- 🔄 Automated imports running via cron
- 📝 Logs show no critical errors
- 🚀 PM2/Docker shows running processes

**Next Steps**: [Maintenance Guide](../04-maintenance/maintenance-tasks.md) | [Troubleshooting](../05-troubleshooting/common-issues.md)