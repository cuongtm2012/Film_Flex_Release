#!/bin/bash

# FilmFlex Docker Movie Import Script - Fixed Version
# This script imports movie data into the Docker PostgreSQL container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
DOCKER_SCRIPT="import-movies-docker.cjs"
APP_CONTAINER="filmflex-app"
DB_CONTAINER="filmflex-postgres"

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️ $1${NC}"; }

print_banner() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "  FilmFlex Docker Movie Import Script (Fixed)"
    echo "======================================================"
    echo -e "${NC}"
    echo "App Container: $APP_CONTAINER"
    echo "DB Container: $DB_CONTAINER"
    echo ""
}

# Check if Docker containers are running and healthy
check_containers() {
    log "Checking Docker container status..."
    
    # Check PostgreSQL container
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        error "PostgreSQL container '$DB_CONTAINER' is not running!"
        echo "Start it with: docker compose up -d postgres"
        return 1
    fi
    
    # Check app container
    if ! docker ps | grep -q "$APP_CONTAINER"; then
        error "App container '$APP_CONTAINER' is not running!"
        echo "Start it with: docker compose up -d app"
        return 1
    fi
    
    # Test database connection
    if ! docker exec "$DB_CONTAINER" pg_isready -U filmflex -d filmflex >/dev/null 2>&1; then
        error "Database is not ready in container '$DB_CONTAINER'"
        return 1
    fi
    
    success "Docker containers are running and healthy"
    return 0
}

# Get current movie count from database
get_movie_count() {
    docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0"
}

# Show database statistics
show_db_stats() {
    log "Current database statistics:"
    
    docker exec "$DB_CONTAINER" psql -U filmflex -d filmflex -c "
    SELECT 
        'movies' as table_name, COUNT(*) as count FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    ORDER BY table_name;
    " 2>/dev/null || warning "Could not retrieve database statistics"
}

# Check if the import script exists in container
check_import_script() {
    if ! docker exec "$APP_CONTAINER" test -f "scripts/data/$DOCKER_SCRIPT"; then
        error "Import script not found in container: scripts/data/$DOCKER_SCRIPT"
        info "Available files in scripts/data/:"
        docker exec "$APP_CONTAINER" ls -la scripts/data/ 2>/dev/null || error "scripts/data directory not found"
        return 1
    fi
    success "Import script found: scripts/data/$DOCKER_SCRIPT"
    return 0
}

# Execute import command with proper shell
execute_import() {
    local import_cmd="$1"
    local description="$2"
    
    log "$description"
    
    # Use sh instead of bash, and ensure logs directory exists
    if docker exec "$APP_CONTAINER" sh -c "mkdir -p /app/logs && $import_cmd"; then
        success "Import completed successfully"
        return 0
    else
        error "Import failed"
        return 1
    fi
}

# Test mode import
test_import() {
    info "Running test mode (no database changes)..."
    execute_import "node scripts/data/$DOCKER_SCRIPT --single-page --page-num=1 --page-size=3 --test-mode" "Testing import functionality"
}

# Import specific number of movies from page 1
import_test_movies() {
    local count="${1:-5}"
    execute_import "node scripts/data/$DOCKER_SCRIPT --single-page --page-num=1 --page-size=$count" "Importing $count test movies from page 1"
}

# Import latest movies
import_latest_movies() {
    local count="${1:-50}"
    execute_import "node scripts/data/$DOCKER_SCRIPT --single-page --page-num=1 --page-size=$count" "Importing $count latest movies"
}

# Import specific page
import_specific_page() {
    local page_num="$1"
    local page_size="$2"
    execute_import "node scripts/data/$DOCKER_SCRIPT --single-page --page-num=$page_num --page-size=$page_size" "Importing $page_size movies from page $page_num"
}

# Import multiple pages
import_multiple_pages() {
    local max_pages="$1"
    execute_import "node scripts/data/$DOCKER_SCRIPT --max-pages=$max_pages" "Importing movies from $max_pages pages"
}

