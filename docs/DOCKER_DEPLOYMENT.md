# PhimGG Docker Deployment Guide

## Quick Start

### Local Development
```bash
# Build and run locally
./docker-deploy.sh

# Or manually:
docker-compose up -d
```

### Production Deployment
```bash
# Set registry (Docker Hub example)
export DOCKER_REGISTRY="your-dockerhub-username"

# Build and push
./docker-deploy.sh latest --push

# On production server:
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Detailed Instructions

### 1. Building the Docker Image Locally

```bash
# Simple build
docker build -t filmflex:latest .

# Build with custom tag
docker build -t filmflex:v1.0.0 .

# Build with build args
docker build --build-arg NODE_ENV=production -t filmflex:latest .
```

### 2. Pushing to Docker Registry

#### Docker Hub
```bash
# Login
docker login

# Tag and push
docker tag filmflex:latest your-username/filmflex:latest
docker push your-username/filmflex:latest
```

#### Private Registry
```bash
# Tag for private registry
docker tag filmflex:latest registry.your-domain.com/filmflex:latest

# Push
docker push registry.your-domain.com/filmflex:latest
```

### 3. Running on Ubuntu VPS

#### Install Docker and Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Deploy Application
```bash
# Clone repository or upload files
git clone your-repo-url filmflex
cd filmflex

# Create production environment file
cp .env.docker .env
# Edit .env with your production values

# Pull and run
docker-compose pull
docker-compose up -d

# Or build on server
docker-compose up -d --build
```

### 4. Environment Variables for Production

Create `.env` file:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex
SESSION_SECRET=your_super_secure_random_secret_here
ALLOWED_ORIGINS=https://phimgg.com,https://www.phimgg.com
CLIENT_URL=https://phimgg.com
DOMAIN=phimgg.com
SERVER_IP=your.server.ip.address
```

### 5. SSL/HTTPS Setup

For production with SSL:
```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d phimgg.com -d www.phimgg.com

# Run with SSL
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
```

### 6. Monitoring and Logs

```bash
# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Check health
curl http://localhost:5000/api/health

# Monitor resources
docker stats
```

### 7. Backup and Updates

```bash
# Backup database
docker-compose exec postgres pg_dump -U filmflex filmflex > backup.sql

# Update application
docker-compose pull
docker-compose up -d

# Scale if needed
docker-compose up -d --scale app=3
```

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node version and dependencies
2. **Database connection**: Ensure PostgreSQL is healthy
3. **Port conflicts**: Change ports in docker-compose.yml
4. **Memory issues**: Increase Docker memory limit

### Useful Commands

```bash
# Restart specific service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build app

# Clean up
docker system prune -a

# Shell into container
docker-compose exec app sh
```