#!/bin/bash

# FilmFlex Deployment Investigation Script
# This script investigates why the website is still running the old version
# Run this script on your production server: 38.54.115.156

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="/tmp/deployment_investigation_$TIMESTAMP.log"

echo -e "${BLUE}===== FilmFlex Deployment Investigation Started at $(date) =====${NC}"
echo "Report will be saved to: $REPORT_FILE"

# Function to log both to console and file
log() {
    echo -e "$@" | tee -a "$REPORT_FILE"
}

log "${BLUE}1. CHECKING DEPLOYMENT LOGS${NC}"
log "-------------------------------------------"

# Check if final-deploy.sh logs exist
if [ -d "/var/log/filmflex" ]; then
    log "Found FilmFlex log directory:"
    ls -la /var/log/filmflex/ | tee -a "$REPORT_FILE"
    
    # Show the latest deployment log
    LATEST_LOG=$(ls -t /var/log/filmflex/final-deploy-*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        log "\n${GREEN}Latest deployment log: $LATEST_LOG${NC}"
        log "Last 50 lines of deployment log:"
        tail -50 "$LATEST_LOG" | tee -a "$REPORT_FILE"
    else
        log "${RED}No final-deploy logs found${NC}"
    fi
else
    log "${RED}FilmFlex log directory not found${NC}"
fi

log "\n${BLUE}2. CHECKING SERVICE STATUS${NC}"
log "-------------------------------------------"

# Check PM2 status
log "PM2 Process Status:"
pm2 status | tee -a "$REPORT_FILE"

log "\nPM2 Logs (last 30 lines):"
pm2 logs filmflex --lines 30 --nostream 2>/dev/null | tee -a "$REPORT_FILE"

# Check if processes are running on port 5000
log "\nProcesses using port 5000:"
lsof -i:5000 2>/dev/null | tee -a "$REPORT_FILE"
ss -tulpn | grep :5000 | tee -a "$REPORT_FILE"

log "\n${BLUE}3. CHECKING DEPLOYMENT DIRECTORY${NC}"
log "-------------------------------------------"

DEPLOY_DIR="/var/www/filmflex"
if [ -d "$DEPLOY_DIR" ]; then
    log "Deployment directory exists: $DEPLOY_DIR"
    log "Directory contents:"
    ls -la "$DEPLOY_DIR" | tee -a "$REPORT_FILE"
    
    # Check if server files exist
    if [ -f "$DEPLOY_DIR/dist/index.js" ]; then
        log "\n${GREEN}Server file exists: $DEPLOY_DIR/dist/index.js${NC}"
        log "File details:"
        ls -la "$DEPLOY_DIR/dist/index.js" | tee -a "$REPORT_FILE"
        
        # Check the first few lines of the server file
        log "\nFirst 20 lines of server file:"
        head -20 "$DEPLOY_DIR/dist/index.js" | tee -a "$REPORT_FILE"
    else
        log "${RED}Server file NOT found: $DEPLOY_DIR/dist/index.js${NC}"
    fi
    
    # Check client files
    if [ -d "$DEPLOY_DIR/client/dist" ]; then
        log "\n${GREEN}Client directory exists${NC}"
        log "Client files:"
        ls -la "$DEPLOY_DIR/client/dist" | head -10 | tee -a "$REPORT_FILE"
    else
        log "${RED}Client directory NOT found: $DEPLOY_DIR/client/dist${NC}"
    fi
    
    # Check package.json
    if [ -f "$DEPLOY_DIR/package.json" ]; then
        log "\nPackage.json version info:"
        grep -E '"version"|"name"' "$DEPLOY_DIR/package.json" | tee -a "$REPORT_FILE"
    fi
    
else
    log "${RED}Deployment directory NOT found: $DEPLOY_DIR${NC}"
fi

log "\n${BLUE}4. CHECKING NGINX STATUS${NC}"
log "-------------------------------------------"

# Check Nginx status
log "Nginx service status:"
systemctl status nginx --no-pager | tee -a "$REPORT_FILE"

# Check Nginx configuration
log "\nNginx configuration test:"
nginx -t 2>&1 | tee -a "$REPORT_FILE"

# Check FilmFlex Nginx config
NGINX_CONFIG="/etc/nginx/sites-enabled/filmflex.conf"
if [ -f "$NGINX_CONFIG" ]; then
    log "\n${GREEN}FilmFlex Nginx config found${NC}"
    log "Nginx configuration for FilmFlex:"
    cat "$NGINX_CONFIG" | tee -a "$REPORT_FILE"
else
    log "${RED}FilmFlex Nginx config NOT found at $NGINX_CONFIG${NC}"
    
    # Check alternative locations
    find /etc/nginx -name "*filmflex*" -o -name "*phimgg*" 2>/dev/null | tee -a "$REPORT_FILE"
fi

log "\n${BLUE}5. CHECKING DATABASE STATUS${NC}"
log "-------------------------------------------"

# Check PostgreSQL status
log "PostgreSQL service status:"
systemctl status postgresql --no-pager | tee -a "$REPORT_FILE"

# Test database connection
log "\nTesting database connection:"
export PGPASSWORD="filmflex2024"
if psql -h localhost -U filmflex -d filmflex -c "SELECT COUNT(*) as movie_count FROM movies;" 2>/dev/null; then
    log "${GREEN}Database connection successful${NC}"
    psql -h localhost -U filmflex -d filmflex -c "SELECT COUNT(*) as movie_count FROM movies;" | tee -a "$REPORT_FILE"
else
    log "${RED}Database connection failed${NC}"
    echo "Database connection error logged" >> "$REPORT_FILE"
fi

log "\n${BLUE}6. CHECKING CACHE AND BROWSER CACHE${NC}"
log "-------------------------------------------"

# Check if there are any caching mechanisms
log "Checking for cache-related services:"
systemctl list-units --type=service | grep -E "(redis|memcached|varnish)" | tee -a "$REPORT_FILE"

# Check for CDN or cache headers in Nginx
if [ -f "$NGINX_CONFIG" ]; then
    log "\nCache-related Nginx directives:"
    grep -E "(expires|cache|etag)" "$NGINX_CONFIG" 2>/dev/null | tee -a "$REPORT_FILE"
fi

log "\n${BLUE}7. TESTING API ENDPOINTS${NC}"
log "-------------------------------------------"

# Test API endpoints
log "Testing local API endpoint:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:5000/api/health 2>/dev/null | tee -a "$REPORT_FILE"

log "\nTesting external API endpoint:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://phimgg.com/api/health 2>/dev/null | tee -a "$REPORT_FILE"

log "\n${BLUE}8. CHECKING SYSTEM RESOURCES${NC}"
log "-------------------------------------------"

log "System memory usage:"
free -h | tee -a "$REPORT_FILE"

log "\nDisk usage:"
df -h | tee -a "$REPORT_FILE"

log "\nSystem load:"
uptime | tee -a "$REPORT_FILE"

log "\n${BLUE}9. CHECKING VERSION INFORMATION${NC}"
log "-------------------------------------------"

# Check if there's any version file or build information
log "Looking for version files:"
find "$DEPLOY_DIR" -name "*version*" -o -name "*build*" -o -name "*.json" | head -10 | tee -a "$REPORT_FILE"

# Check git information if available
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "\nGit commit information:"
    cd "$DEPLOY_DIR"
    git log -1 --oneline 2>/dev/null | tee -a "$REPORT_FILE"
    git status 2>/dev/null | tee -a "$REPORT_FILE"
fi

log "\n${BLUE}10. DEPLOYMENT RECOMMENDATIONS${NC}"
log "-------------------------------------------"

log "Based on the investigation, here are potential issues and solutions:"

# Check common issues
ISSUES_FOUND=0

if ! pm2 list | grep -q "filmflex.*online"; then
    log "${RED}ISSUE: FilmFlex PM2 process is not running${NC}"
    log "SOLUTION: cd $DEPLOY_DIR && pm2 start pm2.config.cjs"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ ! -f "$DEPLOY_DIR/dist/index.js" ]; then
    log "${RED}ISSUE: Server file is missing${NC}"
    log "SOLUTION: Re-run the deployment script"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! curl -s http://localhost:5000/api/health | grep -q "status"; then
    log "${RED}ISSUE: API is not responding${NC}"
    log "SOLUTION: Check PM2 logs and restart the service"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! systemctl is-active --quiet nginx; then
    log "${RED}ISSUE: Nginx is not running${NC}"
    log "SOLUTION: systemctl start nginx"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    log "${GREEN}No obvious issues found. The problem might be:${NC}"
    log "1. Browser cache - Users need to hard refresh (Ctrl+F5)"
    log "2. CDN cache - May need to be purged"
    log "3. Nginx cache - May need to be cleared"
    log "4. Old service still running on different port"
fi

log "\n${BLUE}===== QUICK FIX COMMANDS =====${NC}"
log "Try these commands to fix common issues:"
log ""
log "1. Restart FilmFlex service:"
log "   cd $DEPLOY_DIR && pm2 restart filmflex"
log ""
log "2. Force restart everything:"
log "   pm2 delete filmflex && cd $DEPLOY_DIR && pm2 start pm2.config.cjs"
log ""
log "3. Restart Nginx:"
log "   systemctl restart nginx"
log ""
log "4. Re-run deployment:"
log "   cd /root/Film_Flex_Release/scripts/deployment && ./final-deploy.sh"
log ""
log "5. Clear browser cache:"
log "   Ask users to press Ctrl+F5 or Cmd+Shift+R"

log "\n${GREEN}Investigation completed at $(date)${NC}"
log "Full report saved to: $REPORT_FILE"

echo ""
echo "To view this report later, run: cat $REPORT_FILE"