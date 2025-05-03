#!/bin/bash

# FilmFlex Test Runner Script

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}      FILMFLEX TEST RUNNER            ${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Function to run a specific test
run_test() {
  TEST_FILE=$1
  TEST_NAME=$2
  
  echo -e "${YELLOW}Running test: ${TEST_NAME}${NC}"
  echo -e "${YELLOW}----------------------------------${NC}"
  
  node $TEST_FILE
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Test completed successfully${NC}"
  else
    echo -e "${RED}Test failed${NC}"
  fi
  
  echo ""
}

# Check if a specific test was specified
if [ $# -gt 0 ]; then
  case "$1" in
    "search")
      run_test "tests/api/search.js" "Search API"
      ;;
    "auth")
      run_test "tests/api/auth.js" "Authentication API"
      ;;
    "movie-detail")
      run_test "tests/api/movie-detail.js" "Movie Detail API"
      ;;
    "filter")
      run_test "tests/api/filter.js" "Filter API"
      ;;
    *)
      echo -e "${RED}Unknown test: $1${NC}"
      echo "Available tests: search, auth, movie-detail, filter"
      exit 1
      ;;
  esac
else
  # Run all tests
  echo -e "${YELLOW}Running all tests...${NC}"
  echo ""
  
  # Run the main test runner
  node tests/run-tests.js
fi

# Make the script executable
chmod +x tests/run-tests.sh