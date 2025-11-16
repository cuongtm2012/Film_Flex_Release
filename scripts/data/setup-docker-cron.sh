# PhimGG Complete Cron Job Setup Script - DOCKER VERSION
# This script handles everything needed for automated movie data import INTO DOCKER CONTAINERS

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

# Define variables - Updated for Docker deployment
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Docker-specific configuration
DOCKER_COMPOSE_FILE="docker-compose.server.yml"
if [ ! -f "$APP_DIR/$DOCKER_COMPOSE_FILE" ]; then
    DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
fi

DATA_DIR="$APP_DIR/scripts/data"
CRON_FILE="/etc/cron.d/filmflex-docker-import"
USER="root"
LOG_DIR="/var/log/filmflex"
CRON_WRAPPER="$APP_DIR/scripts/deployment/cron-docker-wrapper.sh"

# Required Docker import scripts
REQUIRED_SCRIPTS=(
  "$DATA_DIR/import-docker-movies.sh"
  "$DATA_DIR/import-movies-docker.cjs"
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
        echo "  install   - Install Docker cron jobs (default)"
        echo "  diagnose  - Run diagnostic tests"
        echo "  status    - Show current cron configuration"
        exit 1
        ;;
esac

echo -e "${BLUE}Detected APP_DIR: $APP_DIR${NC}"
echo -e "${BLUE}SCRIPT_DIR: $SCRIPT_DIR${NC}"
echo -e "${BLUE}Docker Compose File: $DOCKER_COMPOSE_FILE${NC}"

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "  PhimGG Docker Import Setup"
echo "========================================"
echo -e "${NC}"

# Handle diagnostic mode
if [ "$DIAGNOSTIC_MODE" = true ]; then
    print_section "Docker Container Diagnostics"
    
    echo -e "${BLUE}Checking Docker containers...${NC}"
    if command -v docker &> /dev/null; then
        echo "Docker containers status:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(filmflex|postgres)" || echo "No PhimGG containers found"
        
        # Test Docker database connection with multiple methods
        echo -e "\n${BLUE}Testing Docker PostgreSQL connection...${NC}"
        
        # Method 1: Docker compose exec
        if docker compose -f "$APP_DIR/$DOCKER_COMPOSE_FILE" exec -T postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null; then
            echo -e "${GREEN}✓ Docker PostgreSQL connection successful (via docker-compose)${NC}"
        # Method 2: Direct docker exec
        elif docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;" 2>/dev/null; then
            echo -e "${GREEN}✓ Docker PostgreSQL connection successful (via docker exec)${NC}"
        # Method 3: Test basic connection
        elif docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT 1;" 2>/dev/null; then
            echo -e "${YELLOW}⚠ PostgreSQL connected but movies table may not exist${NC}"
        # Method 4: Test if PostgreSQL is running
        elif docker exec filmflex-postgres pg_isready -U filmflex 2>/dev/null; then
            echo -e "${YELLOW}⚠ PostgreSQL is ready but database 'filmflex' may not exist${NC}"
        else
            echo -e "${RED}✗ Cannot connect to Docker PostgreSQL${NC}"
            echo -e "${BLUE}Debugging information:${NC}"
            echo "Container logs (last 10 lines):"
            docker logs filmflex-postgres --tail 10 2>/dev/null || echo "Cannot access container logs"
            echo "Container inspect:"
            docker inspect filmflex-postgres --format '{{.State.Status}}' 2>/dev/null || echo "Cannot inspect container"
        fi
    else
        echo -e "${RED}Docker not installed${NC}"
    fi
    exit 0
fi

# Handle status mode
if [ "$STATUS_MODE" = true ]; then
    print_section "Docker Cron Status"
    
    if [ -f "$CRON_FILE" ]; then
        echo -e "${GREEN}✓ Docker cron file exists: $CRON_FILE${NC}"
        echo "Content:"
        cat "$CRON_FILE" | sed 's/^/  /'
    else
        echo -e "${RED}✗ Docker cron file not found${NC}"
    fi
    exit 0
fi

# Continue with installation mode
print_section "Docker Installation Mode"

# Make sure log directory exists
mkdir -p "$LOG_DIR"

# Verify Docker setup
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not available${NC}"
    exit 1
fi

# Check if Docker containers are running
echo -e "${BLUE}Checking Docker containers...${NC}"
if ! docker ps | grep -q "filmflex-postgres"; then
    echo -e "${YELLOW}Warning: PostgreSQL container not running${NC}"
    echo "Starting containers..."
    cd "$APP_DIR"
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
    sleep 10
fi

if ! docker ps | grep -q "filmflex-app"; then
    echo -e "${YELLOW}Warning: App container not running${NC}"
    echo "Starting app container..."
    cd "$APP_DIR"
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d app
    sleep 5
fi

echo -e "${GREEN}✓ Docker containers are running${NC}"

# Verify required scripts exist
for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ ! -f "$script" ]; then
    echo -e "${RED}Error: Required Docker script not found: $script${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ All required Docker scripts found${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
  echo -e "${RED}This script must be run as root${NC}"
  exit 1
