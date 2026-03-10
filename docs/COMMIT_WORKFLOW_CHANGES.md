# Quick Commit Commands

## Commit Updated Workflow

```bash
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release

# Add workflow file
git add .github/workflows/auto-deploy-production.yml

# Add documentation
git add docs/GITHUB_ACTIONS_*.md
git add docs/DEPLOYMENT_DEBUG_COMMANDS.md
git add docs/ENABLE_GITHUB_ACTIONS.md

# Commit
git commit -m "fix: add --force flag to GitHub Actions deployment

- Skip git uncommitted changes check on server
- GitHub Actions provides latest code via deployment package
- Tested successfully: container starts and runs
- Improved error handling and logging
- Added container verification after deployment

Fixes deployment failure where script tried to git pull
but server had uncommitted changes."

# Push to main
git push origin main
```

## Monitor Deployment

After push, check:

1. **GitHub Actions tab** - Watch workflow run
2. **Server logs** - `ssh root@38.54.14.154 'tail -f /var/log/filmflex/github-deploy-*.log'`
3. **Container status** - `ssh root@38.54.14.154 'docker ps | grep filmflex'`
4. **Application** - `curl http://38.54.14.154:5000/api/health`

## Expected Result

✅ Workflow completes successfully  
✅ Container filmflex-app is running  
✅ Health check passes  
✅ Application accessible at http://38.54.14.154:5000
