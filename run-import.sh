#!/bin/bash
# FilmFlex Data Import Script
# This is a wrapper script that calls the main import script in scripts/data/

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Display a message about using the new script
echo -e "\033[0;33mFilmFlex Data Import System\033[0m"
echo -e "This script is a wrapper that calls the main import script in scripts/data/"
echo -e "For detailed documentation, see: scripts/data/README.md\n"

# Ask for import parameters
read -p "Enter start page (default: 1): " START_PAGE
START_PAGE=${START_PAGE:-1}

read -p "Enter end page (default: 20): " END_PAGE
END_PAGE=${END_PAGE:-20}

read -p "Run in background? (y/N): " BACKGROUND
BACKGROUND=${BACKGROUND:-N}

# Check if screen is installed if running in background
if [[ "$BACKGROUND" == "y" || "$BACKGROUND" == "Y" ]]; then
  if ! command -v screen &> /dev/null; then
    echo -e "\033[0;31mError: 'screen' command not found. Install it with 'apt-get install screen' or run without background option.\033[0m"
    exit 1
  fi
fi

# Execute the import script
cd "$SCRIPT_DIR"
if [[ "$BACKGROUND" == "y" || "$BACKGROUND" == "Y" ]]; then
  echo -e "\033[0;33mStarting import in background (using screen)...\033[0m"
  screen -dmS import bash -c "cd '$SCRIPT_DIR' && npx tsx scripts/data/import.ts $START_PAGE $END_PAGE > /tmp/filmflex-import.log 2>&1"
  echo -e "\033[0;32mImport started in background. You can check progress with:\033[0m"
  echo "  - tail -f /tmp/filmflex-import.log"
  echo "  - screen -r import"
else
  echo -e "\033[0;33mStarting import in foreground...\033[0m"
  npx tsx scripts/data/import.ts $START_PAGE $END_PAGE
fi

exit $?