fi

# Make scripts executable
echo -e "${BLUE}Making Docker scripts executable...${NC}"
chmod +x $DATA_DIR/import-docker-movies.sh
chmod +x $DATA_DIR/import-movies-docker.cjs

# Create Docker cron wrapper
echo -e "${BLUE}Creating Docker cron wrapper...${NC}"
mkdir -p "$APP_DIR/scripts/deployment"

cat > "$CRON_WRAPPER" << 'DOCKER_WRAPPER_EOF'
#!/bin/bash

# PhimGG Docker Cron Job Wrapper Script
# This script runs import jobs inside Docker containers

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the timestamp
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Determine application paths
if [ -f "/var/www/filmflex/docker-compose.server.yml" ]; then
    APP_DIR="/var/www/filmflex"
    COMPOSE_FILE="docker-compose.server.yml"
elif [ -f "/root/Film_Flex_Release/docker-compose.server.yml" ]; then
    APP_DIR="/root/Film_Flex_Release"
    COMPOSE_FILE="docker-compose.server.yml"
elif [ -f "/root/Film_Flex_Release/docker-compose.prod.yml" ]; then
    APP_DIR="/root/Film_Flex_Release"
    COMPOSE_FILE="docker-compose.prod.yml"
else
    echo "[$DATE] ERROR: Cannot find Docker Compose file" >&2
    exit 1
fi

# Log directory
LOG_DIR="/var/log/filmflex"
mkdir -p "$LOG_DIR"

echo "[$DATE] Starting PhimGG Docker cron wrapper..." >&2
echo "[$DATE] APP_DIR: $APP_DIR" >&2
echo "[$DATE] COMPOSE_FILE: $COMPOSE_FILE" >&2

# Change to application directory
cd "$APP_DIR"

# Check if containers are running
if ! docker ps | grep -q "filmflex-postgres"; then
    echo "[$DATE] ERROR: PostgreSQL container not running" >&2
    echo "[$DATE] Starting containers..." >&2
    docker compose -f "$COMPOSE_FILE" up -d postgres
    sleep 10
fi

if ! docker ps | grep -q "filmflex-app"; then
    echo "[$DATE] ERROR: App container not running" >&2
    echo "[$DATE] Starting app container..." >&2
    docker compose -f "$COMPOSE_FILE" up -d app
    sleep 5
fi

echo "[$DATE] Containers verified as running" >&2

# Run the command inside the app container - Enhanced with multiple methods
echo "[$DATE] Executing in Docker: $*" >&2

# Method 1: Try docker-compose exec with working directory
if docker compose -f "$COMPOSE_FILE" exec -T app sh -c "cd /app && $*" 2>/dev/null; then
    echo "[$DATE] SUCCESS: Command executed via docker-compose" >&2
    exit 0
fi

# Method 2: Try direct docker exec with working directory
if docker exec filmflex-app sh -c "cd /app && $*" 2>/dev/null; then
    echo "[$DATE] SUCCESS: Command executed via docker exec" >&2
    exit 0
