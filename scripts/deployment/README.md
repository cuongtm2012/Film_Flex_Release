# FilmFlex Deployment Guide

This document provides a comprehensive guide to deploying and maintaining the FilmFlex application.

## Table of Contents

- [Directory Structure](#directory-structure)
- [One-Command Deployment](#one-command-deployment)
- [Common Tasks](#common-tasks)
- [Database Management](#database-management)
- [Logging and Monitoring](#logging-and-monitoring)
- [Troubleshooting](#troubleshooting)

## Directory Structure

The FilmFlex repository has been organized into these categories:

```
scripts/
├── deployment/   # Deployment and server setup scripts
├── data/         # Data import and management scripts
├── maintenance/  # User management and maintenance scripts
└── tests/        # Testing scripts
```

## One-Command Deployment

The `deploy-filmflex.sh` script is an all-in-one deployment solution that handles:

- Initial server setup
- Database configuration
- Application deployment
- Monitoring and maintenance

### Basic Usage

```bash
# Initial server setup (first time)
./deploy.sh --setup

# Deploy or update application
./deploy.sh

# Database setup only
./deploy.sh --db-only
```

### Complete Command Reference

```bash
# View all available commands
./deploy.sh --help
```

## Common Tasks

### Importing Movies

```bash
# Start the movie import process
./deploy.sh --import
```

### Viewing Logs

```bash
# View application logs
./deploy.sh --logs --app

# View error logs
./deploy.sh --logs --error

# Follow logs in real-time
./deploy.sh --logs --tail

# Filter logs for specific content
./deploy.sh --logs --filter="error message"
```

### Database Backup and Restore

```bash
# Create a backup
./deploy.sh --backup

# Restore from backup
./deploy.sh --restore=/var/backups/filmflex/filmflex_20250505-120000.sql.gz
```

### SSL Setup

```bash
# Configure SSL with Let's Encrypt
./deploy.sh --ssl
```

## Database Management

### Optimization

```bash
# Check database status
./deploy.sh --db-status

# Optimize database
./deploy.sh --db-optimize
```

### Admin Reset

```bash
# Reset admin user credentials
./deploy.sh --reset-admin
```

## Logging and Monitoring

### System Status

```bash
# Check overall system status
./deploy.sh --status
```

This command shows:
- System resources (memory, disk)
- Application status
- Database status
- Recent logs
- Database size and tables

## Troubleshooting

### Database Connection Issues

If you experience database connection problems:

1. Run the database setup command:
   ```bash
   ./deploy.sh --db-only
   ```

2. Verify connection:
   ```bash
   PGPASSWORD=filmflex2024 psql -h localhost -U filmflex -d filmflex -c "SELECT NOW();"
   ```

### Application Not Starting

If the application fails to start:

1. Check logs:
   ```bash
   ./deploy.sh --logs --error
   ```

2. Try restarting:
   ```bash
   ./deploy.sh --deploy
   ```

3. Check if rollback is necessary:
   ```bash
   ./deploy.sh --rollback
   ```