# FilmFlex - Setup Guide

This document provides step-by-step instructions for setting up the FilmFlex streaming platform on a new server.

## Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Database Setup](#database-setup)
4. [Application Installation](#application-installation)
5. [Data Import](#data-import)
6. [Domain Configuration](#domain-configuration)
7. [Automated Tasks](#automated-tasks)
8. [Testing Your Installation](#testing-your-installation)

## Server Requirements

### Minimum Requirements
- Ubuntu 22.04 LTS
- 4GB RAM
- 2 CPU cores
- 50GB SSD storage
- Public IP address

### Recommended Requirements
- Ubuntu 22.04 LTS
- 8GB RAM
- 4 CPU cores
- 100GB SSD storage
- Public IP address

### Required Software
- Node.js 20.x
- PostgreSQL 13+
- Nginx
- PM2
- Git

## Initial Server Setup

### 1. Update System Packages

```bash
# Update package list and upgrade packages
sudo apt update
sudo apt upgrade -y

# Install essential tools
sudo apt install -y build-essential curl wget git nginx
```

### 2. Install Node.js

```bash
# Add Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 9.x.x or higher
```

### 3. Install PostgreSQL

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql-14 postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 4. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Set up PM2 to start on system boot
pm2 startup
```

## Database Setup

### 1. Set Up PostgreSQL User and Database

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database user
createuser --interactive
# Enter name of role to add: filmflex
# Shall the new role be a superuser? (y/n): n
# Shall the new role be allowed to create databases? (y/n): y
# Shall the new role be allowed to create more new roles? (y/n): n

# Create database
createdb filmflex

# Set password for user
psql
ALTER USER filmflex WITH PASSWORD 'filmflex2024';
\q

# Exit postgres user
exit
```

## Application Installation

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

# Clone repository
cd /var/www
git clone https://github.com/yourusername/filmflex.git
cd filmflex
```

### 2. Install Dependencies

```bash
# Install application dependencies
npm install
```

### 3. Configure Environment Variables

```bash
# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=$(openssl rand -hex 32)
EOF
```

### 4. Set Up PM2 Configuration

```bash
# Configure PM2 for the application
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'filmflex',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '300M',
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
EOF
```

### 5. Set Up Nginx Configuration

```bash
# Create Nginx configuration file
sudo bash -c 'cat > /etc/nginx/sites-available/filmflex << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF'

# Enable site
sudo ln -s /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Start the Application

```bash
# Start the application with PM2
cd /var/www/filmflex
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

## Data Import

### 1. Initial Data Import

```bash
# Run daily import (quick import of latest movies)
cd /var/www/filmflex
bash scripts/data/import-movies.sh

# For a complete database import (takes multiple days)
# bash scripts/data/import-all-movies-resumable.sh
```

### 2. Set Up Automated Daily Import

```bash
# Create cron job for daily import
sudo bash -c 'cat > /etc/cron.d/filmflex-data-import << EOF
0 2 * * * root bash /var/www/filmflex/scripts/data/import-movies.sh >> /var/log/filmflex/cron-import.log 2>&1
EOF'

# Create log directory
sudo mkdir -p /var/log/filmflex
sudo chown -R $USER:$USER /var/log/filmflex
```

## Domain Configuration

### 1. Configure Domain

```bash
# Run the domain setup script
cd /var/www/filmflex
bash scripts/domain/setup-domain.sh your-domain.com
```

### 2. Set Up SSL Certificate

```bash
# Wait for DNS propagation (24-48 hours)
# Then run the SSL setup script
bash scripts/domain/check-dns-setup-ssl.sh your-domain.com
```

## Automated Tasks

### 1. Database Backup

```bash
# Create backup script
cat > /var/www/filmflex/scripts/maintenance/backup-database.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/filmflex"
FILENAME="\$BACKUP_DIR/filmflex-\$(date +%Y%m%d-%H%M%S).sql"
mkdir -p \$BACKUP_DIR
pg_dump -U filmflex -d filmflex > \$FILENAME
gzip \$FILENAME
find \$BACKUP_DIR -name "filmflex-*.sql.gz" -mtime +7 -delete
EOF

# Make script executable
chmod +x /var/www/filmflex/scripts/maintenance/backup-database.sh

# Create cron job for daily backups
sudo bash -c 'cat > /etc/cron.d/filmflex-backup << EOF
0 1 * * * root bash /var/www/filmflex/scripts/maintenance/backup-database.sh >> /var/log/filmflex/backup.log 2>&1
EOF'
```

### 2. Log Rotation

```bash
# Create log rotation configuration
sudo bash -c 'cat > /etc/logrotate.d/filmflex << EOF
/var/log/filmflex/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF'
```

## Testing Your Installation

1. **Check Application Status**:
   ```bash
   pm2 status
   ```

2. **Verify Nginx Configuration**:
   ```bash
   sudo nginx -t
   ```

3. **Test Web Server**:
   ```bash
   curl http://localhost:5000/api/health
   ```

4. **Test Database Connection**:
   ```bash
   cd /var/www/filmflex
   node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : 'Database connected!'); pool.end(); });"
   ```

5. **Check Import Status**:
   ```bash
   cat scripts/data/complete_import_progress.json
   ```

If all tests pass, your FilmFlex installation is ready to use!

## Troubleshooting

- **Application Not Starting**: Check PM2 logs with `pm2 logs filmflex`
- **Database Connection Issues**: Verify PostgreSQL service is running with `sudo systemctl status postgresql`
- **Nginx Not Working**: Check Nginx logs with `sudo tail -f /var/log/nginx/error.log`
- **Import Errors**: View import logs in `/var/log/filmflex/` directory