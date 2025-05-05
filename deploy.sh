#!/bin/bash
# FilmFlex Comprehensive Deployment Script
set -e

# Configuration
APP_NAME="filmflex"
APP_PATH="/var/www/filmflex"
ENV_FILE=".env"
DB_USER="filmflex"
DB_PASSWORD="FilmFlexPassword"
DB_NAME="filmflex"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display usage information
function show_usage {
  echo -e "${YELLOW}FilmFlex Deployment Script${NC}"
  echo -e "Usage: ./deploy.sh [OPTION]"
  echo -e "Options:"
  echo -e "  --setup      Perform initial server setup (install dependencies, create database, etc.)"
  echo -e "  --deploy     Deploy or update the application (default if no option provided)"
  echo -e "  --import     Start movie import process"
  echo -e "  --backup     Create a database backup"
  echo -e "  --status     Check server and application status"
  echo -e "  --help       Display this help message"
  echo -e "\nExamples:"
  echo -e "  ./deploy.sh --setup    # First-time setup"
  echo -e "  ./deploy.sh            # Deploy/update application"
}

# Function for initial server setup
function setup_server {
  echo -e "\n${GREEN}===== PERFORMING INITIAL SERVER SETUP =====${NC}\n"
  
  # Update system packages
  echo -e "${YELLOW}Updating system packages...${NC}"
  apt update && apt upgrade -y
  
  # Install required packages
  echo -e "${YELLOW}Installing required packages...${NC}"
  apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib build-essential
  
  # Install Node.js and npm (LTS version)
  echo -e "${YELLOW}Installing Node.js and npm...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  
  # Install PM2 globally
  echo -e "${YELLOW}Installing PM2...${NC}"
  npm install -g pm2
  
  # Set up application directory
  echo -e "${YELLOW}Setting up application directory...${NC}"
  mkdir -p ${APP_PATH}
  mkdir -p /var/log/filmflex
  
  # Set up Nginx
  echo -e "${YELLOW}Setting up Nginx...${NC}"
  systemctl enable nginx
  systemctl start nginx
  
  # Setup database
  echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true
  sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH CREATEDB;" || true
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || true
  
  # Set up PM2 to start on boot
  echo -e "${YELLOW}Setting up PM2 to start on boot...${NC}"
  pm2 startup
  
  # Create systemd service for the application
  echo -e "${YELLOW}Creating systemd service...${NC}"
  cat > /etc/systemd/system/filmflex.service << 'SERVICE'
[Unit]
Description=FilmFlex Application
After=network.target postgresql.service

[Service]
Type=forking
User=root
WorkingDirectory=/var/www/filmflex
ExecStart=/usr/bin/pm2 start ecosystem.config.cjs
ExecReload=/usr/bin/pm2 reload ecosystem.config.cjs
ExecStop=/usr/bin/pm2 stop ecosystem.config.cjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE
  
  # Reload systemd
  systemctl daemon-reload
  systemctl enable filmflex.service
  
  # Create environment file if it doesn't exist
  if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${YELLOW}Creating environment file...${NC}"
    cat > ${ENV_FILE} << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
SESSION_SECRET=$(openssl rand -hex 32)
EOF
  fi
  
  # Setup Nginx configuration
  echo -e "${YELLOW}Setting up Nginx configuration...${NC}"
  if [ ! -f "nginx/filmflex.conf" ]; then
    mkdir -p nginx
    cat > nginx/filmflex.conf << 'NGINX'
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
  fi
  
  cp nginx/filmflex.conf /etc/nginx/sites-available/filmflex
  if [ ! -f "/etc/nginx/sites-enabled/filmflex" ]; then
    ln -s /etc/nginx/sites-available/filmflex /etc/nginx/sites-enabled/
  fi
  nginx -t && systemctl restart nginx
  
  # Setup database backup script
  echo -e "${YELLOW}Setting up database backup script...${NC}"
  mkdir -p /etc/filmflex/scripts
  
  # Create backup script
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
  (crontab -l 2>/dev/null || true; echo "0 2 * * * /etc/filmflex/scripts/backup-db.sh > /var/log/filmflex-backup.log 2>&1") | crontab -
  
  # Create ecosystem.config.cjs (CommonJS format) if it doesn't exist
  if [ ! -f "ecosystem.config.cjs" ]; then
    cat > ecosystem.config.cjs << 'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "./dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "postgresql://filmflex:Cuongtm2012$@localhost:5432/filmflex"
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
ECOSYSTEM
  fi
  
  echo -e "\n${GREEN}Server setup completed successfully!${NC}"
}

