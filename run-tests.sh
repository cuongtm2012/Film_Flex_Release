#!/bin/bash
# FilmFlex Test Runner
# This is a wrapper script that calls the main test runner in scripts/tests/

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Display a message about using the new script
echo -e "\033[0;33mFilmFlex Test Runner\033[0m"
echo -e "This script is a wrapper that calls the main test runner in scripts/tests/"
echo -e "For detailed documentation, see: scripts/tests/README.md\n"

# Check if the main script exists
if [ ! -f "$SCRIPT_DIR/scripts/tests/run_all_tests.sh" ]; then
    echo -e "\033[0;31mError: Main test runner not found at scripts/tests/run_all_tests.sh\033[0m"
    exit 1
fi

# Pass all arguments to the main script
"$SCRIPT_DIR/scripts/tests/run_all_tests.sh" "$@"

# Exit with the same status as the main script
exit $?
