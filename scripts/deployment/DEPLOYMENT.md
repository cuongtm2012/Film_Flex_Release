# FilmFlex Deployment Guide

This document provides comprehensive instructions for deploying and maintaining the FilmFlex application on a production server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [All-in-One Deployment](#all-in-one-deployment)
- [Automated CI/CD Deployment](#automated-cicd-deployment)
- [Database Management](#database-management)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

- VPS with at least 2GB RAM (Ubuntu 22.04 LTS recommended)
- Domain name (optional but recommended)
- SSH access to the server
- Git repository with the FilmFlex application code
- PostgreSQL database

## All-in-One Deployment

FilmFlex now includes a comprehensive all-in-one deployment script (`deploy-filmflex.sh`) that handles everything from initial server setup to database migrations.

### First-Time Server Setup

1. SSH into your server
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/filmflex.git filmflex
   cd filmflex
   ```
3. Make the deployment script executable:
   ```bash
   chmod +x deploy-filmflex.sh
   ```
4. Run the setup command:
   ```bash
   ./deploy-filmflex.sh --setup
   ```

This will:
- Install all required dependencies (Node.js, PM2, PostgreSQL, Nginx, etc.)
- Configure PostgreSQL with password authentication
- Create the database user and database
- Set up application environment variables
- Configure Nginx as a reverse proxy
- Set up automatic database backups
- Deploy and start the application

### Updating Existing Installation

To update an existing installation:

```bash
# Pull latest changes
git pull

# Deploy the update
./deploy-filmflex.sh --deploy
```

### Database Setup Only

If you just need to set up or fix the database:

```bash
./deploy-filmflex.sh --db-only
```

This will:
- Configure PostgreSQL authentication to use passwords instead of peer authentication
- Create the database user and database if they don't exist
- Run database migrations to create tables

### Other Commands

```bash
# Check status of all services
./deploy-filmflex.sh --status

# Create a database backup
./deploy-filmflex.sh --backup

# Start the movie import process
./deploy-filmflex.sh --import

# Show help and available commands
./deploy-filmflex.sh --help
```

## Automated CI/CD Deployment

FilmFlex supports automated deployment through GitHub Actions:

### Setting up GitHub Secrets

For CI/CD to work, add these secrets to your GitHub repository:

- `SSH_PRIVATE_KEY`: SSH private key to access your server
- `SSH_KNOWN_HOSTS`: SSH known hosts entry for your server
- `SERVER_IP`: Your server's IP address
- `SERVER_USER`: The SSH user (typically 'root')

To get the SSH known hosts value:
```bash
ssh-keyscan -H YOUR_SERVER_IP
```

## Database Management

### PostgreSQL Authentication

The deployment script automatically configures PostgreSQL to use password authentication (md5) instead of peer authentication, which avoids common connection issues.

### Database Connection String

The default database connection string format is:
```
postgresql://filmflex:filmflex2024@localhost:5432/filmflex
```

This uses simpler credentials without special characters to avoid connection issues.

### Database Migrations

The `--deploy` and `--db-only` commands automatically run database migrations using:
```bash
npm run db:push
```

### Database Backups

The system creates daily backups at 2 AM in `/var/backups/filmflex/`.

Manually create a backup with:
```bash
./deploy-filmflex.sh --backup
```

## Monitoring and Maintenance

### Checking System Status

```bash
./deploy-filmflex.sh --status
```

This provides comprehensive information about:
- System resources (memory, disk)
- Application status
- Database status
- Recent logs
- Database size and tables
- Recent backups

### Viewing Logs Directly

```bash
# Application output logs
tail -f /var/log/filmflex-out.log

# Application error logs
tail -f /var/log/filmflex-error.log

# PM2 logs
pm2 logs filmflex
```

## Troubleshooting

### Database Connection Issues

If you experience database connection problems:

1. Check authentication settings:
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   Make sure "peer" is changed to "md5" for all connection types.

2. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

3. Verify connection with password:
   ```bash
   PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex -c "SELECT NOW();"
   ```

4. Fix environment variables:
   ```bash
   # Update connection string in .env
   echo "DATABASE_URL='postgresql://filmflex:filmflex2024@localhost:5432/filmflex'" > /var/www/filmflex/.env
   
   # Restart application
   pm2 restart all --update-env
   ```

### Application Not Starting

If the application won't start:

1. Check PM2 processes:
   ```bash
   pm2 list
   pm2 logs
   ```

2. Verify database tables exist:
   ```bash
   PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex -c "\dt"
   ```

3. If tables don't exist, run migrations:
   ```bash
   cd /var/www/filmflex
   npm run db:push
   ```

4. Reset and restart:
   ```bash
   pm2 delete all
   cd /var/www/filmflex
   pm2 start ecosystem.config.js
   pm2 save
   ```

## Security Considerations

- The default database password is set to `filmflex2024`. Change this in production.
- Nginx is configured with common security headers.
- Consider enabling SSL with Let's Encrypt:
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```
- Database backups are stored with restricted permissions (600).
- For increased security, consider:
  - Setting up a firewall with UFW
  - Disabling root SSH login
  - Using SSH key authentication only