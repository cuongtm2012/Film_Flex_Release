# 🚀 FilmFlex Production Deployment Scripts

**Production-ready deployment scripts for FilmFlex application**

## 📁 Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.sh` | Initial setup | `./setup.sh` |
| `production-deploy.sh` | Full deployment | `sudo ./production-deploy.sh` |
| `quick-update.sh` | Fast updates | `sudo ./quick-update.sh` |
| `rollback.sh` | Emergency rollback | `sudo ./rollback.sh` |
| `health-check.sh` | Monitor health | `./health-check.sh` |

## 🎯 Quick Start

### 1. First Time Setup
```bash
# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

### 2. Deploy to Production
```bash
# Full deployment (recommended for first deploy)
sudo ./production-deploy.sh
```

### 3. Quick Updates
```bash
# For quick code changes
sudo ./quick-update.sh
```

## 📋 Script Details

### 🔧 `production-deploy.sh`
**Full production deployment with backup**
- Pulls latest code from git
- Creates backup of current deployment
- Installs dependencies
- Builds application
- Sets proper permissions
- Restarts application with PM2
- Performs health check
- Reloads nginx

### ⚡ `quick-update.sh`
**Fast updates for small changes**
- Quick git pull
- Syncs only changed files
- Quick build
- Restarts application
- Health check

### 🚨 `rollback.sh`
**Emergency rollback to previous version**
- Finds latest backup
- Stops application
- Restores backup
- Restarts application

### 🔍 `health-check.sh`
**Monitor application health**
- Checks PM2 status
- Tests health endpoint
- Monitors resources
- Auto-restart if needed

## 🎛️ Configuration

### Environment Setup
The scripts assume this structure:
- **Source Code**: `~/Film_Flex_Release` (git repository)
- **Production**: `/var/www/filmflex` (live application)
- **Backups**: `/var/backups/filmflex`
- **Logs**: `/var/log/filmflex`

### Required Services
- **PM2**: Process manager for Node.js
- **Nginx**: Web server (optional)
- **PostgreSQL**: Database

## 🔐 Prerequisites

### System Requirements
```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup
pm2 startup
```

### File Permissions
```bash
# Ensure www-data user exists
sudo useradd -r -s /bin/false www-data 2>/dev/null || true

# Set proper ownership
sudo chown -R www-data:www-data /var/www/filmflex
```

## 📊 Monitoring

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs filmflex

# System health
./health-check.sh
```

### Automated Health Checks
```bash
# Add to crontab for automated monitoring
# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh >> /var/log/filmflex/health.log 2>&1
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
cd /var/www/filmflex
rm -rf node_modules dist
npm install
npm run build
```

#### Permission Issues
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/filmflex
sudo chmod -R 755 /var/www/filmflex
```

#### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U filmflex -d filmflex -c "SELECT 1;"
```

## 🔄 Deployment Workflow

### Regular Updates
1. **Development** → Push to git repository
2. **Production** → Run `sudo ./quick-update.sh`
3. **Monitor** → Check with `./health-check.sh`

### Major Releases
1. **Test** → Run `sudo ./production-deploy.sh` on staging
2. **Deploy** → Run `sudo ./production-deploy.sh` on production
3. **Verify** → Full health check and testing

### Emergency Response
1. **Issue Detected** → Run `./health-check.sh`
2. **Auto-restart** → Script will attempt restart
3. **If Failed** → Run `sudo ./rollback.sh`

## 📝 Logs

### Log Locations
- **Deployment**: `/var/log/filmflex/production-deploy-*.log`
- **Application**: PM2 logs (`pm2 logs filmflex`)
- **Health Checks**: `/var/log/filmflex/health.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### View Recent Logs
```bash
# Deployment logs
ls -la /var/log/filmflex/

# Application logs
pm2 logs filmflex --lines 50

# Real-time monitoring
pm2 monit
```

## 🛡️ Security Notes

- Scripts require `sudo` privileges for production deployment
- Backups are created automatically before each deployment
- File permissions are set appropriately for web server
- Health checks help detect issues early

## 🆘 Emergency Contacts

If deployment fails:
1. Check logs: `pm2 logs filmflex`
2. Run health check: `./health-check.sh`
3. Try rollback: `sudo ./rollback.sh`
4. Check system resources: `htop`, `df -h`

---

**Last Updated**: $(date)
**Version**: 1.0
**Environment**: Production