# Function to deploy the application
function deploy_app {
  echo -e "\n${GREEN}===== DEPLOYING APPLICATION =====${NC}\n"
  
  # Make sure we have current directory copied to app path
  echo -e "${YELLOW}Copying application files...${NC}"
  rsync -a --exclude 'node_modules' --exclude '.git' ./ ${APP_PATH}/
  
  # Copy environment file
  if [ -f "${ENV_FILE}" ]; then
    cp ${ENV_FILE} ${APP_PATH}/.env
  fi
  
  # Install dependencies and build
  echo -e "${YELLOW}Installing dependencies and building the application...${NC}"
  cd ${APP_PATH}
  npm ci
  npm run build
  
  # Start or restart the application
  echo -e "${YELLOW}Starting/restarting the application...${NC}"
  pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs
  pm2 save
  
  echo -e "\n${GREEN}Application deployed successfully!${NC}"
  echo -e "${YELLOW}Your FilmFlex application is now accessible at:${NC}"
  echo -e "  http://localhost:5000"
  echo -e "  http://$(hostname -I | awk '{print $1}'):5000"
}

# Function to import movies
function import_movies {
  echo -e "\n${GREEN}===== STARTING MOVIE IMPORT PROCESS =====${NC}\n"
  
  # Make sure we're in the app directory
  cd ${APP_PATH}
  
  # First, check if screen is installed
  if ! command -v screen &> /dev/null; then
    echo -e "${YELLOW}Screen is not installed. Installing it now...${NC}"
    apt-get update && apt-get install -y screen
  fi

  # Create a screen session for the import process
  screen -dmS import bash -c "cd ${APP_PATH} && npx tsx scripts/import.ts 1 2252 > /var/log/filmflex-import.log 2>&1"
  
  echo -e "${GREEN}Import process started in a screen session.${NC}"
  echo -e "${YELLOW}This process will run in the background and may take several hours.${NC}"
  echo -e "${YELLOW}You can check the progress by running:${NC}"
  echo -e "  tail -f /var/log/filmflex-import.log"
  echo -e "${YELLOW}To attach to the screen session:${NC}"
  echo -e "  screen -r import"
}

# Function to create a database backup
function backup_database {
  echo -e "\n${GREEN}===== CREATING DATABASE BACKUP =====${NC}\n"
  
  /etc/filmflex/scripts/backup-db.sh
  
  echo -e "\n${GREEN}Backup completed successfully!${NC}"
  echo -e "${YELLOW}Backup files are stored in /var/backups/filmflex/${NC}"
}

# Function to check system status
function check_status {
  echo -e "\n${GREEN}===== SYSTEM STATUS =====${NC}\n"
  
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
  tail -n 20 /var/log/filmflex.log 2>/dev/null || echo "No logs found"
  
  echo -e "\n${YELLOW}Database Status:${NC}"
  systemctl status postgresql | head -n 5
  
  echo -e "\n${YELLOW}Database Size:${NC}"
  sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" 2>/dev/null || echo "Database not found"
  
  echo -e "\n${YELLOW}Recent Backups:${NC}"
  ls -lh /var/backups/filmflex/ 2>/dev/null | tail -n 5 || echo "No backups found"
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