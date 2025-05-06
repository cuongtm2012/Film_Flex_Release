#!/bin/bash
# Main test runner for FilmFlex
# This script runs all available tests in the appropriate order

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd )"

echo -e "${YELLOW}FilmFlex Test Runner${NC}"
echo -e "Running all tests from project directory: ${PROJECT_ROOT}\n"

# Run unit tests
echo -e "${YELLOW}=== Running Unit Tests ===${NC}"
cd "$PROJECT_ROOT" && npm run test:unit || {
  echo -e "${RED}Unit tests failed${NC}"
}

# Run integration tests
echo -e "\n${YELLOW}=== Running Integration Tests ===${NC}"
cd "$PROJECT_ROOT" && npm run test:integration || {
  echo -e "${RED}Integration tests failed${NC}"
}

# Run API tests
echo -e "\n${YELLOW}=== Running API Tests ===${NC}"
cd "$PROJECT_ROOT" && npm run test:api || {
  echo -e "${RED}API tests failed${NC}"
}

# Run comprehensive test suite
echo -e "\n${YELLOW}=== Running Comprehensive Test Suite ===${NC}"
node "$PROJECT_ROOT/scripts/tests/comprehensive-test-runner.js" || {
  echo -e "${RED}Comprehensive tests failed${NC}"
}

# Summary
echo -e "\n${GREEN}=== All Tests Completed ===${NC}"
echo -e "For detailed test reports, check the reports/ directory."
