#!/bin/bash

#################################################################################
# Film Flex Deployment Script - Production Ready Version
# Description: Production-ready deployment script with ESM/TypeScript support
# Node Version: 22.16+
# Author: GitHub Copilot
# Date: June 16, 2025
#################################################################################

set -euo pipefail  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Fix SOURCE_DIR to point to project root (two levels up from scripts/deployment/)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-$PROJECT_ROOT}"
DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-/var/www/filmflex}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/filmflex}"
LOG_FILE="${LOG_FILE:-/var/log/filmflex-deploy.log}"
PM2_APP_NAME="${PM2_APP_NAME:-filmflex}"
NODE_VERSION="22.16"
NGINX_CONFIG="${NGINX_CONFIG:-/etc/nginx/sites-available/filmflex}"
ENVIRONMENT="${ENVIRONMENT:-production}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:5000/api/health}"
DATABASE_URL="${DATABASE_URL:-}"
ENABLE_SSL="${ENABLE_SSL:-false}"
DOMAIN_NAME="${DOMAIN_NAME:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

#################################################################################
# Logging Functions
#################################################################################

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

#################################################################################
# Error Handling
#################################################################################

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log_error "Check the log file at $LOG_FILE for details"
        
        # Attempt to restart the application if it was stopped
        if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
            if pm2 info "$PM2_APP_NAME" | grep -q "stopped"; then
                log_warning "Attempting to restart application after failed deployment"
                pm2 start "$PM2_APP_NAME" || log_error "Failed to restart application"
            fi
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

#################################################################################
# System Compatibility Checks
#################################################################################

check_system_compatibility() {
    log "Checking system compatibility..."
    
    # Check Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        log "Detected OS: $NAME $VERSION_ID"
        
        # Set package manager based on distribution
        if command -v apt-get &> /dev/null; then
            PACKAGE_MANAGER="apt-get"
        elif command -v yum &> /dev/null; then
            PACKAGE_MANAGER="yum"
        elif command -v dnf &> /dev/null; then
            PACKAGE_MANAGER="dnf"
        else
            log_warning "Unknown package manager, some features may not work"
            PACKAGE_MANAGER=""
        fi
    else
        log_warning "Cannot detect OS version"
    fi
    
    # Check for required system commands
    local required_commands=("curl" "git" "unzip")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            if [ -n "$PACKAGE_MANAGER" ]; then
                log "Installing $cmd..."
                sudo $PACKAGE_MANAGER update
                sudo $PACKAGE_MANAGER install -y "$cmd"
            else
                log_error "Please install $cmd manually"
                exit 1
            fi
        fi
    done
    
    log_success "System compatibility check passed"
}

#################################################################################
# Validation Functions
#################################################################################

validate_node_version() {
    log "Validating Node.js version..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        log "Installing Node.js via NodeSource repository..."
        
        # Install Node.js 22.x
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        # Verify installation
        if ! command -v node &> /dev/null; then
            log_error "Failed to install Node.js"
            exit 1
        fi
    fi
    
    local current_version=$(node --version | sed 's/v//')
    log "Current Node.js version: $current_version"
    log "Required Node.js version: $NODE_VERSION"
    
    # Extract major version for comparison
    local current_major=$(echo "$current_version" | cut -d. -f1)
    local required_major=$(echo "$NODE_VERSION" | cut -d. -f1)
    
    if [ "$current_major" -lt "$required_major" ]; then
        log_error "Node.js version $current_version is too old. Required: $NODE_VERSION or higher"
        exit 1
    fi
    
    log_success "Node.js version validation passed"
}

validate_pm2() {
    log "Validating PM2 installation..."
    
    if ! command -v pm2 &> /dev/null; then
        log "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        
        # Verify PM2 installation
        if ! command -v pm2 &> /dev/null; then
            log_error "Failed to install PM2"
            exit 1
        fi
        
        log_success "PM2 installed successfully"
    else
        log_success "PM2 is already installed"
    fi
}

validate_directories() {
    log "Validating directories..."
    log "Source directory: $SOURCE_DIR"
    log "Deployment directory: $DEPLOYMENT_DIR"
    
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "Source directory does not exist: $SOURCE_DIR"
        exit 1
    fi
    
    if [ ! -f "$SOURCE_DIR/package.json" ]; then
        log_error "package.json not found in source directory: $SOURCE_DIR"
        log "Available files in source directory:"
        ls -la "$SOURCE_DIR/" | head -10
        exit 1
    fi
    
    # Create deployment directory if it doesn't exist
    if [ ! -d "$DEPLOYMENT_DIR" ]; then
        log_warning "Deployment directory doesn't exist. Creating: $DEPLOYMENT_DIR"
        sudo mkdir -p "$DEPLOYMENT_DIR"
        sudo chown $(whoami):$(whoami) "$DEPLOYMENT_DIR"
    fi
    
    # Create backup directory if it doesn't exist
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "Backup directory doesn't exist. Creating: $BACKUP_DIR"
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $(whoami):$(whoami) "$BACKUP_DIR"
    fi
    
    log_success "Directory validation completed"
}

#################################################################################
# Environment and Security Validation
#################################################################################

validate_environment() {
    log "Validating production environment..."
    
    # Allow running as root in production environments
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root user - ensuring proper permissions will be set"
        # Set default user for file ownership if not specified
        DEPLOY_USER="${DEPLOY_USER:-www-data}"
    else
        # Check sudo access for non-root users
        if ! sudo -n true 2>/dev/null; then
            log_error "This script requires sudo access. Please ensure the user has sudo permissions"
            exit 1
        fi
        DEPLOY_USER=$(whoami)
    fi
    
    # Validate environment variables
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Running in PRODUCTION mode - additional checks enabled"
        
        # Check for required environment files
        if [ ! -f "$SOURCE_DIR/.env.production" ] && [ ! -f "$DEPLOYMENT_DIR/.env" ]; then
            log_warning "No production environment file found (.env.production or .env)"
            log_warning "Make sure environment variables are properly configured"
        fi
        
        # Check database connection if URL provided
        if [ -n "$DATABASE_URL" ]; then
            validate_database_connection
        fi
        
        # Check SSL certificate if enabled
        if [ "$ENABLE_SSL" = "true" ]; then
            validate_ssl_certificate
        fi
    fi
    
    log_success "Environment validation completed"
}

validate_database_connection() {
    log "Validating database connection..."
    
    # Test database connection using psql or connection string
    if command -v psql &> /dev/null; then
        if timeout 10 psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "Database connection successful"
        else
            log_warning "Failed to connect to database (non-fatal in deployment)"
            log_warning "Please verify DATABASE_URL and database server status after deployment"
        fi
    else
        log_warning "psql not found - skipping database connection test"
    fi
}

