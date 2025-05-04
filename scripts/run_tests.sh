#!/bin/bash

# Default to running all tests if no specific test is provided
TEST_PATH=${1:-tests}

# Run the tests with ES module support
echo "Running tests in: ${TEST_PATH}"
NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest --testPathPattern=${TEST_PATH}