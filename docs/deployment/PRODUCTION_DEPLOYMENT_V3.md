# FilmFlex Production Deployment Guide v3.0

## 🎬 Complete Production Deployment System

This guide covers the updated production deployment scripts that include all the fixes for ESM imports, Rollup dependencies, and robust error handling.

## 📁 Available Scripts

### 1. **production-deploy.sh** - Complete Production Deployment
- **Purpose**: Full production deployment with comprehensive error handling
- **Features**: 
  - Rollback capability
  - ESM import fixes
  - Multiple build strategies
  - Health checks
  - Database migrations
  - Dependency management with native binary fixes

### 2. **health-check.sh** - Production Health Monitoring
- **Purpose**: Quick health check for running production deployment
- **Features**:
  - PM2 process status
  - Port availability check
  - Application response testing
  - Database connection check
  - Resource usage monitoring

### 3. **quick-redeploy.sh** - Fast Updates
- **Purpose**: Quick updates for minor changes
- **Features**: ESM import fixes and faster deployment cycle

## 🚀 Usage Instructions

### First Time Production Deployment

```bash
# On your production server, run as root:
sudo ./scripts/deployment/production-deploy.sh
```

### Quick Updates (for minor changes)

```bash
# For faster deployments after initial setup:
sudo ./scripts/deployment/quick-redeploy.sh
```

### Health Monitoring

```bash
# Check application health anytime:
sudo ./scripts/deployment/health-check.sh
```

## 🔧 What the Production Script Fixes

### 1. **ESM Import Issues** ✅
- Fixes all `@shared` import paths with proper relative paths
- Handles nested route import paths correctly
- Adds `.js` extensions to all relative imports
- Removes development-only vite.config imports

### 2. **Rollup Native Dependencies** ✅
- Cleans and reinstalls node_modules properly
- Ensures Rollup native binaries are installed
- Handles npm cache issues
- Retry logic for dependency installation

### 3. **Build System** ✅
- Multiple build strategies (npm build, vite, TypeScript, ESBuild)
- Fallback mechanisms if primary build fails
- Comprehensive build verification
- Static asset copying

### 4. **Error Handling & Rollback** ✅
- Automatic backup creation before deployment
- Rollback capability if deployment fails
- Comprehensive error logging
- Step-by-step failure tracking

### 5. **Health Checks & Monitoring** ✅
- PM2 process monitoring
- Port availability checks
- Application response testing
- Database connection verification
- Resource usage monitoring

## 📋 Pre-Requirements

### System Requirements
- Ubuntu/Debian Linux server
- Node.js 18+ installed
- PM2 process manager
- PostgreSQL database
- Nginx web server
- Git repository access

### Required Commands
The script checks for these commands:
- `git`, `npm`, `pm2`, `curl`, `rsync`, `nginx`, `psql`

## 🛠 Configuration

### Environment Variables
Create these files in your deployment directory:
- `.env.production` - Production environment variables
- `ecosystem.config.js` - PM2 configuration

### Directory Structure
```
/var/www/filmflex/          # Production deployment directory
/var/backups/filmflex/      # Automatic backups
/var/log/filmflex/         # Deployment logs
```

## 📊 Monitoring & Logs

### View Application Status
```bash
pm2 status
pm2 logs filmflex
```

### View Deployment Logs
```bash
ls -la /var/log/filmflex/production-deploy-*.log
tail -f /var/log/filmflex/production-deploy-YYYYMMDD_HHMMSS.log
```

### Check Health Status
```bash
./scripts/deployment/health-check.sh
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. ESM Import Errors
- **Issue**: `Cannot find module @shared/schema`
- **Fix**: The script automatically fixes these during deployment
- **Manual Fix**: Run the ESM import fixing section of the script

#### 2. Rollup Native Binary Missing
- **Issue**: `Cannot find module @rollup/rollup-linux-x64-gnu`
- **Fix**: Script automatically reinstalls dependencies with native binaries
- **Manual Fix**: `npm install @rollup/rollup-linux-x64-gnu --save-optional`

#### 3. Build Failures
- **Issue**: Build process fails
- **Fix**: Script tries multiple build strategies automatically
- **Manual Fix**: Check build logs and run individual build commands

#### 4. PM2 Start Issues
- **Issue**: Application fails to start
- **Fix**: Script tries multiple startup strategies
- **Manual Fix**: Check PM2 logs and verify build output

### Emergency Rollback

If deployment fails, the script automatically attempts rollback. For manual rollback:

```bash
# Find latest backup
ls -la /var/backups/filmflex/

# Restore backup (replace TIMESTAMP with actual timestamp)
sudo cp -r /var/backups/filmflex/backup_TIMESTAMP/* /var/www/filmflex/

# Restart application
sudo pm2 restart filmflex
```

## ✅ Success Indicators

### Successful Deployment Shows:
- ✓ All pre-flight checks passed
- ✓ Source code updated
- ✓ Backup created
- ✓ Dependencies installed
- ✓ Build completed
- ✓ ESM imports fixed
- ✓ Application started
- ✓ Health checks passed
- ✓ Nginx configuration updated

### Application Running Properly:
- PM2 shows process as "online"
- Port 5000 is listening
- `curl http://localhost:5000` returns HTML content
- No error messages in PM2 logs
- Database connection successful

## 🔄 Regular Maintenance

### Weekly Tasks
```bash
# Check application health
./scripts/deployment/health-check.sh

# Update application if needed
sudo ./scripts/deployment/quick-redeploy.sh
```

### Monthly Tasks
```bash
# Full deployment with cleanup
sudo ./scripts/deployment/production-deploy.sh

# Clean old backups and logs (automatic in script)
```

## 🆘 Support

If you encounter issues:

1. **Check the deployment log**: `/var/log/filmflex/production-deploy-*.log`
2. **Run health check**: `./scripts/deployment/health-check.sh`
3. **Check PM2 logs**: `pm2 logs filmflex`
4. **Verify system requirements**: All required commands installed
5. **Check disk space**: `df -h`
6. **Verify database**: `pg_isready -h localhost -p 5432`

---

## 🎉 Success!

With these updated scripts, your FilmFlex application should deploy without the ESM import issues, Rollup dependency problems, or other runtime errors we encountered. The deployment system is now robust, self-healing, and includes comprehensive monitoring.

**Happy Deploying! 🎬**