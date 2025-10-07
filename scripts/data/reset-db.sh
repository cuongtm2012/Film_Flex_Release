#!/bin/bash

# PhimGG Database Reset Script
# This script provides a convenient way to run the database reset operation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script and change to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Print header
echo -e "${BLUE}========================================"
echo "  PhimGG Database Reset"
echo -e "========================================${NC}\n"

# Check for database URL
if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    echo -e "${YELLOW}Loading DATABASE_URL from .env file...${NC}"
    export $(grep -v '^#' .env | grep DATABASE_URL)
  else
    echo -e "${YELLOW}No DATABASE_URL found in environment or .env file.${NC}"
    echo -e "${YELLOW}Using default local database URL:${NC}"
    export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
  fi
fi

echo -e "${BLUE}Using database:${NC} $DATABASE_URL"

# Warning and confirmation prompt
echo -e "\n${RED}WARNING:${NC} This script will completely reset the film database."
echo -e "${RED}ALL DATA WILL BE PERMANENTLY DELETED.${NC}"
echo -e "This includes all movies, users, comments, and other data.\n"

read -p "Are you sure you want to proceed? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo -e "\n${YELLOW}Database reset cancelled.${NC}"
  exit 0
fi

echo -e "\n${BLUE}Starting database reset process...${NC}"

# Create log directory if needed
mkdir -p logs

# Run episode fields migration
echo -e "${BLUE}Adding episode fields to schema...${NC}"
EPISODE_FIELDS_SQL="server/db/migrations/006_add_episode_fields.sql"
if [ -f "$EPISODE_FIELDS_SQL" ]; then
    psql "$DATABASE_URL" -f "$EPISODE_FIELDS_SQL" || {
        echo -e "${RED}Error adding episode fields${NC}"
        exit 1
    }
fi

# First ensure database exists
echo -e "${BLUE}Checking database existence...${NC}"
node "$SCRIPT_DIR/ensure-db.cjs"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to ensure database exists. Aborting.${NC}"
  exit 1
fi

# Run the TypeScript reset script with the correct path
echo -e "${BLUE}Running database reset script...${NC}"
npx tsx "$SCRIPT_DIR/reset-film-database.ts" | tee logs/db-reset-$(date +%Y%m%d-%H%M%S).log

status=$?
if [ $status -eq 0 ]; then
  echo -e "\n${GREEN}Database reset completed successfully!${NC}"
else
  echo -e "\n${RED}Database reset failed with exit code $status.${NC}"
  echo "Check the log file for more details."
fi

echo -e "\n${BLUE}Done.${NC}"