# Quick Debug Commands for Deployment Failure

## 🚨 Container Not Running After Deployment

### Step 1: Check Deployment Logs

```bash
ssh root@38.54.14.154

# View latest deployment log
tail -100 $(ls -t /var/log/filmflex/github-deploy-*.log | head -1)
```

### Step 2: Check Container Status

```bash
# Check all filmflex containers
docker ps -a | grep filmflex

# If filmflex-app exists but stopped, check why
docker logs filmflex-app --tail 100

# If filmflex-app doesn't exist, check images
docker images | grep filmflex
```

### Step 3: Manual Container Start

```bash
cd ~/Film_Flex_Release

# Try to start container
docker compose -f docker-compose.server.yml up -d app

# Watch logs in real-time
docker logs filmflex-app -f
```

### Step 4: If Container Keeps Crashing

```bash
# Check build artifacts
ls -la ~/Film_Flex_Release/dist/

# Rebuild if needed
cd ~/Film_Flex_Release
npm ci
npm run build

# Force rebuild Docker image
docker compose -f docker-compose.server.yml build --no-cache app

# Start with logs
docker compose -f docker-compose.server.yml up app
```

### Step 5: Check Common Issues

```bash
# Port conflict?
netstat -tlnp | grep 5000

# Environment variables?
cat ~/Film_Flex_Release/.env.production

# Docker compose config valid?
docker compose -f ~/Film_Flex_Release/docker-compose.server.yml config
```

## 🔧 Quick Fix

```bash
# One-liner to restart everything
ssh root@38.54.14.154 'cd ~/Film_Flex_Release && docker compose -f docker-compose.server.yml down && docker compose -f docker-compose.server.yml up -d app && docker logs filmflex-app --tail 50'
```

## 📊 Share These Outputs

Please run and share:

```bash
ssh root@38.54.14.154 << 'EOF'
echo "=== Deployment Log ==="
tail -50 $(ls -t /var/log/filmflex/github-deploy-*.log | head -1)

echo -e "\n=== Container Status ==="
docker ps -a | grep filmflex

echo -e "\n=== Container Logs (if exists) ==="
docker logs filmflex-app --tail 50 2>&1 || echo "Container not found"

echo -e "\n=== Build Artifacts ==="
ls -la ~/Film_Flex_Release/dist/ 2>&1 || echo "Dist not found"

echo -e "\n=== Docker Images ==="
docker images | grep filmflex
EOF
```
