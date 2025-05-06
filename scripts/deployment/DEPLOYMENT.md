# FilmFlex Deployment Guide

This document provides instructions for deploying, managing, and troubleshooting the FilmFlex application in a production environment.

## System Requirements

- **Operating System**: Ubuntu 22.04 LTS or later
- **Node.js**: v16.x or later
- **PostgreSQL**: v14.x or later
- **Memory**: At least 2GB RAM
- **Storage**: At least 10GB free disk space

## Deployment Steps

### 1. Initial Setup

Clone the repository and navigate to the deployment scripts:

```bash
git clone https://github.com/yourusername/filmflex.git Film_Flex_Release
cd Film_Flex_Release/scripts/deployment
```

### 2. Deploy the Application

Run the deployment script as root:

```bash
sudo ./deploy-filmflex.sh
```

This script will:
- Create necessary directories
- Install dependencies
- Build the application
- Configure PM2 for process management
- Set up systemd service for auto-restart
- Start the application

### 3. Check Deployment Status

You can check the status of your deployment with:

```bash
sudo ./deploy-filmflex.sh status
```

This will show:
- Application directory status
- PM2 process status
- Log directory status
- Environment file status
- Database connection status

### 4. Environment Configuration

The application expects the following environment variables in the `.env` file located at `/var/www/filmflex/.env`:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=your-secret-key-here
```

Make sure to update these values according to your environment.

## Application Management

### Starting the Application

If the application is not running, start it with:

```bash
cd /var/www/filmflex
pm2 start ecosystem.config.cjs
```

### Stopping the Application

```bash
pm2 stop filmflex
```

### Restarting the Application

```bash
pm2 restart filmflex
```

### Viewing Logs

Application logs are stored in:
- Error logs: `/var/log/filmflex/error.log`
- Output logs: `/var/log/filmflex/out.log`

You can view the logs in real-time with:

```bash
# View all logs
pm2 logs filmflex

# View only error logs
pm2 logs filmflex --err

# View only output logs
pm2 logs filmflex --out
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify the database credentials in the `.env` file
2. Check if PostgreSQL service is running: `systemctl status postgresql`
3. Test the database connection manually:
   ```bash
   PGPASSWORD=your_password psql -h localhost -U filmflex -d filmflex -c '\conninfo'
   ```

### Application Not Starting

If the application fails to start:

1. Check the error logs: `cat /var/log/filmflex/error.log`
2. Verify that all dependencies are installed: `cd /var/www/filmflex && npm install`
3. Ensure the build process completed successfully: `cd /var/www/filmflex && npm run build`
4. Check PM2 status: `pm2 list`

### Port Conflicts

If port 5000 is already in use:

1. Change the port in the `.env` file
2. Update the `PORT` environment variable in `ecosystem.config.cjs`
3. Restart the application: `pm2 restart filmflex`

## Maintenance

### Updating the Application

To update the application:

1. Pull the latest changes: `cd /var/www/filmflex && git pull`
2. Run the deployment script: `sudo /var/www/filmflex/scripts/deployment/deploy-filmflex.sh`

### Backing Up the Database

Regularly back up the PostgreSQL database:

```bash
pg_dump -h localhost -U filmflex -d filmflex > /backup/filmflex_$(date +%Y%m%d).sql
```

### Monitoring System Resources

Monitor system resource usage:

```bash
# Memory usage
pm2 monit

# Disk usage
df -h /var/www/filmflex
df -h /var/log/filmflex
```

## Support

If you encounter issues that cannot be resolved using this guide, please contact the development team at support@filmflex.example.com.