#!/bin/bash

# PhimGG GitHub Secrets Setup Script
# This script will help you set up the required GitHub secrets for deployment
# using the GitHub CLI. Make sure you have it installed and authenticated.

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI is not installed.${NC}"
    echo "Please install it first: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: You are not authenticated with GitHub CLI.${NC}"
    echo "Please run 'gh auth login' first."
    exit 1
fi

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo -e "${YELLOW}Could not determine the current repository.${NC}"
    echo -e "Please enter your GitHub repository (format: username/repo):"
    read REPO
fi

echo -e "${BLUE}Setting up secrets for repository: ${GREEN}$REPO${NC}"
echo

# Function to set secret
set_secret() {
    local name=$1
    local prompt=$2
    local default=$3
    
    echo -e "${BLUE}$prompt${NC}"
    if [ -n "$default" ]; then
        echo -e "${YELLOW}Default: $default${NC}"
        echo -e "Press Enter to use default or type a new value:"
    fi
    
    read value
    
    # Use default if no value provided
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    if [ -n "$value" ]; then
        echo -e "Setting secret ${GREEN}$name${NC}..."
        echo -n "$value" | gh secret set "$name" -R "$REPO"
        echo -e "${GREEN}✓ Secret $name set successfully${NC}"
    else
        echo -e "${YELLOW}Skipping $name (no value provided)${NC}"
    fi
    echo
}

# Set SERVER_IP
set_secret "SERVER_IP" "Enter your server IP address:" "38.54.115.156"

# Set SERVER_USER
set_secret "SERVER_USER" "Enter your server SSH username:" "root"

# Set SSH_PASSWORD
set_secret "SSH_PASSWORD" "Enter your server SSH password:" ""

# Set DATABASE_URL
set_secret "DATABASE_URL" "Enter your PostgreSQL connection string:" "postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

# Telegram notification support has been removed

echo -e "${GREEN}All secrets have been configured successfully!${NC}"
echo -e "${BLUE}You can now use the GitHub Actions workflows to deploy PhimGG.${NC}"
echo -e "For more information, see the docs/GITHUB_DEPLOYMENT.md file."