# FilmFlex Deployment Scripts - Cleaned & Optimized

This folder contains the essential deployment and maintenance scripts for the FilmFlex application on the phimgg.com production environment (154.205.142.255).

## 🚀 **Essential Scripts (Production-Ready)**

| Script | Status | Description |
|--------|--------|-------------|
| `final-deploy.sh` | ✅ **PRIMARY** | Complete deployment with database setup, SSL, and comprehensive fixes |
| `health-check.sh` | ✅ **MONITOR** | Production health monitoring for phimgg.com |
| `rollback.sh` | ✅ **RECOVERY** | Emergency rollback capability |
| `setup.sh` | ✅ **SETUP** | Initial environment setup |
| `filmflex-server.cjs` | ✅ **FALLBACK** | Fallback server configuration |

## 🗑️ **Removed Scripts (Redundant)**

The following scripts have been removed as their functionality is fully covered by `final-deploy.sh`:
- ❌ `deploy.sh` - Overly complex legacy script
- ❌ `production-deploy.sh` - Redundant with final-deploy.sh
- ❌ `simple-deploy.sh` - Basic functionality covered
- ❌ `quick-redeploy.sh` - Quick deployment covered
- ❌ `quick-update.sh` - Update functionality covered
- ❌ `fix-production.sh` - Fix functionality integrated
- ❌ `quick-cors-fix.sh` - CORS fixes integrated

## 🌐 **Production Environment - phimgg.com**

**Server Configuration:**
- **Domain:** phimgg.com  
- **IP Address:** 154.205.142.255
- **Source Code:** `~/Film_Flex_Release` (Git repository)
- **Production Deploy:** `/var/www/filmflex` (Live website)
- **Build System:** ES Modules with esbuild
- **Database:** PostgreSQL with RBAC system
- **Process Manager:** PM2 with cluster mode
- **Environment:** Production-optimized CORS and variables

## 🎯 **Usage Guide**

### Full Production Deployment (Recommended)

```bash
# Complete deployment with all features
cd ~/Film_Flex_Release
sudo ./scripts/deployment/final-deploy.sh

# Features included:
# ✅ Database schema setup and migrations
# ✅ SSL certificate management
# ✅ Static file deployment fixes
# ✅ CORS configuration
# ✅ PM2 process management
# ✅ Health checks and monitoring
# ✅ Nginx configuration updates
```

### Health Monitoring

```bash
# Check application health
./scripts/deployment/health-check.sh

# Monitor with detailed output
./scripts/deployment/health-check.sh --verbose
```

### Emergency Recovery

```bash
# Rollback to previous deployment
./scripts/deployment/rollback.sh

# Rollback with specific backup
./scripts/deployment/rollback.sh --backup=backup_20250716_143000
```

## 🔧 **Key Improvements in final-deploy.sh**

1. **Static File Fix**: Correctly deploys client files to `/var/www/filmflex/dist/public/`
2. **Nginx Configuration**: Automatic nginx config updates with proper static paths
3. **SSL Management**: Automated SSL certificate handling
4. **Database Setup**: Complete PostgreSQL schema and RBAC setup
5. **Health Validation**: Comprehensive health checks and file validation
6. **Error Recovery**: Built-in rollback and error handling
7. **CORS Optimization**: Production-ready CORS configuration

## 📊 **Post-Deployment Verification**

After running `final-deploy.sh`, verify:

- ✅ **HTTPS Access**: https://phimgg.com loads correctly
- ✅ **Static Assets**: CSS, JS, images load without 404 errors
- ✅ **API Endpoints**: /api/health returns 200 OK
- ✅ **Database**: Admin login works (admin/Cuongtm2012$)
- ✅ **PM2 Status**: `pm2 status` shows running processes
- ✅ **Nginx Logs**: No errors in `/var/log/nginx/phimgg.com.error.log`

## 🚨 **Troubleshooting**

If deployment fails:

1. **Check Logs**: `/var/log/filmflex/`
2. **PM2 Status**: `pm2 logs filmflex`
3. **Nginx Status**: `nginx -t && systemctl status nginx`
4. **Database**: Test connection with provided credentials
5. **Rollback**: Use `./rollback.sh` if needed

## 💡 **Best Practices**

- Always run `final-deploy.sh` for production deployments
- Use `health-check.sh` for monitoring
- Keep `rollback.sh` ready for emergencies
- Monitor logs after deployment
- Test SSL certificates before deployment
sudo ./scripts/deployment/quick-redeploy.sh --no-branch
```

### Branch-Specific Deployment (New!)

```bash
# Interactive branch deployment with validation
cd ~/Film_Flex_Release
sudo ./scripts/deployment/deploy-branch.sh main

# List available branches
sudo ./scripts/deployment/deploy-branch.sh --list-branches

