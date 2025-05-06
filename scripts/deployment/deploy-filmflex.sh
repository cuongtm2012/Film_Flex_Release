#!/bin/bash
# FilmFlex All-in-One Deployment Script
# This script handles the entire deployment process for FilmFlex
set -e

# Configuration
APP_NAME="filmflex"
APP_PATH="/var/www/filmflex"
ENV_FILE=".env"
DB_USER="filmflex"
DB_PASSWORD="filmflex2024" # Using simple password without special characters
DB_NAME="filmflex"
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage information
function show_usage {
  echo -e "${YELLOW}FilmFlex All-in-One Deployment Script${NC}"
  echo -e "Usage: ./deploy-filmflex.sh [OPTION]"
  echo -e "Options:"
  echo -e "  --setup      Perform initial server setup (install dependencies, create database, etc.)"
  echo -e "  --deploy     Deploy or update the application (default if no option provided)"
  echo -e "  --db-only    Setup database only (create tables, fix authentication)"
  echo -e "  --import     Start movie import process"
  echo -e "  --backup     Create a database backup"
  echo -e "  --status     Check server and application status"
  echo -e "  --help       Display this help message"
  echo -e "\nExamples:"
  echo -e "  ./deploy-filmflex.sh --setup    # First-time setup"
  echo -e "  ./deploy-filmflex.sh            # Deploy/update application"
}

# Function to check if command exists
function command_exists {
  command -v "$1" >/dev/null 2>&1
}

