# PhimGG Maintenance Guide

This document provides instructions for performing maintenance tasks for the PhimGG application.

## Table of Contents

- [User Management](#user-management)
- [Database Maintenance](#database-maintenance)
- [Server Maintenance](#server-maintenance)
- [Security](#security)
- [Regular Maintenance Checklist](#regular-maintenance-checklist)

## User Management

### Resetting Admin User

If you need to reset the admin user credentials:

```bash
# Using the deployment script
./deploy.sh --reset-admin

# Or directly
npx tsx scripts/maintenance/reset_admin.ts
```

This will:
1. Set the admin user's password to a default value
2. Ensure the admin user has the correct role and permissions
3. Output the new credentials

### Managing User Roles

PhimGG supports multiple user roles:
- `admin`: Full system access
- `moderator`: Content management but no system settings
- `premium`: Premium user features
- `user`: Standard user

To change a user's role (must be done from the database):

```bash
# Connect to the database
PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex

# Update the user's role
UPDATE users SET role = 'admin' WHERE username = 'username';
```

## Database Maintenance

### Optimizing the Database

Periodically optimize the database for better performance:

```bash
# Using the deployment script
./deploy.sh --db-optimize
```

This runs:
1. `VACUUM ANALYZE` to reclaim space and update statistics
2. `REINDEX DATABASE` to rebuild indexes

### Backup and Restore

Regular backups are essential:

```bash
# Create a manual backup
./deploy.sh --backup

# Restore from backup
./deploy.sh --restore=/var/backups/filmflex/filmflex_20250505-120000.sql.gz
```

Automatic backups are created daily at 2 AM in `/var/backups/filmflex/`.

## Server Maintenance

### Checking Server Status

```bash
# Get comprehensive status report
./deploy.sh --status
```

This shows:
- System resources (memory, disk)
- Application status
- Database status
- Recent logs

### Log Management

Periodically check and rotate logs:

```bash
# Check logs
./deploy.sh --logs --all

# Clean up old logs (if not using logrotate)
find /var/log/filmflex -name "*.log.*" -mtime +30 -delete
```

## Security

### SSL Certificate Management

SSL certificates from Let's Encrypt auto-renew, but you should check their status:

```bash
# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run
```

### Security Updates

Regularly update the server:

```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies (after testing!)
cd /var/www/filmflex
npm update --save
```

## Regular Maintenance Checklist

Perform these maintenance tasks regularly:

### Daily
- Check application status with `./deploy.sh --status`
- Verify successful backups
- Review error logs with `./deploy.sh --logs --error`

### Weekly
- Run database optimization with `./deploy.sh --db-optimize`
- Check disk space with `df -h`
- Verify SSL certificates are valid

### Monthly
- Update system packages
- Test backup restoration
- Clean up old backup files and logs
- Review user accounts for suspicious activity