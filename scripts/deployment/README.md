# FilmFlex Deployment Script

This folder contains scripts for managing the FilmFlex application deployment.

## Deployment Script

The `deploy.sh` script is a comprehensive tool for updating the production environment with the latest changes from the source code repository.

### Server Setup

This script is designed for a specific deployment scenario:
- Source code is in `~/Film_Flex_Release` (Git repository)
- Production deployment is in `/var/www/filmflex` (Live website)

### Usage on Production Server

1. Make sure your local changes are committed and pushed to the repository
2. Connect to the production server
3. Run the deployment script:

```bash
cd ~/Film_Flex_Release
git pull  # Pull latest changes including this script
chmod +x scripts/deployment/deploy.sh
./scripts/deployment/deploy.sh
```

### What the Script Does

The script performs the following steps automatically:

1. Updates the source code in `~/Film_Flex_Release`
2. Builds the application in the source directory
3. Creates a backup of critical files in the production directory
4. Copies the built application and server files to `/var/www/filmflex`
5. Preserves important data like log files and import progress
6. Sets the correct file permissions
7. Installs production dependencies
8. Restarts the application using PM2
9. Verifies the application status

### Important Notes

- The script preserves the existing `.env` file in the production directory
- It also preserves the `scripts/data` directory which contains import progress
- Logs and other critical data are backed up before deployment

### Troubleshooting

If you still don't see your changes after running the script:

1. Check the PM2 logs for errors: `pm2 logs filmflex`
2. Verify Nginx configuration: `nginx -t` and restart if needed: `systemctl restart nginx`
3. Check for errors in the deployment process: `tail -100 /var/log/filmflex/deployment.log`
4. Clear your browser cache or try an incognito/private window
5. If needed, perform a complete restart: `pm2 stop filmflex && pm2 start filmflex`