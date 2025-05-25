#!/bin/bash

# Server Diagnostic Script for FilmFlex
# Run this script on your production server to diagnose issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# System Information
check_system() {
    header "System Information"
    echo "Date: $(date)"
    echo "Uptime: $(uptime)"
    echo "Disk Usage:"
    df -h /var/www/ || df -h /
    echo "Memory Usage:"
    free -h
}

# PM2 Status
check_pm2() {
    header "PM2 Status"
    if command -v pm2 &> /dev/null; then
        pm2 list
        echo -e "\nPM2 Logs (last 20 lines):"
        pm2 logs filmflex --lines 20 --nostream 2>/dev/null || pm2 logs --lines 20 --nostream
    else
        error "PM2 not installed"
    fi
}

# Application Status
check_app() {
    header "Application Status"
    
    APP_DIR="/var/www/filmflex"
    if [ -d "$APP_DIR" ]; then
        log "Application directory exists: $APP_DIR"
        echo "Directory contents:"
        ls -la "$APP_DIR"
        
        if [ -f "$APP_DIR/package.json" ]; then
            echo -e "\nPackage info:"
            cat "$APP_DIR/package.json" | grep -E '"name"|"version"' | head -2
        fi
        
        if [ -f "$APP_DIR/dist/index.js" ]; then
            echo -e "\nMain file info:"
            ls -la "$APP_DIR/dist/index.js"
            echo "File size: $(wc -c < "$APP_DIR/dist/index.js") bytes"
        else
            error "Main application file not found: $APP_DIR/dist/index.js"
        fi
    else
        error "Application directory not found: $APP_DIR"
    fi
}

# Network Status
check_network() {
    header "Network Status"
    
    # Check if port 5000 is listening
    if netstat -tulpn | grep -q ":5000 "; then
        log "Port 5000 is listening"
        netstat -tulpn | grep ":5000 "
    else
        error "Port 5000 is not listening"
    fi
    
    # Check API health
    echo -e "\nAPI Health Check:"
    if curl -s --max-time 5 http://localhost:5000/api/health > /dev/null; then
        log "✅ API is responding"
        curl -s http://localhost:5000/api/health | head -5
    else
        error "❌ API is not responding"
    fi
    
    # Check external access
    echo -e "\nExternal API test:"
    if curl -s --max-time 5 http://localhost:5000/ > /dev/null; then
        log "✅ Web server is responding"
    else
        error "❌ Web server is not responding"
    fi
}

# Database Status
check_database() {
    header "Database Status"
    
    export PGPASSWORD="filmflex2024"
    
    if psql -U filmflex -d filmflex -h localhost -c "SELECT version();" 2>/dev/null | grep -q "PostgreSQL"; then
        log "✅ Database connection successful"
        
        echo -e "\nDatabase info:"
        psql -U filmflex -d filmflex -h localhost -c "
            SELECT 
                schemaname as schema,
                tablename as table,
                pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY pg_total_relation_size(tablename::regclass) DESC;
        " 2>/dev/null || echo "Could not get table info"
        
        # Check users table
        echo -e "\nUsers table structure:"
        psql -U filmflex -d filmflex -h localhost -c "\d users" 2>/dev/null || echo "Users table not found or accessible"
        
    else
        error "❌ Database connection failed"
    fi
}

# Nginx Status
check_nginx() {
    header "Nginx Status"
    
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx is running"
        echo "Nginx status:"
        systemctl status nginx --no-pager -l
        
        echo -e "\nNginx configuration test:"
        nginx -t 2>&1
        
        # Check if FilmFlex config exists
        if [ -f "/etc/nginx/sites-available/filmflex" ]; then
            log "FilmFlex nginx config found"
        else
            warning "FilmFlex nginx config not found in sites-available"
        fi
        
        if [ -L "/etc/nginx/sites-enabled/filmflex" ]; then
            log "FilmFlex nginx config is enabled"
        else
            warning "FilmFlex nginx config not enabled"
        fi
        
    else
        error "❌ Nginx is not running"
    fi
}

# Log Files
check_logs() {
    header "Recent Log Files"
    
    # Application logs
    if [ -f "/var/log/filmflex/out.log" ]; then
        echo "Application output (last 10 lines):"
        tail -10 /var/log/filmflex/out.log
    fi
    
    if [ -f "/var/log/filmflex/error.log" ]; then
        echo -e "\nApplication errors (last 10 lines):"
        tail -10 /var/log/filmflex/error.log
    fi
    
    # Nginx logs
    if [ -f "/var/log/nginx/error.log" ]; then
        echo -e "\nNginx errors (last 5 lines):"
        tail -5 /var/log/nginx/error.log
    fi
}

# Environment Check
check_environment() {
    header "Environment Variables"
    
    if [ -n "$DATABASE_URL" ]; then
        log "DATABASE_URL is set"
    else
        warning "DATABASE_URL not set in current environment"
    fi
    
    if [ -n "$NODE_ENV" ]; then
        log "NODE_ENV: $NODE_ENV"
    else
        warning "NODE_ENV not set"
    fi
    
    echo -e "\nNode.js version:"
    node --version 2>/dev/null || error "Node.js not found"
    
    echo "NPM version:"
    npm --version 2>/dev/null || error "NPM not found"
}

# Quick Fix Suggestions
suggest_fixes() {
    header "Quick Fix Suggestions"
    
    echo "If you see issues above, try these commands:"
    echo ""
    echo "1. Restart services:"
    echo "   pm2 restart all"
    echo "   systemctl restart nginx"
    echo ""
    echo "2. Check detailed logs:"
    echo "   pm2 logs filmflex"
    echo "   tail -f /var/log/nginx/error.log"
    echo ""
    echo "3. Redeploy application:"
    echo "   bash /tmp/production-deploy.sh"
    echo ""
    echo "4. Fix database schema:"
    echo "   See database section output above"
}

# Main function
main() {
    echo -e "${BLUE}FilmFlex Production Server Diagnostic${NC}"
    echo "Generated on: $(date)"
    echo "========================================="
    
    check_system
    check_environment
    check_app
    check_pm2
    check_network
    check_database
    check_nginx
    check_logs
    suggest_fixes
    
    log "🏁 Diagnostic completed!"
}

main "$@"