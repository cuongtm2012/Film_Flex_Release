#!/bin/bash
# Data import script for FilmFlex
# Usage: ./import-data.sh [--pages=NUM_PAGES] [--from=START_PAGE] [--to=END_PAGE] [--resume]

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
START_PAGE=1
END_PAGE=5
RESUME=false
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --pages=*)
      PAGES="${arg#*=}"
      START_PAGE=1
      END_PAGE=$PAGES
      shift
      ;;
    --from=*)
      START_PAGE="${arg#*=}"
      shift
      ;;
    --to=*)
      END_PAGE="${arg#*=}"
      shift
      ;;
    --resume)
      RESUME=true
      shift
      ;;
    --help)
      echo -e "${BLUE}FilmFlex Data Import Tool${NC}"
      echo "Usage: ./import-data.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --pages=NUM     Import NUM pages (starts from page 1)"
      echo "  --from=START    Start importing from page START"
      echo "  --to=END        Import until page END (inclusive)"
      echo "  --resume        Resume the last import operation"
      echo "  --help          Display this help message"
      echo ""
      echo "Examples:"
      echo "  ./import-data.sh --pages=10           # Import first 10 pages"
      echo "  ./import-data.sh --from=5 --to=15     # Import pages 5 through 15"
      echo "  ./import-data.sh --resume             # Resume the previous import"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to display estimated time
function estimate_time() {
  local current_page=$1
  local total_pages=$2
  local start_time=$3
  local now=$(date +%s)
  local elapsed=$((now - start_time))
  
  # Only estimate if we have processed some pages
  if [[ $current_page -gt $START_PAGE ]]; then
    local pages_done=$((current_page - START_PAGE))
    local pages_left=$((END_PAGE - current_page))
    local time_per_page=$((elapsed / pages_done))
    local estimated_time_left=$((time_per_page * pages_left))
    
    local hours=$((estimated_time_left / 3600))
    local minutes=$(((estimated_time_left % 3600) / 60))
    local seconds=$((estimated_time_left % 60))
    
    printf "${YELLOW}Estimated time remaining: %02d:%02d:%02d${NC}\n" $hours $minutes $seconds
  else
    echo -e "${YELLOW}Calculating estimated time...${NC}"
  fi
}

# Function to display progress bar
function show_progress() {
  local current=$1
  local total=$2
  local width=50
  local percent=$((current * 100 / total))
  local completed=$((width * current / total))
  local remaining=$((width - completed))
  
  printf "\r[${GREEN}"
  for ((i=0; i<completed; i++)); do printf "#"; done
  printf "${NC}"
  for ((i=0; i<remaining; i++)); do printf "."; done
  printf "] %d%%" $percent
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js to use this script.${NC}"
  exit 1
fi

# Navigate to the root directory
cd "$ROOT_DIR" || { echo -e "${RED}Error: Could not navigate to project root directory.${NC}"; exit 1; }

# Check if the import script exists
if [ ! -f "scripts/import.ts" ]; then
  echo -e "${RED}Error: Import script (scripts/import.ts) not found.${NC}"
  exit 1
fi

# Print banner
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            FilmFlex Data Import           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"

# Print import plan
if [ "$RESUME" = true ]; then
  echo -e "${GREEN}Resuming previous import operation...${NC}"
else
  echo -e "${GREEN}Importing movies from page $START_PAGE to $END_PAGE${NC}"
  echo -e "${YELLOW}Total pages to import: $((END_PAGE - START_PAGE + 1))${NC}"
fi

# Record start time
START_TIME=$(date +%s)

# Run the import script
if [ "$RESUME" = true ]; then
  echo -e "${BLUE}Executing: npx tsx scripts/import.ts --resume${NC}"
  npx tsx scripts/import.ts --resume
else
  echo -e "${BLUE}Executing: npx tsx scripts/import.ts $START_PAGE $END_PAGE${NC}"
  npx tsx scripts/import.ts $START_PAGE $END_PAGE
fi

# Check the result
if [ $? -eq 0 ]; then
  # Calculate import time
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  HOURS=$((DURATION / 3600))
  MINUTES=$(((DURATION % 3600) / 60))
  SECONDS=$((DURATION % 60))
  
  echo -e "\n${GREEN}=== Import Completed Successfully ===${NC}"
  printf "${GREEN}Total import time: %02d:%02d:%02d${NC}\n" $HOURS $MINUTES $SECONDS
  echo -e "${GREEN}Imported pages $START_PAGE to $END_PAGE${NC}"
  
  # If importing all available pages, indicate in log
  if [ $END_PAGE -eq 2252 ]; then
    echo -e "${GREEN}All available movie data has been imported!${NC}"
  fi
else
  echo -e "\n${RED}=== Import Failed ===${NC}"
  echo -e "${RED}Please check the error messages above for details.${NC}"
  echo -e "${YELLOW}You can try resuming the import with: ./import-data.sh --resume${NC}"
  exit 1
fi