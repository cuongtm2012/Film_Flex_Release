# 🎬 FilmFlex Production Deployment Guide

**Status**: ✅ **SUCCESSFULLY DEPLOYED**  
**Date**: September 5, 2025  
**Server**: 38.54.14.154 (lightnode)  
**Database**: 5,005+ Movies Pre-loaded  
**Application URL**: http://38.54.14.154:5000

## 📋 **Deployment Summary**

FilmFlex has been successfully deployed to production using Docker containers with:
- **Multi-platform support** (ARM64 + AMD64)
- **Complete movie database** (5,005+ movies)
- **CORS issues resolved**
- **Production-ready configuration**

## 🐳 **Docker Images**

### Application Image
- **Name**: `cuongtm2012/filmflex-app:latest`
- **Size**: ~485MB
- **Platforms**: linux/amd64, linux/arm64
- **Contains**: Built FilmFlex application with all dependencies

### Database Image
- **Name**: `cuongtm2012/filmflex-postgres-data:latest`
- **Size**: ~135MB (31MB database + PostgreSQL)
- **Platforms**: linux/amd64, linux/arm64
- **Contains**: PostgreSQL 15 + Complete movie database

## 🚀 **Quick Start Commands**

### Deploy FilmFlex
```bash
# Run the production deployment script
./deploy-production.sh
```

### Manage FilmFlex
```bash
# Start services
./filmflex-manager.sh start

# Check status
./filmflex-manager.sh status

# View logs
./filmflex-manager.sh logs

# Stop services
./filmflex-manager.sh stop
```

## 🔧 **Manual Docker Compose Commands**

```bash
# Start all services
docker compose -f docker-compose.server.yml up -d

# Stop all services
docker compose -f docker-compose.server.yml down

# View logs
docker compose -f docker-compose.server.yml logs -f

# Check status
docker compose -f docker-compose.server.yml ps

# Restart services
docker compose -f docker-compose.server.yml restart

# Update images and restart
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

## 📊 **Service Configuration**

### PostgreSQL Database
- **Container**: `filmflex-postgres`
- **Port**: 5432
- **Database**: filmflex
- **User**: filmflex
- **Movies**: 5,005+
- **Data Persistence**: Docker volume `postgres_data`

### FilmFlex Application
- **Container**: `filmflex-app`
- **Port**: 5000
- **Environment**: Production
- **CORS**: Configured for all origins
- **Health Checks**: Enabled
- **Auto Restart**: Enabled

## 🔑 **Environment Variables**

### Database Configuration
```env
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex
```

### CORS Configuration (Fixed)
```env
ALLOWED_ORIGINS=*
CLIENT_URL=*
CORS_ORIGIN=*
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma
CORS_CREDENTIALS=true
```

### Server Configuration
```env
DOMAIN=38.54.14.154
SERVER_IP=38.54.14.154
PUBLIC_URL=http://38.54.14.154:5000
NODE_ENV=production
PORT=5000
```

## 🛠️ **Troubleshooting**

### Check Container Status
```bash
docker compose -f docker-compose.server.yml ps
```

### View Application Logs
```bash
docker compose -f docker-compose.server.yml logs app
```

### View Database Logs
```bash
docker compose -f docker-compose.server.yml logs postgres
```

### Test Database Connection
```bash
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"
```

### Test Application Endpoint
```bash
curl -I http://localhost:5000
```

## 🔄 **Updates and Maintenance**

### Update to Latest Images
```bash
# Pull latest images
docker compose -f docker-compose.server.yml pull

# Restart with new images
docker compose -f docker-compose.server.yml up -d
```

### Backup Database
```bash
# Create database backup
docker compose -f docker-compose.server.yml exec postgres pg_dump -U filmflex -d filmflex > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Clean Up Docker Resources
```bash
# Remove unused images and containers
docker system prune -f
```

## 🌐 **Access Information**

- **Application**: http://38.54.14.154:5000
- **Server SSH**: `ssh root@38.54.14.154`
- **Database**: Internal Docker network (postgres:5432)

## ✅ **Deployment Features**

- ✅ **Multi-platform Docker images**
- ✅ **Complete movie database (5,005+ movies)**
- ✅ **CORS issues resolved**
- ✅ **Health checks enabled**
- ✅ **Auto-restart on failure**
- ✅ **Persistent data storage**
- ✅ **Production logging**
- ✅ **Isolated network**
- ✅ **Easy management scripts**

## 📞 **Support**

If you encounter any issues:

1. Check container status: `./filmflex-manager.sh status`
2. View logs: `./filmflex-manager.sh logs`
3. Restart services: `./filmflex-manager.sh restart`
4. Run deployment script: `./deploy-production.sh`

---

**🎉 FilmFlex is now successfully running in production!** 🎬