# NEW: Import from page to page (range import)
import_page_range() {
    local start_page="$1"
    local end_page="$2"
    local total_pages=$((end_page - start_page + 1))
    
    info "Importing movies from page $start_page to page $end_page ($total_pages pages total)"
    
    # Skip the batch-import.sh script due to compatibility issues and use direct method
    warning "Using direct page-by-page import method for maximum compatibility..."
    local success_count=0
    local failed_count=0
    
    log "Starting page-by-page import from $start_page to $end_page..."
    
    for ((page=start_page; page<=end_page; page++)); do
        info "Processing page $page of $end_page..."
        
        # Use execute_import which already handles the container execution properly
        if execute_import "node scripts/data/$DOCKER_SCRIPT --single-page --page-num=$page --page-size=20" "Importing page $page"; then
            ((success_count++))
            success "Page $page imported successfully"
        else
            ((failed_count++))
            warning "Failed to import page $page"
            # Continue with next page even if this one fails
        fi
        
        # Add small delay between pages to avoid rate limiting
        if [ $page -lt $end_page ]; then
            info "Waiting 3 seconds before next page..."
            sleep 3
        fi
        
        # Show progress every 5 pages
        if (( page % 5 == 0 )) || [ $page -eq $end_page ]; then
            local progress=$(( (page - start_page + 1) * 100 / total_pages ))
            info "Progress: $progress% ($((page - start_page + 1))/$total_pages pages completed)"
        fi
    done
    
    echo ""
    success "Page range import completed!"
    success "Successfully imported: $success_count pages"
    if [ $failed_count -gt 0 ]; then
        warning "Failed to import: $failed_count pages"
    else
        success "All pages imported successfully!"
    fi
    
    # Don't exit here - let the function return normally
    return 0
}

# Import specific movie by slug
import_specific_movie() {
    local movie_slug="$1"
    execute_import "node scripts/data/$DOCKER_SCRIPT --movie-slug=\"$movie_slug\"" "Importing specific movie: $movie_slug"
}

# Comprehensive import (all movies) - Enhanced version
import_all_movies() {
    warning "WARNING: This will import ALL movies from the API!"
    echo -e "${YELLOW}This process will:${NC}"
    echo "  • Take several hours to complete"
    echo "  • Import thousands of movies and episodes"
    echo "  • Use significant bandwidth and storage"
    echo "  • May slow down your system during import"
    echo ""
    
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [[ "$CONFIRM" =~ ^[Yy](es)?$ ]]; then
        log "Starting comprehensive movie import..."
        warning "This will run continuously until all movies are imported."
        warning "You can press Ctrl+C to stop at any time and resume later."
        echo ""
        
        # Create a timestamped log file
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local log_file="/app/logs/comprehensive-import-$timestamp.log"
        
        info "Import log will be saved inside container at: $log_file"
        echo ""
        
        # Use sh instead of bash and include proper error handling
        local import_cmd="node scripts/data/$DOCKER_SCRIPT --deep-scan --max-pages=50 --force-import 2>&1 | tee $log_file"
        
        if docker exec "$APP_CONTAINER" sh -c "mkdir -p /app/logs && $import_cmd"; then
            success "Comprehensive import completed!"
            info "Check the final count below for total imported movies."
        else
            error "Comprehensive import encountered errors"
            info "Check the log file: $log_file"
        fi
    else
        warning "Import cancelled."
        return 1
    fi
}

# NEW: Fetch ALL from API (comprehensive import with auto-detection)
import_fetch_all_from_api() {
    warning "FETCH ALL FROM API: This will automatically detect and import ALL available movies!"
    echo -e "${YELLOW}This comprehensive import will:${NC}"
    echo "  • Auto-detect total pages available on the API"
    echo "  • Import ALL movies from all available pages"
    echo "  • Take many hours or days to complete"
    echo "  • Can be resumed if interrupted"
    echo "  • Import thousands of movies with episodes"
    echo ""
    
    read -p "Are you sure you want to fetch ALL movies from API? (yes/no): " CONFIRM
    
    if [[ "$CONFIRM" =~ ^[Yy](es)?$ ]]; then
        log "Starting FETCH ALL FROM API import..."
        warning "This will use the resumable import script for maximum reliability."
        echo ""
        
        # Use the resumable import script which can handle interruptions
        info "Switching to resumable import script..."
        if docker exec "$APP_CONTAINER" bash scripts/data/import-all-movies-resumable.sh; then
            success "FETCH ALL FROM API completed!"
            info "All available movies have been imported from the API."
        else
            warning "Import was interrupted or encountered errors."
            info "You can resume this import using option 10 (Resume from current stage)."
        fi
    else
        warning "FETCH ALL FROM API cancelled."
        return 1
    fi
}

# NEW: Resume from current stage (resumable import)
import_resume_from_current_stage() {
    info "RESUME FROM CURRENT STAGE: Continue from where previous import left off"
    echo -e "${YELLOW}This will:${NC}"
    echo "  • Check for existing import progress"
    echo "  • Resume from the last completed page"
    echo "  • Skip already imported movies"
    echo "  • Continue until all movies are imported"
    echo ""
    
    # Check if there's existing progress
    if docker exec "$APP_CONTAINER" test -f "scripts/data/complete_import_progress.json"; then
        success "Found existing import progress!"
        info "Resuming import from current stage..."
        
        if docker exec "$APP_CONTAINER" bash scripts/data/import-all-movies-resumable.sh; then
            success "Resume import completed!"
        else
            warning "Resume import was interrupted."
            info "You can run this option again to continue from where it left off."
        fi
    else
        warning "No existing import progress found."
        echo -e "${BLUE}Options:${NC}"
        echo "1) Start a new comprehensive import"
        echo "2) Go back to main menu"
        read -p "Choose an option (1-2): " RESUME_OPTION
        
        case $RESUME_OPTION in
            1)
                info "Starting new comprehensive import..."
                import_fetch_all_from_api
                ;;
            2)
                return 0
                ;;
            *)
                error "Invalid option."
                return 1
                ;;
        esac
    fi
}

