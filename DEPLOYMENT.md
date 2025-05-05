# FilmFlex Deployment Guide

This document provides comprehensive instructions for deploying, maintaining, and operating the FilmFlex streaming platform in a production environment.

## Prerequisites

- Linux server (Ubuntu 20.04 LTS or higher recommended)
- Root access to the server
- Domain name pointing to your server (optional but recommended)
- GitHub repository for your FilmFlex codebase

## Server Specifications

- Minimum 2 CPU cores
- 4GB RAM
- 40GB SSD storage
- PostgreSQL 13+ database

## Deployment Process

### Getting Started

1. Clone this repository to your server:
   ```bash
   git clone https://github.com/cuongtm2012/Film_Flex_R.git
   cd Film_Flex_R
   ```

2. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

3. Run the initial setup:
   ```bash
   ./deploy.sh --setup
   ```

   This script will:
   - Set up the server environment with required packages
   - Configure PostgreSQL database
   - Set up Nginx web server
   - Create systemd service for automatic startup
   - Deploy the application

### All-in-One Deployment Script

The `deploy.sh` script handles all deployment operations with a simple command-line interface:

- **Initial Setup**: Set up the server environment and deploy the application
  ```bash
  ./deploy.sh --setup
  ```

- **Deploy/Update Application**: Deploy new code or update existing installation (default action)
  ```bash
  ./deploy.sh
  ```
  or
  ```bash
  ./deploy.sh --deploy
  ```

- **Import Movies**: Start the movie import process (runs in background)
  ```bash
  ./deploy.sh --import
  ```

- **Create Database Backup**: Manually create a database backup
  ```bash
  ./deploy.sh --backup
  ```

- **Check System Status**: View system, application, and database status
  ```bash
  ./deploy.sh --status
  ```

- **View Help**: See all available options
  ```bash
  ./deploy.sh --help
  ```

## Configuration

### Environment Variables

The deployment script automatically creates a `.env` file with the following variables:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:FilmFlexPassword@localhost:5432/filmflex
SESSION_SECRET=generated-secure-secret
```

You can modify this file manually if needed.

### SSL Setup

To enable HTTPS with Let's Encrypt (after you have a domain name):

1. Connect your domain to your server's IP
2. On your server, run:
   ```bash
   certbot --nginx -d yourdomain.com
   ```

3. Then update your Nginx configuration in `/etc/nginx/sites-available/filmflex` to use the SSL configuration from `nginx/filmflex_ssl.conf` (modify domain name as needed).

## Data Management

### Movie Import

The import process runs in a background screen session and can be monitored:

```bash
# Start import
./deploy.sh --import

# Monitor import progress
tail -f /var/log/filmflex-import.log

# Attach to the import screen session
screen -r import
```

### Database Backups

Daily database backups are automatically configured. To manage backups:

```bash
# Create a manual backup
./deploy.sh --backup

# View recent backups
ls -lh /var/backups/filmflex/
```

### Database Restore

To restore from a backup, use a direct PostgreSQL command:

```bash
# First, stop the application
pm2 stop filmflex

# Restore from backup
gunzip -c /var/backups/filmflex/your-backup-file.sql.gz | sudo -u postgres psql filmflex

# Restart the application
pm2 start filmflex
```

## Monitoring and Maintenance

### System Status

Check the system, application, database, and Nginx status:

```bash
./deploy.sh --status
```

### Application Logs

View application logs:

```bash
tail -f /var/log/filmflex.log       # General application logs
tail -f /var/log/filmflex-error.log # Error logs
```

### Process Management

Manage the application using PM2:

```bash
pm2 list                # List all processes
pm2 monit               # Monitor application performance
pm2 logs filmflex       # View application logs
pm2 restart filmflex    # Restart the application
```

## CI/CD Setup

To set up continuous integration and deployment with GitHub Actions:

1. Generate SSH keys for deployment:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/filmflex_deploy_key -N "" -C "filmflex-deploy@github-actions"
   ```

2. Add the generated public key to your server's authorized_keys:
   ```bash
   cat ~/.ssh/filmflex_deploy_key.pub >> ~/.ssh/authorized_keys
   ```

3. Add the following secrets to your GitHub repository:
   - `SSH_PRIVATE_KEY`: The content of the private key file (~/.ssh/filmflex_deploy_key)
   - `SERVER_IP`: Your server's IP address
   - `SSH_USER`: Username (usually 'root')
   - `DATABASE_URL`: Your database connection string
   - `SESSION_SECRET`: Your session secret

4. The CI/CD workflow will automatically deploy changes to the main branch.

## Troubleshooting

### Application Not Starting

1. Check application logs:
   ```bash
   tail -f /var/log/filmflex.log
   tail -f /var/log/filmflex-error.log
   ```

2. Check if the port is already in use:
   ```bash
   netstat -tulpn | grep 5000
   ```

3. Verify the application process:
   ```bash
   pm2 list
   pm2 logs filmflex
   ```

### Database Connection Issues

1. Verify the database is running:
   ```bash
   systemctl status postgresql
   ```

2. Check database connection:
   ```bash
   sudo -u postgres psql -c "\l"
   ```

3. Verify database credentials match those in your `.env` file.

### Nginx Issues

1. Check Nginx configuration:
   ```bash
   nginx -t
   ```

2. View Nginx logs:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

3. Ensure Nginx is running:
   ```bash
   systemctl status nginx
   ```

## Security Considerations

- Keep your server updated with security patches
- Use strong passwords for database and admin accounts
- Use SSH keys instead of passwords for server access
- Enable firewall with minimal open ports
- Use HTTPS for all traffic
- Configure proper Content-Security-Policy headers
- Regularly review server logs for suspicious activity