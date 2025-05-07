#!/bin/bash

# FilmFlex Deployment Script
# This script automates the deployment process for the FilmFlex application
# It handles application setup, environment validation, build, and restart

set -e  # Exit immediately if a command exits with a non-zero status

# Define log file and directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Create log directory if it doesn't exist
mkdir -p $LOG_DIR

# Colors for output formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
  echo -e "${TIMESTAMP} - $1"
}

# Function to log success messages
log_success() {
  echo -e "${TIMESTAMP} - ${GREEN}$1${NC}"
}

# Function to log error messages
log_error() {
  echo -e "${TIMESTAMP} - ${RED}$1${NC}"
}

# Function to log warning messages
log_warning() {
  echo -e "${TIMESTAMP} - ${YELLOW}$1${NC}"
}

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  log_error "This script must be run as root"
  exit 1
fi

# Display status information
if [ "$1" == "status" ]; then
  log "FilmFlex deployment status:"
  
  # Check if application directory exists
  if [ -d "$APP_DIR" ]; then
    log_success "Application directory: OK"
  else
    log_error "Application directory: NOT FOUND"
  fi
  
  # Check if PM2 is running the application
  if command_exists pm2; then
    if pm2 list | grep -q "filmflex"; then
      log_success "PM2 process: RUNNING"
      pm2 list | grep "filmflex"
    else
      log_error "PM2 process: NOT RUNNING"
    fi
  else
    log_error "PM2: NOT INSTALLED"
  fi
  
  # Check if log directory exists
  if [ -d "$LOG_DIR" ]; then
    log_success "Log directory: OK"
  else
    log_error "Log directory: NOT FOUND"
  fi
  
  # Check if environment file exists
  if [ -f "$APP_DIR/.env" ]; then
    log_success "Environment file: OK"
  else
    log_error "Environment file: NOT FOUND"
  fi
  
  # Check if database is accessible
  if grep -q "DATABASE_URL" "$APP_DIR/.env"; then
    log_success "Database configuration: FOUND"
    
    # Source the environment variables from .env
    export $(grep -v '^#' "$APP_DIR/.env" | xargs)
    
    # Try to connect to the database
    if command_exists psql; then
      if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c '\q' 2>/dev/null; then
        log_success "Database connection: OK"
      else
        log_error "Database connection: FAILED"
      fi
    else
      log_warning "PostgreSQL client not installed, skipping database connection check"
    fi
  else
    log_error "Database configuration: NOT FOUND"
  fi
  
  exit 0
fi

# Main deployment logic
log "Starting FilmFlex deployment..."

# Create application directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
  log "Creating application directory..."
  mkdir -p "$APP_DIR"
fi

# Create log directory if it doesn't exist
if [ ! -d "$LOG_DIR" ]; then
  log "Creating log directory..."
  mkdir -p "$LOG_DIR"
fi

# Navigate to application directory
cd "$APP_DIR" || { log_error "Failed to change to application directory"; exit 1; }

# Check for required dependencies
if ! command_exists node; then
  log_error "Node.js is not installed. Please install Node.js first."
  exit 1
fi

if ! command_exists npm; then
  log_error "npm is not installed. Please install npm first."
  exit 1
fi

if ! command_exists pm2; then
  log "Installing PM2..."
  npm install -g pm2 || { log_error "Failed to install PM2"; exit 1; }
fi

# Create or update ecosystem.config.cjs
log "Creating/updating PM2 ecosystem config..."
cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [
    {
      name: "filmflex",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/filmflex/error.log",
      out_file: "/var/log/filmflex/out.log",
      merge_logs: true,
      max_memory_restart: "500M"
    }
  ]
};
EOF

# Check for environment file
if [ ! -f "$APP_DIR/.env" ]; then
  log_warning "Environment file not found. Creating a sample .env file..."
  cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
PGUSER=filmflex
PGPASSWORD=filmflex2024
PGDATABASE=filmflex
PGHOST=localhost
PGPORT=5432
SESSION_SECRET=your-secret-key-here
EOF
  log_warning "Please update the environment variables in .env file with your actual values."
fi

# Install dependencies
log "Installing dependencies..."
npm install || { log_error "Failed to install dependencies"; exit 1; }

# Build the application
log "Building application..."
npm run build || { log_error "Failed to build application"; exit 1; }

# Setup systemd service for PM2
log "Setting up systemd service..."
pm2 startup systemd || log_warning "Failed to set up PM2 startup hook"

# Start or restart the application with PM2
if pm2 list | grep -q "filmflex"; then
  log "Restarting application..."
  pm2 restart filmflex || { log_error "Failed to restart application"; exit 1; }
else
  log "Starting application..."
  pm2 start ecosystem.config.cjs || { log_error "Failed to start application"; exit 1; }
fi

# Save PM2 process list
pm2 save || log_warning "Failed to save PM2 process list"

# Get IP addresses for display
PUBLIC_IP=$(hostname -I | awk '{print $1}')

log_success "Application deployed successfully!"
log "Your FilmFlex application is now accessible at:"
log "  http://localhost:5000"
log "  http://$PUBLIC_IP:5000"
log "Deployment script completed successfully!"
log "For more information on managing your FilmFlex deployment, see DEPLOYMENT.md"