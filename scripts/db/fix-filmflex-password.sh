#!/bin/bash

# Quick PostgreSQL Password Fix for filmflex user
# Production Server: phimgg.com (154.205.142.255)
# Usage: bash fix-filmflex-password.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 FilmFlex PostgreSQL Password Fix${NC}"
echo "====================================="

# Step 1: Update filmflex user password
echo -e "${YELLOW}Step 1: Updating filmflex user password...${NC}"

sudo -u postgres psql << 'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'filmflex') THEN
        CREATE USER filmflex WITH PASSWORD 'filmflex2024';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        ALTER USER filmflex CREATEDB;
        RAISE NOTICE 'Created filmflex user with password: filmflex2024';
    ELSE
        ALTER USER filmflex PASSWORD 'filmflex2024';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        RAISE NOTICE 'Updated filmflex user password to: filmflex2024';
    END IF;
END$$;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL user password updated successfully${NC}"
else
    echo -e "${RED}❌ Failed to update PostgreSQL user password${NC}"
    exit 1
fi

# Step 2: Test the new password
echo -e "${YELLOW}Step 2: Testing new password...${NC}"

if PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Password test successful!${NC}"
else
    echo -e "${RED}❌ Password test failed. Checking database existence...${NC}"
    
    # Try to create database if it doesn't exist
    sudo -u postgres createdb filmflex 2>/dev/null || echo "Database may already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;" || true
    
    # Test again
    if PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Password test successful after database creation!${NC}"
    else
        echo -e "${RED}❌ Password test still failing${NC}"
        exit 1
    fi
fi

# Step 3: Display connection info
echo -e "${YELLOW}Step 3: Connection Information${NC}"
echo "================================"
echo -e "${BLUE}Database User:${NC} filmflex"
echo -e "${BLUE}Database Password:${NC} filmflex2024"
echo -e "${BLUE}Database Name:${NC} filmflex"
echo -e "${BLUE}Connection String:${NC} postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

# Step 4: Check user permissions
echo -e "${YELLOW}Step 4: Verifying user permissions...${NC}"
sudo -u postgres psql -c "\du filmflex"

# Step 5: Update environment file
echo -e "${YELLOW}Step 5: Updating environment configuration...${NC}"

ENV_FILE="$HOME/.env"
if [ -f "$ENV_FILE" ]; then
    # Backup existing env file
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update DATABASE_URL in env file
    if grep -q "DATABASE_URL" "$ENV_FILE"; then
        sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable|' "$ENV_FILE"
        echo -e "${GREEN}✅ Updated DATABASE_URL in $ENV_FILE${NC}"
    else
        echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added DATABASE_URL to $ENV_FILE${NC}"
    fi
else
    echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable" > "$ENV_FILE"
    echo -e "${GREEN}✅ Created $ENV_FILE with DATABASE_URL${NC}"
fi

# Step 6: Final verification
echo -e "${YELLOW}Step 6: Final verification...${NC}"

# Test with the connection string format
if PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT 'Connection successful!' as status;" 2>/dev/null; then
    echo -e "${GREEN}✅ All tests passed! PostgreSQL password change complete.${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Restart your application to use the new password"
    echo "2. Update any PM2 ecosystem config files if needed"
    echo "3. Test your application login"
    echo ""
    echo -e "${BLUE}Connection Details:${NC}"
    echo "  User: filmflex"
    echo "  Password: filmflex2024"
    echo "  Database: filmflex"
    echo "  Full URL: postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable"
else
    echo -e "${RED}❌ Final verification failed${NC}"
    echo "Manual intervention may be required."
    exit 1
fi
