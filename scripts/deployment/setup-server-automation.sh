#!/bin/bash

# PhimGG Server Setup Script - Automated Import & Cron Configuration
# Run this script on your server to set up automated movie imports and maintenance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "========================================================"
echo "  PhimGG Server Setup - Import & Cron Configuration"  
echo "========================================================"
echo -e "${NC}"

# Function to print colored output
log() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if running on server
if [[ $(hostname) != "lightnode" ]]; then
    warn "This script should be run on the production server (lightnode)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ensure we're in the right directory
cd ~/Film_Flex_Release
log "Working directory: $(pwd)"

# Step 1: Create necessary directories
info "Creating directory structure..."
mkdir -p ~/Film_Flex_Release/scripts/cron
mkdir -p ~/Film_Flex_Release/logs  
mkdir -p ~/Film_Flex_Release/backups
log "Directories created"

# Step 2: Create cron scripts
info "Creating automated cron scripts..."

# Daily Import Script
cat > ~/Film_Flex_Release/scripts/cron/daily-import.sh << 'EOF'
#!/bin/bash
cd ~/Film_Flex_Release
LOG_FILE="~/Film_Flex_Release/logs/cron-daily-$(date +%Y%m%d).log"
mkdir -p ~/Film_Flex_Release/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Starting Daily Movie Import ==="

if ! docker compose -f docker-compose.server.yml ps | grep -q "Up"; then
    log "ERROR: Docker containers are not running"
    exit 1
fi

log "Docker containers are running"
log "Starting movie import..."
docker compose -f docker-compose.server.yml exec -T app node scripts/data/import-movies-sql.cjs --max-pages=3 >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    MOVIE_COUNT=$(docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ')
    log "SUCCESS: Daily import completed. Total movies: $MOVIE_COUNT"
else
    log "ERROR: Daily import failed"
    exit 1
fi

find ~/Film_Flex_Release/logs -name "cron-daily-*.log" -mtime +30 -delete
log "=== Daily Import Complete ==="
EOF

# Weekly Deep Scan Script  
cat > ~/Film_Flex_Release/scripts/cron/weekly-deep-scan.sh << 'EOF'
#!/bin/bash
cd ~/Film_Flex_Release
LOG_FILE="~/Film_Flex_Release/logs/cron-weekly-$(date +%Y%m%d).log"
mkdir -p ~/Film_Flex_Release/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Starting Weekly Deep Scan ==="

if ! docker compose -f docker-compose.server.yml ps | grep -q "Up"; then
    log "ERROR: Docker containers are not running"
    exit 1
fi

log "Starting deep scan import..."
docker compose -f docker-compose.server.yml exec -T app node scripts/data/import-movies-sql.cjs --deep-scan --max-pages=10 >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    MOVIE_COUNT=$(docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ')
    log "SUCCESS: Weekly deep scan completed. Total movies: $MOVIE_COUNT"
else
    log "ERROR: Weekly deep scan failed"
    exit 1
fi

log "Running database maintenance..."
docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex -c "VACUUM ANALYZE movies; VACUUM ANALYZE episodes;" >> "$LOG_FILE" 2>&1
log "=== Weekly Deep Scan Complete ==="
EOF

# Health Check Script
cat > ~/Film_Flex_Release/scripts/cron/health-check.sh << 'EOF'
#!/bin/bash
cd ~/Film_Flex_Release
LOG_FILE="~/Film_Flex_Release/logs/health-check-$(date +%Y%m%d).log"
mkdir -p ~/Film_Flex_Release/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Starting Health Check ==="

POSTGRES_STATUS=$(docker compose -f docker-compose.server.yml ps postgres --format "table {{.Status}}" | grep -v STATUS)
APP_STATUS=$(docker compose -f docker-compose.server.yml ps app --format "table {{.Status}}" | grep -v STATUS)

log "PostgreSQL Status: $POSTGRES_STATUS"
log "App Status: $APP_STATUS"

if [[ "$POSTGRES_STATUS" != *"Up"* ]] || [[ "$APP_STATUS" != *"Up"* ]]; then
    log "WARNING: One or more containers are down. Attempting restart..."
    docker compose -f docker-compose.server.yml up -d
    sleep 30
    
    if ! docker compose -f docker-compose.server.yml ps | grep -q "Up"; then
        log "ERROR: Failed to restart containers"
    else
        log "SUCCESS: Containers restarted successfully"
    fi
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000)
if [ "$HTTP_STATUS" != "200" ]; then
    log "WARNING: Application not responding (HTTP $HTTP_STATUS)"
    docker compose -f docker-compose.server.yml restart app
    sleep 15
    log "App container restarted"
else
    log "Application is healthy (HTTP 200)"
fi

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log "WARNING: Disk usage is ${DISK_USAGE}%"
    find ~/Film_Flex_Release/logs -name "*.log" -mtime +7 -delete
    docker system prune -f
    log "Cleaned up old files and Docker images"
else
    log "Disk usage is healthy: ${DISK_USAGE}%"
fi

MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
log "Memory usage: ${MEMORY_USAGE}%"
log "=== Health Check Complete ==="

find ~/Film_Flex_Release/logs -name "health-check-*.log" -mtime +7 -delete
EOF

# Database Backup Script
cat > ~/Film_Flex_Release/scripts/cron/database-backup.sh << 'EOF'
#!/bin/bash
cd ~/Film_Flex_Release
BACKUP_DIR="~/Film_Flex_Release/backups"
mkdir -p "$BACKUP_DIR"
LOG_FILE="~/Film_Flex_Release/logs/backup-$(date +%Y%m%d).log"
mkdir -p ~/Film_Flex_Release/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Starting Database Backup ==="

BACKUP_FILE="$BACKUP_DIR/filmflex-backup-$(date +%Y%m%d-%H%M%S).sql"

log "Creating backup: $BACKUP_FILE"
docker compose -f docker-compose.server.yml exec -T postgres pg_dump -U filmflex -d filmflex > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "SUCCESS: Backup created successfully ($BACKUP_SIZE)"
    
    gzip "$BACKUP_FILE"
    log "Backup compressed: ${BACKUP_FILE}.gz"
else
    log "ERROR: Backup failed"
    exit 1
fi

find "$BACKUP_DIR" -name "filmflex-backup-*.sql.gz" -mtime +30 -delete
log "Old backups cleaned up"

find ~/Film_Flex_Release/logs -name "backup-*.log" -mtime +30 -delete
log "=== Database Backup Complete ==="
EOF

# Make all scripts executable
chmod +x ~/Film_Flex_Release/scripts/cron/*.sh
log "Cron scripts created and made executable"

# Step 3: Test one of the scripts
info "Testing health check script..."
if bash ~/Film_Flex_Release/scripts/cron/health-check.sh; then
    log "Health check script test successful"
else
    warn "Health check script test failed - check the logs"
fi

# Step 4: Create crontab configuration
info "Preparing crontab configuration..."

CRON_JOBS=$(cat << 'EOF'

# PhimGG Automated Tasks - Added by setup script
# Daily movie import at 2:00 AM
0 2 * * * /bin/bash ~/Film_Flex_Release/scripts/cron/daily-import.sh

# Weekly deep scan on Saturdays at 3:00 AM  
0 3 * * 6 /bin/bash ~/Film_Flex_Release/scripts/cron/weekly-deep-scan.sh

# System health check every 30 minutes
*/30 * * * * /bin/bash ~/Film_Flex_Release/scripts/cron/health-check.sh

# Database backup daily at 1:00 AM
0 1 * * * /bin/bash ~/Film_Flex_Release/scripts/cron/database-backup.sh

# Monthly comprehensive import on 1st Sunday at 4:00 AM
0 4 * * 0 [ $(date +\%d) -le 7 ] && /bin/bash ~/Film_Flex_Release/scripts/data/import-all-movies-resumable.sh

# Clean Docker system monthly on 15th at 5:00 AM
0 5 15 * * /usr/bin/docker system prune -f

# Restart containers weekly on Sunday at 6:00 AM (maintenance window)
0 6 * * 0 /usr/bin/docker compose -f ~/Film_Flex_Release/docker-compose.server.yml restart
EOF
)

