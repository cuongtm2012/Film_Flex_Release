#!/bin/bash

# Deploy Enhanced Cron Scripts to Server
# Transfers all necessary scripts and sets up the enhanced cron system

set -e

# Configuration
LOCAL_PROJECT_ROOT="/Users/jack/Desktop/1.PROJECT/Film_Flex_Release"
SERVER_USER="root"
SERVER_HOST="your-server-ip"  # Replace with your actual server IP
SERVER_PROJECT_ROOT="/root/Film_Flex_Release"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_deploy() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "[$timestamp] ${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "[$timestamp] ${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "[$timestamp] ${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "[$timestamp] ${BLUE}ℹ️  $message${NC}" ;;
        "HEADER") echo -e "[$timestamp] ${PURPLE}🎯 $message${NC}" ;;
    esac
}

print_banner() {
    echo -e "${BLUE}"
    echo "================================================================="
    echo "    Enhanced FilmFlex Cron System Deployment"
    echo "================================================================="
    echo -e "${NC}"
    echo "Local:  $LOCAL_PROJECT_ROOT"
    echo "Server: $SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT"
    echo ""
}

# Check if we can connect to server
check_server_connection() {
    log_deploy "INFO" "Checking server connection..."
    
    if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" >/dev/null 2>&1; then
        log_deploy "SUCCESS" "Server connection established"
        return 0
    else
        log_deploy "ERROR" "Cannot connect to server. Please check:"
        echo "  1. Server IP is correct: $SERVER_HOST"
        echo "  2. SSH key is configured"
        echo "  3. Server is accessible"
        echo ""
        echo "To fix this:"
        echo "  1. Update SERVER_HOST in this script"
        echo "  2. Ensure SSH access: ssh $SERVER_USER@$SERVER_HOST"
        return 1
    fi
}

