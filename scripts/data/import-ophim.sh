#!/bin/bash

################################################################################
# Ophim Movie Import Wrapper Script
# 
# Easy-to-use wrapper for importing movies from Ophim API
# 
# Usage:
#   ./import-ophim.sh --page 1
#   ./import-ophim.sh --start 1 --end 5
#   ./import-ophim.sh --page 1 --verbose
#
# Author: PhimGG Development Team
# Last Updated: 2025-11-09
################################################################################

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
IMPORT_SCRIPT="${PROJECT_ROOT}/scripts/import-ophim-movies.ts"

# Create log directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# Log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/import-ophim-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
}

print_header() {
    echo ""
    echo "================================"
    echo "🎬 Ophim Movie Importer"
    echo "================================"
    echo ""
}

print_footer() {
    echo ""
    echo "================================"
    echo "Log file: ${LOG_FILE}"
    echo "================================"
    echo ""
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check tsx
    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed"
        exit 1
    fi
    
    # Check import script exists
    if [ ! -f "${IMPORT_SCRIPT}" ]; then
        log_error "Import script not found: ${IMPORT_SCRIPT}"
        exit 1
    fi
    
    log_success "All dependencies OK"
}

show_help() {
    cat << EOF
Ophim Movie Import Wrapper

Usage:
  $0 [OPTIONS]

Options:
  -p, --page <number>        Import a single page (e.g., --page 1)
  -s, --start <number>       Start page for range import
  -e, --end <number>         End page for range import
  --no-skip                  Re-import existing movies
  --validate-only            Validate data without importing
  -v, --verbose              Show detailed output
  --rate-limit <ms>          Rate limit between API calls (default: 500ms)
  -h, --help                 Show this help message

Examples:
  # Import page 1
  $0 --page 1

  # Import pages 1 to 5
  $0 --start 1 --end 5

  # Import with verbose output
  $0 --page 1 --verbose

  # Validate only (no database changes)
  $0 --page 1 --validate-only

  # Custom rate limit
  $0 --page 1 --rate-limit 1000

Environment Variables:
  DB_HOST       Database host (default: localhost)
  DB_PORT       Database port (default: 5432)
  DB_NAME       Database name (default: filmflex)
  DB_USER       Database user (default: filmflex)
  DB_PASSWORD   Database password (default: filmflex2024)

EOF
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header
    
    # Parse help flag first
    for arg in "$@"; do
        if [ "$arg" == "--help" ] || [ "$arg" == "-h" ]; then
            show_help
            exit 0
        fi
    done
    
    # Check dependencies
    check_dependencies
    
    # Log start time
    log_info "Import started at: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Command: $0 $*"
    log_info "Working directory: ${PROJECT_ROOT}"
    
    # Change to project root
    cd "${PROJECT_ROOT}"
    
    # Run import script with all arguments
    log_info "Running import script..."
    echo ""
    
    if npx tsx "${IMPORT_SCRIPT}" "$@" 2>&1 | tee -a "${LOG_FILE}"; then
        echo ""
        log_success "Import completed successfully!"
        EXIT_CODE=0
    else
        echo ""
        log_error "Import failed!"
        EXIT_CODE=1
    fi
    
    # Log end time
    log_info "Import ended at: $(date '+%Y-%m-%d %H:%M:%S')"
    
    print_footer
    
    exit $EXIT_CODE
}

# Run main function with all arguments
main "$@"
