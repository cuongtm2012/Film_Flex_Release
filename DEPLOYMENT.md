# FilmFlex Deployment Guide

This document provides comprehensive instructions for deploying and maintaining the FilmFlex application on a production server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Initial Server Setup](#initial-server-setup)
- [Automatic Deployment](#automatic-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Management](#database-management)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- VPS with at least 2GB RAM (Ubuntu 22.04 LTS recommended)
- Domain name (optional but recommended)
- SSH access to the server
- Git repository with the FilmFlex application code
- PostgreSQL database

## Deployment Options

FilmFlex can be deployed in two ways:

1. **Automated Deployment**: Using GitHub Actions CI/CD pipeline
2. **Manual Deployment**: Using the deploy.sh script directly on the server

## Initial Server Setup

To set up a new server for FilmFlex:

1. SSH into your server
2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/filmflex.git Film_Flex_Release
   cd Film_Flex_Release
   ```
3. Run the setup script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh --setup
   ```

This will:
- Install all required dependencies
- Set up PostgreSQL database
- Configure Nginx
- Create systemd service for automatic startup
- Deploy the application

## Automatic Deployment

FilmFlex uses GitHub Actions for CI/CD. When you push changes to the main branch:

1. The CI workflow will build and test the application
2. The CD workflow will deploy it to your production server

### Setting up GitHub Secrets

For CI/CD to work, you need to add these secrets to your GitHub repository:

- `SSH_PRIVATE_KEY`: The SSH private key to access your server
- `SSH_KNOWN_HOSTS`: The SSH known hosts entry for your server
- `SERVER_IP`: Your server's IP address
- `SERVER_USER`: The SSH user (usually 'root')

To get the SSH known hosts value:
```bash
ssh-keyscan -H YOUR_SERVER_IP
```

## Manual Deployment

For manual deployment:

1. SSH into your server
2. Navigate to the repository
   ```bash
   cd ~/Film_Flex_Release
   ```
3. Pull the latest changes
   ```bash
   git pull
   ```
4. Run the deploy script
   ```bash
   ./deploy.sh --deploy
   ```

## Database Management

### Running Migrations

```bash
cd /var/www/filmflex
DATABASE_URL="postgresql://filmflex:yourpassword@localhost:5432/filmflex" npm run db:push
```

### Creating Backups

The system automatically creates daily backups at 2 AM in `/var/backups/filmflex/`.

You can manually trigger a backup:
```bash
./deploy.sh --backup
```

## Monitoring and Maintenance

### Checking Application Status

```bash
./deploy.sh --status
```

### Viewing Logs

FilmFlex provides a convenient script for checking logs remotely:

```bash
# Make the script executable
chmod +x scripts/check-logs.sh

# View all logs
./scripts/check-logs.sh --all

# View application logs only
./scripts/check-logs.sh --app

# View error logs only
./scripts/check-logs.sh --error

# Follow logs in real-time
./scripts/check-logs.sh --tail

# View system status
./scripts/check-logs.sh --system

# View PM2 logs in real-time
./scripts/check-logs.sh --pm2
```

### Monitoring Resource Usage

```bash
# Memory usage
free -h

# Disk usage
df -h

# Process info
top
```

## Troubleshooting

### Common Issues

#### Application not starting

Check the logs for errors:
```bash
pm2 logs filmflex
```

Reset the service:
```bash
systemctl reset-failed filmflex.service
systemctl restart filmflex.service
```

#### Database Connection Issues

Verify the database connection:
```bash
cd /var/www/filmflex
DATABASE_URL="postgresql://filmflex:yourpassword@localhost:5432/filmflex" node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err);
    } else {
      console.log('Database connected:', res.rows[0]);
    }
    pool.end();
  });
"
```

#### PM2 Issues

If PM2 is not managing your application properly:
```bash
pm2 delete all
cd /var/www/filmflex
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```