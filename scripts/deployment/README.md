# FilmFlex Deployment Scripts

This folder contains essential scripts for managing the FilmFlex application deployment process.

## Available Scripts

| Script | Description |
|--------|-------------|
| `final-deploy.sh` | **RECOMMENDED**: All-in-one deployment script that fixes database schema issues directly, deploys the application, and copies import scripts to production |
| `filmflex-server.cjs` | Production server using CommonJS format for compatibility |
| `push-to-github.sh` | Script to push changes to GitHub repository |

> **Note:** The database fixes are now integrated directly into `final-deploy.sh`, so separate fix scripts are no longer needed.

## Server Setup

These scripts are designed for a specific deployment scenario:
- Source code is in `~/Film_Flex_Release` (Git repository)
- Production deployment is in `/var/www/filmflex` (Live website)
- Domain configured with Nginx at `phimgg.com`

## Usage on Production Server

### Standard Deployment (Recommended)

```bash
cd ~/Film_Flex_Release
git pull  # Pull latest changes
chmod +x scripts/deployment/final-deploy.sh
sudo ./scripts/deployment/final-deploy.sh
```

### Database Fixes

```bash
# Database fixes are now integrated into the deployment script!
# Simply run the deployment script again to fix database issues:
cd ~/Film_Flex_Release
chmod +x scripts/deployment/final-deploy.sh
sudo ./scripts/deployment/final-deploy.sh
```

### Movie Data Import

```bash
cd /var/www/filmflex/scripts/data
# For daily import (new movies only):
./import-movies.sh
# For full import (can be resumed if interrupted):
./import-all-movies-resumable.sh
# To set up automatic daily imports:
sudo ./setup-cron.sh
```

## What the Deployment Script Does

The deployment scripts perform these key steps:

1. Fix database schema issues (adds missing columns)
2. Stop any existing PM2 processes
3. Properly configure package.json and environment
4. Copy production server files to `/var/www/filmflex`
5. Copy data import and database fix scripts
6. Install required dependencies
7. Start the server with PM2
8. Verify the application status
9. Reload Nginx configuration

## Troubleshooting

If you encounter issues after deployment:

### Database Issues
1. Run the deployment script again to fix schema issues: `sudo ./scripts/deployment/final-deploy.sh`
2. Verify database connection: `psql -U filmflex -d filmflex -c "SELECT NOW();"`
3. Check database structure: `psql -U filmflex -d filmflex -c "\d movies"`

### Server Issues
1. Check PM2 logs: `pm2 logs filmflex`
2. Verify server is running: `curl http://localhost:5000/api/health`
3. Restart the server if needed: `pm2 restart filmflex`
4. Check for port conflicts: `netstat -tuln | grep 5000`

### Nginx Issues
1. Check Nginx configuration: `nginx -t`
2. Restart Nginx if needed: `systemctl restart nginx`
3. Check Nginx logs: `tail -f /var/log/nginx/error.log`

### Data Import Issues
1. Check import logs: `tail -f /var/log/filmflex/import.log`
2. Verify API access: `curl -s "https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1" | head -20`
3. Check if axios is installed: `cd /var/www/filmflex && npm list axios`

## Running the Server Manually

If all automated methods fail, you can run the server directly:

```bash
cd /var/www/filmflex
export NODE_ENV=production
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node filmflex-server.cjs
```