#!/bin/bash

# FilmFlex Movie Import Script
# Usage: ./import-movies.sh [start_page] [end_page]
# or: ./import-movies.sh --resume

# Use npx tsx to run the import script
npx tsx import_new.ts "$@"