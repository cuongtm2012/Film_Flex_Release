# FilmFlex Deployment Script

This folder contains scripts for managing the FilmFlex application deployment.

## Deployment Script

The `deploy.sh` script is a comprehensive tool for updating the production environment with the latest changes from the repository.

### Usage on Production Server

1. Make sure your local changes are committed and pushed to the repository
2. Connect to the production server
3. Navigate to the FilmFlex directory
4. Run the deployment script:

```bash
cd /var/www/filmflex
./scripts/deployment/deploy.sh
```

### What the Script Does

The script performs the following steps automatically:

1. Pulls the latest code from the Git repository
2. Installs any new dependencies
3. Builds the application with the latest changes
4. Sets the correct file permissions for the web server
5. Clears any caches
6. Restarts the application using PM2
7. Verifies the application status

### Troubleshooting

If you still don't see your changes after running the script:

1. Check the PM2 logs for errors: `pm2 logs filmflex`
2. Verify Nginx configuration: `nginx -t` and restart if needed: `systemctl restart nginx`
3. Clear your browser cache or try an incognito/private window
4. If needed, perform a complete restart: `pm2 stop filmflex && pm2 start filmflex`