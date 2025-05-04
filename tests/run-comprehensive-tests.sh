#!/bin/bash

echo "FilmFlex Comprehensive Test Runner"
echo "=================================="
echo ""
echo "Using API URL: http://localhost:5000"
echo ""
echo "Running comprehensive tests..."
echo "-----------------------------"
npx jest tests/comprehensive-tests.ts --silent --passWithNoTests

echo "Generating test report at reports/comprehensive-test-report.html..."
node ./scripts/comprehensive-test-runner.js

echo ""
echo "Comprehensive test run completed!"
echo "Report generated at: reports/comprehensive-test-report.html"