# Film Flex Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Node.js 22.16+ 
- PM2 process manager
- Nginx (optional but recommended)
- PostgreSQL database (if using database features)

### 1. Upload Your Code
```bash
# Upload your project to the server
scp -r Film_Flex_Release/ user@your-server:/tmp/

# Or clone from repository
git clone https://github.com/your-username/Film_Flex_Release.git /tmp/Film_Flex_Release
```

### 2. Run Deployment Script
```bash
# Navigate to deployment directory
cd /tmp/Film_Flex_Release/scripts/deployment/

# Make script executable
chmod +x deploy.sh

# Run full deployment
sudo ./deploy.sh

# Or with custom settings
DEPLOYMENT_DIR=/opt/filmflex DOMAIN_NAME=your-domain.com ENABLE_SSL=true ./deploy.sh
```

## 🔧 Configuration Options

### Environment Variables
```bash
# Deployment paths
export DEPLOYMENT_DIR="/var/www/filmflex"
export BACKUP_DIR="/var/backups/filmflex"
export SOURCE_DIR="/tmp/Film_Flex_Release"

# Application settings
export ENVIRONMENT="production"
export DATABASE_URL="postgresql://user:pass@localhost:5432/filmflex"

# SSL/Domain setup
export DOMAIN_NAME="your-domain.com"
export ENABLE_SSL="true"
```

### Command Line Options
```bash
# Skip certain steps
./deploy.sh --skip-backup     # Skip backup creation
./deploy.sh --skip-build      # Skip TypeScript compilation
./deploy.sh --skip-nginx      # Skip Nginx configuration
./deploy.sh --skip-ssl        # Skip SSL certificate setup

# Utility operations
./deploy.sh --health-check    # Run health check only
./deploy.sh --rollback        # Rollback to previous version
./deploy.sh --dry-run         # Show what would be done
```

## 🔍 Troubleshooting

### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails
```bash
# Check TypeScript configuration
cat tsconfig.server.json

# Manual compilation test
npx tsc -p tsconfig.server.json --listFiles

# Install missing types
npm install --save-dev @types/node @types/express
```

**Solution**: The script automatically detects and fixes common TypeScript issues:
- Uses `tsconfig.server.json` for server compilation
- Creates server config if main config has `noEmit: true`
- Fixes ESM import paths automatically

### PM2 Process Issues

**Problem**: Application won't start with PM2
```bash
# Check PM2 status
pm2 status
pm2 logs filmflex --lines 50

# Manual start for debugging
cd /var/www/filmflex
node dist/server/index.js
```

**Solution**: Check the ecosystem configuration:
```javascript
// ecosystem.config.js should point to correct entry file
{
  name: 'filmflex',
  script: './dist/server/index.js', // or ./dist/index.js
  // ... other config
}
```

### Database Connection Issues

**Problem**: Database connection fails
```bash
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check environment variables
env | grep DATABASE
```

**Solution**: Ensure DATABASE_URL is correctly formatted:
```bash
export DATABASE_URL="postgresql://username:password@host:5432/database"
```

### Port/Firewall Issues

**Problem**: Application not accessible from outside
```bash
# Check if application is running
curl http://localhost:5000/api/health

# Check firewall status
sudo ufw status

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

**Solution**: Configure firewall and Nginx:
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Restart Nginx
sudo systemctl restart nginx
```

## 📋 Post-Deployment Checklist

### ✅ Application Health
```bash
# Check application status
./deploy.sh --health-check

# Monitor logs
pm2 logs filmflex --lines 100
tail -f /var/log/filmflex-deploy.log
```

### ✅ Performance Monitoring
```bash
# Check PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h
```

### ✅ Security Verification
```bash
# Check file permissions
ls -la /var/www/filmflex/
ls -la /var/www/filmflex/.env

# Verify firewall
sudo ufw status verbose

# SSL certificate status (if enabled)
sudo certbot certificates
```

## 🔄 Maintenance Tasks

### Update Deployment
```bash
# Update code and redeploy
cd /path/to/new/code
./scripts/deployment/deploy.sh
```

### Database Migrations
```bash
# Run migrations separately
cd /var/www/filmflex
npm run db:migrate
```

### SSL Certificate Renewal
```bash
# Check certificate expiration
sudo certbot certificates

# Manual renewal
sudo certbot renew
```

### Backup Management
```bash
# List backups
ls -la /var/backups/filmflex/

# Manual backup
./deploy.sh --skip-build --skip-migrations

# Restore from backup
./deploy.sh --rollback
```

## 🚨 Emergency Procedures

### Application Down
```bash
# Quick restart
pm2 restart filmflex

# Full redeployment
./deploy.sh --skip-backup

# Rollback to previous version
./deploy.sh --rollback
```

### Database Issues
```bash
# Check database status
sudo systemctl status postgresql

# Restart database
sudo systemctl restart postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### Server Resources Exhausted
```bash
# Clear PM2 logs
pm2 flush

# Clear application logs
rm -f /var/www/filmflex/logs/*.log

# Clean old backups
find /var/backups/filmflex/ -name "backup_*" -mtime +7 -delete
```

## 📊 Monitoring Setup

The deployment script automatically sets up:
- PM2 process monitoring
- Log rotation
- System health monitoring (cron job every 5 minutes)
- Automatic application restart on failures

### Monitor Logs
```bash
# Application logs
pm2 logs filmflex

# Deployment logs
tail -f /var/log/filmflex-deploy.log

# System monitoring logs
tail -f /var/log/filmflex-monitor.log
```

## 🔐 Security Best Practices

1. **Environment Variables**: Store sensitive data in `.env` files with restricted permissions (600)
2. **Firewall**: Only allow necessary ports (80, 443, SSH)
3. **SSL**: Enable HTTPS with automatic certificate renewal
4. **Updates**: Keep Node.js, npm, and system packages updated
5. **Monitoring**: Set up log monitoring and alerting

## 📞 Support

If you encounter issues:
1. Check the deployment logs: `/var/log/filmflex-deploy.log`
2. Review application logs: `pm2 logs filmflex`
3. Run health check: `./deploy.sh --health-check`
4. Use dry-run mode to debug: `./deploy.sh --dry-run`

---

**Note**: This deployment script is specifically optimized for your Film Flex application with ESM/TypeScript support and includes automatic fixes for common production deployment issues.