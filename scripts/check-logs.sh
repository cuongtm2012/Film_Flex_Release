#!/bin/bash
# Check logs script for remote server monitoring
# Usage: ./check-logs.sh [--all|--app|--error|--nginx|--system|--pm2|--tail]

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
SSH_USER="root"
SSH_HOST="38.54.115.156"
APP_PATH="/var/www/filmflex"
LOG_PATH="/var/log"

# Show usage information
function show_usage {
  echo "Usage: $0 [OPTION]"
  echo "Check logs on the remote server."
  echo ""
  echo "Options:"
  echo "  --all        Show all logs (application, error, nginx, and system)"
  echo "  --app        Show application logs only"
  echo "  --error      Show error logs only"
  echo "  --nginx      Show nginx logs only"
  echo "  --system     Show system logs only"
  echo "  --pm2        Show PM2 logs (real-time)"
  echo "  --tail       Continuously follow application logs"
  echo "  --filter=X   Filter logs for keyword X"
  echo "  --errors     Show only error messages in logs"
  echo "  --debug      Show extended debug information"
  echo "  --db         Check database connection"
  echo "  --help       Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --app                  # Show application logs"
  echo "  $0 --error                # Show error logs"
  echo "  $0 --filter=\"fetch movies\" # Filter logs for 'fetch movies'"
  echo "  $0 --errors               # Show only error messages"
}

# Check application logs
function check_app_logs {
  echo -e "${GREEN}===== APPLICATION LOGS =====${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -n 50 $LOG_PATH/filmflex-out.log"
}

# Check error logs
function check_error_logs {
  echo -e "${RED}===== ERROR LOGS =====${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -n 50 $LOG_PATH/filmflex-error.log"
}

# Check nginx logs
function check_nginx_logs {
  echo -e "${YELLOW}===== NGINX ACCESS LOGS =====${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -n 20 $LOG_PATH/nginx/access.log"
  
  echo -e "\n${RED}===== NGINX ERROR LOGS =====${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -n 20 $LOG_PATH/nginx/error.log"
}

# Check system logs
function check_system_logs {
  echo -e "${YELLOW}===== SYSTEM STATUS =====${NC}"
  ssh $SSH_USER@$SSH_HOST "cd $APP_PATH && ./deploy.sh --status"
}

# Check PM2 logs in real-time
function check_pm2_logs {
  echo -e "${GREEN}===== PM2 LOGS (REAL-TIME) =====${NC}"
  echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
  ssh $SSH_USER@$SSH_HOST "pm2 logs filmflex"
}

# Tail application logs continuously
function tail_app_logs {
  echo -e "${GREEN}===== TAILING APPLICATION LOGS (REAL-TIME) =====${NC}"
  echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -f $LOG_PATH/filmflex-out.log"
}

# Filter logs for specific keyword
function filter_logs {
  local keyword="$1"
  echo -e "${GREEN}===== FILTERED LOGS FOR: ${keyword} =====${NC}"
  ssh $SSH_USER@$SSH_HOST "grep -i \"$keyword\" $LOG_PATH/filmflex-out.log | tail -n 100"
  
  echo -e "\n${RED}===== FILTERED ERROR LOGS FOR: ${keyword} =====${NC}"
  ssh $SSH_USER@$SSH_HOST "grep -i \"$keyword\" $LOG_PATH/filmflex-error.log | tail -n 100"
}

# Show only error messages
function show_errors_only {
  echo -e "${RED}===== ERROR MESSAGES ONLY =====${NC}"
  ssh $SSH_USER@$SSH_HOST "grep -i \"error\\|exception\\|failed\\|fatal\" $LOG_PATH/filmflex-out.log | tail -n 100"
  ssh $SSH_USER@$SSH_HOST "cat $LOG_PATH/filmflex-error.log | tail -n 100"
}

# Show detailed debug information
function show_debug_info {
  echo -e "${YELLOW}===== DETAILED DEBUG INFORMATION =====${NC}"
  
  echo -e "\n${YELLOW}Server Uptime and Load:${NC}"
  ssh $SSH_USER@$SSH_HOST "uptime"
  
  echo -e "\n${YELLOW}Memory Usage:${NC}"
  ssh $SSH_USER@$SSH_HOST "free -h"
  
  echo -e "\n${YELLOW}Disk Usage:${NC}"
  ssh $SSH_USER@$SSH_HOST "df -h"
  
  echo -e "\n${YELLOW}Node.js Process Information:${NC}"
  ssh $SSH_USER@$SSH_HOST "pm2 show filmflex"
  
  echo -e "\n${YELLOW}Recent Error Logs:${NC}"
  ssh $SSH_USER@$SSH_HOST "tail -n 50 $LOG_PATH/filmflex-error.log"
  
  echo -e "\n${YELLOW}Network Connections:${NC}"
  ssh $SSH_USER@$SSH_HOST "netstat -tuln | grep 5000"
}

# Check database connection
function check_db_connection {
  echo -e "${YELLOW}===== DATABASE CONNECTION CHECK =====${NC}"
  
  # Run a simple database query to check connection
  ssh $SSH_USER@$SSH_HOST "cd $APP_PATH && node -e \"
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT NOW() as current_time', (err, res) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
      } else {
        console.log('✅ Database connection successful!');
        console.log('   Connected at:', res.rows[0].current_time);
        pool.query('SELECT COUNT(*) as movie_count FROM movies', (err, res) => {
          if (err) {
            console.log('❌ Could not count movies:', err.message);
          } else {
            console.log('📊 Total movies in database:', res.rows[0].movie_count);
          }
          pool.end();
        });
      }
    });
  \"" || echo -e "${RED}Failed to check database connection. See error above.${NC}"
}

# Parse command-line arguments
if [ $# -eq 0 ]; then
  # Default action: show usage
  show_usage
  exit 0
else
  case "$1" in
    --all)
      check_app_logs
      check_error_logs
      check_nginx_logs
      check_system_logs
      ;;
    --app)
      check_app_logs
      ;;
    --error)
      check_error_logs
      ;;
    --nginx)
      check_nginx_logs
      ;;
    --system)
      check_system_logs
      ;;
    --pm2)
      check_pm2_logs
      ;;
    --tail)
      tail_app_logs
      ;;
    --filter=*)
      keyword="${1#*=}"
      filter_logs "$keyword"
      ;;
    --errors)
      show_errors_only
      ;;
    --debug)
      show_debug_info
      ;;
    --db)
      check_db_connection
      ;;
    --help)
      show_usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      exit 1
      ;;
  esac
fi