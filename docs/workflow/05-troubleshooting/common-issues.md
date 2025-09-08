# 🚨 Common Issues & Troubleshooting

**Server**: 38.54.14.154 | **Last Updated**: September 8, 2025

## 🔍 **Quick Diagnostics**

### **Health Check Commands**
```bash
# Application status
curl http://localhost:5000/api/health

# Container status
docker compose -f docker-compose.server.yml ps

# System resources
df -h && free -h

# Recent logs
docker compose -f docker-compose.server.yml logs --tail=50 app
```

## 🐛 **Common Issues**

### **1. Application Not Responding**

**Symptoms**: Website not loading, timeouts, 502 errors

**Quick Fix**:
```bash
# Restart containers
docker compose -f docker-compose.server.yml restart

# Check if ports are free
netstat -tuln | grep 5000

# Force restart if needed
docker compose -f docker-compose.server.yml down
docker compose -f docker-compose.server.yml up -d
```

**Root Cause Analysis**:
```bash
# Check application logs
docker compose -f docker-compose.server.yml logs app

# Check resource usage
docker stats

# Check disk space
df -h
```

### **2. Database Connection Issues**

**Symptoms**: "Database connection failed", empty movie lists

**Quick Fix**:
```bash
# Test database connection
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT 1;"

# Restart database
docker compose -f docker-compose.server.yml restart postgres

# Reset database if corrupted
docker compose -f docker-compose.server.yml down -v
docker compose -f docker-compose.server.yml up -d
```

**Data Recovery**:
```bash
# Restore from latest backup
ls -la ~/Film_Flex_Release/backups/
gunzip < ~/Film_Flex_Release/backups/filmflex-backup-latest.sql.gz | \
docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex
```

### **3. Movie Import Failures**

**Symptoms**: No new movies, import scripts failing

**Quick Fix**:
```bash
# Manual import test
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --single-page --page-num=1 --page-size=5

# Check import logs
tail -f ~/Film_Flex_Release/logs/cron-daily-$(date +%Y%m%d).log

# Reset import system
bash ~/Film_Flex_Release/scripts/cron/daily-import.sh
```

**Debug Import Issues**:
```bash
# Test API connectivity
curl -I https://api.themoviedb.org/3/movie/popular

# Check database permissions
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "\du"

# Verify table structure
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "\d movies"
```

### **4. Static Files Not Loading**

**Symptoms**: No CSS/JS, broken styling, blank pages

**Quick Fix**:
```bash
# Check static files exist
ls -la ~/Film_Flex_Release/client/dist/
docker compose -f docker-compose.server.yml exec app ls -la /app/dist/public/

# Rebuild static files
cd ~/Film_Flex_Release
npm run build
docker compose -f docker-compose.server.yml restart app
```

### **5. High Memory/CPU Usage**

**Symptoms**: Slow response, server unresponsive

**Immediate Actions**:
```bash
# Check resource usage
docker stats
htop

# Restart application
docker compose -f docker-compose.server.yml restart app

# Clean up system
docker system prune -f
find ~/Film_Flex_Release/logs -name "*.log" -mtime +7 -delete
```

### **6. SSL/HTTPS Issues**

**Symptoms**: Certificate errors, HTTP instead of HTTPS

**Fix**:
```bash
# Check nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Check certificate status
openssl x509 -in /etc/letsencrypt/live/phimgg.com/fullchain.pem -text -noout
```

## 🔧 **Advanced Troubleshooting**

### **Container Issues**

**Container Won't Start**:
```bash
# Check Docker daemon
systemctl status docker

# View container logs
docker compose -f docker-compose.server.yml logs postgres
docker compose -f docker-compose.server.yml logs app

# Rebuild containers
docker compose -f docker-compose.server.yml build --no-cache
docker compose -f docker-compose.server.yml up -d
```

**Port Conflicts**:
```bash
# Check what's using port 5000
lsof -i :5000
netstat -tuln | grep 5000

# Kill conflicting processes
sudo killall -9 node
sudo pkill -f filmflex
```

### **Database Issues**

