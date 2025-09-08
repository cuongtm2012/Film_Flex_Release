#!/bin/bash

# FilmFlex Complete Cron Job Setup Script
# This script handles everything needed for automated movie data import:
# - Creates cron-wrapper for environment variable loading
# - Sets up scheduled cron jobs
# - Provides diagnostic and testing tools
# - Handles both development and production environments

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit immediately if a command exits with a non-zero status
set -e

# Function to print section headers
print_section() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to run diagnostics
run_diagnostics() {
    print_section "Running Diagnostics"
    
    echo -e "${BLUE}System Information:${NC}"
    echo "Current user: $(whoami)"
    echo "Current directory: $(pwd)"
    echo "Hostname: $(hostname)"
    echo "Date: $(date)"
    
    echo -e "\n${BLUE}Cron Service Status:${NC}"
    if command -v systemctl &> /dev/null; then
        systemctl is-active cron 2>/dev/null && echo "✓ Cron service is active" || echo "⚠ Cron service not active"
        systemctl is-enabled cron 2>/dev/null && echo "✓ Cron service is enabled" || echo "⚠ Cron service not enabled"
    elif command -v service &> /dev/null; then
        service cron status >/dev/null 2>&1 && echo "✓ Cron service is running" || echo "⚠ Cron service status unknown"
    fi
    
    echo -e "\n${BLUE}Environment Paths:${NC}"
    echo "APP_DIR: $APP_DIR"
    echo "SCRIPT_DIR: $SCRIPT_DIR"
    echo "DATA_DIR: $DATA_DIR"
    echo "LOG_DIR: $LOG_DIR"
    echo "CRON_FILE: $CRON_FILE"
    echo "CRON_WRAPPER: $CRON_WRAPPER"
    
    # Check .env file
    if [ -f "$APP_DIR/.env" ]; then
        echo -e "${GREEN}✓ .env file found${NC}"
        echo "First few environment variables:"
        head -3 "$APP_DIR/.env" | sed 's/^/  /'
    else
        echo -e "${RED}✗ .env file not found${NC}"
    fi
    
    # Check required scripts
    echo -e "\n${BLUE}Required Scripts:${NC}"
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            echo -e "${GREEN}✓ Found: $(basename "$script")${NC}"
        else
            echo -e "${RED}✗ Missing: $script${NC}"
        fi
    done
}

# Function to test the cron wrapper manually
test_cron_wrapper() {
    print_section "Testing Cron Wrapper"
    
    if [ -f "$CRON_WRAPPER" ]; then
        echo "Testing cron wrapper with a simple command..."
        if bash "$CRON_WRAPPER" echo "Cron wrapper test successful" 2>&1; then
            echo -e "${GREEN}✓ Cron wrapper test passed${NC}"
        else
            echo -e "${RED}✗ Cron wrapper test failed${NC}"
            echo "Try running manually: bash $CRON_WRAPPER echo 'test'"
        fi
        
        echo -e "\nTesting with import script (1 page)..."
        if bash "$CRON_WRAPPER" bash "$APP_DIR/scripts/data/import-movies.sh" --max-pages=1 2>/dev/null; then
            echo -e "${GREEN}✓ Import script test successful${NC}"
        else
            echo -e "${YELLOW}⚠ Import script test failed (this may be normal if no import-movies.sh exists)${NC}"
        fi
    else
        echo -e "${RED}✗ Cron wrapper not found${NC}"
    fi
}

# Function to show current cron jobs
show_cron_status() {
    print_section "Current Cron Configuration"
    
    if [ -f "$CRON_FILE" ]; then
        echo -e "${GREEN}✓ Cron file exists: $CRON_FILE${NC}"
        echo "Content:"
        cat "$CRON_FILE" | sed 's/^/  /'
        
        echo -e "\nCron jobs using wrapper:"
        grep -n "cron-wrapper" "$CRON_FILE" | sed 's/^/  /' || echo "  No wrapper usage found"
    else
        echo -e "${RED}✗ Cron file not found: $CRON_FILE${NC}"
    fi
    
    echo -e "\n${BLUE}User crontab:${NC}"
    crontab -l 2>/dev/null | sed 's/^/  /' || echo "  No user crontab found"
    
    echo -e "\n${BLUE}Recent cron logs:${NC}"
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -name "cron-*.log" -type f -mtime -1 2>/dev/null | head -3 | while read logfile; do
            echo "  Recent entries from $(basename "$logfile"):"
            tail -3 "$logfile" 2>/dev/null | sed 's/^/    /' || echo "    (empty)"
        done
    else
        echo "  No log directory found"
    fi
}

# Define variables
# Detect the actual application directory based on where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"  # Go up two levels from scripts/data

# Alternative app directory detection for common deployment paths
if [ -f "/var/www/filmflex/.env" ]; then
    APP_DIR="/var/www/filmflex"
