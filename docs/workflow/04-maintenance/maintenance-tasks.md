# 🛠️ Maintenance Tasks

**Server**: 38.54.14.154 | **Status**: Automated | **Last Updated**: September 8, 2025

## 🔄 **Automated Maintenance (Already Running)**

Your PhimGG server runs these tasks automatically:

### **Daily Tasks (2:00 AM)**
- 🎬 Import ~150 latest movies
- 💾 Database backup (compressed)
- 🧹 Clean old logs (30+ days)

### **Weekly Tasks (Saturday 3:00 AM)**
- 🔍 Deep scan import (~500 movies)
- 🗄️ Database maintenance (VACUUM ANALYZE)
- 📊 Performance optimization

### **Every 30 Minutes**
- ❤️ Health check & auto-restart
- 💾 Disk space monitoring
- 🖥️ Memory usage check

## 📋 **Manual Maintenance Tasks**

### **Movie Data Management**
```bash
# Import latest movies manually
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --max-pages=3

# Check movie count
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"

# Full movie import (resumable)
bash ~/Film_Flex_Release/scripts/data/import-all-movies-resumable.sh
```

### **Database Maintenance**
```bash
# Manual backup
docker compose -f docker-compose.server.yml exec postgres pg_dump -U filmflex filmflex | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < backup-20250908.sql.gz | docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex

# Database health check
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT version(); SELECT NOW();"
```

### **Application Maintenance**
```bash
# Check application status
docker compose -f docker-compose.server.yml ps

# View application logs
docker compose -f docker-compose.server.yml logs -f app

# Restart application
docker compose -f docker-compose.server.yml restart app

# Update application
git pull origin main
docker compose -f docker-compose.server.yml build --no-cache
docker compose -f docker-compose.server.yml up -d
```

### **System Maintenance**
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check system load
htop

# Clean Docker system
docker system prune -f

# Check automation logs
ls -la ~/Film_Flex_Release/logs/
tail -f ~/Film_Flex_Release/logs/cron-daily-$(date +%Y%m%d).log
```

## 🗂️ **Log Management**

### **Log Locations**
```bash
# Automation logs
~/Film_Flex_Release/logs/cron-daily-*.log      # Daily import logs
~/Film_Flex_Release/logs/cron-weekly-*.log     # Weekly scan logs  
~/Film_Flex_Release/logs/health-check-*.log    # Health monitoring
~/Film_Flex_Release/logs/backup-*.log          # Database backups

# Application logs
docker compose -f docker-compose.server.yml logs app

# System logs
/var/log/syslog
/var/log/nginx/error.log
```

### **Log Cleanup**
```bash
# Clean old automation logs (30+ days)
find ~/Film_Flex_Release/logs -name "*.log" -mtime +30 -delete

# Clean Docker logs
docker system prune -f

# Rotate application logs
docker compose -f docker-compose.server.yml exec app truncate -s 0 /app/logs/*.log
```

## 💾 **Backup Management**

### **Automated Backups**
- **Daily**: Database backup at 1:00 AM
- **Location**: `~/Film_Flex_Release/backups/`
- **Retention**: 30 days
- **Format**: Compressed SQL (.gz)

### **Manual Backup**
```bash
# Create full backup
bash ~/Film_Flex_Release/scripts/cron/database-backup.sh

# List backups
ls -la ~/Film_Flex_Release/backups/

# Backup application files
tar -czf filmflex-app-backup-$(date +%Y%m%d).tar.gz ~/Film_Flex_Release
```

### **Restore Procedures**
```bash
# Restore database from backup
gunzip < ~/Film_Flex_Release/backups/filmflex-backup-20250908-120000.sql.gz | \
docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex

# Restore application files
tar -xzf filmflex-app-backup-20250908.tar.gz -C ~/
```

## 🔧 **Configuration Updates**

### **Environment Variables**
```bash
# Edit Docker Compose environment
nano docker-compose.server.yml

# Restart to apply changes
docker compose -f docker-compose.server.yml up -d
```

### **Cron Job Management**
```bash
# View current cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Check cron service
systemctl status cron
```

### **Database Configuration**
```bash
# PostgreSQL configuration
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex

# Check database settings
SHOW all;

# Performance tuning
VACUUM ANALYZE;
REINDEX DATABASE filmflex;
```

## 📊 **Performance Monitoring**

### **Application Performance**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000

# Monitor connections
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT * FROM pg_stat_activity;"
```

### **Resource Usage**
```bash
# Container stats
docker stats

# System resources
htop
iostat 1 5
```

## 🚨 **Monitoring & Alerts**

### **Health Check Script**
```bash
# Run manual health check
bash ~/Film_Flex_Release/scripts/cron/health-check.sh

# View health check logs
tail -f ~/Film_Flex_Release/logs/health-check-$(date +%Y%m%d).log
```

### **Critical Monitoring Points**
- 🔴 **Application Down**: Auto-restart attempts
- 🟡 **High Memory**: >80% usage logged
- 🟡 **High Disk**: >85% triggers cleanup
- 🟢 **Normal Operation**: Health checks passing

## 🔄 **Update Procedures**

### **Application Updates**
```bash
# 1. Pull latest code
cd ~/Film_Flex_Release
git pull origin main

# 2. Backup current state
bash ~/Film_Flex_Release/scripts/cron/database-backup.sh

# 3. Deploy update
docker compose -f docker-compose.server.yml build --no-cache
docker compose -f docker-compose.server.yml up -d

# 4. Verify update
curl http://localhost:5000/api/health
```

### **System Updates**
```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Update Node.js (if needed)
sudo npm install -g npm@latest
```

## 📅 **Maintenance Schedule**

### **Daily** (Automated)
- Movie imports
- Database backups
- Log cleanup

### **Weekly** (Automated)
- Deep movie scan
- Database optimization
- System cleanup

### **Monthly** (Manual)
- Review application logs
- Check system updates
- Verify backup integrity
- Performance optimization

### **Quarterly** (Manual)
- Security updates
- Dependency updates
- Configuration review
- Disaster recovery test

**Next Steps**: [Troubleshooting Guide](../05-troubleshooting/common-issues.md) | [Development Workflow](../02-development/development-workflow.md)