# FilmFlex Production Deployment Guide - Without Database Changes

## Overview
This guide provides step-by-step instructions for deploying FilmFlex to production while preserving your existing database. This is ideal for updates, feature deployments, or maintenance releases where you want to keep all your existing data intact.

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Nginx installed and configured
- SSL certificates (Let's Encrypt recommended)
- Minimum 2GB RAM, 20GB storage
- Root or sudo access

### Before You Start
- ✅ Verify your database is healthy and backed up
- ✅ Ensure you have access to production server
- ✅ Confirm DNS is pointing to your server
- ✅ Have your environment variables ready

## Quick Deploy Options

### Option 1: Quick Redeploy (Recommended for updates)
```bash
# Navigate to your deployment script
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release/scripts/deployment

# Run quick deployment (preserves database)
./deploy.sh quick --backup
```

### Option 2: Production Docker Deployment (Application only)
```bash
# Deploy only application containers
./deploy.sh production --force --no-database
```

### Option 3: Manual Step-by-Step Deployment

## Step-by-Step Manual Deployment

### Step 1: Create Backup (Safety First)
```bash
# Create comprehensive backup before deployment
sudo mkdir -p /var/backups/filmflex
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"

# Backup application files
sudo tar -czf "/var/backups/filmflex/${BACKUP_NAME}_app.tar.gz" -C /var/www/filmflex . 2>/dev/null || true

# Backup nginx configuration
sudo cp /etc/nginx/sites-available/phimgg.com "/var/backups/filmflex/${BACKUP_NAME}_nginx.conf"

echo "✅ Backup created: $BACKUP_NAME"
```

### Step 2: Prepare Production Environment
```bash
# Set environment variables
export PRODUCTION_IP="38.54.14.154"
export PRODUCTION_DOMAIN="phimgg.com"
export DEPLOY_DIR="/var/www/filmflex"
export DB_CONTAINER="filmflex-postgres"

# Create deployment directory
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR
```

### Step 3: Create Production Docker Compose (Without DB Changes)
Create a `docker-compose.production-no-db.yml` file:

```yaml
version: '3.8'

services:
  app:
    # Updated FilmFlex application image
    image: cuongtm2012/filmflex-app:latest
    container_name: filmflex-app
    restart: unless-stopped
    environment:
      # Database Configuration (connects to existing DB)
      DATABASE_URL: postgresql://filmflex:filmflex2024@postgres:5432/filmflex
      
      # Application Configuration
      NODE_ENV: production
      PORT: 5000
      
      # CORS Configuration
      ALLOWED_ORIGINS: "*"
      CLIENT_URL: "*"
      CORS_ORIGIN: "*"
      CORS_METHODS: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      CORS_ALLOWED_HEADERS: "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma"
      CORS_CREDENTIALS: "true"
      
      # Server Configuration
      DOMAIN: "38.54.14.154"
      SERVER_IP: "38.54.14.154"
      PUBLIC_URL: "https://phimgg.com"
      
      # Security
      SESSION_SECRET: filmflex_production_secret_2024
    ports:
      - "5000:5000"
    networks:
      - filmflex-network
    volumes:
      - app_logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  filmflex-network:
    external: true

volumes:
  app_logs:
    driver: local
```

### Step 4: Stop Application (Keep Database Running)
```bash
# Stop only the application container, keep database running
docker stop filmflex-app 2>/dev/null || true
docker rm filmflex-app 2>/dev/null || true

# Verify database is still running
docker ps | grep filmflex-postgres
```

### Step 5: Deploy Updated Application
```bash
# Pull latest application image
docker pull cuongtm2012/filmflex-app:latest

# Start updated application
docker compose -f docker-compose.production-no-db.yml up -d app

# Wait for application to start
sleep 30
```

### Step 6: Verify Deployment
```bash
# Check container status
docker ps | grep filmflex

# Verify database connection (should show existing movie count)
docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;"

# Test application endpoint
curl -s http://localhost:5000/api/health

# Test from external access
curl -s https://phimgg.com/api/health
```

### Step 7: Update Nginx Configuration (If Needed)
```bash
# Test current nginx configuration
sudo nginx -t

# If configuration is valid, reload
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

## Environment-Specific Configurations

### Production Environment Variables
Ensure these are set in your production environment:

```bash
# Core Configuration
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex

# CORS Settings (for external access)
ALLOWED_ORIGINS=https://phimgg.com,https://www.phimgg.com,*
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Server Settings
DOMAIN=phimgg.com
SERVER_IP=38.54.14.154
PUBLIC_URL=https://phimgg.com

# Security
SESSION_SECRET=filmflex_production_secret_2024
```

## Health Checks and Monitoring

### Application Health Check
```bash
# Check application health
curl -f http://localhost:5000/api/health || echo "❌ Application health check failed"

# Check container logs
docker logs filmflex-app --tail 50

# Check container resource usage
docker stats filmflex-app --no-stream
```

### Database Health Check (Without Changes)
```bash
# Verify database connectivity
docker exec filmflex-postgres pg_isready -U filmflex -d filmflex

# Check movie count (should remain unchanged)
MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" | xargs)
echo "✅ Database contains $MOVIE_COUNT movies"

# Check recent activity (optional)
docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables ORDER BY schemaname,tablename;"
```

### System Resource Check
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Check Docker system usage
docker system df
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Container Won't Start
```bash
# Check logs for errors
docker logs filmflex-app

# Verify environment variables
docker exec filmflex-app env | grep -E "(DATABASE_URL|NODE_ENV|PORT)"

# Restart with verbose logging
docker compose -f docker-compose.production-no-db.yml up app
```

#### 2. Database Connection Issues
```bash
# Test database connection from app container
docker exec filmflex-app psql $DATABASE_URL -c "SELECT 1;"

# Check database container status
docker exec filmflex-postgres pg_isready -U filmflex -d filmflex

# Verify network connectivity
docker network ls | grep filmflex
```

#### 3. CORS Issues
```bash
# Test CORS headers
curl -I -H "Origin: https://phimgg.com" http://localhost:5000/api/health

# Update CORS environment variables if needed
docker exec filmflex-app env | grep CORS
```

#### 4. SSL/Nginx Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check SSL certificate expiry
sudo certbot certificates

# Verify nginx proxy is working
curl -I https://phimgg.com
```

## Rollback Procedure

If deployment fails, you can quickly rollback:

```bash
# Stop new container
docker stop filmflex-app

# Restore from backup
BACKUP_NAME="your_backup_name"  # Use actual backup name
sudo tar -xzf "/var/backups/filmflex/${BACKUP_NAME}_app.tar.gz" -C /var/www/filmflex

# Start previous version
docker run -d --name filmflex-app \
  --network filmflex-network \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex \
  cuongtm2012/filmflex-app:previous
```

## Best Practices

### Pre-Deployment Checklist
- [ ] Create backup of current deployment
- [ ] Verify database is healthy and accessible
- [ ] Test deployment on staging environment
- [ ] Ensure all environment variables are correct
- [ ] Verify Docker images are available
- [ ] Check SSL certificate validity
- [ ] Confirm DNS resolution

### Post-Deployment Verification
- [ ] Application responds on port 5000
- [ ] Database connection is working
- [ ] Movie count unchanged from before deployment
- [ ] CORS headers are properly set
- [ ] SSL certificate is working
- [ ] External access through domain works
- [ ] Log files are being written
- [ ] Container health checks are passing

### Security Considerations
- Always backup before deployment
- Use specific image tags instead of `latest` in production
- Regularly update SSL certificates
- Monitor container logs for security issues
- Keep Docker images updated with security patches

## Automated Deployment Script

For convenience, you can use the provided deployment script with specific options:

```bash
# Quick deployment without database changes
./deploy.sh quick --backup --skip-database

# Production deployment preserving database
./deploy.sh production --force --preserve-database

# Health check only
./deploy.sh health --verbose
```

## Support and Monitoring

### Log Locations
- Application logs: `docker logs filmflex-app`
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- System logs: `/var/log/syslog`
- Deployment logs: `/var/log/filmflex/deploy-*.log`

### Monitoring Commands
```bash
# Real-time application logs
docker logs -f filmflex-app

# Monitor container resource usage
docker stats

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s https://phimgg.com
```

This guide ensures your database remains untouched while updating your FilmFlex application in production. Always test the deployment process in a staging environment first, and keep backups before any production changes.