validate_ssl_certificate() {
    log "Validating SSL certificate..."
    
    if [ -z "$DOMAIN_NAME" ]; then
        log_error "DOMAIN_NAME is required when SSL is enabled"
        exit 1
    fi
    
    # Check if SSL certificate files exist
    local ssl_cert="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    local ssl_key="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    
    if [ ! -f "$ssl_cert" ] || [ ! -f "$ssl_key" ]; then
        log_warning "SSL certificate files not found"
        log_warning "Certificate: $ssl_cert"
        log_warning "Private Key: $ssl_key"
        log_warning "Consider running: sudo certbot --nginx -d $DOMAIN_NAME"
    else
        # Check certificate expiration
        local exp_date=$(openssl x509 -enddate -noout -in "$ssl_cert" | cut -d= -f2)
        local exp_timestamp=$(date -d "$exp_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (exp_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -lt 30 ]; then
            log_warning "SSL certificate expires in $days_until_expiry days"
            log_warning "Consider renewing the certificate soon"
        else
            log_success "SSL certificate is valid (expires in $days_until_expiry days)"
        fi
    fi
}

#################################################################################
# System Resource Validation
#################################################################################

validate_system_resources() {
    log "Validating system resources..."
    
    # Check available disk space (require at least 2GB free)
    local available_space=$(df "$DEPLOYMENT_DIR" | awk 'NR==2 {print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_error "Insufficient disk space. Required: 2GB, Available: $(($available_space / 1024))MB"
        exit 1
    fi
    
    # Check available memory (require at least 1GB free)
    local available_memory=$(free | awk 'NR==2{printf "%.0f", $7/1024}')
    if [ "$available_memory" -lt 1024 ]; then
        log_warning "Low available memory: ${available_memory}MB"
        log_warning "Consider stopping other services or adding more RAM"
    fi
    
    # Check CPU load (compatible approach without bc)
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_threshold_int=$(echo "$cpu_load" | cut -d. -f1)
    
    if [ "$cpu_threshold_int" -gt 4 ]; then
        log_warning "High CPU load detected: $cpu_load"
        log_warning "Consider waiting for load to decrease before deployment"
    fi
    
    log_success "System resources validation completed"
}

#################################################################################
# Security Hardening
#################################################################################

apply_security_hardening() {
    log "Applying security hardening..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Set proper file permissions
    log "Setting secure file permissions..."
    
    # Application files
    find . -type f -name "*.js" -exec chmod 644 {} \;
    find . -type f -name "*.json" -exec chmod 644 {} \;
    find . -type f -name "*.html" -exec chmod 644 {} \;
    find . -type f -name "*.css" -exec chmod 644 {} \;
    
    # Directories
    find . -type d -exec chmod 755 {} \;
    
    # Environment files (more restrictive)
    if [ -f ".env" ]; then
        chmod 600 .env
        log "Secured .env file permissions"
    fi
    
    # Log directory
    if [ -d "logs" ]; then
        chown -R $(whoami):$(whoami) logs/
        chmod 755 logs/
    fi
    
    # Remove sensitive files if they exist
    rm -f .env.example .env.local .env.development 2>/dev/null || true
    rm -rf .git 2>/dev/null || true
    
    log_success "Security hardening completed"
}

#################################################################################
# Application Management Functions
#################################################################################

stop_application() {
    log "Stopping application gracefully..."
    
    if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
        log "Found PM2 process: $PM2_APP_NAME"
        
        # Force delete the process to ensure complete restart
        log "Force stopping PM2 process to ensure clean restart..."
        pm2 delete "$PM2_APP_NAME" || true
        
        # Wait for process to fully stop
        local timeout=10
        local count=0
        while pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1 && [ $count -lt $timeout ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if [ $count -ge $timeout ]; then
            log_warning "Force killing all PM2 processes..."
            pm2 kill || true
        fi
        
        log_success "Application stopped completely"
    else
        log_warning "PM2 process '$PM2_APP_NAME' not found or not running"
    fi
}

create_enhanced_ecosystem_config() {
    log "Creating enhanced PM2 ecosystem configuration..."
    
    cd "$DEPLOYMENT_DIR"
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
    apps: [{
        name: 'filmflex',
        script: './dist/index.js',
        instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
            PORT: 5000,
            NODE_OPTIONS: '--max-old-space-size=512'
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 5000,
            NODE_OPTIONS: '--max-old-space-size=512 --enable-source-maps'
        },
        // Logging
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        
        // Process management
        max_memory_restart: '512M',
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 5000,
        
        // Health monitoring
        health_check_grace_period: 10000,
        
        // Restart policies
        restart_delay: 4000,
        max_restarts: 10,
        min_uptime: 10000,
        
        // Source maps support for better error reporting
        source_map_support: true,
        
        // Environment-specific settings
        node_args: process.env.NODE_ENV === 'production' 
            ? ['--max-old-space-size=512', '--enable-source-maps']
            : ['--max-old-space-size=512', '--inspect=9229']
    }]
};
EOF
    
    log_success "Enhanced PM2 ecosystem configuration created"
}

start_application() {
    log "Starting application with enhanced configuration..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Create logs directory
    mkdir -p logs
    
    # Update ecosystem config to use the correct entry point
    if [ -f "dist/server/index.js" ]; then
        update_ecosystem_config "dist/server/index.js"
    elif [ -f "dist/index.js" ]; then
        update_ecosystem_config "dist/index.js"
    else
        log_error "Cannot find main application file"
        exit 1
    fi
    
    # Ensure PM2 is completely clean
    pm2 kill 2>/dev/null || true
    sleep 2
    
    # Start with ecosystem config
    log "Starting application with PM2..."
    if pm2 start ecosystem.config.js --env production; then
        log_success "Application started successfully"
    else
        log_error "Failed to start application with PM2"
        log "Attempting to start with direct command..."
        
        # Fallback to direct start
        local main_file=""
        if [ -f "dist/server/index.js" ]; then
            main_file="dist/server/index.js"
        elif [ -f "dist/index.js" ]; then
            main_file="dist/index.js"
        fi
        
        if [ -n "$main_file" ] && pm2 start "$main_file" --name "$PM2_APP_NAME" --node-args="--max-old-space-size=512"; then
            log_success "Application started with fallback method"
        else
            log_error "Failed to start application with fallback method"
            log_error "Checking for common startup issues..."
            
            # Check if the file exists and is executable
            if [ ! -f "$main_file" ]; then
                log_error "$main_file not found"
            else
                log "$main_file exists, checking permissions..."
                ls -la "$main_file"
            fi
            
            # Try to run directly to see error
            log "Attempting direct execution for debugging..."
            timeout 10s node "$main_file" || log_error "Direct execution failed"
            
            exit 1
        fi
    fi
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    if pm2 startup | grep -q "sudo"; then
        log "PM2 startup script needs to be configured manually"
        log "Run the command provided by PM2 startup"
    fi
    
    # Wait for application to stabilize
    sleep 5
    
    # Show application status
    pm2 status
    pm2 info "$PM2_APP_NAME"
    
    # Display build version information
    if [ -f "dist/build-info.json" ]; then
        local build_version=$(node -e "const info = require('./dist/build-info.json'); console.log(info.buildVersion || 'unknown')")
        log_success "Application started with build version: $build_version"
    fi
}

#################################################################################
# Backup Functions
#################################################################################

create_backup() {
    log "Creating backup of current deployment..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    if [ -d "$DEPLOYMENT_DIR" ] && [ "$(ls -A $DEPLOYMENT_DIR)" ]; then
        log "Backing up current deployment to: $backup_path"
        
        mkdir -p "$backup_path"
        
        # Copy important files and directories
        if [ -d "$DEPLOYMENT_DIR/dist" ]; then
            cp -r "$DEPLOYMENT_DIR/dist" "$backup_path/" 2>/dev/null || true
        fi
        
        if [ -f "$DEPLOYMENT_DIR/package.json" ]; then
            cp "$DEPLOYMENT_DIR/package.json" "$backup_path/" 2>/dev/null || true
        fi
        
        if [ -f "$DEPLOYMENT_DIR/package-lock.json" ]; then
            cp "$DEPLOYMENT_DIR/package-lock.json" "$backup_path/" 2>/dev/null || true
        fi
        
        if [ -f "$DEPLOYMENT_DIR/ecosystem.config.js" ]; then
            cp "$DEPLOYMENT_DIR/ecosystem.config.js" "$backup_path/" 2>/dev/null || true
        fi
        
        if [ -d "$DEPLOYMENT_DIR/public" ]; then
            cp -r "$DEPLOYMENT_DIR/public" "$backup_path/" 2>/dev/null || true
        fi
        
        # Create backup info file
        cat > "$backup_path/backup_info.txt" << EOF
Backup created: $(date)
Source deployment: $DEPLOYMENT_DIR
Git commit: $(cd "$SOURCE_DIR" && git rev-parse HEAD 2>/dev/null || echo "Not available")
Git branch: $(cd "$SOURCE_DIR" && git branch --show-current 2>/dev/null || echo "Not available")
EOF
        
        log_success "Backup created successfully: $backup_path"
        
        # Clean up old backups (keep last 5)
        log "Cleaning up old backups (keeping last 5)..."
        cd "$BACKUP_DIR"
        ls -t | grep "backup_" | tail -n +6 | xargs -r rm -rf
        
    else
        log_warning "No existing deployment found to backup"
    fi
}

#################################################################################
# Deployment Functions
#################################################################################

copy_source_code() {
    log "Copying source code to deployment directory..."
    
    # Create temporary directory for rsync exclusions
    local exclude_file=$(mktemp)
    
    cat > "$exclude_file" << EOF
node_modules/
.git/
.env*
*.log
logs/
temp/
tmp/
.cache/
coverage/
.nyc_output/
dist/
build/
.DS_Store
Thumbs.db
*.swp
*.swo
*~
.vscode/
.idea/
*.sqlite
*.db
migrations/
cypress/videos/
cypress/screenshots/
test-results/
EOF

    # Use rsync for efficient copying with exclusions
    if command -v rsync &> /dev/null; then
        log "Using rsync for efficient file copying..."
        rsync -av --delete --exclude-from="$exclude_file" "$SOURCE_DIR/" "$DEPLOYMENT_DIR/"
    else
        log "rsync not available, using cp with manual exclusions..."
        
        # Clear deployment directory first (except for persistent files)
        find "$DEPLOYMENT_DIR" -mindepth 1 -not -path "*/node_modules*" -not -name ".env*" -delete 2>/dev/null || true
        
        # Copy all files except excluded ones
        cp -r "$SOURCE_DIR"/* "$DEPLOYMENT_DIR/" 2>/dev/null || true
        
        # Remove excluded directories if they were copied
        rm -rf "$DEPLOYMENT_DIR/node_modules" 2>/dev/null || true
        rm -rf "$DEPLOYMENT_DIR/.git" 2>/dev/null || true
        rm -rf "$DEPLOYMENT_DIR/logs" 2>/dev/null || true
        rm -rf "$DEPLOYMENT_DIR/dist" 2>/dev/null || true
    fi
    
    # Clean up temporary file
    rm -f "$exclude_file"
    
    log_success "Source code copied successfully"
}

check_dependencies() {
    log "Checking if dependencies need to be updated..."
    
    local needs_install=false
    
    cd "$DEPLOYMENT_DIR"
    
    # Check if node_modules exists and package files are newer
    if [ ! -d "node_modules" ]; then
        needs_install=true
        log "node_modules directory doesn't exist"
    elif [ "package.json" -nt "node_modules" ]; then
        needs_install=true
        log "package.json is newer than node_modules"
    elif [ -f "package-lock.json" ] && [ "package-lock.json" -nt "node_modules" ]; then
        needs_install=true
        log "package-lock.json is newer than node_modules"
    fi
    
    if [ "$needs_install" = true ]; then
        log "Dependencies need to be installed/updated"
        return 0
    else
        log "Dependencies are up to date"
        return 1
    fi
}

install_dependencies() {
    log "Installing/updating dependencies..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
      # Remove existing node_modules for clean install
    if [ -d "node_modules" ]; then
        log "Removing existing node_modules for clean install..."
        rm -rf node_modules/
    fi
    
    # Install dependencies
    if [ -f "package-lock.json" ]; then
        log "Using npm ci for clean install..."
        if ! npm ci --production; then
            log_error "npm ci failed, trying npm install..."
            npm install --production
        fi
    else
        log "Using npm install..."
        npm install --production
    fi
    
    # Verify installation
    if [ ! -d "node_modules" ]; then
        log_error "node_modules directory was not created"
        exit 1
    fi
    
    log_success "Dependencies installed successfully"
}

#################################################################################
# Enhanced Build Process with ESM/TypeScript Support
#################################################################################

validate_typescript_config() {
    log "Validating TypeScript configuration..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Check for TypeScript config files - prioritize server config
    if [ -f "tsconfig.server.json" ]; then
        log "Found server-specific TypeScript configuration"
        TSCONFIG_FILE="tsconfig.server.json"
        
        # Validate tsconfig.server.json syntax
        if ! node -e "JSON.parse(require('fs').readFileSync('tsconfig.server.json', 'utf8'))" 2>/dev/null; then
            log_error "Invalid tsconfig.server.json syntax"
            exit 1
        fi
        log "Server-specific TypeScript config validated"
        
    elif [ -f "tsconfig.json" ]; then
        log_warning "Using main tsconfig.json - checking if it supports compilation"
        TSCONFIG_FILE="tsconfig.json"
        
        # Validate tsconfig.json syntax
        if ! node -e "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" 2>/dev/null; then
            log_error "Invalid tsconfig.json syntax"
            exit 1
        fi
        
        # Check if noEmit is true, which would prevent compilation
        local no_emit=$(node -e "const config = JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8')); console.log(config.compilerOptions?.noEmit || false)")
        if [ "$no_emit" = "true" ]; then
            log_warning "Main tsconfig.json has noEmit: true, creating temporary server config"
            create_server_tsconfig
            TSCONFIG_FILE="tsconfig.server.json"
        fi    else
        log_error "No TypeScript configuration found"
        exit 1
    fi
    
    log_success "TypeScript configuration validated: $TSCONFIG_FILE"
}

create_server_tsconfig() {
    log "Creating server-specific TypeScript configuration..."
    
    cd "$DEPLOYMENT_DIR"
    
    cat > tsconfig.server.json << 'EOF'
{
  "include": [
    "server/**/*.ts",
    "shared/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "client",
    "cypress",
    "tests",
    "dist"
  ],
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": false,
    "sourceMap": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "types": [
      "node"
    ],
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"],
      "@server/*": ["server/*"]
    }
  }
}
EOF
    
    log_success "Server TypeScript configuration created"
}

