# GitHub Actions Auto-Deployment Setup

Quick reference guide for setting up auto-deployment.

## Quick Setup (5 minutes)

### 1. Add GitHub Secrets

Go to: **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

```
SERVER_HOST = 38.54.14.154
SERVER_USER = root
SSH_PASSWORD = Cuongtm2012$
```

### 2. Push Workflow File

```bash
git add .github/workflows/auto-deploy-production.yml
git commit -m "feat: add auto-deployment workflow"
git push origin main
```

### 3. Verify

- Go to **Actions** tab
- See workflow run
- Check deployment success

## Usage

### Auto Deploy
- Merge code to `main` → Auto deploy

### Manual Deploy
1. **Actions** tab
2. **Auto Deploy to Production**
3. **Run workflow**
4. Select options
5. **Run workflow**

## Monitor

```bash
# SSH to server
ssh root@38.54.14.154

# Check logs
tail -f /var/log/filmflex/github-deploy-*.log

# Check containers
docker ps | grep filmflex

# Check health
curl http://localhost:5000/api/health
```

## Troubleshoot

### SSH Failed
```bash
# Test SSH
ssh root@38.54.14.154 'echo "OK"'
```

### Build Failed
```bash
# Test locally
npm ci && npm run build
```

### Health Check Failed
```bash
# Check logs
ssh root@38.54.14.154 'docker logs filmflex-app --tail 50'
```

## Rollback

```bash
ssh root@38.54.14.154
cd ~/Film_Flex_Release
git checkout <previous-commit>
./scripts/deployment/deploy-production.sh --app-only
```

---

For detailed guide, see: [GITHUB_ACTIONS_DEPLOYMENT.md](GITHUB_ACTIONS_DEPLOYMENT.md)
