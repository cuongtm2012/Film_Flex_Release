#!/bin/bash

# Create reports directory if it doesn't exist
mkdir -p reports

echo "==============================================="
echo "FilmFlex Comprehensive Test Automation Suite"
echo "==============================================="

# Run the comprehensive test suite
echo "Running all FilmFlex test cases..."
node scripts/comprehensive-test-runner.js

echo ""
echo "==================================================="
echo "Test execution complete."
echo "The comprehensive HTML report is available at:"
echo "reports/comprehensive-test-report.html"
echo ""
echo "Test Suite includes automation for:"
echo "- Password Management"
echo "- Watch History"
echo "- My List Management" 
echo "- User Profile"
echo "- Footer"
echo "- Profile Image Upload"
echo "==================================================="