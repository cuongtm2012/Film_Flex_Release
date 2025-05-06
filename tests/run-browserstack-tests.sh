#!/bin/bash

# Script to run BrowserStack Cypress tests for FilmFlex

echo "FilmFlex BrowserStack Cypress Test Runner"
echo "=========================================="

# Function to run all tests
run_all_tests() {
  echo "Running all Cypress tests on BrowserStack..."
  npx browserstack-cypress run --cf browserstack.json
}

# Function to run search tests
run_search_tests() {
  echo "Running search functionality tests on BrowserStack..."
  npx browserstack-cypress run --cf browserstack.json --spec 'cypress/e2e/search.cy.js'
}

# Function to run authentication tests
run_auth_tests() {
  echo "Running authentication tests on BrowserStack..."
  npx browserstack-cypress run --cf browserstack.json --spec 'cypress/e2e/auth.cy.js'
}

# Function to run movie details tests
run_movie_details_tests() {
  echo "Running movie details tests on BrowserStack..."
  npx browserstack-cypress run --cf browserstack.json --spec 'cypress/e2e/movie-details.cy.js'
}

# Function to run watchlist tests
run_watchlist_tests() {
  echo "Running watchlist tests on BrowserStack..."
  npx browserstack-cypress run --cf browserstack.json --spec 'cypress/e2e/watchlist.cy.js'
}

# Check command line arguments
if [ "$1" == "all" ]; then
  run_all_tests
elif [ "$1" == "search" ]; then
  run_search_tests
elif [ "$1" == "auth" ]; then
  run_auth_tests
elif [ "$1" == "movie-details" ]; then
  run_movie_details_tests
elif [ "$1" == "watchlist" ]; then
  run_watchlist_tests
else
  echo "Usage: ./run-browserstack-tests.sh [all|search|auth|movie-details|watchlist]"
  echo ""
  echo "Options:"
  echo "  all            - Run all tests"
  echo "  search         - Run search functionality tests"
  echo "  auth           - Run authentication tests"
  echo "  movie-details  - Run movie details tests"
  echo "  watchlist      - Run watchlist tests"
  exit 1
fi