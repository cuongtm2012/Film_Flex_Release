#!/bin/bash

# This script resets the import process and starts over from the beginning

echo "====================================="
echo "== FilmFlex Import Reset Utility ==="
echo "====================================="

# Step 1: Reset the progress file
echo -e "\n1. Resetting progress tracker..."
echo '{"lastCompletedPage":0,"timestamp":"'$(date -Iseconds)'"}' > import_progress.json
echo "   ✓ Progress file reset!"

# Step 2: Clear movie and episode data
echo -e "\n2. Clearing existing movie and episode data..."
npx tsx clear_movie_data.ts

# Step 3: Start the import from page 1
echo -e "\n3. Starting fresh import from page 1..."
npx tsx simple_import.ts single 1

echo -e "\nImport restart process completed."