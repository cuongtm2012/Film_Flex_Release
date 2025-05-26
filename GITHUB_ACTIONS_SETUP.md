# GitHub Actions Deployment Setup Guide for FilmFlex

## Overview
This guide will help you set up automated deployment using GitHub Actions to deploy your FilmFlex application to the production server (38.54.115.156).

## Prerequisites
- GitHub repository with admin access
- Production server access (38.54.115.156)
- SSH credentials for the server

## Step 1: Set Up GitHub Secrets

Your GitHub Actions workflow requires these secrets to be configured in your repository:

### Required Secrets:
- `SERVER_IP`: 38.54.115.156
- `SERVER_USER`: root
- `SSH_PASSWORD`: Your server SSH password

### How to Add Secrets:

1. **Go to your GitHub repository**
2. **Click on "Settings" tab**
3. **In the left sidebar, click "Secrets and variables"**
4. **Click "Actions"**
5. **Click "New repository secret"**
6. **Add each secret one by one:**

   **Secret 1:**
   - Name: `SERVER_IP`
   - Value: `38.54.115.156`

   **Secret 2:**
   - Name: `SERVER_USER`
   - Value: `root`

   **Secret 3:**
   - Name: `SSH_PASSWORD`
   - Value: `[Your server SSH password]`

## Step 2: Verify Workflow Configuration

The workflow file is located at: `.github/workflows/filmflex-deploy.yml`

✅ **Already configured:**
- Triggers on pushes to `Production` branch
- Supports manual workflow dispatch
- Has three deployment modes: standard, full-rebuild, db-fix-only

## Step 3: Deploy Using GitHub Actions

### Option A: Automatic Deployment (Recommended)
Since you already have commits on the Production branch, the workflow should trigger automatically:

1. **Check workflow status:**
   - Go to GitHub repository
   - Click "Actions" tab
   - Look for "FilmFlex Full Deployment" workflow
   - Check if it's running or completed

### Option B: Manual Deployment
If you want to trigger deployment manually:

1. **Go to GitHub repository**
2. **Click "Actions" tab**
3. **Click "FilmFlex Full Deployment" in the left sidebar**
4. **Click "Run workflow" button (top right)**
5. **Select options:**
   - Branch: `Production`
   - Deploy mode: `standard` (recommended for normal deployments)
6. **Click "Run workflow"**

### Deployment Modes:
- **standard**: Normal deployment with build and deploy
- **full-rebuild**: Complete rebuild, clears previous files
- **db-fix-only**: Only applies database fixes

## Step 4: Monitor Deployment

1. **Check workflow progress:**
   - In Actions tab, click on the running workflow
   - Monitor each step: Build → Test → Deploy → Verify

2. **Expected duration:** 5-10 minutes

3. **Check deployment logs:**
   - Each step shows detailed logs
   - Look for any errors in red

## Step 5: Verify Deployment Success

After deployment completes, test the endpoints:

### Test Commands (Run in PowerShell):
```powershell
# Test server health
Invoke-RestMethod -Uri "http://38.54.115.156:5000/api/health"

# Test recommended movies endpoint (the one we fixed)
Invoke-RestMethod -Uri "http://38.54.115.156:5000/api/movies/recommended?page=1&limit=5"
```

### Expected Results:
- Health endpoint: Should return server status
- Recommended movies: Should return movie data (not error message)

## Troubleshooting

### If Workflow Fails:
1. **Check secrets are correctly set**
2. **Verify server is accessible**
3. **Check workflow logs for specific errors**

### If Deployment Succeeds but API Still Fails:
1. **Check server logs:** SSH to server and check `/var/log/filmflex/`
2. **Restart PM2:** `pm2 restart filmflex`
3. **Verify database connection**

### Common Issues:
- **SSH connection failed**: Check SSH_PASSWORD secret
- **Build failed**: Check for code compilation errors
- **PM2 not starting**: Check server resources and logs

## Current Status
- ✅ Workflow updated to support Production branch
- ✅ Commits pushed to Production branch  
- 🔄 Ready for deployment once secrets are configured

## Next Steps
1. **Add the three GitHub secrets** (most important)
2. **Go to Actions tab and monitor workflow**
3. **Test endpoints after deployment**

---
**Need Help?** 
- Check workflow logs in GitHub Actions
- Test server connectivity with PowerShell commands above
- Review deployment logs on the server at `/var/log/filmflex/`
