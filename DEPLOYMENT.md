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

### Initial Setup

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/filmflex.git
   cd filmflex
   ```

2. Make the deployment scripts executable:
   ```bash
   chmod +x scripts/*.sh
   ```

3. Run the initial deployment script:
   ```bash
   ./scripts/initial-deploy.sh
   ```

   This script will:
   - Set up the server environment with required packages
   - Configure PostgreSQL database
   - Set up Nginx web server
   - Create systemd service for automatic startup
   - Deploy the application

### Continuous Deployment

For subsequent deployments after making changes to the codebase:

1. Push your changes to GitHub
2. CI/CD will automatically deploy your changes (if set up)
3. Or, run the deployment script manually:
   ```bash
   ./scripts/deploy.sh
   ```

## Configuration

### Environment Variables

Create a `.env.production` file with the following variables:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:FilmFlexPassword@localhost:5432/filmflex
SESSION_SECRET=your-secure-session-secret
```

### Database Setup

The database will be automatically set up during initial deployment. If you need to manually set it up:

```bash
./scripts/db-migration.sh
```

### SSL Setup

To enable HTTPS with Let's Encrypt (after you have a domain name):

1. Connect your domain to your server's IP
2. SSH into your server
3. Run:
   ```bash
   certbot --nginx -d yourdomain.com
   ```

## Data Import

To import movie data from the external API:

```bash
./scripts/import-data.sh
```

This will start a background process that will import all 2252 pages of movies. You can monitor progress in the log file.

## Maintenance

### Backups

Daily database backups are automatically configured. To manually create a backup:

```bash
./scripts/backup-db.sh
```

### Restoring from Backup

To restore the database from a backup:

```bash
./scripts/restore-backup.sh filmflex_20250505-123045.sql.gz
```

### Monitoring

To check the status of the application:

```bash
./scripts/status-check.sh
```

### Rollback

If you need to roll back to a previous version:

```bash
./scripts/rollback.sh commit-hash
```

## CI/CD Setup

To set up continuous integration and deployment with GitHub Actions:

1. Generate SSH keys for deployment:
   ```bash
   ./scripts/generate-ssh-key.sh
   ```

2. Add the following secrets to your GitHub repository:
   - `SSH_PRIVATE_KEY`: The private key generated in step 1
   - `SERVER_IP`: Your server's IP address
   - `SSH_USER`: Username (usually 'root')
   - `DATABASE_URL`: Your database connection string
   - `SESSION_SECRET`: Your session secret

3. Push your code to GitHub, and the CI/CD pipeline will automatically deploy changes to the main branch.

## Troubleshooting

### Application Not Starting

Check the application logs:
```bash
ssh root@your-server-ip 'tail -f /var/log/filmflex.log'
```

### Database Connection Issues

Verify the database is running:
```bash
ssh root@your-server-ip 'systemctl status postgresql'
```

Check database connection:
```bash
ssh root@your-server-ip 'sudo -u postgres psql -c "\l"'
```

### Nginx Issues

Check Nginx configuration:
```bash
ssh root@your-server-ip 'nginx -t'
```

View Nginx logs:
```bash
ssh root@your-server-ip 'tail -f /var/log/nginx/error.log'
```

## Security Considerations

- Keep your server updated with security patches
- Use strong passwords for database and admin accounts
- Use SSH keys instead of passwords for server access
- Enable firewall with minimal open ports
- Use HTTPS for all traffic