# Main import menu
show_import_menu() {
    echo ""
    echo -e "${YELLOW}What would you like to import?${NC}"
    echo "1) Test mode (3 movies, no database changes)"
    echo "2) Import a few test movies (page 1, 5 movies)"
    echo "3) Import latest movies (page 1, 50 movies)"
    echo "4) Import specific page (you choose page and count)"
    echo "5) Import from page to page (range import)"
    echo "6) Import specific movie by slug"
    echo "7) Import ALL movies (comprehensive import - WARNING: takes hours!)"
    echo "8) Show current database statistics"
    echo "9) Fetch ALL from API (comprehensive import with auto-detection)"
    echo "10) Resume from current stage (resumable import)"
    echo "q) Quit"
    echo ""
    read -p "Select an option (1-10, q): " IMPORT_OPTION
    
    case $IMPORT_OPTION in
        1)
            test_import
            ;;
        2)
            import_test_movies 5
            ;;
        3)
            import_latest_movies 50
            ;;
        4)
            read -p "Enter page number: " PAGE_NUM
            read -p "Enter number of movies to import: " MOVIE_COUNT
            if [[ "$PAGE_NUM" =~ ^[0-9]+$ ]] && [[ "$MOVIE_COUNT" =~ ^[0-9]+$ ]]; then
                import_specific_page "$PAGE_NUM" "$MOVIE_COUNT"
            else
                error "Invalid input. Please enter numbers only."
                return 1
            fi
            ;;
        5)
            read -p "Enter start page: " START_PAGE
            read -p "Enter end page: " END_PAGE
            if [[ "$START_PAGE" =~ ^[0-9]+$ ]] && [[ "$END_PAGE" =~ ^[0-9]+$ ]] && [ "$END_PAGE" -ge "$START_PAGE" ]; then
                import_page_range "$START_PAGE" "$END_PAGE"
            else
                error "Invalid input. Please enter valid page numbers."
                return 1
            fi
            ;;
        6)
            read -p "Enter movie slug: " MOVIE_SLUG
            if [ -n "$MOVIE_SLUG" ]; then
                import_specific_movie "$MOVIE_SLUG"
            else
                error "Movie slug cannot be empty."
                return 1
            fi
            ;;
        7)
            import_all_movies
            ;;
        8)
            show_db_stats
            return 0
            ;;
        9)
            import_fetch_all_from_api
            ;;
        10)
            import_resume_from_current_stage
            ;;
        q|Q)
            info "Exiting..."
            exit 0
            ;;
        *)
            error "Invalid option. Please try again."
            return 1
            ;;
    esac
}

# Main execution
main() {
    print_banner
    
    # Check prerequisites
    if ! check_containers; then
        exit 1
    fi
    
    if ! check_import_script; then
        exit 1
    fi
    
    # Show current stats
    log "Current database status:"
    local current_count=$(get_movie_count)
    info "Current movies in database: $current_count"
    
    # Show import menu
    show_import_menu
    
    # Show final stats
    echo ""
    log "Checking final movie count..."
    local final_count=$(get_movie_count)
    local added_count=$((final_count - current_count))
    
    success "Import session completed!"
    success "Movies before: $current_count"
    success "Movies after: $final_count"
    success "Movies added: $added_count"
    
    echo ""
    info "Your FilmFlex app is available at: https://phimgg.com"
}

# Handle command line arguments
if [ $# -gt 0 ]; then
    case "$1" in
        "test")
            print_banner
            check_containers && check_import_script && test_import
            ;;
        "quick")
            print_banner
            check_containers && check_import_script && import_test_movies 5
            ;;
        "latest")
            print_banner
            check_containers && check_import_script && import_latest_movies 20
            ;;
        "stats")
            print_banner
            check_containers && show_db_stats
            ;;
        *)
            echo "Usage: $0 [test|quick|latest|stats]"
            echo ""
            echo "Commands:"
            echo "  test    - Run test mode (no database changes)"
            echo "  quick   - Import 5 test movies"
            echo "  latest  - Import 20 latest movies"
            echo "  stats   - Show database statistics"
            echo "  (no args) - Interactive menu"
            ;;
    esac
else
    main
fi