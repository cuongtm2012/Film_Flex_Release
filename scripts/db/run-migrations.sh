#!/bin/bash

# FilmFlex Database Migration Helper
# This script runs all necessary database migrations in order

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get directory paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
MIGRATIONS_DIR="${APP_DIR}/server/db/migrations"
LOG_DIR="${APP_DIR}/log"
MIGRATION_LOG="${LOG_DIR}/migrations-$(date +%Y%m%d-%H%M%S).log"

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
  DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
fi

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to run a migration file
run_migration() {
  local file="$1"
  local base_name=$(basename "$file")
  echo -e "${BLUE}Running migration: ${base_name}${NC}"
  
  # Run the migration and capture both stdout and stderr
  if psql "$DATABASE_URL" -f "$file" 2>&1 | tee -a "$MIGRATION_LOG"; then
    echo -e "${GREEN}✓ Migration successful: ${base_name}${NC}"
    return 0
  else
    echo -e "${RED}✗ Migration failed: ${base_name}${NC}"
    return 1
  fi
}

# Print banner
echo -e "${BLUE}"
echo "======================================================"
echo "       FilmFlex Database Migration Helper"
echo "======================================================"
echo -e "${NC}"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo -e "${RED}Error: Migrations directory not found: $MIGRATIONS_DIR${NC}"
  exit 1
fi

# Get all SQL migration files sorted by name
migrations=($(find "$MIGRATIONS_DIR" -name "*.sql" | sort))

if [ ${#migrations[@]} -eq 0 ]; then
  echo -e "${YELLOW}No migration files found in $MIGRATIONS_DIR${NC}"
  exit 0
fi

echo -e "${BLUE}Found ${#migrations[@]} migration files.${NC}"

# Run each migration in order
for migration in "${migrations[@]}"; do
  if ! run_migration "$migration"; then
    echo -e "${RED}Migration process failed. Check $MIGRATION_LOG for details.${NC}"
    exit 1
  fi
done

echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${BLUE}Migration log saved to: $MIGRATION_LOG${NC}"

# Apply schema fixes (additional safety checks)
echo -e "${BLUE}Applying schema fixes...${NC}"

# Fix any NULL episode fields
psql "$DATABASE_URL" << EOF
-- Update episode fields
UPDATE movies m SET
episode_total = COALESCE(
  (SELECT COUNT(*)::TEXT FROM episodes e WHERE e.movie_slug = m.slug),
  m.episode_total,
  '1'
)
WHERE episode_total IS NULL;

UPDATE movies SET
episode_current = COALESCE(episode_current, 'Full')
WHERE episode_current IS NULL;

-- Fix any invalid episode_total values
UPDATE movies SET
episode_total = '1'
WHERE episode_total = '0' OR episode_total = '';

-- Cleanup orphaned episodes
DELETE FROM episodes e
WHERE NOT EXISTS (
  SELECT 1 FROM movies m
  WHERE m.slug = e.movie_slug
);
EOF

echo -e "${GREEN}Schema fixes applied successfully.${NC}"
echo -e "${BLUE}======================================================"
echo "                 Process completed"
echo "======================================================${NC}"
