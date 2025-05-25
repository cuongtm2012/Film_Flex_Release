#!/bin/bash

# Database Verification Script for FilmFlex
# This script checks if all database tables and connections are working properly

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== FilmFlex Database Verification ===${NC}"

# Set PostgreSQL environment variables
export PGHOST="localhost"
export PGDATABASE="filmflex"
export PGUSER="filmflex"
export PGPASSWORD="filmflex2024"
export PGPORT="5432"

# Function to check table exists and row count
check_table() {
    local table_name=$1
    echo -n "Checking table '$table_name'... "
    
    if psql -c "\dt $table_name" >/dev/null 2>&1; then
        local count=$(psql -t -c "SELECT COUNT(*) FROM $table_name;" 2>/dev/null | xargs)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}EXISTS (${count} rows)${NC}"
        else
            echo -e "${YELLOW}EXISTS (query failed)${NC}"
        fi
    else
        echo -e "${RED}NOT FOUND${NC}"
    fi
}

# Function to test database connection
test_connection() {
    echo -n "Testing database connection... "
    if psql -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}SUCCESS${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Test database connection first
if ! test_connection; then
    echo -e "${RED}Cannot connect to database. Please check your PostgreSQL setup.${NC}"
    exit 1
fi

echo ""
echo "Checking all required tables:"

# Check all required tables
check_table "movies"
check_table "users"
check_table "roles"
check_table "permissions"
check_table "role_permissions"
check_table "comments"
check_table "watchlist"
check_table "view_history"
check_table "audit_logs"
check_table "featured_sections"
check_table "episodes"

echo ""
echo "Checking specific database features:"

# Check if roles are properly set up
echo -n "Checking default roles... "
role_count=$(psql -t -c "SELECT COUNT(*) FROM roles WHERE name IN ('Admin', 'Content Manager', 'Viewer');" 2>/dev/null | xargs)
if [ "$role_count" = "3" ]; then
    echo -e "${GREEN}OK (3 roles found)${NC}"
else
    echo -e "${YELLOW}INCOMPLETE ($role_count/3 roles found)${NC}"
fi

# Check if permissions are set up
echo -n "Checking permissions... "
perm_count=$(psql -t -c "SELECT COUNT(*) FROM permissions;" 2>/dev/null | xargs)
if [ "$perm_count" -gt "0" ]; then
    echo -e "${GREEN}OK ($perm_count permissions)${NC}"
else
    echo -e "${RED}NONE FOUND${NC}"
fi

# Check if admin user exists
echo -n "Checking admin user... "
admin_count=$(psql -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null | xargs)
if [ "$admin_count" = "1" ]; then
    echo -e "${GREEN}EXISTS${NC}"
else
    echo -e "${YELLOW}NOT FOUND${NC}"
fi

# Check array columns
echo -n "Checking array columns... "
array_test=$(psql -t -c "SELECT array_length(categories, 1) FROM movies WHERE categories IS NOT NULL LIMIT 1;" 2>/dev/null | xargs)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}ISSUES DETECTED${NC}"
fi

echo ""
echo -e "${BLUE}=== Verification Complete ===${NC}"