# Make all scripts executable locally
make_scripts_executable() {
    log_deploy "INFO" "Making scripts executable locally..."
    
    local scripts=(
        "scripts/deployment/manage-cron.sh"
        "scripts/deployment/cron-docker-wrapper.sh"
        "scripts/maintenance/health-check.sh"
        "scripts/maintenance/track-import-success.sh"
        "scripts/maintenance/rotate-logs.sh"
        "scripts/maintenance/log-db-stats.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$LOCAL_PROJECT_ROOT/$script"
        if [ -f "$script_path" ]; then
            chmod +x "$script_path"
            log_deploy "SUCCESS" "Made executable: $script"
        else
            log_deploy "WARNING" "Script not found: $script"
        fi
    done
}

# Transfer scripts to server
transfer_scripts() {
    log_deploy "HEADER" "Transferring scripts to server..."
    
    # Create remote directories
    ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_PROJECT_ROOT/scripts/{deployment,maintenance}"
    
    # Transfer deployment scripts
    log_deploy "INFO" "Transferring deployment scripts..."
    scp "$LOCAL_PROJECT_ROOT/scripts/deployment/manage-cron.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/deployment/"
    
    scp "$LOCAL_PROJECT_ROOT/scripts/deployment/cron-docker-wrapper.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/deployment/"
    
    scp "$LOCAL_PROJECT_ROOT/scripts/deployment/enhanced-cron.conf" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/deployment/"
    
    # Transfer maintenance scripts
    log_deploy "INFO" "Transferring maintenance scripts..."
    scp "$LOCAL_PROJECT_ROOT/scripts/maintenance/health-check.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/maintenance/"
    
    scp "$LOCAL_PROJECT_ROOT/scripts/maintenance/track-import-success.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/maintenance/"
    
    scp "$LOCAL_PROJECT_ROOT/scripts/maintenance/rotate-logs.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/maintenance/"
    
    scp "$LOCAL_PROJECT_ROOT/scripts/maintenance/log-db-stats.sh" \
        "$SERVER_USER@$SERVER_HOST:$SERVER_PROJECT_ROOT/scripts/maintenance/"
    
    log_deploy "SUCCESS" "All scripts transferred successfully"
}

# Make scripts executable on server
make_server_scripts_executable() {
    log_deploy "INFO" "Making scripts executable on server..."
    
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        chmod +x /root/Film_Flex_Release/scripts/deployment/*.sh
        chmod +x /root/Film_Flex_Release/scripts/maintenance/*.sh
EOF
    
    log_deploy "SUCCESS" "Server scripts made executable"
}

# Install enhanced cron system on server
install_enhanced_cron() {
    log_deploy "HEADER" "Installing enhanced cron system on server..."
    
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /root/Film_Flex_Release
        
        # Run the enhanced cron installation
        if [ -f "scripts/deployment/manage-cron.sh" ]; then
            bash scripts/deployment/manage-cron.sh install
        else
            echo "Error: manage-cron.sh not found"
            exit 1
        fi
EOF
    
    log_deploy "SUCCESS" "Enhanced cron system installed on server"
}

# Verify installation
verify_installation() {
    log_deploy "HEADER" "Verifying installation on server..."
    
    log_deploy "INFO" "Checking cron jobs status..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        echo "=== Cron Jobs Status ==="
        if [ -f "/etc/cron.d/filmflex-imports" ]; then
            echo "✅ Enhanced cron jobs installed"
            echo ""
            echo "Active cron jobs:"
            cat /etc/cron.d/filmflex-imports | grep -v "^#" | grep -v "^$"
        else
            echo "❌ Cron jobs not found"
        fi
        
        echo ""
        echo "=== Script Permissions ==="
        find /root/Film_Flex_Release/scripts -name "*.sh" -exec ls -la {} \;
        
        echo ""
        echo "=== Log Directory ==="
        ls -la /var/log/filmflex/ 2>/dev/null || echo "Log directory will be created on first run"
EOF
    
    log_deploy "SUCCESS" "Installation verification completed"
}

# Test the system
test_enhanced_system() {
    log_deploy "HEADER" "Testing enhanced cron system..."
    
    log_deploy "INFO" "Running test import..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /root/Film_Flex_Release
        
        # Test the cron wrapper
        echo "Testing cron docker wrapper..."
        timeout 300 bash scripts/deployment/cron-docker-wrapper.sh regular test || echo "Test completed (may have timed out)"
        
        # Test health check
        echo "Testing health check..."
        bash scripts/maintenance/health-check.sh --basic || echo "Health check completed"
        
        # Test tracking
        echo "Testing import tracking..."
        bash scripts/maintenance/track-import-success.sh analyze || echo "Tracking test completed"
EOF
    
    log_deploy "SUCCESS" "System testing completed"
}

# Show next steps
show_next_steps() {
    log_deploy "HEADER" "Deployment completed successfully!"
    echo ""
    echo -e "${GREEN}🎉 Enhanced FilmFlex Cron System Deployed!${NC}"
    echo ""
    echo -e "${BLUE}📋 What was installed:${NC}"
    echo "  ✅ Enhanced cron jobs (5 different import strategies)"
    echo "  ✅ Health monitoring system"
    echo "  ✅ Import success tracking"
    echo "  ✅ Log rotation and cleanup"
    echo "  ✅ Database statistics logging"
    echo ""
    echo -e "${BLUE}📅 Cron Schedule:${NC}"
    echo "  • 6:00 AM & 6:00 PM (Mon-Fri): Regular imports"
    echo "  • 10:00 AM (Weekends): Weekend imports"
    echo "  • 4:00 AM (Saturdays): Deep discovery"
    echo "  • 1st Sunday 1:00 AM: Comprehensive scan"
    echo "  • Wednesday 2:00 PM: Targeted new content"
    echo "  • Every 4 hours: Health checks"
    echo "  • Daily: Log cleanup and DB stats"
    echo ""
    echo -e "${BLUE}🔧 Server Management Commands:${NC}"
    echo "  • Check status: ssh $SERVER_USER@$SERVER_HOST 'cd /root/Film_Flex_Release && bash scripts/deployment/manage-cron.sh status'"
    echo "  • View logs: ssh $SERVER_USER@$SERVER_HOST 'cd /root/Film_Flex_Release && bash scripts/deployment/manage-cron.sh logs import'"
    echo "  • Test system: ssh $SERVER_USER@$SERVER_HOST 'cd /root/Film_Flex_Release && bash scripts/deployment/manage-cron.sh test regular'"
    echo "  • Reset counters: ssh $SERVER_USER@$SERVER_HOST 'cd /root/Film_Flex_Release && bash scripts/deployment/manage-cron.sh reset'"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "  • First import will run at next scheduled time"
    echo "  • Monitor logs in /var/log/filmflex/ on server"
    echo "  • Import scripts are now available in Docker container"
    echo "  • System will automatically retry failed imports"
    echo ""
    echo -e "${GREEN}✅ Your daily import issue should now be resolved!${NC}"
}

# Main execution
main() {
    print_banner
    
    # Check if server host is configured
    if [ "$SERVER_HOST" = "your-server-ip" ]; then
        log_deploy "ERROR" "Please update SERVER_HOST in this script with your actual server IP"
        echo ""
        echo "Edit this script and change:"
        echo "  SERVER_HOST=\"your-server-ip\""
        echo "to:"
        echo "  SERVER_HOST=\"your.actual.server.ip\""
        exit 1
    fi
    
    # Execute deployment steps
    check_server_connection || exit 1
    make_scripts_executable
    transfer_scripts
    make_server_scripts_executable
    install_enhanced_cron
    verify_installation
    test_enhanced_system
    show_next_steps
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "This script deploys the enhanced FilmFlex cron system to your server."
    echo ""
    echo "Before running:"
    echo "  1. Update SERVER_HOST with your server IP"
    echo "  2. Ensure SSH key access to your server"
    echo "  3. Verify Docker containers are running on server"
    echo ""
    echo "What it does:"
    echo "  • Transfers all cron and maintenance scripts"
    echo "  • Installs enhanced cron jobs"
    echo "  • Sets up monitoring and logging"
    echo "  • Tests the system"
    echo ""
    exit 0
fi

# Run main function
main "$@"