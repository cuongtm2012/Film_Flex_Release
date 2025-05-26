# Linux Server Commands for FilmFlex Deployment

## SSH into your server
```bash
ssh root@38.54.115.156
```

## 1. Check Current Server Status
```bash
# Check if the application is running
pm2 status

# Check server health
curl -s http://localhost:5000/api/health

# Test the broken recommended movies endpoint (should fail)
curl -s http://localhost:5000/api/movies/recommended?page=1&limit=5
```

## 2. Navigate to Project Directory
```bash
cd /root/Film_Flex_Release
```

## 3. Check Current Git Status
```bash
# Check current branch and commits
git status
git log --oneline -5

# Check which branch you're on
git branch
```

## 4. Pull Latest Changes (if needed)
```bash
# Make sure you're on the correct branch
git checkout Production

# Pull the latest changes with our fixes
git pull origin Production
```

## 5. Manual Deployment Option
```bash
# Navigate to deployment scripts
cd /root/Film_Flex_Release/scripts/deployment

# Make script executable
chmod +x final-deploy.sh

# Run the deployment script
./final-deploy.sh
```

## 6. Alternative: Quick Manual Steps
```bash
# Navigate back to project root
cd /root/Film_Flex_Release

# Install dependencies
npm ci

# Build the project
npm run build

# Stop current application
pm2 stop filmflex

# Start the application with new code
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

## 7. Verify Deployment Success
```bash
# Check PM2 status
pm2 status

# Test health endpoint
curl -s http://localhost:5000/api/health

# Test the FIXED recommended movies endpoint
curl -s http://localhost:5000/api/movies/recommended?page=1&limit=5

# Check application logs
pm2 logs filmflex --lines 50
```

## 8. If Database Issues Exist
```bash
# Connect to PostgreSQL
psql -h localhost -U filmflex -d filmflex

# Inside PostgreSQL, check tables
\dt

# Exit PostgreSQL
\q

# Run database reset if needed (CAUTION: This will reset all data)
cd /root/Film_Flex_Release/scripts/data
chmod +x reset-film-database.sh
./reset-film-database.sh
```

## 9. Check Network and Ports
```bash
# Check if port 5000 is listening
netstat -tulpn | grep :5000

# Check system resources
free -h
df -h
```

## 10. Troubleshooting Commands
```bash
# Check system logs
journalctl -f

# Check nginx status (if using reverse proxy)
systemctl status nginx

# Restart nginx if needed
systemctl restart nginx

# Check firewall status
ufw status

# Check if port 5000 is accessible externally
netstat -an | grep :5000
```

## Expected Results After Deployment:

### ✅ Health Check Should Return:
```json
{
  "status": "ok",
  "uptime": 123456,
  "environment": "production"
}
```

### ✅ Recommended Movies Should Return:
```json
{
  "items": [
    {
      "id": 1,
      "title": "Movie Title",
      "slug": "movie-slug",
      "description": "Movie description"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50
  }
}
```

## Quick Test Script
Save this as `test-deployment.sh`:
```bash
#!/bin/bash
echo "=== FilmFlex Deployment Test ==="
echo "1. Testing Health Endpoint..."
curl -s http://localhost:5000/api/health | jq .

echo -e "\n2. Testing Recommended Movies..."
curl -s http://localhost:5000/api/movies/recommended?page=1&limit=5 | jq .

echo -e "\n3. PM2 Status..."
pm2 status

echo -e "\n4. Recent Logs..."
pm2 logs filmflex --lines 10 --nostream
```

Run with:
```bash
chmod +x test-deployment.sh
./test-deployment.sh
```