# Deploy current branch
sudo ./scripts/deployment/deploy-branch.sh --current
```

### Full Deployment (Database + Code)

```bash
cd ~/Film_Flex_Release
git pull  # Pull latest changes
chmod +x scripts/deployment/final-deploy.sh
sudo ./scripts/deployment/final-deploy.sh
```

### CORS Configuration Fix

```bash
# Fix CORS issues for production
cd ~/Film_Flex_Release
sudo ./scripts/deployment/fix-cors-production.sh
```

### Movie Data Import

```bash
cd /var/www/filmflex/scripts/data
# For daily import (new movies only):
./import-movies.sh
# For full import (can be resumed if interrupted):
./import-all-movies-resumable.sh
# To set up automatic daily imports:
sudo ./setup-cron.sh
```

## Script Features & Updates

### quick-redeploy.sh v3.0 (Updated)
- ✅ ES module build support with esbuild
- ✅ Enhanced dependency management with binary fixes
- ✅ Production environment variables for phimgg.com
- ✅ CORS configuration (*) for development
- ✅ Multiple build fallback strategies
- ✅ Comprehensive health checks with production IP testing
- ✅ Improved error handling and rollback capability

### deploy-branch.sh v1.0 (New)
- ✅ Branch validation before deployment
- ✅ Interactive confirmation for production deployments
- ✅ Branch comparison and commit information
- ✅ List available local and remote branches
- ✅ Enhanced logging and status reporting

### Environment Configuration
**Production Environment Variables:**
```bash
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=*
CLIENT_URL=*
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
DOMAIN=phimgg.com
SERVER_IP=154.205.142.255
```

## Production URLs

| Service | URL |
|---------|-----|
| **Local Access** | http://localhost:5000 |
| **Production IP** | http://154.205.142.255:5000 |
| **Domain** | https://phimgg.com (when DNS configured) |
| **Health Check** | http://154.205.142.255:5000/api/health |

## Management Commands

```bash
# Application Status
pm2 status filmflex
pm2 logs filmflex
pm2 monit

# Application Control
pm2 restart filmflex
pm2 stop filmflex
pm2 reload filmflex

# Quick Health Check
curl http://localhost:5000/api/health
curl http://154.205.142.255:5000/api/health
```

## Troubleshooting

### Build Issues
- ✅ Enhanced dependency management automatically fixes corrupted node_modules
- ✅ Platform-specific binaries (@esbuild/linux-x64, @rollup/rollup-linux-x64-gnu) auto-installed
- ✅ Multiple build strategies (esbuild, TypeScript, fallbacks)

### CORS Issues  
- ✅ Wildcard CORS (*) configured for development
- ⚠️ Review CORS settings for production security

### Database Issues
- ✅ Complete RBAC system setup included in final-deploy.sh
- ✅ All tables and relationships automatically created
- ✅ Default roles (Admin, Content Manager, Viewer) configured

### Performance Issues
- ✅ PM2 cluster mode with max instances
- ✅ Memory restart limit (500M)
- ✅ Enhanced logging configuration

## Next Steps

1. **DNS Configuration**: Point phimgg.com to 154.205.142.255
2. **SSL Certificate**: Set up HTTPS for phimgg.com
3. **Security Review**: Configure proper CORS for production
4. **Monitoring**: Set up application monitoring and alerts
sudo ./setup-cron.sh
```

## What the Deployment Script Does

The deployment scripts perform these key steps:

1. Fix database schema issues (adds missing columns)
2. Stop any existing PM2 processes
3. Properly configure package.json and environment
4. Copy production server files to `/var/www/filmflex`
5. Copy data import and database fix scripts
6. Install required dependencies
7. Start the server with PM2
8. Verify the application status
9. Reload Nginx configuration

## Troubleshooting

If you encounter issues after deployment:

### Database Issues
1. Run the deployment script again to fix schema issues: `sudo ./scripts/deployment/final-deploy.sh`
2. Verify database connection: `psql -U filmflex -d filmflex -c "SELECT NOW();"`
3. Check database structure: `psql -U filmflex -d filmflex -c "\d movies"`

### Server Issues
1. Check PM2 logs: `pm2 logs filmflex`
2. Verify server is running: `curl http://localhost:5000/api/health`
3. Restart the server if needed: `pm2 restart filmflex`
4. Check for port conflicts: `netstat -tuln | grep 5000`

### Nginx Issues
1. Check Nginx configuration: `nginx -t`
2. Restart Nginx if needed: `systemctl restart nginx`
3. Check Nginx logs: `tail -f /var/log/nginx/error.log`

### Data Import Issues
1. Check import logs: `tail -f /var/log/filmflex/import.log`
2. Verify API access: `curl -s "https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1" | head -20`
3. Check if axios is installed: `cd /var/www/filmflex && npm list axios`

## Running the Server Manually

If all automated methods fail, you can run the server directly:

```bash
cd /var/www/filmflex
export NODE_ENV=production
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node filmflex-server.cjs
```