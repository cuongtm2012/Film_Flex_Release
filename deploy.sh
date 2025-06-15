#!/bin/bash

#################################################################################
# Film Flex Deployment Script - Final Version
# Description: Production-ready deployment script with ESM/TypeScript support
# Node Version: 22.16+
# Author: GitHub Copilot
# Date: June 15, 2025
#################################################################################

set -euo pipefail  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-/var/www/filmflex}"
SOURCE_DIR="${SOURCE_DIR:-$SCRIPT_DIR}"
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
# Validation Functions
#################################################################################

validate_node_version() {
    log "Validating Node.js version..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
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
        log_error "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        log_success "PM2 installed successfully"
    else
        log_success "PM2 is already installed"
    fi
}

validate_directories() {
    log "Validating directories..."
    
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "Source directory does not exist: $SOURCE_DIR"
        exit 1
    fi
    
    if [ ! -f "$SOURCE_DIR/package.json" ]; then
        log_error "package.json not found in source directory: $SOURCE_DIR"
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
        if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "Database connection successful"
        else
            log_error "Failed to connect to database"
            log_error "Please check DATABASE_URL and database server status"
            exit 1
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
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_threshold="4.0"
    
    if (( $(echo "$cpu_load > $cpu_threshold" | bc -l) )); then
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
    if [ -d "$LOG_DIR" ]; then
        sudo chown -R $(whoami):$(whoami) "$LOG_DIR"
        chmod 755 "$LOG_DIR"
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
        
        # Graceful stop with timeout
        if pm2 stop "$PM2_APP_NAME"; then
            log_success "Application stopped successfully"
            
            # Wait for process to fully stop
            local timeout=30
            local count=0
            while pm2 info "$PM2_APP_NAME" | grep -q "online" && [ $count -lt $timeout ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if [ $count -ge $timeout ]; then
                log_warning "Graceful stop timeout. Force stopping..."
                pm2 kill "$PM2_APP_NAME" || true
            fi
        else
            log_warning "Failed to stop PM2 process gracefully. Attempting force stop..."
            pm2 kill "$PM2_APP_NAME" || true
        fi
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
    
    # Create enhanced PM2 configuration
    create_enhanced_ecosystem_config
    
    # Start with ecosystem config
    log "Starting application with PM2..."
    if pm2 start ecosystem.config.js --env production; then
        log_success "Application started successfully"
    else
        log_error "Failed to start application with PM2"
        log "Attempting to start with direct command..."
        
        # Fallback to direct start
        if pm2 start dist/index.js --name "$PM2_APP_NAME" --node-args="--max-old-space-size=512"; then
            log_success "Application started with fallback method"
        else
            log_error "Failed to start application with fallback method"
            log_error "Checking for common startup issues..."
            
            # Check if the file exists and is executable
            if [ ! -f "dist/index.js" ]; then
                log_error "dist/index.js not found"
            else
                log "dist/index.js exists, checking permissions..."
                ls -la dist/index.js
            fi
            
            # Try to run directly to see error
            log "Attempting direct execution for debugging..."
            timeout 10s node dist/index.js || log_error "Direct execution failed"
            
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
    
    # Show application status
    pm2 status
    pm2 info "$PM2_APP_NAME"
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
*.sql
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
    
    # Check if package.json changed
    if [ ! -f "node_modules/.package-lock.json" ] || 
       [ "package.json" -nt "node_modules/.package-lock.json" ] ||
       [ "package-lock.json" -nt "node_modules/.package-lock.json" ] ||
       [ ! -d "node_modules" ]; then
        needs_install=true
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
    npm cache clean --force
    
    # Install dependencies
    if [ -f "package-lock.json" ]; then
        log "Using npm ci for clean install..."
        npm ci --production
    else
        log "Using npm install..."
        npm install --production
    fi
    
    # Create marker file
    touch "node_modules/.package-lock.json"
    
    log_success "Dependencies installed successfully"
}

#################################################################################
# Enhanced Build Process with ESM/TypeScript Support
#################################################################################

validate_typescript_config() {
    log "Validating TypeScript configuration..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Check for TypeScript config files
    if [ ! -f "tsconfig.json" ]; then
        log_error "tsconfig.json not found in deployment directory"
        exit 1
    fi
    
    # Validate tsconfig.json syntax
    if ! node -e "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" 2>/dev/null; then
        log_error "Invalid tsconfig.json syntax"
        exit 1
    fi
    
    # Check for server-specific tsconfig if it exists
    if [ -f "tsconfig.server.json" ]; then
        if ! node -e "JSON.parse(require('fs').readFileSync('tsconfig.server.json', 'utf8'))" 2>/dev/null; then
            log_error "Invalid tsconfig.server.json syntax"
            exit 1
        fi
        log "Server-specific TypeScript config found and validated"
    fi
    
    log_success "TypeScript configuration validated"
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
    
    // Ensure type: module for ESM support
    pkg.type = 'module';
    
    // Ensure proper scripts
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.build = pkg.scripts.build || 'tsc && npm run build:copy-files';
    pkg.scripts['build:copy-files'] = 'cp -r public dist/ 2>/dev/null || true';
    pkg.scripts.start = 'node dist/index.js';
    pkg.scripts['start:dev'] = 'tsx watch src/index.ts';
    
    // Ensure required dependencies for production
    pkg.dependencies = pkg.dependencies || {};
    if (!pkg.dependencies['@types/node']) {
        pkg.devDependencies = pkg.devDependencies || {};
        if (!pkg.devDependencies['@types/node']) {
            pkg.devDependencies['@types/node'] = '^22.0.0';
        }
    }
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    console.log('Package.json updated with ESM configuration');
    "
    
    # Ensure tsconfig.json has proper ESM settings
    log "Updating TypeScript configuration for ESM..."
    
    node -e "
    const fs = require('fs');
    let tsconfig;
    
    try {
        tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    } catch (e) {
        console.error('Failed to read tsconfig.json:', e.message);
        process.exit(1);
    }
    
    // Ensure proper compiler options for ESM
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.target = 'ES2022';
    tsconfig.compilerOptions.module = 'ESNext';
    tsconfig.compilerOptions.moduleResolution = 'Node';
    tsconfig.compilerOptions.allowSyntheticDefaultImports = true;
    tsconfig.compilerOptions.esModuleInterop = true;
    tsconfig.compilerOptions.forceConsistentCasingInFileNames = true;
    tsconfig.compilerOptions.strict = true;
    tsconfig.compilerOptions.skipLibCheck = true;
    tsconfig.compilerOptions.outDir = './dist';
    tsconfig.compilerOptions.rootDir = './src';
    tsconfig.compilerOptions.declaration = true;
    tsconfig.compilerOptions.declarationMap = true;
    tsconfig.compilerOptions.sourceMap = true;
    
    // Include and exclude patterns
    tsconfig.include = tsconfig.include || ['src/**/*'];
    tsconfig.exclude = tsconfig.exclude || ['node_modules', 'dist', 'tests', 'cypress'];
    
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
    console.log('TypeScript configuration updated for ESM');
    "
    
    # Create or update server-specific tsconfig if needed
    if [ -f "tsconfig.server.json" ]; then
        log "Updating server TypeScript configuration..."
        
        node -e "
        const fs = require('fs');
        let serverConfig;
        
        try {
            serverConfig = JSON.parse(fs.readFileSync('tsconfig.server.json', 'utf8'));
        } catch (e) {
            console.error('Failed to read tsconfig.server.json:', e.message);
            process.exit(1);
        }
        
        // Server-specific optimizations
        serverConfig.compilerOptions = serverConfig.compilerOptions || {};
        serverConfig.compilerOptions.target = 'ES2022';
        serverConfig.compilerOptions.module = 'ESNext';
        serverConfig.compilerOptions.moduleResolution = 'Node';
        serverConfig.compilerOptions.outDir = './dist';
        serverConfig.compilerOptions.rootDir = './src';
        
        fs.writeFileSync('tsconfig.server.json', JSON.stringify(serverConfig, null, 2));
        console.log('Server TypeScript configuration updated');
        "
    fi
    
    log_success "Module resolution fixes applied"
}

build_application() {
    log "Building application with enhanced TypeScript/ESM support..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Validate TypeScript configuration
    validate_typescript_config
    
    # Apply module resolution fixes
    fix_module_resolution
    
    # Clean previous build
    log "Cleaning previous build artifacts..."
    rm -rf dist/ 2>/dev/null || true
    rm -rf build/ 2>/dev/null || true
    
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
        exit 1
    fi
    
    log "TypeScript compiler version: $(npx tsc --version)"
    
    # Build TypeScript to JavaScript
    log "Compiling TypeScript to JavaScript..."
    if npx tsc; then
        log_success "TypeScript compilation completed"
    else
        log_error "TypeScript compilation failed"
        log_error "Checking for common TypeScript errors..."
        
        # Run TypeScript with more verbose output
        npx tsc --listFiles --diagnostics || true
        exit 1
    fi
    
    # Verify build output exists
    if [ ! -d "dist" ]; then
        log_error "Build output directory 'dist' not created"
        exit 1
    fi
    
    if [ ! -f "dist/index.js" ]; then
        log_error "Main application file 'dist/index.js' not found"
        log "Available files in dist:"
        find dist -name "*.js" | head -10
        exit 1
    fi
    
    # Copy static assets and public files
    log "Copying static assets..."
    if [ -d "public" ]; then
        cp -r public dist/ 2>/dev/null || true
        log "Public files copied to dist/"
    fi
    
    # Copy any additional required files
    for file in robots.txt sitemap.xml .env.example; do
        if [ -f "$file" ]; then
            cp "$file" dist/ 2>/dev/null || true
        fi
    done
    
    # Verify the built application can be imported
    log "Verifying built application..."
    if node -e "import('./dist/index.js').catch(e => { console.error('Import failed:', e); process.exit(1); })" 2>/dev/null; then
        log_success "Built application verification passed"
    else
        log_warning "Built application verification failed - checking for common issues..."
        
        # Check for missing file extensions in imports
        log "Checking for missing .js extensions in compiled files..."
        grep -r "from ['\"]\..*[^js]['\"]" dist/ || log "No missing .js extensions found"
        
        # Check for problematic imports
        log "Checking for problematic import patterns..."
        grep -r "import.*node_modules" dist/ || log "No direct node_modules imports found"
    fi
    
    # Remove dev dependencies to reduce size
    log "Removing development dependencies..."
    npm prune --production
    
    # Create build info file
    cat > dist/build-info.json << EOF
{
    "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "gitBranch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "environment": "$ENVIRONMENT"
}
EOF
    
    log_success "Application built successfully with ESM/TypeScript support"
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
    
    # Same configuration as HTTP server
    # ... (copy location blocks from above)
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
# Database Migration Functions
#################################################################################

run_database_migrations() {
    log "Running database migrations..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Check if migration scripts exist
    if [ -d "migrations" ] || [ -f "drizzle.config.ts" ]; then
        log "Found database migration files"
        
        # Run Drizzle migrations if config exists
        if [ -f "drizzle.config.ts" ]; then
            log "Running Drizzle migrations..."
            if npm run db:migrate 2>/dev/null || npx drizzle-kit migrate; then
                log_success "Drizzle migrations completed successfully"
            else
                log_error "Drizzle migrations failed"
                exit 1
            fi
        elif [ -d "migrations" ]; then
            log "Running custom migrations..."
            for migration in migrations/*.sql; do
                if [ -f "$migration" ]; then
                    log "Running migration: $(basename "$migration")"
                    if [ -n "$DATABASE_URL" ]; then
                        psql "$DATABASE_URL" -f "$migration" || {
                            log_error "Migration failed: $(basename "$migration")"
                            exit 1
                        }
                    else
                        log_warning "DATABASE_URL not set, skipping SQL migration"
                    fi
                fi
            done
            log_success "Custom migrations completed"
        fi
    else
        log "No migration files found, skipping database migrations"
    fi
}

#################################################################################
# Performance Optimization
#################################################################################

optimize_performance() {
    log "Applying performance optimizations..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Enable PM2 cluster mode if not already configured
    if [ -f "ecosystem.config.js" ]; then
        log "Using existing ecosystem configuration"
    else
        log "Creating optimized PM2 configuration..."
        cat > ecosystem.config.js << EOF
module.exports = {
    apps: [{
        name: '$PM2_APP_NAME',
        script: './dist/index.js',
        instances: 'max', // Use all available CPU cores
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 5000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '500M',
        node_args: '--max-old-space-size=400',
        kill_timeout: 3000,
        wait_ready: true,
        listen_timeout: 3000
    }]
};
EOF
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Set Node.js memory optimization
    export NODE_OPTIONS="--max-old-space-size=400 --optimize-for-size"
    
    log_success "Performance optimizations applied"
}

#################################################################################
# Firewall and Security Setup
#################################################################################

setup_firewall() {
    log "Configuring firewall rules..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        # Enable UFW if not already enabled
        if ! sudo ufw status | grep -q "Status: active"; then
            log "Enabling UFW firewall..."
            sudo ufw --force enable
        fi
        
        # Allow SSH
        sudo ufw allow ssh
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Deny direct access to application port
        sudo ufw deny 5000/tcp
        
        log_success "Firewall rules configured"
    else
        log_warning "UFW not available, skipping firewall configuration"
    fi
}

#################################################################################
# SSL Certificate Setup
#################################################################################

setup_ssl_certificate() {
    if [ "$ENABLE_SSL" = "true" ] && [ -n "$DOMAIN_NAME" ]; then
        log "Setting up SSL certificate for $DOMAIN_NAME..."
        
        # Install certbot if not available
        if ! command -v certbot &> /dev/null; then
            log "Installing certbot..."
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Obtain SSL certificate
        if [ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
            log "Obtaining SSL certificate..."
            sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME"
            
            # Setup auto-renewal
            if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
                (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
                log_success "SSL auto-renewal configured"
            fi
        else
            log "SSL certificate already exists"
        fi
    fi
}

#################################################################################
# Cleanup Functions
#################################################################################

cleanup_deployment() {
    log "Performing post-deployment cleanup..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Clean up temporary files
    rm -rf tmp/ temp/ .cache/ 2>/dev/null || true
    
    # Clean up old log files (keep last 30 days)
    find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Clean up old PM2 logs
    pm2 flush
    
    log_success "Cleanup completed"
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
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log "==================== Film Flex Deployment Started (Final Version) ===================="
    log "Timestamp: $(date)"
    log "Environment: $ENVIRONMENT"
    log "Node Version: $(node --version)"
    log "NPM Version: $(npm --version)"
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