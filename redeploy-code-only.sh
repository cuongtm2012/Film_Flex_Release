#!/bin/bash

# FilmFlex Code-Only Redeployment Script for Linux Production Server
# This script redeploys only frontend and backend code without touching the database

set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define paths
SOURCE_DIR="/root/Film_Flex_Release"
DEPLOY_DIR="/var/www/filmflex"
LOG_DIR="/var/log/filmflex"
DATE=$(date '+%Y%m%d%H%M%S')
BACKUP_DIR="/var/backups/filmflex/code-backup-${DATE}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Print banner
echo -e "${BLUE}"
echo "============================================="
echo "    FilmFlex Code-Only Redeployment"
echo "============================================="
echo -e "${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   error "This script must be run as root"
   exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/code-redeploy-${DATE}.log"

# Function to log and execute commands
execute() {
    local cmd="$1"
    log "Executing: $cmd"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Executing: $cmd" >> "$LOG_FILE"
    
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        success "Command completed successfully"
        return 0
    else
        error "Command failed (check $LOG_FILE)"
        return 1
    fi
}

log "Starting FilmFlex code-only redeployment..."
log "Source directory: $SOURCE_DIR"
log "Deploy directory: $DEPLOY_DIR"
log "Backup directory: $BACKUP_DIR"
log "Log file: $LOG_FILE"

# Verify source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    error "Source directory not found: $SOURCE_DIR"
    error "Please ensure you've uploaded the latest code to the home directory"
    exit 1
fi

# Verify deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    error "Deployment directory not found: $DEPLOY_DIR"
    error "Please run the full deployment script first"
    exit 1
fi

# Step 1: Create backup of current deployment
log "Step 1: Creating backup of current deployment..."
execute "mkdir -p /var/backups/filmflex"
execute "mkdir -p $BACKUP_DIR"

# Backup current code (excluding node_modules and logs)
log "Backing up current code..."
execute "rsync -av --exclude=node_modules --exclude=logs --exclude=dist --exclude=.env $DEPLOY_DIR/ $BACKUP_DIR/"

# Step 2: Stop the application
log "Step 2: Stopping application..."
execute "pm2 stop filmflex || true"
success "Application stopped"

# Step 3: Update code
log "Step 3: Updating application code..."

# Copy new source code (preserve .env and node_modules)
log "Copying new source code..."
execute "rsync -av --delete --exclude=node_modules --exclude=.git --exclude=logs --exclude=dist --exclude=.env --exclude=database.db $SOURCE_DIR/ $DEPLOY_DIR/"

# Step 4: Install/update dependencies
log "Step 4: Installing/updating dependencies..."
cd "$DEPLOY_DIR"

# Check if package.json changed
if ! cmp -s "$SOURCE_DIR/package.json" "$DEPLOY_DIR/package.json" 2>/dev/null; then
    log "package.json changed, reinstalling dependencies..."
    execute "rm -rf node_modules package-lock.json"
    execute "npm install --production"
else
    log "package.json unchanged, updating dependencies..."
    execute "npm update"
fi

# Step 5: Build application
log "Step 5: Building application..."
# Clean previous builds to ensure fresh build
execute "rm -rf dist client/dist"
execute "npm run build"

# Step 6: Run database migrations
log "Step 6: Running database migrations..."

# Create migrations tracking table if it doesn't exist
execute "sudo -u postgres psql -d filmflex -c \"
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\""

# Define migration files in order of execution
MIGRATION_FILES=(
    "add_default_roles_and_permissions.sql"
    "setup_default_rbac_roles.sql"
    "add_user_comment_reactions.sql"
    "add_movie_reactions.sql"
    "update_movie_reactions_constraints.sql"
    "add_anime_section.sql"
    "add_oauth_fields.sql"
)

# Run migrations that haven't been executed yet
for migration_file in "\${MIGRATION_FILES[@]}"; do
    migration_path="\$SOURCE_DIR/migrations/\$migration_file"
    
    if [ -f "\$migration_path" ]; then
        # Check if migration has already been executed
        executed=\$(sudo -u postgres psql -d filmflex -t -c "SELECT COUNT(*) FROM migrations WHERE filename = '\$migration_file';" | tr -d ' ')
        
        if [ "\$executed" -eq "0" ]; then
            log "Running migration: \$migration_file"
            
            # Execute migration
            if sudo -u postgres psql -d filmflex -f "\$migration_path" >> "\$LOG_FILE" 2>&1; then
                # Mark migration as executed
                sudo -u postgres psql -d filmflex -c "INSERT INTO migrations (filename) VALUES ('\$migration_file');" >> "\$LOG_FILE" 2>&1
                success "Migration \$migration_file completed successfully"
            else
                error "Migration \$migration_file failed (check \$LOG_FILE)"
                # Continue with other migrations instead of failing completely
                warning "Continuing with remaining migrations..."
            fi
        else
            log "Migration \$migration_file already executed, skipping..."
        fi
    else
        warning "Migration file not found: \$migration_path"
    fi
done

success "Database migrations completed"

# Step 7: Set permissions
log "Step 7: Setting permissions..."
execute "chown -R www-data:www-data $DEPLOY_DIR"
execute "chmod -R 755 $DEPLOY_DIR"
execute "chmod 600 $DEPLOY_DIR/.env"

# Step 8: Start application
log "Step 8: Starting application..."
execute "pm2 start $DEPLOY_DIR/ecosystem.config.cjs"
execute "pm2 save"

# Step 9: Verify deployment
log "Step 9: Verifying deployment..."
sleep 5

if execute "pm2 list | grep filmflex | grep online"; then
    success "Application is running successfully"
else
    error "Application failed to start"
    log "Attempting to restore from backup..."
    
    # Restore from backup
    execute "pm2 stop filmflex || true"
    execute "rsync -av $BACKUP_DIR/ $DEPLOY_DIR/"
    execute "chown -R www-data:www-data $DEPLOY_DIR"
    execute "pm2 start $DEPLOY_DIR/ecosystem.config.cjs"
    
    error "Deployment failed and backup restored"
    exit 1
fi

# Step 10: Restart Nginx (if needed)
log "Step 10: Restarting Nginx..."
execute "nginx -t"
execute "systemctl reload nginx"

# Step 11: Cleanup old backups (keep last 5)
log "Step 11: Cleaning up old backups..."
execute "find /var/backups/filmflex -name 'code-backup-*' -type d | sort -r | tail -n +6 | xargs rm -rf"

success "Code redeployment completed successfully!"
success "Application is running at: http://$(hostname -I | awk '{print $1}')"
log "Backup saved at: $BACKUP_DIR"
log "Full deployment log: $LOG_FILE"

# Display status
echo ""
log "Current application status:"
pm2 list
echo ""
log "Application logs (last 20 lines):"
pm2 logs filmflex --lines 20