# Step 5: Install crontab jobs
info "Installing crontab jobs..."
echo "Do you want to install the automated cron jobs? (y/N)"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing crontab
    crontab -l > ~/crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true
    
    # Add new jobs to existing crontab
    (crontab -l 2>/dev/null || true; echo "$CRON_JOBS") | crontab -
    
    log "Crontab jobs installed successfully"
    info "Crontab backup saved to ~/crontab-backup-*.txt"
else
    warn "Crontab installation skipped"
    echo "To install manually, run: crontab -e"
    echo "Then add the jobs from the script output above"
fi

# Step 6: Enable cron service
info "Ensuring cron service is running..."
if systemctl is-active --quiet cron; then
    log "Cron service is already running"
else
    systemctl enable cron
    systemctl start cron
    log "Cron service started and enabled"
fi

# Step 7: Test a quick import
info "Testing movie import functionality..."
echo "Do you want to test importing a few movies now? (y/N)"
read -n 1 -r  
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Running test import (5 movies from page 1)..."
    docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --single-page --page-num=1 --page-size=5
    
    if [ $? -eq 0 ]; then
        log "Test import successful!"
    else
        warn "Test import had issues - check the output above"
    fi
else
    info "Test import skipped"
fi

# Step 8: Final verification
info "Running final verification..."

# Check current movie count
CURRENT_MOVIES=$(docker compose -f docker-compose.server.yml exec -T postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | grep -E '^\s*[0-9]+\s*$' | tr -d ' ')
log "Current movies in database: $CURRENT_MOVIES"

# Check crontab
if crontab -l | grep -q "PhimGG"; then
    log "Crontab jobs are installed"
else
    warn "Crontab jobs not found - manual installation may be needed"
fi

# Check script permissions
if [ -x ~/Film_Flex_Release/scripts/cron/daily-import.sh ]; then
    log "Scripts are executable"
else
    warn "Script permissions may need fixing"
fi

echo ""
echo -e "${GREEN}🎉 PhimGG Server Setup Complete!${NC}"
echo "=================================="
echo ""
log "✅ Automated Import & Maintenance System Ready"
log "✅ Daily movie imports scheduled (2:00 AM)"
log "✅ Weekly deep scans scheduled (Saturday 3:00 AM)" 
log "✅ System health monitoring (every 30 minutes)"
log "✅ Database backups scheduled (1:00 AM daily)"
log "✅ Monthly maintenance tasks scheduled"
echo ""
info "📊 Monitoring Commands:"
info "• View cron jobs: crontab -l"
info "• Check logs: ls -la ~/Film_Flex_Release/logs/"
info "• Test scripts: bash ~/Film_Flex_Release/scripts/cron/health-check.sh"
info "• Manual import: docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --max-pages=3"
echo ""
info "📖 Documentation:"
info "• Import Guide: ~/Film_Flex_Release/docs/DOCKER_POSTGRES_IMPORT_GUIDE.md"
info "• Crontab Guide: ~/Film_Flex_Release/docs/SERVER_CRONTAB_SETUP_GUIDE.md"
echo ""
log "🌐 Your PhimGG application: http://38.54.14.154:5000"
echo ""
echo -e "${BLUE}Your server is now fully automated with regular movie updates! 🚀${NC}"