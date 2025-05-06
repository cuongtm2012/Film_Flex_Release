#!/bin/bash

echo "FilmFlex Test Suite"
echo "=================="
echo "Running all tests..."
echo ""

echo "1. Running Real Component Tests..."
./tests/run-real-tests.sh
echo ""
echo "------------------------------------------------"
echo ""

echo "2. Running Admin Panel Tests..."
./tests/run-admin-tests.sh
echo ""
echo "------------------------------------------------"
echo ""

echo "3. Running Comprehensive API Tests..."
./tests/run-comprehensive-tests.sh
echo ""

echo "All test runs completed!"
echo "Check the reports directory for HTML reports."