fi

# Method 3: Try without working directory change
if docker exec filmflex-app sh -c "$*" 2>/dev/null; then
    echo "[$DATE] SUCCESS: Command executed directly" >&2
    exit 0
fi

# All methods failed - provide detailed error info
echo "[$DATE] ERROR: All execution methods failed" >&2
echo "[$DATE] Container status:" >&2
docker ps | grep filmflex-app >&2
echo "[$DATE] Available containers:" >&2
docker ps --format "table {{.Names}}\t{{.Status}}" >&2
exit 1
DOCKER_WRAPPER_EOF

chmod +x "$CRON_WRAPPER"
echo -e "${GREEN}Docker cron wrapper created successfully${NC}"

# Create Docker-specific cron job file
echo -e "${BLUE}Creating Docker cron job entries...${NC}"
cat > $CRON_FILE << EOF
# PhimGG Docker Data Import Cron Jobs
# These jobs run inside Docker containers
PATH=/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin
SHELL=/bin/bash

# OPHIM SOURCE: Run 4 times daily (staggered with KKPhim)
# Runs at: 00:00, 06:00, 12:00, 18:00 (3 pages each time)
0 0,6,12,18 * * * $USER $CRON_WRAPPER npx tsx scripts/data/import-ophim-movies.ts --start 1 --end 3 >> $LOG_DIR/docker-ophim-import.log 2>&1

# KKPHIM SOURCE: Run 4 times daily (staggered with Ophim)
# Runs at: 03:00, 09:00, 15:00, 21:00 (3 pages each time)
0 3,9,15,21 * * * $USER $CRON_WRAPPER node scripts/data/import-movies-docker.cjs --max-pages=3 >> $LOG_DIR/docker-kkphim-import.log 2>&1

# OPHIM DEEP SCAN: Weekly comprehensive scan
# Runs every Saturday at 02:00 (10 pages)
0 2 * * 6 $USER $CRON_WRAPPER npx tsx scripts/data/import-ophim-movies.ts --start 1 --end 10 --verbose >> $LOG_DIR/docker-ophim-weekly.log 2>&1

# KKPHIM DEEP SCAN: Weekly comprehensive scan (6 hours after Ophim)
# Runs every Saturday at 08:00 (10 pages)
0 8 * * 6 $USER $CRON_WRAPPER node scripts/data/import-movies-docker.cjs --deep-scan --max-pages=10 >> $LOG_DIR/docker-kkphim-weekly.log 2>&1

# FULL IMPORT: Monthly comprehensive import from all sources
# Runs first Sunday of month at 01:00
0 1 1-7 * 0 $USER $CRON_WRAPPER bash scripts/data/import-all-movies-resumable-docker.sh >> $LOG_DIR/docker-monthly-import.log 2>&1

# CLEANUP: Remove old logs (keep last 30 days)
0 0 * * * $USER find $LOG_DIR -name "*.log" -type f -mtime +30 -delete

# Keep an empty line at the end of the file
EOF

# Set proper permissions
chmod 644 $CRON_FILE

# Restart cron service (using the enhanced logic from original script)
echo -e "${BLUE}Restarting cron service...${NC}"
CRON_RESTARTED=false

if command -v systemctl &> /dev/null; then
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
fi

if [ "$CRON_RESTARTED" = false ]; then
  if command -v crontab &> /dev/null; then
    echo -e "${GREEN}✓ Cron appears to be installed (crontab command available)${NC}"
    CRON_RESTARTED=true
  fi
fi

if [ "$CRON_RESTARTED" = true ]; then
  echo -e "${GREEN}✓ Cron service configuration completed${NC}"
else
  echo -e "${YELLOW}⚠ Could not restart cron service automatically${NC}"
fi

# Test the Docker wrapper
echo -e "${BLUE}Testing Docker cron wrapper...${NC}"
if bash "$CRON_WRAPPER" echo "Docker wrapper test successful"; then
  echo -e "${GREEN}✓ Docker wrapper test passed${NC}"