fix_module_resolution() {
    log "Applying module resolution fixes..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Create or update package.json with proper ESM configuration
    log "Ensuring package.json has correct module configuration..."
    
    # Use Node.js to safely update package.json
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Ensure ESM configuration
        pkg.type = 'module';
        
        // Update main entry point if needed
        if (!pkg.main || pkg.main === 'index.js') {
            pkg.main = 'dist/server/index.js';
        }
        
        // Ensure scripts exist
        if (!pkg.scripts) pkg.scripts = {};
        if (!pkg.scripts.start) pkg.scripts.start = 'node dist/server/index.js';
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('package.json updated with ESM configuration');
    " 2>/dev/null || log_warning "Failed to update package.json automatically"
    
    log_success "Module resolution fixes applied"
}

build_application() {
    log "Building application with enhanced TypeScript/ESM support..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Validate TypeScript configuration
    validate_typescript_config
    
    # Apply module resolution fixes
    fix_module_resolution
    
    # Clean previous build COMPLETELY
    log "Cleaning previous build artifacts completely..."
    rm -rf dist/ 2>/dev/null || true
    rm -rf build/ 2>/dev/null || true
    rm -rf client/dist/ 2>/dev/null || true
    rm -rf .vite/ 2>/dev/null || true
    
    # Clear any cached builds
    npm cache clean --force 2>/dev/null || true
    
    # Install all dependencies (including dev) for build
    log "Installing dependencies for build..."
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # Verify TypeScript compiler is available
    if ! npx tsc --version > /dev/null 2>&1; then
        log_error "TypeScript compiler not available"
        log "Installing TypeScript..."
        npm install -g typescript
        
        if ! npx tsc --version > /dev/null 2>&1; then
            log_error "Failed to install TypeScript compiler"
            exit 1
        fi
    fi
    
    log "TypeScript compiler version: $(npx tsc --version)"
    
    # Build client-side application first (if exists)
    if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
        log "Building client-side application with Vite..."
        if npm run build:client 2>/dev/null || npm run build 2>/dev/null; then
            log_success "Client-side build completed"
        else
            log_warning "Client-side build failed, continuing with server build..."
        fi
    fi
    
    # Build TypeScript to JavaScript using server config
    log "Compiling TypeScript to JavaScript using $TSCONFIG_FILE..."
    if npx tsc -p "$TSCONFIG_FILE"; then
        log_success "TypeScript compilation completed"
    else
        log_error "TypeScript compilation failed"
        log_error "Checking for common TypeScript errors..."
        
        # Run TypeScript with more verbose output for debugging
        log "Running TypeScript compilation with verbose output..."
        npx tsc -p "$TSCONFIG_FILE" --listFiles --diagnostics 2>&1 | tail -20
        
        # Check if we can compile with less strict options
        log_warning "Attempting compilation with relaxed settings..."
        npx tsc -p "$TSCONFIG_FILE" --skipLibCheck --noUnusedLocals false --noUnusedParameters false 2>&1 | tail -10
        
        exit 1
    fi
    
    # Verify build output exists
    if [ ! -d "dist" ]; then
        log_error "Build output directory 'dist' not created"
        log "Checking what happened during compilation..."
        ls -la . | grep -E "(dist|build)"
        exit 1
    fi
    
    # Check for the main application file
    local main_file=""
    if [ -f "dist/server/index.js" ]; then
        main_file="dist/server/index.js"
    elif [ -f "dist/index.js" ]; then
        main_file="dist/index.js"
    else
        log_error "Main application file not found"
        log "Available files in dist:"
        find dist -name "*.js" -type f | head -10
        
        # Try to find any server entry point
        if find dist -name "*.js" -path "*/server/*" | head -1 > /dev/null; then
            main_file=$(find dist -name "*.js" -path "*/server/*" | head -1)
            log_warning "Found potential entry point: $main_file"
        else
            exit 1
        fi
    fi
    
    log_success "Main application file found: $main_file"
    
    # Update ecosystem config to use the correct entry point
    update_ecosystem_config "$main_file"
    
    # Copy static assets and public files with version busting
    log "Copying static assets with cache busting..."
    if [ -d "public" ]; then
        mkdir -p dist/public
        cp -r public/* dist/public/ 2>/dev/null || true
        log "Public files copied to dist/public/"
    fi
    
    # Copy client build output if it exists
    if [ -d "client/dist" ]; then
        log "Copying client-side build output..."
        mkdir -p dist/public
        cp -r client/dist/* dist/public/ 2>/dev/null || true
        log "Client build files copied to dist/public/"
    fi
    
    # Copy shared files if they exist
    if [ -d "shared" ] && [ ! -d "dist/shared" ]; then
        cp -r shared dist/ 2>/dev/null || true
        log "Shared files copied to dist/"
    fi
    
    # Copy any additional required files
    for file in robots.txt sitemap.xml .env.example; do
        if [ -f "$file" ]; then
            cp "$file" dist/ 2>/dev/null || true
        fi
    done
    
    # Create cache-busting version file
    local build_version=$(date +%s)
    echo "$build_version" > dist/public/.version 2>/dev/null || true
    echo "window.APP_VERSION = '$build_version';" > dist/public/version.js 2>/dev/null || true
    
    # Fix import paths in compiled JavaScript files for ESM
    log "Fixing ESM import paths in compiled files..."
    fix_esm_imports
    
    # Verify the built application can be imported
    log "Verifying built application..."
    if timeout 10s node -e "import('./$main_file').catch(e => { console.error('Import failed:', e.message); process.exit(1); })" 2>/dev/null; then
        log_success "Built application verification passed"
    else
        log_warning "Built application verification failed - this may be normal for server applications"
        log "Checking for syntax errors in main file..."
        node --check "$main_file" && log "Syntax check passed" || log_error "Syntax errors found"
        
        # Check for common import issues
        log "Checking for common import issues..."
        grep -n "from ['\"]\..*[^js]['\"]" "$main_file" | head -5 || log "No missing .js extensions found"
    fi
    
    # Remove dev dependencies to reduce size
    log "Removing development dependencies..."
    npm prune --production
    
    # Create build info file with version information
    cat > dist/build-info.json << EOF
{
    "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "buildVersion": "$build_version",
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "gitCommit": "$(cd "$SOURCE_DIR" && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "gitBranch": "$(cd "$SOURCE_DIR" && git branch --show-current 2>/dev/null || echo 'unknown')",
    "environment": "$ENVIRONMENT",
    "mainFile": "$main_file",
    "tsConfig": "$TSCONFIG_FILE"
}
EOF
    
    log_success "Application built successfully with ESM/TypeScript support (Version: $build_version)"
}

fix_esm_imports() {
    log "Fixing ESM import paths for Node.js compatibility..."
    
    # Find all JavaScript files in dist and fix import extensions
    find dist -name "*.js" -type f | while read -r file; do
        # Add .js extensions to relative imports that don't have them
        sed -i.bak -E "s/from ['\"](\.[^'\"]*[^js])['\"];/from '\1.js';/g" "$file" 2>/dev/null || true
        sed -i.bak -E "s/import ['\"](\.[^'\"]*[^js])['\"];/import '\1.js';/g" "$file" 2>/dev/null || true
        # Remove backup files
        rm -f "$file.bak" 2>/dev/null || true
    done
    
    log "ESM import paths fixed"
}

update_ecosystem_config() {
    local main_file="$1"
    log "Updating PM2 ecosystem configuration for entry point: $main_file"
    
    cd "$DEPLOYMENT_DIR"
    
    cat > ecosystem.config.js << EOF
module.exports = {
    apps: [{
        name: 'filmflex',
        script: './$main_file',
        instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
            PORT: 5000,
            NODE_OPTIONS: '--max-old-space-size=512'
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 5000,
            NODE_OPTIONS: '--max-old-space-size=512 --enable-source-maps'
        },
        // Logging
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        
        // Process management
        max_memory_restart: '512M',
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 10000,
        
        // Health monitoring
        health_check_grace_period: 15000,
        
        // Restart policies
        restart_delay: 4000,
        max_restarts: 10,
        min_uptime: 10000,
        
        // Source maps support for better error reporting
        source_map_support: true,
        
        // Environment-specific settings
        node_args: process.env.NODE_ENV === 'production' 
            ? ['--max-old-space-size=512', '--enable-source-maps']
            : ['--max-old-space-size=512']
    }]
};
EOF
    
    log_success "PM2 ecosystem configuration updated with correct entry point"
}
#################################################################################
# Health Check Functions
#################################################################################

health_check() {
    log "Performing comprehensive health check..."
    
    local max_attempts=60  # Increased timeout for ESM startup
    local attempt=1
    local health_url="http://localhost:5000/api/health"
    local app_url="http://localhost:5000"
    
    # Wait for application to initialize
    log "Waiting for application to initialize..."
    sleep 10
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts"
        
        # Check if PM2 process is running
        if ! pm2 info "$PM2_APP_NAME" | grep -q "online"; then
            log_error "PM2 process is not running"
            log "PM2 process status:"
            pm2 info "$PM2_APP_NAME"
            log "Recent PM2 logs:"
            pm2 logs "$PM2_APP_NAME" --lines 20
            return 1
        fi
        
        # Check application health endpoint
        if curl -f -s -m 10 "$health_url" > /dev/null 2>&1; then
            log_success "Health endpoint is responding"
            
            # Additional checks for application functionality
            log "Performing additional functionality checks..."
            
            # Check main application endpoint
            if curl -f -s -m 10 "$app_url" > /dev/null 2>&1; then
                log_success "Main application endpoint is responding"
            else
                log_warning "Main application endpoint not responding, but health check passed"
            fi
            
            # Check if application is serving expected content
            local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$app_url")
            if [ "$response_code" = "200" ]; then
                log_success "Application is serving content correctly (HTTP $response_code)"
            else
                log_warning "Application returned HTTP $response_code"
            fi
            
            return 0
        fi
        
        # Check application logs for errors
        if [ $((attempt % 10)) -eq 0 ]; then
            log "Checking application logs for errors..."
            pm2 logs "$PM2_APP_NAME" --lines 5 | grep -i error || true
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Health check timeout after $max_attempts attempts"
    log_error "Final PM2 status:"
    pm2 info "$PM2_APP_NAME"
    log_error "Recent application logs:"
    pm2 logs "$PM2_APP_NAME" --lines 30
    
    return 1
}

#################################################################################
# Nginx Configuration
#################################################################################

setup_nginx() {
    log "Setting up Nginx configuration..."
    
    if [ ! -f "$NGINX_CONFIG" ]; then
        log "Creating Nginx configuration file..."
        
        sudo tee "$NGINX_CONFIG" > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME:-localhost};
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias $DEPLOYMENT_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF
        
        # Enable SSL if requested
        if [ "$ENABLE_SSL" = "true" ] && [ -n "$DOMAIN_NAME" ]; then
            log "Adding SSL configuration..."
            sudo tee -a "$NGINX_CONFIG" > /dev/null << EOF

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /static/ {
        alias $DEPLOYMENT_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}
EOF
        fi
        
        # Enable the site
        if [ ! -L "/etc/nginx/sites-enabled/filmflex" ]; then
            sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/filmflex
        fi
        
        # Test and reload Nginx
        if sudo nginx -t; then
            sudo systemctl reload nginx
            log_success "Nginx configuration updated and reloaded"
        else
            log_error "Nginx configuration test failed"
            exit 1
        fi
    else
        log "Nginx configuration already exists"
    fi
}

#################################################################################
# Rollback Functionality
#################################################################################

rollback_deployment() {
    log "Initiating rollback to previous deployment..."
    
    # Find the most recent backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/backup_* 2>/dev/null | head -n1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log "Rolling back to: $latest_backup"
    
    # Stop current application
    stop_application
    
    # Restore from backup
    log "Restoring files from backup..."
    rm -rf "$DEPLOYMENT_DIR"/* 2>/dev/null || true
    cp -r "$latest_backup"/* "$DEPLOYMENT_DIR/" 2>/dev/null || true
    
    # Restore node_modules if needed
    cd "$DEPLOYMENT_DIR"
    if [ ! -d "node_modules" ]; then
        log "Reinstalling dependencies after rollback..."
        npm ci --production
    fi
    
    # Start application
    start_application
    
    # Health check
    if health_check; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback completed but health check failed"
        exit 1
    fi
}

#################################################################################
# Monitoring and Alerting Setup
#################################################################################

setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Setup PM2 monitoring
    if command -v pm2 &> /dev/null; then
        # Configure PM2 monitoring
        pm2 set pm2:log-date-format 'YYYY-MM-DD HH:mm:ss Z'
        pm2 set pm2:max-memory-restart '500M'
        
        # Setup log rotation
        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 10M
        pm2 set pm2-logrotate:retain 30
        pm2 set pm2-logrotate:compress true
        
        log_success "PM2 monitoring configured"
    fi
    
    # Setup system monitoring script
    local monitor_script="/usr/local/bin/filmflex-monitor.sh"
    
    sudo tee "$monitor_script" > /dev/null << 'EOF'
#!/bin/bash
# FilmFlex System Monitor

APP_NAME="filmflex"
HEALTH_URL="http://localhost:5000/api/health"
LOG_FILE="/var/log/filmflex-monitor.log"

log_monitor() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check application health
if ! curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
    log_monitor "ERROR: Application health check failed"
    
    # Check if PM2 process is running
    if ! pm2 info "$APP_NAME" | grep -q "online"; then
        log_monitor "CRITICAL: PM2 process is down, attempting restart"
        pm2 restart "$APP_NAME"
        
        # Send alert (customize with your alerting system)
        # mail -s "FilmFlex Application Down" admin@example.com < /dev/null
        
        exit 1
    fi
else
    log_monitor "INFO: Application health check passed"
fi

# Check disk usage
DISK_USAGE=$(df /var/www/filmflex | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log_monitor "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    log_monitor "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi
EOF

    sudo chmod +x "$monitor_script"
    
    # Setup cron job for monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * $monitor_script") | crontab -
      log_success "Monitoring and alerting setup completed"
}

#################################################################################
# Performance Optimization Functions
#################################################################################

optimize_performance() {
    log "Applying performance optimizations..."
    
    # Node.js memory settings
    log "Configuring Node.js memory settings..."
    export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
    
    # PM2 performance configurations
    if command -v pm2 &> /dev/null; then
        log "Configuring PM2 performance settings..."
        pm2 set pm2:max-memory-restart '512M'
        pm2 set pm2:log-date-format 'YYYY-MM-DD HH:mm:ss Z'
        pm2 set pm2:autodump true
        pm2 set pm2:autodump-interval 300000  # 5 minutes
    fi
    
    # System TCP optimizations
    log "Applying system TCP optimizations..."
    if [ -f /etc/sysctl.conf ]; then
        # Backup original sysctl.conf
        sudo cp /etc/sysctl.conf /etc/sysctl.conf.bak.$(date +%Y%m%d) 2>/dev/null || true
        
        # Apply network optimizations
        sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'

# FilmFlex Performance Optimizations
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_fin_timeout = 30
EOF
        
        # Apply the changes
        sudo sysctl -p 2>/dev/null || log_warning "Failed to apply sysctl optimizations"
    fi
    
    # File descriptor limits
    log "Configuring file descriptor limits..."
    sudo tee /etc/security/limits.d/filmflex.conf > /dev/null << 'EOF'
# FilmFlex file descriptor limits
*               soft    nofile          65536
*               hard    nofile          65536
root            soft    nofile          65536
root            hard    nofile          65536
EOF
    
    log_success "Performance optimizations applied"
}

setup_ssl_certificate() {
    log "Setting up SSL certificate..."
    
    # Check if domain name is set
    if [ -z "$DOMAIN_NAME" ]; then
        log_warning "DOMAIN_NAME not set, skipping SSL certificate setup"
        log_warning "To setup SSL later, set DOMAIN_NAME and run: certbot --nginx -d your-domain.com"
        return 0
    fi
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        if [ -n "$PACKAGE_MANAGER" ]; then
            case "$PACKAGE_MANAGER" in
                apt-get)
                    sudo apt-get update
                    sudo apt-get install -y certbot python3-certbot-nginx
                    ;;
                yum|dnf)
                    sudo $PACKAGE_MANAGER install -y certbot python3-certbot-nginx
                    ;;
                *)
                    log_warning "Unknown package manager, please install certbot manually"
                    return 0
                    ;;
            esac
        else
            log_warning "Cannot install certbot automatically"
            return 0
        fi
    fi
    
    # Check if nginx is running
    if ! systemctl is-active --quiet nginx; then
        log "Starting nginx for SSL certificate validation..."
        sudo systemctl start nginx
    fi
    
    # Obtain Let's Encrypt certificate
    log "Obtaining Let's Encrypt certificate for $DOMAIN_NAME..."
    if sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME" --redirect; then
        log_success "SSL certificate obtained and configured"
        
        # Setup auto-renewal
        log "Setting up SSL certificate auto-renewal..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
        
        log_success "SSL certificate auto-renewal configured"
    else
        log_error "Failed to obtain SSL certificate"
        log_warning "SSL setup failed, application will run on HTTP only"
    fi
}

setup_firewall() {
    log "Configuring firewall..."
    
    # Check if UFW is available (Ubuntu/Debian)
    if command -v ufw &> /dev/null; then
        log "Configuring UFW firewall..."
        
        # Enable UFW
        sudo ufw --force enable
        
        # Allow SSH
        sudo ufw allow ssh
        sudo ufw allow 22/tcp
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Allow application port (restrict to localhost)
        sudo ufw allow from 127.0.0.1 to any port 5000
        
        log_success "UFW firewall configured"
        
    elif command -v firewall-cmd &> /dev/null; then
        log "Configuring firewalld..."
        
        # Start firewalld
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        
        # Allow HTTP and HTTPS
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --permanent --add-service=ssh
        
        # Reload firewall
        sudo firewall-cmd --reload
        
        log_success "Firewalld configured"
        
    elif command -v iptables &> /dev/null; then
        log "Configuring iptables..."
        
        # Basic iptables rules
        sudo iptables -A INPUT -i lo -j ACCEPT
        sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 5000 -s 127.0.0.1 -j ACCEPT
        sudo iptables -A INPUT -j DROP
        
        # Save iptables rules
        if command -v iptables-save &> /dev/null; then
            sudo iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
        fi
        
        log_success "Iptables configured"
    else
        log_warning "No supported firewall found, skipping firewall configuration"
        log_warning "Please configure your firewall manually to allow ports 80, 443, and restrict 5000 to localhost"
    fi
}

cleanup_deployment() {
    log "Performing post-deployment cleanup..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Clean up temporary files
    log "Cleaning up temporary files..."
    rm -rf /tmp/filmflex-* 2>/dev/null || true
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name "*.log.old" -delete 2>/dev/null || true
    
    # Clean up old node_modules cache
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache/* 2>/dev/null || true
    fi
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Set final file permissions
    log "Setting final file permissions..."
    
    # Ensure proper ownership
    if [ "$(whoami)" != "root" ]; then
        sudo chown -R $(whoami):$(whoami) "$DEPLOYMENT_DIR" 2>/dev/null || true
    fi
    
    # Set proper permissions for key files
    chmod 755 "$DEPLOYMENT_DIR" 2>/dev/null || true
    find "$DEPLOYMENT_DIR" -type d -exec chmod 755 {} \; 2>/dev/null || true
    find "$DEPLOYMENT_DIR" -type f -name "*.js" -exec chmod 644 {} \; 2>/dev/null || true
    find "$DEPLOYMENT_DIR" -type f -name "*.json" -exec chmod 644 {} \; 2>/dev/null || true
    
    # Secure sensitive files
    if [ -f ".env" ]; then
        chmod 600 .env
    fi
    
    # Create log rotation for application logs
    if [ -d "logs" ]; then
        log "Setting up log rotation..."
        sudo tee /etc/logrotate.d/filmflex > /dev/null << EOF
$DEPLOYMENT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOF
    fi
    
    # Optimize file system cache
    log "Optimizing file system cache..."
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
    
    # Create deployment info file
    log "Creating deployment information file..."
    cat > deployment-info.json << EOF
{
    "deploymentDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deploymentVersion": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "environment": "$ENVIRONMENT",
    "deploymentDir": "$DEPLOYMENT_DIR",
    "healthCheckUrl": "$HEALTH_CHECK_URL"
}
EOF
    
    log_success "Post-deployment cleanup completed"
}

#################################################################################
# Database Migration Functions
#################################################################################

run_database_migrations() {
    log "Running database migrations..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Check if migration scripts exist
    if [ -d "migrations" ] || [ -f "drizzle.config.ts" ]; then
        log "Found database migration files"
        
        # Check if DATABASE_URL is set - make it optional for deployment
        if [ -z "$DATABASE_URL" ]; then
            log_warning "DATABASE_URL not set - skipping database migrations"
            log_warning "To run migrations later, set DATABASE_URL and run:"
            log_warning "  cd $DEPLOYMENT_DIR && npm install drizzle-kit --no-save && npx drizzle-kit push"
            log_warning "  Or manually run SQL files from migrations/ directory"
            return 0
        fi
        
        # Run Drizzle migrations if config exists
        if [ -f "drizzle.config.ts" ]; then
            log "Running Drizzle migrations..."
            
            # Check if drizzle-kit is available
            if ! npm list drizzle-kit > /dev/null 2>&1 && ! npx drizzle-kit --version > /dev/null 2>&1; then
                log_warning "drizzle-kit not found in production dependencies"
                log "Installing drizzle-kit temporarily for migrations..."
                
                # Install drizzle-kit temporarily
                if npm install drizzle-kit --no-save > /dev/null 2>&1; then
                    log_success "drizzle-kit installed temporarily"
                else
                    log_error "Failed to install drizzle-kit"
                    log_warning "Skipping Drizzle migrations - will try SQL migrations instead"
                    run_sql_migrations
                    return $?
                fi
            fi
            
            # Set DATABASE_URL for drizzle if not already exported
            export DATABASE_URL="$DATABASE_URL"
            
            # Try different migration commands
            if timeout 30 npm run db:push 2>/dev/null; then
                log_success "Drizzle push completed successfully"
                return 0
            elif timeout 30 npx drizzle-kit push 2>/dev/null; then
                log_success "Drizzle migrations completed successfully"
                return 0
            elif timeout 30 npx drizzle-kit migrate 2>/dev/null; then
                log_success "Drizzle migrations completed successfully"
                return 0
            else
                log_warning "Drizzle migrations failed, attempting SQL migrations fallback"
                run_sql_migrations
                return $?
            fi
            
        elif [ -d "migrations" ]; then
            log "Running SQL migrations from migrations directory..."
            run_sql_migrations
            return $?
        fi
    else
        log "No migration files found, skipping database migrations"
        return 0
    fi
}

run_sql_migrations() {
    log "Running SQL migrations from migrations directory..."
    
    cd "$DEPLOYMENT_DIR"
    
    if [ ! -d "migrations" ]; then
        log_warning "No migrations directory found"
        return 0
    fi
    
    # Check if we have SQL migration files
    if ! ls migrations/*.sql > /dev/null 2>&1; then
        log_warning "No SQL migration files found in migrations directory"
        return 0
    fi
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set, cannot run SQL migrations"
        log_warning "To run SQL migrations manually later:"
        log_warning "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
        log_warning "  psql \$DATABASE_URL -f migrations/your_migration.sql"
        return 0  # Return success to not fail deployment
    fi
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_warning "psql not found, cannot run SQL migrations"
        log "Attempting to install postgresql-client..."
        
        if [ -n "$PACKAGE_MANAGER" ]; then
            if sudo $PACKAGE_MANAGER update && sudo $PACKAGE_MANAGER install -y postgresql-client; then
                log_success "postgresql-client installed"
            else
                log_warning "Failed to install postgresql-client automatically"
                log_warning "Please install postgresql-client manually to run SQL migrations"
                return 0  # Return success to not fail deployment
            fi
        else
            log_warning "Cannot install postgresql-client automatically"
            log_warning "Please install postgresql-client manually to run SQL migrations"
            return 0  # Return success to not fail deployment
        fi
    fi
    
    # Test database connection with timeout
    log "Testing database connection..."
    if ! timeout 10 psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_warning "Cannot connect to database with provided DATABASE_URL"
        log_warning "Please verify database server is running and DATABASE_URL is correct"
        log_warning "Database connection string format: postgresql://user:password@host:port/database"
        return 0  # Return success to not fail deployment
    fi
    
    log_success "Database connection verified"
    
    # Create migrations tracking table if it doesn't exist
    if ! psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );" > /dev/null 2>&1; then
        log_warning "Failed to create migration_history table - migrations may be re-run"
    fi
    
    # Run migrations in order
    local migration_count=0
    local migration_errors=0
    
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            local filename=$(basename "$migration")
            
            # Check if migration has already been applied
            local already_applied=0
            if psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM migration_history WHERE filename = '$filename';" > /dev/null 2>&1; then
                already_applied=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM migration_history WHERE filename = '$filename';" | tr -d ' ')
            fi
            
            if [ "$already_applied" = "0" ] || [ -z "$already_applied" ]; then
                log "Running migration: $filename"
                
                if timeout 30 psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
                    # Record successful migration
                    psql "$DATABASE_URL" -c "INSERT INTO migration_history (filename) VALUES ('$filename') ON CONFLICT (filename) DO NOTHING;" > /dev/null 2>&1 || {
                        log_warning "Failed to record migration in history: $filename"
                    }
                    log_success "Migration completed: $filename"
                    migration_count=$((migration_count + 1))
                else
                    log_warning "Migration failed: $filename"
                    log_warning "This may not be critical for application startup"
                    migration_errors=$((migration_errors + 1))
                fi
            else
                log "Migration already applied: $filename (skipping)"
            fi
        fi
    done
    
    if [ $migration_count -eq 0 ] && [ $migration_errors -eq 0 ]; then
        log "No new migrations to apply"
    elif [ $migration_errors -gt 0 ]; then
        log_warning "$migration_errors migrations failed, $migration_count completed successfully"
        log_warning "Application will start anyway - check database manually if needed"
    else
        log_success "$migration_count migrations applied successfully"
    fi
    
    return 0  # Always return success to not fail deployment
}
#################################################################################
# Usage Information
#################################################################################

show_usage() {
    cat << EOF
Film Flex Deployment Script - Final Version with ESM/TypeScript Support

Usage: $0 [OPTIONS]

FEATURES:
    ✅ Full ESM (ES Modules) support
    ✅ TypeScript compilation with proper configuration
    ✅ Enhanced error handling and diagnostics
    ✅ Comprehensive health checks
    ✅ Production optimizations
    ✅ Security hardening
    ✅ Automated backup and rollback
    ✅ PM2 cluster mode with monitoring

OPTIONS:
    --help                  Show this help message
    --rollback             Rollback to previous deployment
    --health-check         Run health check only
    --skip-backup          Skip backup creation
    --skip-build           Skip application build
    --skip-migrations      Skip database migrations
    --skip-nginx           Skip Nginx configuration
    --skip-ssl             Skip SSL certificate setup
    --dry-run              Show what would be done without executing

ENVIRONMENT VARIABLES:
    DEPLOYMENT_DIR         Target deployment directory (default: /var/www/filmflex)
    BACKUP_DIR            Backup directory (default: /var/backups/filmflex)
    DATABASE_URL          Database connection string
    DOMAIN_NAME           Domain name for SSL certificate
    ENABLE_SSL            Enable SSL certificate setup (true/false)
    ENVIRONMENT           Deployment environment (production/staging)

EXAMPLES:
    # Full production deployment with ESM/TypeScript
    sudo ./deploy.sh

    # Quick deployment to custom directory
    DEPLOYMENT_DIR=/opt/filmflex ./deploy.sh

    # Rollback to previous version
    ./deploy.sh --rollback

    # Health check with enhanced diagnostics
    ./deploy.sh --health-check

REQUIREMENTS:
    - Node.js 22.16+
    - PM2 process manager
    - TypeScript compiler
    - Nginx (optional)
    - SSL certificates (optional)

EOF
}

#################################################################################
# Main Execution Flow - Enhanced Version
#################################################################################

main() {
    local skip_backup=false
    local skip_build=false
    local skip_migrations=false
    local skip_nginx=false
    local skip_ssl=false
    local dry_run=false
    local rollback=false
    local health_check_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help)
                show_usage
                exit 0
                ;;
            --rollback)
                rollback=true
                shift
                ;;
            --health-check)
                health_check_only=true
                shift
                ;;
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --skip-migrations)
                skip_migrations=true
                shift
                ;;
            --skip-nginx)
                skip_nginx=true
                shift
                ;;
            --skip-ssl)
                skip_ssl=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Initialize logging
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chown $(whoami):$(whoami) "$LOG_FILE"
    
    log "==================== Film Flex Deployment Started (Production Ready) ===================="
    log "Timestamp: $(date)"
    log "Environment: $ENVIRONMENT"
    log "Deployment Directory: $DEPLOYMENT_DIR"
    log "Source Directory: $SOURCE_DIR"
    log "ESM/TypeScript Support: Enabled"
    log "========================================================================================"
    
    if [ "$dry_run" = true ]; then
        log "DRY RUN MODE - No changes will be made"
        return 0
    fi
    
    # Handle specific operations
    if [ "$health_check_only" = true ]; then
        health_check
        return $?
    fi
    
    if [ "$rollback" = true ]; then
        rollback_deployment
        return 0
    fi
    
    # Main deployment flow with enhanced error handling
    log "Starting enhanced deployment process with ESM/TypeScript support..."
    
    # Pre-deployment validations
    check_system_compatibility
    validate_node_version
    validate_pm2
    validate_directories
    validate_environment
    validate_system_resources
    
    # Create backup before deployment
    if [ "$skip_backup" = false ]; then
        create_backup
    fi
    
    # Stop application gracefully
    stop_application
    
    # Deploy new version
    copy_source_code
    
    # Install dependencies if needed
    if check_dependencies; then
        install_dependencies
    fi
    
    # Enhanced build process with TypeScript/ESM support
    if [ "$skip_build" = false ]; then
        build_application
    fi
    
    # Run database migrations
    if [ "$skip_migrations" = false ]; then
        run_database_migrations
    fi
    
    # Apply security hardening
    apply_security_hardening
    
    # Performance optimizations
    optimize_performance
    
    # Setup system services
    if [ "$skip_nginx" = false ]; then
        setup_nginx
    fi
    
    if [ "$skip_ssl" = false ]; then
        setup_ssl_certificate
    fi
    
    setup_firewall
    setup_monitoring
    
    # Start application with enhanced configuration
    start_application
    
    # Comprehensive health check
    if health_check; then
        log_success "=========================================="
        log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
        log_success "=========================================="
        log_success "Application: Film Flex"
        log_success "Status: Running and Healthy"
        log_success "URL: http://localhost:5000"
        log_success "Health Check: http://localhost:5000/api/health"
        log_success "PM2 Status: $(pm2 info "$PM2_APP_NAME" | grep "status" | awk '{print $4}' || echo 'Running')"
        log_success "Build: TypeScript/ESM with optimizations"
        log_success "Environment: $ENVIRONMENT"
        log_success "=========================================="
        
        # Post-deployment cleanup
        cleanup_deployment
        
        # Show final status
        log "Final deployment status:"
        pm2 status
        
    else
        log_error "=========================================="
        log_error "❌ DEPLOYMENT FAILED - HEALTH CHECK ❌"
        log_error "=========================================="
        log_error "The application was deployed but failed health checks"
        log_error "Check the logs for more details:"
        log_error "  Application logs: pm2 logs $PM2_APP_NAME"
        log_error "  Deployment log: $LOG_FILE"
        log_error "  System status: pm2 status"
        log_error "=========================================="
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"