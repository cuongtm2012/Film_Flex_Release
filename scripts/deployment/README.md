# FilmFlex Deployment Scripts

This folder contains scripts for managing the FilmFlex application deployment process.

## Available Scripts

| Script | Description |
|--------|-------------|
| `final-deploy.sh` | **RECOMMENDED**: Latest deployment script that fixes ES module compatibility issues |
| `check-deploy.sh` | Diagnoses server issues and provides troubleshooting information |
| `deploy.sh` | Standard deployment script (use `final-deploy.sh` instead) |
| `filmflex-server.cjs` | Production server using CommonJS format |

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
chmod +x scripts/deployment/final-deploy.sh scripts/deployment/frontend-build.sh
sudo ./scripts/deployment/final-deploy.sh
sudo ./scripts/deployment/frontend-build.sh
```

### Diagnostic and Troubleshooting

```bash
cd ~/Film_Flex_Release
chmod +x scripts/deployment/check-deploy.sh
./scripts/deployment/check-deploy.sh
```

## What the Deployment Script Does

The deployment scripts perform these key steps:

1. Stop any existing PM2 processes
2. Properly configure package.json and environment
3. Copy production server files to `/var/www/filmflex`
4. Install required dependencies
5. Start the server with PM2
6. Verify the application status
7. Reload Nginx configuration

## Troubleshooting

If you encounter issues after deployment:

1. Run the diagnostic script: `./scripts/deployment/check-deploy.sh`
2. Check PM2 logs: `pm2 logs filmflex`
3. Verify server is running: `curl http://localhost:5000/api/health`
4. Check Nginx configuration: `nginx -t`
5. Restart Nginx if needed: `systemctl restart nginx`
6. Clear browser cache or try in incognito mode

## Running the Server Manually

If all automated methods fail, you can run the server directly:

```bash
cd /var/www/filmflex
export NODE_ENV=production
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node filmflex-server.cjs
```