# Function to log messages
function log {
  echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

# Function to log success messages
function log_success {
  echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

# Function to log error messages
function log_error {
  echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

# Function for initial server setup
function setup_server {
  log "===== PERFORMING INITIAL SERVER SETUP ====="
  
  # Update system packages
  log "Updating system packages..."
  apt update && apt upgrade -y || {
    log_error "Failed to update packages but continuing..."
  }
  
  # Install required packages
  log "Installing required packages..."
  apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib build-essential screen rsync nano || {
    log_error "Failed to install some packages but continuing..."
  }
  
  # Install Node.js and npm (LTS version)
  log "Installing Node.js and npm..."
  if ! command_exists node; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  else
    log "Node.js is already installed. Version: $(node -v)"
  fi
  
  # Install PM2 globally
  log "Installing PM2..."
  if ! command_exists pm2; then
    npm install -g pm2
  else
    log "PM2 is already installed. Version: $(pm2 -v)"
  fi
  
  # Set up application directory
  log "Setting up application directory..."
  mkdir -p ${APP_PATH}
  mkdir -p /var/log/filmflex
  
  # Set up Nginx
  log "Setting up Nginx..."
  if systemctl is-active --quiet nginx; then
    log "Nginx is already running"
  else
    systemctl enable nginx
    systemctl start nginx
  fi
  
  # Setup database
  setup_database
  
  # Set up PM2 to start on boot
  log "Setting up PM2 to start on boot..."
  pm2 startup

  # Create systemd service for the application
  log "Creating systemd service..."
  cat > /etc/systemd/system/filmflex.service << 'SERVICE'
[Unit]
Description=FilmFlex Application
After=network.target postgresql.service

[Service]
Type=forking
User=root
WorkingDirectory=/var/www/filmflex
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
PIDFile=/root/.pm2/pm2.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE
  
  # Reload systemd
  systemctl daemon-reload
  systemctl enable filmflex.service
  
  # Create environment file if it doesn't exist
  if [ ! -f "${ENV_FILE}" ]; then
    log "Creating environment file..."
    cat > ${ENV_FILE} << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=${DB_URL}
SESSION_SECRET=$(openssl rand -hex 32)
EOF
  fi
  
  # Setup Nginx configuration
  setup_nginx
  
  # Setup database backup script
  setup_backup_script
  
  # Create ecosystem.config.js if it doesn't exist
  update_ecosystem_config
  
  log_success "Server setup completed successfully!"
}

# Function to setup PostgreSQL database
function setup_database {
  log "===== SETTING UP POSTGRESQL DATABASE ====="

  # Check if PostgreSQL is running
  if ! systemctl is-active --quiet postgresql; then
    log "Starting PostgreSQL service..."
    systemctl start postgresql
  fi
  
  # Configure PostgreSQL for password authentication
  log "Configuring PostgreSQL authentication..."
  
  # Find PostgreSQL version
  PG_VERSION=$(ls -1 /etc/postgresql/ 2>/dev/null | head -n 1)
  if [ -z "$PG_VERSION" ]; then
    log_error "PostgreSQL installation not found. Make sure PostgreSQL is installed."
    return 1
  fi
  
  PG_HBA_FILE="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
  if [ -f "$PG_HBA_FILE" ]; then
    # Make a backup of the original file
    cp "${PG_HBA_FILE}" "${PG_HBA_FILE}.bak"
    
    # Update authentication method from peer to md5
    log "Updating PostgreSQL authentication method from peer to md5..."
    sed -i 's/peer/md5/g' "${PG_HBA_FILE}"
    
    # Restart PostgreSQL to apply changes
    log "Restarting PostgreSQL to apply changes..."
    systemctl restart postgresql
  else
    log_error "PostgreSQL HBA config file not found at ${PG_HBA_FILE}"
    log "Will continue without changing PostgreSQL authentication"
  fi
  
  # Create database user and database
  log "Creating database user and database..."
  sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;" || log_error "Failed to create user but continuing..."

  sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH CREATEDB;" || log_error "Failed to grant CREATEDB but continuing..."
  
  # Check if database exists, if not create it
  if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    log "Creating database ${DB_NAME}..."
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || log_error "Failed to create database but continuing..."
  else
    log "Database ${DB_NAME} already exists"
  fi
  
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || log_error "Failed to grant privileges but continuing..."
  
  # Test database connection
  log "Testing database connection..."
  if PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" >/dev/null 2>&1; then
    log_success "Database connection successful!"
  else
    log_error "Database connection test failed."
  fi
}

# Function to run database migrations
function run_migrations {
  log "===== RUNNING DATABASE MIGRATIONS ====="
  
  # Change to application directory
  cd ${APP_PATH}
  
  # Run migrations
  export DATABASE_URL="${DB_URL}"
  log "Running database migrations with db:push..."
  
  if npm run db:push; then
    log_success "Database migrations completed successfully!"
  else
    log_error "Failed to run database migrations."
    
    # Check if tables exist anyway
    log "Checking if tables exist in the database..."
    TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    if [ "$TABLE_COUNT" -gt 0 ]; then
      log "Found ${TABLE_COUNT} tables in the database. Schema might be partially created."
    else
      log_error "No tables found in the database. Application will likely not work properly."
    fi
  fi
  
  # List created tables
  log "Tables in database:"
  PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "\dt"
}

# Function to setup Nginx
function setup_nginx {
  log "===== SETTING UP NGINX ====="
  
  # Create Nginx configuration
  log "Creating Nginx configuration..."
  cat > /etc/nginx/sites-available/filmflex << 'NGINX'
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase client body size for file uploads
    client_max_body_size 20M;

    # Enable compression for faster loading
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/xml
        application/xml+rss
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
NGINX
  
  # Enable site
  if [ ! -f "/etc/nginx/sites-enabled/filmflex" ]; then
    ln -s /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
  fi
  
  # Test Nginx configuration
  if nginx -t; then
    systemctl restart nginx
    log_success "Nginx configuration updated and restarted successfully!"
  else
    log_error "Nginx configuration test failed. Please check the Nginx error log."
  fi
}

# Function to setup backup script
function setup_backup_script {
  log "===== SETTING UP DATABASE BACKUP SCRIPT ====="
  
  # Create backup directory
  mkdir -p /var/backups/filmflex
  mkdir -p /etc/filmflex/scripts
  
  # Create backup script
  log "Creating backup script..."
  cat > /etc/filmflex/scripts/backup-db.sh << 'BACKUP'
#!/bin/bash
# FilmFlex database backup script
set -e

# Configuration
DB_NAME="filmflex"
DB_USER="filmflex"
BACKUP_DIR="/var/backups/filmflex"
BACKUP_COUNT=7  # Number of daily backups to keep

# Timestamp for the backup file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform database backup
echo "Creating database backup: ${BACKUP_FILE}"
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Set appropriate permissions
chmod 600 $BACKUP_FILE

# Delete old backups (keep only the latest BACKUP_COUNT backups)
echo "Cleaning up old backups, keeping last $BACKUP_COUNT backups"
ls -tp $BACKUP_DIR/*.sql.gz 2>/dev/null | grep -v '/$' | tail -n +$((BACKUP_COUNT+1)) | xargs -I {} rm -- {} 2>/dev/null || true

echo "Backup completed: $BACKUP_FILE"
BACKUP
  
  chmod +x /etc/filmflex/scripts/backup-db.sh
  
  # Create cron job for daily backups at 2 AM
  log "Setting up daily backup cron job..."
  (crontab -l 2>/dev/null || true; echo "0 2 * * * /etc/filmflex/scripts/backup-db.sh > /var/log/filmflex-backup.log 2>&1") | crontab -
  
  log_success "Backup script set up successfully!"
}

# Function to update ecosystem config
function update_ecosystem_config {
  log "===== UPDATING ECOSYSTEM CONFIG ====="
  
  # Create or update ecosystem.config.js
  log "Creating/updating ecosystem.config.js..."
  cat > ${APP_PATH}/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: "${APP_NAME}",
      script: "./dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "${DB_URL}"
      },
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      merge_logs: true,
      log_file: "/var/log/filmflex.log",
      error_file: "/var/log/filmflex-error.log",
      out_file: "/var/log/filmflex-out.log",
      time: true,
      max_memory_restart: "1G",
      autorestart: true
    }
  ]
};
EOF
  
  # Create or update .env file
  log "Creating/updating .env file..."
  cat > ${APP_PATH}/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=${DB_URL}
SESSION_SECRET=$(openssl rand -hex 32)
EOF
  
  log_success "Ecosystem config updated successfully!"
}

# Function to deploy the application
function deploy_app {
  log "===== DEPLOYING APPLICATION ====="
  
  # Make sure we have current directory copied to app path
  log "Copying application files..."
  mkdir -p ${APP_PATH}
  rsync -a --exclude 'node_modules' --exclude '.git' ./ ${APP_PATH}/
  
  # Copy environment file
  if [ -f "${ENV_FILE}" ]; then
    cp ${ENV_FILE} ${APP_PATH}/.env
  fi
  
  # Install dependencies and build
  log "Installing dependencies and building the application..."
  cd ${APP_PATH}
  npm ci || npm install
  npm run build
  
  # Update ecosystem config
  update_ecosystem_config
  
  # Run database migrations
  run_migrations
  
  # Start or restart the application
  log "Starting/restarting the application..."
  pm2 delete ${APP_NAME} >/dev/null 2>&1 || true
  pm2 start ecosystem.config.js
  pm2 save
  
  # Make sure PM2 will start on boot
  log "Setting up PM2 to start on boot..."
  pm2 startup
  
  # For systemd control
  log "Updating systemd service..."
  systemctl daemon-reload
  systemctl restart filmflex.service || true
  
  log_success "Application deployed successfully!"
  echo -e "${YELLOW}Your FilmFlex application is now accessible at:${NC}"
  echo -e "  http://localhost:5000"
  echo -e "  http://$(hostname -I | awk '{print $1}' | head -n1):5000"
}

# Function to import movies
function import_movies {
  log "===== STARTING MOVIE IMPORT PROCESS ====="
  
  # Make sure we're in the app directory
  cd ${APP_PATH}
  
  # First, check if screen is installed
  if ! command_exists screen; then
    log "Screen is not installed. Installing it now..."
    apt-get update && apt-get install -y screen
  fi

  # Create a screen session for the import process
  screen -dmS import bash -c "cd ${APP_PATH} && npx tsx scripts/import.ts 1 2252 > /var/log/filmflex-import.log 2>&1"
  
  log_success "Import process started in a screen session."
  echo -e "${YELLOW}This process will run in the background and may take several hours.${NC}"
  echo -e "${YELLOW}You can check the progress by running:${NC}"
  echo -e "  tail -f /var/log/filmflex-import.log"
  echo -e "${YELLOW}To attach to the screen session:${NC}"
  echo -e "  screen -r import"
}

# Function to create a database backup
function backup_database {
  log "===== CREATING DATABASE BACKUP ====="
  
  if [ -f "/etc/filmflex/scripts/backup-db.sh" ]; then
    /etc/filmflex/scripts/backup-db.sh
  else
    setup_backup_script
    /etc/filmflex/scripts/backup-db.sh
  fi
  
  log_success "Backup completed successfully!"
  echo -e "${YELLOW}Backup files are stored in /var/backups/filmflex/${NC}"
}

# Function to check system status
function check_status {
  log "===== SYSTEM STATUS ====="
  
  echo -e "${YELLOW}System Uptime:${NC}"
  uptime
  
  echo -e "\n${YELLOW}Memory Usage:${NC}"
  free -h
  
  echo -e "\n${YELLOW}Disk Usage:${NC}"
  df -h | grep /dev/
  
  echo -e "\n${YELLOW}Application Status:${NC}"
  systemctl status filmflex.service 2>/dev/null || echo "Service not found"
  
  echo -e "\n${YELLOW}PM2 Process Status:${NC}"
  pm2 list
  
  echo -e "\n${YELLOW}Nginx Status:${NC}"
  systemctl status nginx | head -n 5
  
  echo -e "\n${YELLOW}Recent Application Logs:${NC}"
  tail -n 20 /var/log/filmflex-out.log 2>/dev/null || echo "No logs found"
  
  echo -e "\n${YELLOW}Recent Error Logs:${NC}"
  tail -n 20 /var/log/filmflex-error.log 2>/dev/null || echo "No logs found"
  
  echo -e "\n${YELLOW}Database Status:${NC}"
  systemctl status postgresql | head -n 5
  
  echo -e "\n${YELLOW}Database Size:${NC}"
  sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" 2>/dev/null || echo "Database not found"
  
  echo -e "\n${YELLOW}Recent Backups:${NC}"
  ls -lh /var/backups/filmflex/ 2>/dev/null | tail -n 5 || echo "No backups found"
  
  echo -e "\n${YELLOW}Database Tables:${NC}"
  PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "\dt" 2>/dev/null || echo "Failed to list tables"
  
  echo -e "\n${YELLOW}Application Health Check:${NC}"
  curl -s http://localhost:5000/api/health 2>/dev/null || echo "Application not responding to health check"
}

# Parse command-line arguments
if [ $# -eq 0 ]; then
  # Default action: deploy the application
  deploy_app
else
  case "$1" in
    --setup)
      setup_server
      deploy_app
      ;;
    --deploy)
      deploy_app
      ;;
    --db-only)
      setup_database
      run_migrations
      ;;
    --import)
      import_movies
      ;;
    --backup)
      backup_database
      ;;
    --status)
      check_status
      ;;
    --help)
      show_usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      exit 1
      ;;
  esac
fi

# Display success message
log_success "Deployment script completed successfully!"
echo -e "${YELLOW}For more information on managing your FilmFlex deployment, see DEPLOYMENT.md${NC}"