**Database Corruption**:
```bash
# Check database integrity
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "VACUUM FULL; REINDEX DATABASE filmflex;"

# Restore from backup if needed
docker compose -f docker-compose.server.yml down -v
docker volume create filmflex_postgres_data
docker compose -f docker-compose.server.yml up -d postgres
# Wait for startup, then restore backup
```

**Slow Queries**:
```bash
# Check active queries
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Optimize database
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "VACUUM ANALYZE; REINDEX DATABASE filmflex;"
```

### **Build/Deployment Issues**

**TypeScript Compilation Errors**:
```bash
# Clean build
rm -rf node_modules dist
npm install
npm run build

# Alternative build
npx esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js
```

**ES Module Import Errors**:
```bash
# Check for missing .js extensions in imports
grep -r "from ['\"]\./" server/ --include="*.ts"

# Run import fix script (if available)
bash scripts/deployment/fix-esm-imports.sh
```

## 📊 **Performance Troubleshooting**

### **Slow Page Load**
```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000

# Check database query performance
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Optimize static file serving
# Ensure nginx is properly configured for static files
```

### **High Database Load**
```bash
# Check active connections
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT query, mean_time FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC;"
```

## 🚨 **Emergency Procedures**

### **Complete System Recovery**
```bash
# 1. Stop everything
docker compose -f docker-compose.server.yml down

# 2. Clean Docker system
docker system prune -a -f
docker volume prune -f

# 3. Restore from backup
cd ~/Film_Flex_Release
git reset --hard HEAD
git pull origin main

# 4. Redeploy
./setup-server-automation.sh
```

### **Data Recovery**
```bash
# List available backups
ls -la ~/Film_Flex_Release/backups/

# Restore latest backup
gunzip < ~/Film_Flex_Release/backups/filmflex-backup-$(date +%Y%m%d)*.sql.gz | \
docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex
```

### **Rollback Deployment**
```bash
# Revert to previous Docker image
docker compose -f docker-compose.server.yml down
docker image rm filmflex_release_app:latest
git checkout HEAD~1
docker compose -f docker-compose.server.yml up -d
```

## 📝 **Logging & Monitoring**

### **Critical Log Locations**
```bash
# Application logs
docker compose -f docker-compose.server.yml logs -f app

# Automation logs
tail -f ~/Film_Flex_Release/logs/health-check-$(date +%Y%m%d).log

# System logs
journalctl -u docker -f
tail -f /var/log/syslog
```

### **Log Analysis**
```bash
# Search for errors
docker compose -f docker-compose.server.yml logs app 2>&1 | grep -i error

# Count error types
docker compose -f docker-compose.server.yml logs app 2>&1 | grep -i "error\|fail\|exception" | sort | uniq -c

# Monitor real-time issues
docker compose -f docker-compose.server.yml logs -f app | grep -E "(error|fail|exception|timeout)"
```

## 🔄 **Preventive Measures**

### **Regular Health Checks**
```bash
# Set up monitoring script
echo "0 */6 * * * bash ~/Film_Flex_Release/scripts/cron/health-check.sh" | crontab -

# Manual health verification
bash ~/Film_Flex_Release/scripts/cron/health-check.sh
```

### **Resource Monitoring**
```bash
# Disk space alerts
df -h | awk '$5 > 80 {print $0}' # Alert if >80% full

# Memory monitoring
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'
```

## 📞 **Getting Help**

### **Information to Collect**
Before seeking help, gather:
```bash
# System information
uname -a
docker --version
docker compose --version

# Application status
docker compose -f docker-compose.server.yml ps
curl -I http://localhost:5000

# Recent logs
docker compose -f docker-compose.server.yml logs --tail=100 app > app-logs.txt
tail -50 ~/Film_Flex_Release/logs/health-check-$(date +%Y%m%d).log

# Resource usage
df -h
free -h
docker stats --no-stream
```

### **Quick Recovery Checklist**
1. ✅ Try container restart first
2. ✅ Check disk space and memory
3. ✅ Review recent logs for errors
4. ✅ Test database connectivity
5. ✅ Verify automation is running
6. ✅ Consider full redeployment if needed

**Next Steps**: [Quick Start Guide](../01-setup/quick-start.md) | [Maintenance Tasks](../04-maintenance/maintenance-tasks.md)