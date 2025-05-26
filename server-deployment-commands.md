# FilmFlex Server Deployment Commands

## SSH Connection
```bash
ssh root@38.54.115.156
# Password: Cuongtm2012$
```

## Once Connected to Server

### 1. Navigate to your project directory
```bash
cd ~/Film_Flex_Release
```

### 2. Check if deployment script exists
```bash
ls -la deploy-production.sh
```

### 3. Make the script executable
```bash
chmod +x deploy-production.sh
```

### 4. Run the deployment
```bash
sudo ./deploy-production.sh
```

### 5. Monitor the deployment progress
The script will show colored output indicating:
- ✅ Successful steps
- ⚠️ Warnings
- ❌ Errors
- 🚀 Current progress

### 6. Verify deployment after completion
```bash
# Check if application is running
curl http://localhost:5000/api/health

# Check PM2 status
pm2 status

# Check logs if needed
pm2 logs filmflex

# Check database connection
psql -h localhost -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"
```

## Expected Deployment Time
- Database setup: 2-3 minutes
- Application deployment: 3-5 minutes
- Initial data import: 5-10 minutes
- **Total: 10-20 minutes**

## After Successful Deployment
Your FilmFlex application will be accessible at:
- **Main site:** http://38.54.115.156
- **Admin panel:** http://38.54.115.156/admin
- **API:** http://38.54.115.156/api
- **Health check:** http://38.54.115.156/api/health

## Troubleshooting Commands
If you encounter issues:

```bash
# Check system resources
df -h
free -h

# Check services
systemctl status nginx
systemctl status postgresql

# Restart services if needed
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Check deployment logs
tail -f /var/log/filmflex/deployment-*.log

# Manual server restart
pm2 restart filmflex
```

## Post-Deployment Management
```bash
# Start/Stop/Restart application
pm2 start filmflex
pm2 stop filmflex
pm2 restart filmflex

# View real-time logs
pm2 logs filmflex --lines 50

# Check application status
pm2 monit

# Backup database
pg_dump -h localhost -U filmflex filmflex > backup_$(date +%Y%m%d).sql
```