elif [ -f "/root/Film_Flex_Release/.env" ]; then
    APP_DIR="/root/Film_Flex_Release"
fi

DATA_DIR="$APP_DIR/scripts/data"
CRON_FILE="/etc/cron.d/filmflex-data-import"
USER="root"  # User to run the cron job as
LOG_DIR="/var/log/filmflex"
CRON_WRAPPER="$APP_DIR/scripts/deployment/cron-wrapper.sh"

# Required scripts for validation
REQUIRED_SCRIPTS=(
  "$DATA_DIR/import-movies.sh"
  "$DATA_DIR/import-all-movies-resumable.sh"
)

# Check for command line arguments
COMMAND="$1"
case "$COMMAND" in
    "diagnose"|"diagnostic"|"test")
        DIAGNOSTIC_MODE=true
        ;;
    "status")
        STATUS_MODE=true
        ;;
    "install"|"setup"|"")
        INSTALL_MODE=true
        ;;
    *)
        echo -e "${YELLOW}Usage: $0 [install|diagnose|status]${NC}"
        echo "  install   - Install cron jobs (default)"
        echo "  diagnose  - Run diagnostic tests"
        echo "  status    - Show current cron configuration"
        exit 1
        ;;
esac

echo -e "${BLUE}Detected APP_DIR: $APP_DIR${NC}"
echo -e "${BLUE}SCRIPT_DIR: $SCRIPT_DIR${NC}"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "  FilmFlex Automated Import Setup"
echo "========================================"
echo -e "${NC}"

# Handle different modes
if [ "$DIAGNOSTIC_MODE" = true ]; then
    run_diagnostics
    exit 0
elif [ "$STATUS_MODE" = true ]; then
    show_cron_status
    exit 0
fi

# Continue with installation mode
print_section "Installation Mode"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Verify that the application directory exists and contains the expected structure
if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}Error: Application directory not found: $APP_DIR${NC}"
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo -e "${RED}Error: .env file not found in: $APP_DIR${NC}"
  exit 1
fi

