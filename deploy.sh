#!/bin/bash
# FilmFlex Deployment Script
# This is a wrapper script that calls the main deployment script in scripts/deployment/

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Display a message about using the new script
echo -e "\033[0;33mFilmFlex Deployment System\033[0m"
echo -e "This script is a wrapper that calls the main deployment script in scripts/deployment/"
echo -e "For detailed documentation, see: scripts/deployment/README.md\n"

# Check if the main script exists
if [ ! -f "$SCRIPT_DIR/scripts/deployment/deploy-filmflex.sh" ]; then
    echo -e "\033[0;31mError: Main deployment script not found at scripts/deployment/deploy-filmflex.sh\033[0m"
    exit 1
fi

# Pass all arguments to the main script
"$SCRIPT_DIR/scripts/deployment/deploy-filmflex.sh" "$@"

# Exit with the same status as the main script
exit $?
