#!/bin/bash
# FilmFlex Master Test Runner
# This script serves as a central entry point to run all tests

echo "FilmFlex Master Test Runner"
echo "=========================="
echo ""

# Execute the comprehensive tests
tests/run-comprehensive-tests.sh

echo ""
echo "All tests completed!"
echo ""
echo "For more specific testing needs, you can use these scripts:"
echo "  - ./tests/run-admin-tests.sh       (Admin panel tests only)"
echo "  - ./tests/run-real-tests.sh        (Tests with real components)"
echo "  - ./tests/run-profile-image-tests.sh  (Profile image upload tests)"
echo ""