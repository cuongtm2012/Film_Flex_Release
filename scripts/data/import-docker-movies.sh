#!/bin/bash

# FilmFlex Docker Movie Import Script
# This script imports movie data into the Docker PostgreSQL container

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
DOCKER_SCRIPT="import-movies-docker.cjs"

echo -e "${BLUE}"
echo "======================================================"
echo "  FilmFlex Docker Movie Import Script"
echo "======================================================"
echo -e "${NC}"

# Check if Docker containers are running
echo -e "${BLUE}📋 Checking Docker container status...${NC}"
if ! docker ps | grep -q "filmflex-postgres"; then
    echo -e "${RED}❌ Docker PostgreSQL container is not running!${NC}"
    echo "Please start it with: docker-compose up -d"
    exit 1
fi

if ! docker ps | grep -q "filmflex-app"; then
    echo -e "${RED}❌ Docker FilmFlex app container is not running!${NC}"
    echo "Please start it with: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✅ Docker containers are running${NC}"

# Check current movie count
echo -e "${BLUE}📊 Checking current movie count in Docker database...${NC}"
CURRENT_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" | tr -d ' ')
echo -e "${GREEN}Current movies in Docker database: ${CURRENT_COUNT}${NC}"

# Ask user what they want to do
echo ""
echo -e "${YELLOW}What would you like to import?${NC}"
echo "1) Import a few test movies (page 1, 5 movies)"
echo "2) Import latest movies (page 1, 20 movies)"  
echo "3) Import specific page (you choose page and count)"
echo "4) Import multiple pages (you choose how many)"
echo "5) Import specific movie by slug"
echo "6) Test mode (no database changes)"
echo "7) Import ALL movies (comprehensive import - this will take a long time!)"

read -p "Select an option (1-7): " IMPORT_OPTION

case $IMPORT_OPTION in
    1)
        echo -e "${BLUE}🎬 Importing 5 test movies from page 1...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --single-page --page-num=1 --page-size=5
        ;;
    2)
        echo -e "${BLUE}🎬 Importing 20 latest movies from page 1...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --single-page --page-num=1 --page-size=20
        ;;
    3)
        read -p "Enter page number: " PAGE_NUM
        read -p "Enter number of movies to import: " MOVIE_COUNT
        echo -e "${BLUE}🎬 Importing ${MOVIE_COUNT} movies from page ${PAGE_NUM}...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --single-page --page-num="$PAGE_NUM" --page-size="$MOVIE_COUNT"
        ;;
    4)
        read -p "Enter number of pages to import: " MAX_PAGES
        echo -e "${BLUE}🎬 Importing movies from ${MAX_PAGES} pages...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --max-pages="$MAX_PAGES"
        ;;
    5)
        read -p "Enter movie slug: " MOVIE_SLUG
        echo -e "${BLUE}🎬 Importing specific movie: ${MOVIE_SLUG}...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --movie-slug="$MOVIE_SLUG"
        ;;
    6)
        echo -e "${BLUE}🧪 Running in test mode (no database changes)...${NC}"
        docker exec filmflex-app node "scripts/data/$DOCKER_SCRIPT" --single-page --page-num=1 --page-size=5 --test-mode
        ;;
    7)
        echo -e "${RED}⚠️  WARNING: This will import ALL movies from the API!${NC}"
        echo -e "${YELLOW}This process will:${NC}"
        echo "  • Take several hours to complete"
        echo "  • Import thousands of movies and episodes"
        echo "  • Use significant bandwidth and storage"
        echo "  • May slow down your system during import"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        
        if [ "$CONFIRM" = "yes" ] || [ "$CONFIRM" = "YES" ] || [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            echo -e "${BLUE}🚀 Starting comprehensive movie import...${NC}"
            echo -e "${YELLOW}This will run continuously until all movies are imported.${NC}"
            echo -e "${YELLOW}You can press Ctrl+C to stop at any time and resume later.${NC}"
            echo ""
            
            # Create a log file for the comprehensive import
            LOG_FILE="/app/logs/comprehensive-import-$(date +%Y%m%d_%H%M%S).log"
            
            echo -e "${BLUE}📝 Import log will be saved inside container at: $LOG_FILE${NC}"
            echo ""
            
            # Start with a deep scan of 50 pages (should cover most content)
            # The script will handle resuming if interrupted
            docker exec filmflex-app bash -c "mkdir -p /app/logs && node 'scripts/data/$DOCKER_SCRIPT' --deep-scan --max-pages=50 --force-import 2>&1 | tee '$LOG_FILE'"
            
            echo ""
            echo -e "${GREEN}🎉 Comprehensive import completed!${NC}"
            echo -e "${BLUE}📊 Check the final count below for total imported movies.${NC}"
        else
            echo -e "${YELLOW}Import cancelled.${NC}"
            exit 0
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid option. Exiting.${NC}"
        exit 1
        ;;
esac

# Check final movie count
echo ""
echo -e "${BLUE}📊 Checking final movie count...${NC}"
FINAL_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" | tr -d ' ')
ADDED_COUNT=$((FINAL_COUNT - CURRENT_COUNT))

echo -e "${GREEN}✅ Import completed!${NC}"
echo -e "${GREEN}Movies before: ${CURRENT_COUNT}${NC}"
echo -e "${GREEN}Movies after: ${FINAL_COUNT}${NC}"
echo -e "${GREEN}Movies added: ${ADDED_COUNT}${NC}"

echo ""
echo -e "${BLUE}🌐 Your FilmFlex app is available at: https://phimgg.com${NC}"