# Verify required scripts exist
REQUIRED_SCRIPTS=(
  "$DATA_DIR/import-movies.sh"
  "$DATA_DIR/import-all-movies-resumable.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ ! -f "$script" ]; then
    echo -e "${RED}Error: Required script not found: $script${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ All required scripts and files found${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
  echo -e "${RED}This script must be run as root${NC}"
  exit 1
fi

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x $SCRIPT_DIR/*.sh
chmod +x $SCRIPT_DIR/*.cjs 2>/dev/null || true
chmod +x $APP_DIR/scripts/deployment/cron-wrapper.sh 2>/dev/null || true

# Verify cron-wrapper.sh exists or create it
CRON_WRAPPER="$APP_DIR/scripts/deployment/cron-wrapper.sh"
if [ ! -f "$CRON_WRAPPER" ]; then
  echo -e "${YELLOW}Creating cron-wrapper.sh script...${NC}"
  mkdir -p "$APP_DIR/scripts/deployment"
  
  cat > "$CRON_WRAPPER" << 'WRAPPER_EOF'
#!/bin/bash

# FilmFlex Cron Job Wrapper Script
# This script properly loads environment variables before running cron jobs

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the timestamp
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Determine environment paths
if [ -f "/var/www/filmflex/.env" ]; then
    # Production environment
    APP_DIR="/var/www/filmflex"
    ENV_FILE="/var/www/filmflex/.env"
elif [ -f "/root/Film_Flex_Release/.env" ]; then
    # Production environment (alternative path)
    APP_DIR="/root/Film_Flex_Release"
    ENV_FILE="/root/Film_Flex_Release/.env"
else
    echo -e "${RED}[$DATE] ERROR: Cannot find .env file${NC}" >&2
    exit 1
fi

# Log directory
LOG_DIR="/var/log/filmflex"
mkdir -p "$LOG_DIR"

echo "[$DATE] Starting FilmFlex cron wrapper..." >&2
echo "[$DATE] APP_DIR: $APP_DIR" >&2
echo "[$DATE] ENV_FILE: $ENV_FILE" >&2

# Export environment variables from .env file
if [ -f "$ENV_FILE" ]; then
    echo "[$DATE] Loading environment variables from $ENV_FILE" >&2
    
    # Source the environment file, handling both formats
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # turn off automatic export
    
    # Verify critical environment variables are loaded
    if [ -z "$DATABASE_URL" ]; then
        echo "[$DATE] ERROR: DATABASE_URL not loaded from environment" >&2
        exit 1
    fi
    
    echo "[$DATE] Environment variables loaded successfully" >&2
    echo "[$DATE] DATABASE_URL: ${DATABASE_URL:0:30}..." >&2  # Only show first 30 chars for security
else
    echo "[$DATE] ERROR: Environment file not found: $ENV_FILE" >&2
    exit 1
fi

# Change to application directory
cd "$APP_DIR"

# Set NODE_ENV to production
export NODE_ENV=production

# Run the command passed as arguments
echo "[$DATE] Executing: $*" >&2
exec "$@"
WRAPPER_EOF

  chmod +x "$CRON_WRAPPER"
  echo -e "${GREEN}Cron wrapper script created successfully${NC}"
else
  echo -e "${GREEN}Cron wrapper script already exists${NC}"
fi

# Create cron job file
echo -e "${BLUE}Creating cron job entries...${NC}"
cat > $CRON_FILE << EOF
# FilmFlex Data Import Cron Jobs - Enhanced Environment Variable Loading
# Set PATH and environment variables for Node.js and PM2
PATH=/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin
SHELL=/bin/bash

# Run normal movie data import twice daily at 6 AM and 6 PM (first 3 pages)
0 6,18 * * 0-5 $USER $CRON_WRAPPER bash $APP_DIR/scripts/data/import-movies.sh --max-pages=3 > $LOG_DIR/cron-import-\$(date +\\%Y\\%m\\%d\\%H\\%M\\%S).log 2>&1

# Run a deep scan every Saturday at 6 AM
# This will automatically scan multiple pages to ensure all new content is captured
0 6 * * 6 $USER $CRON_WRAPPER bash $APP_DIR/scripts/data/import-movies.sh --deep-scan --max-pages=10 > $LOG_DIR/cron-deep-import-\$(date +\\%Y\\%m\\%d\\%H\\%M\\%S).log 2>&1

# Run a complete database refresh monthly using resumable script (first Sunday of month at 1 AM)
0 1 1-7 * 0 $USER $CRON_WRAPPER bash $APP_DIR/scripts/data/import-all-movies-resumable.sh > $LOG_DIR/cron-full-import-\$(date +\\%Y\\%m\\%d\\%H\\%M\\%S).log 2>&1

# Cleanup old logs (keep last 30 days)
0 0 * * * $USER find $LOG_DIR -name "*.log" -type f -mtime +30 -delete

# Keep an empty line at the end of the file
EOF

# Set proper permissions
chmod 644 $CRON_FILE

# Restart cron service
echo -e "${BLUE}Restarting cron service...${NC}"
CRON_RESTARTED=false

# Try different cron service names and methods
if command -v systemctl &> /dev/null; then
  # SystemD systems - try different service names
  for service_name in cron crond crontab; do
    if systemctl list-units --type=service | grep -q "$service_name"; then
      echo "Found systemd service: $service_name"
      systemctl restart "$service_name" 2>/dev/null && {
        systemctl status "$service_name" --no-pager -l | head -10
        CRON_RESTARTED=true
        break
      }
    fi
  done
  
  # If no service found, try enabling and starting cron
  if [ "$CRON_RESTARTED" = false ]; then
    echo "Attempting to install and enable cron service..."
    systemctl enable cron 2>/dev/null || systemctl enable crond 2>/dev/null || true
    systemctl start cron 2>/dev/null || systemctl start crond 2>/dev/null || {
      echo -e "${YELLOW}Could not start cron service via systemd${NC}"
    }
  fi
elif command -v service &> /dev/null; then
  # SysV init systems
  for service_name in cron crond crontab; do
    service "$service_name" restart 2>/dev/null && {
      service "$service_name" status | head -10
      CRON_RESTARTED=true
      break
    }
  done
else
  echo -e "${YELLOW}No systemctl or service command found${NC}"
fi

# If we still couldn't restart, check if cron is installed
if [ "$CRON_RESTARTED" = false ]; then
  echo -e "${YELLOW}Checking if cron is installed...${NC}"
  
  if command -v crontab &> /dev/null; then
    echo -e "${GREEN}✓ Cron appears to be installed (crontab command available)${NC}"
    echo -e "${BLUE}Cron jobs have been configured but service restart failed${NC}"
    echo -e "${BLUE}This may be normal on some systems${NC}"
    
    # Try to reload crontab directly
    echo -e "${BLUE}Attempting to reload cron configuration...${NC}"
    if [ -f /var/run/crond.pid ]; then
      kill -HUP $(cat /var/run/crond.pid) 2>/dev/null && echo "✓ Sent reload signal to cron daemon"
    fi
    
    CRON_RESTARTED=true
  else
    echo -e "${RED}✗ Cron does not appear to be installed${NC}"
    echo -e "${YELLOW}Please install cron:${NC}"
    echo -e "  Ubuntu/Debian: apt-get install cron"
    echo -e "  CentOS/RHEL: yum install cronie"
    echo -e "  Then run this script again${NC}"
  fi
fi

if [ "$CRON_RESTARTED" = true ]; then
  echo -e "${GREEN}✓ Cron service configuration completed${NC}"
else
  echo -e "${YELLOW}⚠ Could not restart cron service automatically${NC}"
  echo -e "${YELLOW}Please restart cron manually or reboot the server${NC}"
fi

# Print completion message
echo -e "${GREEN}Cron jobs successfully created at $CRON_FILE${NC}"
echo -e "${GREEN}Schedule:${NC}"
echo -e "  - Daily import: 6:00 AM and 6:00 PM (3 pages)"
echo -e "  - Weekly deep scan: Saturday 6:00 AM (10 pages)"
echo -e "  - Monthly full database refresh: First Sunday of each month at 1:00 AM"

# Verify the cron jobs were created correctly
echo -e "${BLUE}Verifying cron job configuration...${NC}"
if [ -f "$CRON_FILE" ]; then
  echo -e "${GREEN}✓ Cron file created successfully${NC}"
  echo -e "${BLUE}Cron jobs using cron-wrapper for environment variable loading:${NC}"
  grep -n "cron-wrapper" "$CRON_FILE" | sed 's/^/  /'
  
  # Test the cron-wrapper script
  echo -e "${BLUE}Testing cron-wrapper script...${NC}"
  if bash "$CRON_WRAPPER" echo "Cron wrapper test successful"; then
    echo -e "${GREEN}✓ Cron wrapper script is working${NC}"
  else
    echo -e "${RED}✗ Cron wrapper script failed${NC}"
  fi
else
  echo -e "${RED}✗ Error: Cron file not created${NC}"
fi

# Create a launcher script for the resumable import
echo -e "${BLUE}Creating launcher for resumable import...${NC}"
cat > $DATA_DIR/start-full-import.sh << EOF
#!/bin/bash
# Launcher for complete database import
cd $APP_DIR && bash $CRON_WRAPPER bash $APP_DIR/scripts/data/import-all-movies-resumable.sh
EOF
chmod +x $DATA_DIR/start-full-import.sh

# Create a manual test script
echo -e "${BLUE}Creating manual test script...${NC}"
cat > $DATA_DIR/test-cron-manual.sh << EOF
#!/bin/bash
# Manual test script for cron jobs

echo "Testing cron wrapper with import script..."
echo "This should load environment variables and run a small import test"
echo

# Test with 1 page import
$CRON_WRAPPER bash $APP_DIR/scripts/data/import-movies.sh --max-pages=1

echo
echo "Test completed. Check output above for any errors."
EOF
chmod +x $DATA_DIR/test-cron-manual.sh

# Ask if user wants to run the import now
echo
echo -e "${YELLOW}Which import would you like to run now?${NC}"
echo -e "1) Daily import (3 pages)"
echo -e "2) Weekly deep scan (10 pages)"
echo -e "3) Monthly full database refresh (resumable)"
echo -e "4) Test cron wrapper manually"
echo -e "5) Skip running imports now"
read -p "Select an option (1-5): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
  echo -e "${GREEN}Running daily import now...${NC}"
  cd $APP_DIR
  bash $CRON_WRAPPER bash $APP_DIR/scripts/data/import-movies.sh --max-pages=3
elif [[ $REPLY =~ ^[2]$ ]]; then
  echo -e "${GREEN}Running deep scan now...${NC}"
  cd $APP_DIR
  bash $CRON_WRAPPER bash $APP_DIR/scripts/data/import-movies.sh --deep-scan --max-pages=10
elif [[ $REPLY =~ ^[3]$ ]]; then
  echo -e "${GREEN}Running full database refresh now...${NC}"
  cd $APP_DIR
  bash $CRON_WRAPPER bash $APP_DIR/scripts/data/import-all-movies-resumable.sh
elif [[ $REPLY =~ ^[4]$ ]]; then
  echo -e "${GREEN}Running manual test...${NC}"
  bash $DATA_DIR/test-cron-manual.sh
else
  echo -e "${BLUE}Skipping import for now. You can run it manually later.${NC}"
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}         Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}📋 Quick Reference:${NC}"
echo -e "  • Run diagnostics: bash $0 diagnose"
echo -e "  • Check status: bash $0 status"
echo -e "  • Manual test: bash $DATA_DIR/test-cron-manual.sh"
echo -e "  • View cron file: cat $CRON_FILE"
echo -e "  • Watch logs: tail -f $LOG_DIR/cron-*.log"
echo
echo -e "${BLUE}📅 Scheduled Jobs:${NC}"
echo -e "  • Daily: 6 AM & 6 PM (3 pages) - Mon-Fri"
echo -e "  • Weekly: Saturday 6 AM (10 pages)"
echo -e "  • Monthly: 1st Sunday 1 AM (full refresh)"
echo

exit 0