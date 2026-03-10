# PhimGG Production Deployment Guide 🚀

## Overview
This guide covers the complete production deployment process for PhimGG (phimgg.com), including server deployment, Cloudflare Worker setup, database configuration, and email service integration.

## 🔧 **Phase 1: Pre-Deployment Preparation**

### 1. Environment Configuration
Ensure your production environment files are properly configured:

**`.env` (Production):**
```bash
# Database
DATABASE_URL=your_production_database_url
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=filmflex
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Application
NODE_ENV=production
PORT=3000
SESSION_SECRET=your_super_secure_session_secret

# Cloudflare Integration
USE_CLOUDFLARE_OAUTH=true
USE_CLOUDFLARE_EMAIL=true
CLOUDFLARE_WORKER_URL=https://phimgg.com

# Email Configuration
FROM_EMAIL=noreply@phimgg.com
FROM_NAME=PhimGG

# Domain
DOMAIN=phimgg.com
CLIENT_URL=https://phimgg.com
```

### 2. Build Preparation
```bash
# Install dependencies
npm install

# Type check
npm run check

# Build the application
npm run build
```

## 🌐 **Phase 2: Cloudflare Worker Deployment**

### 1. Login to Cloudflare
```bash
wrangler login
```

### 2. Configure Secrets
Run the setup script to configure all secrets:
```bash
./scripts/setup-cloudflare-secrets.sh
```

This will prompt you to enter:
- Google OAuth Client ID & Secret
- Facebook App ID & Secret
- SendGrid API Key (for email service)
- Session Secret

### 3. Deploy Cloudflare Worker
```bash
wrangler deploy
```

### 4. Verify Worker Deployment
```bash
# Check worker status
wrangler tail

# List configured secrets
wrangler secret list
```

## 🐳 **Phase 3: Server Deployment Options**

### Option A: Docker Deployment (Recommended)

#### 1. Using Docker Compose Production
```bash
# Build and start production containers
docker-compose -f docker-compose.production.yml up -d

# Or with enhanced configuration
docker-compose -f docker-compose.enhanced.yml up -d
```

#### 2. Using Docker with SSL
```bash
# Deploy with SSL support
docker-compose -f docker-compose.nginx-ssl.yml up -d
```

### Option B: VPS Deployment

#### 1. Build Server Bundle
```bash
npm run build:server
```

#### 2. Deploy to Server
```bash
# Copy files to your VPS
scp -r dist/ user@your-server:/path/to/filmflex/
scp package.json user@your-server:/path/to/filmflex/
scp ecosystem.config.js user@your-server:/path/to/filmflex/

# SSH into server
ssh user@your-server

# Install dependencies and start
cd /path/to/filmflex
npm install --production
pm2 start ecosystem.config.js
```

## 🗄️ **Phase 4: Database Setup**

### 1. PostgreSQL Database
```bash
# Using Docker PostgreSQL
docker-compose -f docker-compose.yml up postgres -d

# Or import existing data
./shared/import_to_docker_20250817_200439.sh
```

### 2. Run Migrations
```bash
npm run db:push
```

### 3. Verify Database
```bash
./shared/verify_database_20250817_200439.sh
```

## 🌍 **Phase 5: Domain & SSL Configuration**

### 1. Cloudflare DNS Setup
Ensure your DNS records point to:
- **A Record**: `phimgg.com` → Your server IP
- **CNAME**: `www.phimgg.com` → `phimgg.com`

### 2. SSL Certificate
If using Cloudflare:
- Enable "Full (Strict)" SSL/TLS encryption
- Enable "Always Use HTTPS"
- Configure "Automatic HTTPS Rewrites"

### 3. Nginx Configuration (if using)
Your nginx configuration is in `/nginx/phimgg.com.conf`

## 📧 **Phase 6: Email Service Verification**

### 1. Test Email Functionality
```bash
# Check email service logs
wrangler tail --format=json | grep email

# Test password reset email
curl -X POST https://phimgg.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 2. SendGrid Configuration
- Verify your SendGrid API key has send permissions
- Check SendGrid dashboard for delivery statistics

## 🔍 **Phase 7: Production Testing**

### 1. Application Health Check
```bash
# Check server status
curl https://phimgg.com/health

# Test API endpoints
curl https://phimgg.com/api/films
```

### 2. OAuth Testing
- Test Google OAuth: `https://phimgg.com/api/auth/google`
- Test Facebook OAuth: `https://phimgg.com/api/auth/facebook`

### 3. Email Testing
- Test password reset functionality
- Verify email delivery in SendGrid dashboard

## 📊 **Phase 8: Monitoring Setup**

### 1. Application Monitoring
```bash
# View PM2 processes
pm2 list

# Monitor logs
pm2 logs filmflex
```

### 2. Docker Monitoring
```bash
# Check container status
docker ps

# View container logs
docker logs filmflex-app
docker logs filmflex-db
```

### 3. Cloudflare Analytics
- Monitor Worker performance in Cloudflare dashboard
- Check email delivery rates

## 🚀 **Deployment Checklist**

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Application builds successfully
- [ ] Database migrations ready
- [ ] SSL certificates configured

### Cloudflare Worker
- [ ] Worker deployed successfully
- [ ] All secrets configured
- [ ] Routes working correctly
- [ ] OAuth flows tested
- [ ] Email service tested

### Server Deployment
- [ ] Application deployed
- [ ] Database connected
- [ ] PM2/Docker containers running
- [ ] Health checks passing

### Post-Deployment
- [ ] Domain resolving correctly
- [ ] SSL working
- [ ] All API endpoints accessible
- [ ] User registration/login working
- [ ] Email notifications working
- [ ] Movie streaming functional

## 🔧 **Common Deployment Commands**

```bash
# Quick deployment update
npm run build && docker-compose -f docker-compose.production.yml up -d --build

# Update Cloudflare Worker
wrangler deploy

# Restart PM2 application
pm2 restart filmflex

# Update database schema
npm run db:push

# View application logs
docker logs filmflex-app -f
pm2 logs filmflex --lines 100
```

## 🆘 **Troubleshooting**

### Cloudflare Worker Issues
```bash
# Check worker logs
wrangler tail

# Verify secrets
wrangler secret list

# Re-deploy worker
wrangler deploy --force
```

### Database Connection Issues
```bash
# Test database connection
npm run db:push

# Check database logs
docker logs filmflex-db
```

### Email Delivery Issues
```bash
# Check SendGrid API key
wrangler secret list | grep SENDGRID

# Test email endpoint
curl -X POST https://phimgg.com/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Test message"}'
```

## 📈 **Production Optimization**

1. **Performance Monitoring**
   - Use Cloudflare Analytics
   - Monitor server resources
   - Track database performance

2. **Security**
   - Regular security updates
   - Monitor access logs
   - Keep secrets rotated

3. **Backup Strategy**
   - Database backups
   - Application code backups
   - Configuration backups

Your PhimGG application is now ready for production deployment! 🎬✨