else
  echo -e "${RED}✗ Docker wrapper test failed${NC}"
fi

# Print completion message
echo -e "${GREEN}Docker cron jobs successfully created at $CRON_FILE${NC}"
echo -e "${GREEN}Schedule (runs inside Docker containers):${NC}"
echo -e "${BLUE}DAILY IMPORTS (both sources - 4 times/day):${NC}"
echo -e "  📺 Ophim:  00:00, 06:00, 12:00, 18:00 (3 pages)"
echo -e "  📺 KKPhim: 03:00, 09:00, 15:00, 21:00 (3 pages)"
echo -e "${BLUE}WEEKLY DEEP SCANS (Saturday - 6 hours apart):${NC}"
echo -e "  🔍 Ophim:  02:00 (10 pages)"
echo -e "  🔍 KKPhim: 08:00 (10 pages)"
echo -e "${BLUE}MONTHLY FULL IMPORT:${NC}"
echo -e "  📦 All sources: First Sunday 01:00"

# Create test script
echo -e "${BLUE}Creating Docker test script...${NC}"
cat > $DATA_DIR/test-docker-cron.sh << EOF
#!/bin/bash
# Docker cron test script

echo "Testing Docker cron wrapper with import..."
echo "This runs the import inside the Docker container"
echo

# Test Ophim import (1 page)
echo "Testing Ophim import script..."
$CRON_WRAPPER npx tsx scripts/data/import-ophim-movies.ts --page 1 --verbose

echo
echo "Docker test completed. Check output above for any errors."
EOF
chmod +x $DATA_DIR/test-docker-cron.sh

# Ask if user wants to test now
echo
echo -e "${YELLOW}Test the Docker import now?${NC}"
echo -e "1) Test Ophim import (1 page with TypeScript)"
echo -e "2) Test legacy import (1 page)"
echo -e "3) Run Ophim daily import (3 pages)"
echo -e "4) Skip testing"
read -p "Select an option (1-4): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
  echo -e "${GREEN}Running Ophim import test...${NC}"
  bash $DATA_DIR/test-docker-cron.sh
elif [[ $REPLY =~ ^[2]$ ]]; then
  echo -e "${GREEN}Running legacy Docker test import...${NC}"
  bash $CRON_WRAPPER node scripts/data/import-movies-docker.cjs --max-pages=1
elif [[ $REPLY =~ ^[3]$ ]]; then
  echo -e "${GREEN}Running Ophim daily import...${NC}"
  cd $APP_DIR
  bash $CRON_WRAPPER npx tsx scripts/data/import-ophim-movies.ts --start 1 --end 3
else
  echo -e "${BLUE}Skipping test. You can run it manually later.${NC}"
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    Docker Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${YELLOW}📋 Quick Reference:${NC}"
echo -e "${BLUE}Ophim Import:${NC}"
echo -e "  • Test: bash $DATA_DIR/test-docker-cron.sh"
echo -e "  • Manual: npx tsx scripts/data/import-ophim-movies.ts --page 1 --verbose"
echo -e "  • Logs: tail -f $LOG_DIR/docker-ophim-import.log"
echo -e "${BLUE}KKPhim Import:${NC}"
echo -e "  • Manual: node scripts/data/import-movies-docker.cjs --max-pages=1"
echo -e "  • Logs: tail -f $LOG_DIR/docker-kkphim-*.log"
echo -e "${BLUE}General:${NC}"
echo -e "  • Check status: bash $0 status"
echo -e "  • Diagnose: bash $0 diagnose"
echo -e "  • All logs: tail -f $LOG_DIR/docker-*.log"
echo
echo -e "${BLUE}🐳 Docker Commands:${NC}"
echo -e "  • Check containers: docker ps"
echo -e "  • View app logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f app"
echo -e "  • Check database: docker compose -f $DOCKER_COMPOSE_FILE exec postgres psql -U filmflex -d filmflex -c \"SELECT COUNT(*) FROM movies;\""
echo

exit 0