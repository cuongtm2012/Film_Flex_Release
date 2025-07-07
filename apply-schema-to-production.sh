#!/bin/bash
# Apply Final Schema to Production Database
# Usage: ./apply-schema-to-production.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== FilmFlex Production Schema Update ===${NC}"
echo "This script will apply the final schema to the production database"
echo

# Database connection details
DB_HOST="localhost"
DB_NAME="filmflex"
DB_USER="filmflex"
DB_PASSWORD="filmflex2024!"

# Check if we're on the production server
if [[ "$(hostname -I | grep -o '^[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+')" != "154.205.142.255" ]]; then
    echo -e "${RED}Warning: This doesn't appear to be the production server (154.205.142.255)${NC}"
    echo "Current IP: $(hostname -I)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot connect to database${NC}"
    echo "Please check:"
    echo "1. PostgreSQL is running"
    echo "2. Database credentials are correct"
    echo "3. Database 'filmflex' exists"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"

# Create backup
echo -e "${YELLOW}Creating backup of current database...${NC}"
BACKUP_FILE="filmflex_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"

# Check current schema
echo -e "${YELLOW}Checking current database schema...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\dt" > current_tables.txt
echo -e "${GREEN}✓ Current schema saved to current_tables.txt${NC}"

# Apply the schema migration
echo -e "${YELLOW}Applying schema migration...${NC}"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f apply-final-schema.sql; then
    echo -e "${GREEN}✓ Schema migration completed successfully${NC}"
else
    echo -e "${RED}ERROR: Schema migration failed${NC}"
    echo "You can restore from backup using:"
    echo "psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    exit 1
fi

# Verify the schema
echo -e "${YELLOW}Verifying updated schema...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\\dt" > updated_tables.txt

# Check if filename column exists in episodes table
FILENAME_EXISTS=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='episodes' AND column_name='filename';" | xargs)

if [[ "$FILENAME_EXISTS" == "filename" ]]; then
    echo -e "${GREEN}✓ filename column exists in episodes table${NC}"
else
    echo -e "${RED}✗ filename column missing in episodes table${NC}"
fi

# Show table comparison
echo -e "${YELLOW}Schema comparison:${NC}"
echo "Before migration:"
cat current_tables.txt
echo
echo "After migration:"
cat updated_tables.txt

echo
echo -e "${GREEN}=== Schema Update Complete ===${NC}"
echo "Backup file: $BACKUP_FILE"
echo "Current tables: current_tables.txt"
echo "Updated tables: updated_tables.txt"
echo
echo "Next steps:"
echo "1. Test the movie import script"
echo "2. Verify all functionality works"
echo "3. If issues occur, restore from backup"

# Clean up
unset PGPASSWORD
