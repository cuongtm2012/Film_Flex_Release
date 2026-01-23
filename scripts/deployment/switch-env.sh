#!/bin/bash

# PhimGG Environment Switcher
# Easily switch between development and production environments

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

show_usage() {
    echo -e "${BLUE}PhimGG Environment Switcher${NC}"
    echo ""
    echo "Usage: $0 {dev|prod|production|show|backup}"
    echo ""
    echo "Commands:"
    echo "  dev, development    Switch to development environment"
    echo "  prod, production    Switch to production environment"
    echo "  show                Show current environment"
    echo "  backup              Backup current .env file"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Switch to development"
    echo "  $0 prod             # Switch to production"
    echo "  $0 show             # Show current settings"
    echo ""
}

show_current_env() {
    echo -e "${BLUE}Current Environment Configuration:${NC}"
    echo ""
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
        echo ""
        
        # Show key settings
        if grep -q "NODE_ENV=production" "$PROJECT_ROOT/.env"; then
            echo -e "Environment: ${GREEN}PRODUCTION${NC}"
        elif grep -q "NODE_ENV=development" "$PROJECT_ROOT/.env"; then
            echo -e "Environment: ${YELLOW}DEVELOPMENT${NC}"
        else
            echo -e "Environment: ${RED}UNKNOWN${NC}"
        fi
        
        echo ""
        echo "Key Settings:"
        grep -E "^(NODE_ENV|PORT|DATABASE_URL|PUBLIC_URL|DOMAIN)" "$PROJECT_ROOT/.env" | while IFS= read -r line; do
            echo "  $line"
        done
    else
        echo -e "${RED}✗ .env file not found${NC}"
        echo ""
        echo "Available environment files:"
        ls -la "$PROJECT_ROOT"/.env* 2>/dev/null || echo "  No .env files found"
    fi
    echo ""
}

backup_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="$PROJECT_ROOT/.env.backup.$timestamp"
        
        cp "$PROJECT_ROOT/.env" "$backup_file"
        echo -e "${GREEN}✓ Backed up .env to: $backup_file${NC}"
    else
        echo -e "${YELLOW}⚠ No .env file to backup${NC}"
    fi
}

switch_to_dev() {
    echo -e "${YELLOW}Switching to DEVELOPMENT environment...${NC}"
    echo ""
    
    # Backup current .env if exists
    if [ -f "$PROJECT_ROOT/.env" ]; then
        backup_env
    fi
    
    # Check if .env.example exists
    if [ ! -f "$PROJECT_ROOT/.env.example" ]; then
        echo -e "${RED}✗ .env.example not found${NC}"
        exit 1
    fi
    
    # Copy .env.example to .env
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    
    # Update to development settings
    sed -i 's/NODE_ENV=.*/NODE_ENV=development/' "$PROJECT_ROOT/.env" 2>/dev/null || \
        sed -i '' 's/NODE_ENV=.*/NODE_ENV=development/' "$PROJECT_ROOT/.env"
    
    echo -e "${GREEN}✓ Switched to DEVELOPMENT environment${NC}"
    echo ""
    echo "Configuration:"
    echo "  - NODE_ENV: development"
    echo "  - Database: localhost:5432"
    echo "  - Port: 5000"
    echo ""
    echo -e "${YELLOW}Note: Update OAuth credentials and other secrets in .env${NC}"
}

switch_to_prod() {
    echo -e "${YELLOW}Switching to PRODUCTION environment...${NC}"
    echo ""
    
    # Backup current .env if exists
    if [ -f "$PROJECT_ROOT/.env" ]; then
        backup_env
    fi
    
    # Check if .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        echo -e "${RED}✗ .env.production not found${NC}"
        echo ""
        echo "Creating .env.production template..."
        
        # Create basic production template
        cat > "$PROJECT_ROOT/.env.production" << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex
SESSION_SECRET=change_this_to_secure_random_string
PUBLIC_URL=https://phimgg.com
DOMAIN=phimgg.com
ALLOWED_ORIGINS=*
ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200
ELASTICSEARCH_ENABLED=true
EOF
        
        echo -e "${GREEN}✓ Created .env.production template${NC}"
    fi
    
    # Copy .env.production to .env
    cp "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env"
    
    echo -e "${GREEN}✓ Switched to PRODUCTION environment${NC}"
    echo ""
    echo "Configuration:"
    echo "  - NODE_ENV: production"
    echo "  - Database: postgres:5432 (Docker)"
    echo "  - Domain: phimgg.com"
    echo ""
    echo -e "${RED}⚠ IMPORTANT: Update the following in .env:${NC}"
    echo "  1. SESSION_SECRET - Use a strong random string"
    echo "  2. ENCRYPTION_KEY - Use a strong random string"
    echo "  3. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo "  4. FACEBOOK_APP_ID and FACEBOOK_APP_SECRET"
    echo "  5. SENDGRID_API_KEY or SMTP settings"
    echo ""
}

# Main execution
case "${1:-help}" in
    "dev"|"development")
        switch_to_dev
        ;;
    "prod"|"production")
        switch_to_prod
        ;;
    "show"|"status")
        show_current_env
        ;;
    "backup")
        backup_env
        ;;
    "help"|*)
        show_usage
        ;;
esac
