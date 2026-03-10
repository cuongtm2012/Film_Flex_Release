# PhimGG GitHub Workflows

This document provides an overview of all the GitHub Actions workflows available for the PhimGG application.

## Available Workflows

### 1. `filmflex-deploy.yml`

**Purpose:** Main deployment workflow for PhimGG

**Triggers:**
- Push to `main` branch (except for `.md` and `.gitignore` files)
- Manual trigger via GitHub Actions UI

**Features:**
- Builds and tests the application
- Uploads necessary files to the production server
- Runs the comprehensive deployment script
- Verifies the deployment
- Sends a notification upon completion

**Deployment Modes:**
- `standard` (default): Regular deployment with no special options
- `full-rebuild`: Completely rebuilds the deployment directory from scratch
- `db-fix-only`: Only runs the database schema fix script without deploying the application

### 2. `filmflex-data-maintenance.yml`

**Purpose:** Keeps the movie database up-to-date

**Triggers:**
- Daily scheduled run at 2:00 AM UTC
- Manual trigger via GitHub Actions UI

**Features:**
- Runs various data import scripts on the server
- Logs detailed information about the import process
- Verifies database health after import
- Implements timeout protection for long-running imports
- Sends a notification upon completion

**Import Types:**
- `daily` (default): Regular daily update of new movies
- `full-import`: Complete import of all available movies
- `resume-import`: Resumable import that continues from where it left off
- `update-existing`: Updates information for existing movies only

### 3. `filmflex-monitoring.yml`

**Purpose:** Monitors system health and performs automatic recovery

**Triggers:**
- Runs every 30 minutes
- Manual trigger via GitHub Actions UI

**Features:**
- Checks API health endpoint
- Verifies frontend accessibility
- Collects detailed system information in case of failure
- Attempts automatic recovery when issues are detected
- Sends alert notifications for system failures
- Sends recovery notifications when automatic fixes work

## Setup Requirements

All workflows require the following GitHub Secrets:

| Secret Name | Description |
|-------------|-------------|
| `SERVER_IP` | The IP address of your production server |
| `SERVER_USER` | The SSH username for your server |
| `SSH_PASSWORD` | The SSH password for your server |

# Notification support has been removed

The easiest way to set up all required secrets and variables is to use the provided helper script:

```bash
./scripts/setup-github-secrets.sh
```

## Usage Tips

### Best Practices

1. **Regular Deployments:** Use the `filmflex-deploy.yml` workflow with the `standard` mode for regular code updates.

2. **Data Maintenance:** Let the scheduled `filmflex-data-maintenance.yml` workflow run automatically for daily updates, and manually trigger full imports when needed.

3. **Monitoring:** The `filmflex-monitoring.yml` workflow will automatically check your system every 30 minutes. No manual intervention is required.

### Common Commands

To manually check server health:
```bash
# Check API health
curl http://your-server-ip:5000/api/health

# Check PM2 status
ssh user@your-server-ip "pm2 status filmflex"
```

To manually run a database fix:
```bash
ssh user@your-server-ip "cd /var/www/filmflex/scripts/deployment && ./final-deploy.sh"
```

## Troubleshooting

### Workflow Failures

If a workflow fails, check:

1. GitHub Actions logs for specific error messages
2. Server logs at `/var/log/filmflex/`
3. Verify that all required secrets are correctly set up

### Common Issues

1. **SSH Connection Failures:** Confirm your server IP, username, and password are correct.

2. **Build Errors:** Check for syntax errors or failing tests in your codebase.

3. **Database Issues:** You may need to manually run the database fix script on the server.

### Getting Help

For more detailed information, refer to:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PhimGG Deployment Guide](./GITHUB_DEPLOYMENT.md)