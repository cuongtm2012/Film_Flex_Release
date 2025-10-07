#!/bin/bash

# Node.js Installation Script for PhimGG
# This script installs Node.js 18.x LTS on Ubuntu/Debian systems

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   PhimGG Node.js Installation${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    DISTRO=$ID
else
    echo -e "${RED}Cannot detect operating system${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS: $OS${NC}"

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    CURRENT_VERSION=$(node --version)
    echo -e "${YELLOW}Node.js is already installed: $CURRENT_VERSION${NC}"
    read -p "Do you want to upgrade/reinstall? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Skipping installation${NC}"
        exit 0
    fi
fi

# Install Node.js based on distribution
case "$DISTRO" in
    "ubuntu"|"debian")
        echo -e "${BLUE}Installing Node.js 18.x LTS via NodeSource repository...${NC}"
        
        # Update package index
        apt-get update
        
        # Install required packages
        apt-get install -y curl software-properties-common
        
        # Add NodeSource repository
        echo -e "${BLUE}Adding NodeSource repository...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        
        # Install Node.js
        echo -e "${BLUE}Installing Node.js and npm...${NC}"
        apt-get install -y nodejs
        
        # Install build tools for native modules
        apt-get install -y build-essential
        ;;
    
    "centos"|"rhel"|"fedora")
        echo -e "${BLUE}Installing Node.js 18.x LTS via NodeSource repository...${NC}"
        
        # Add NodeSource repository
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        
        # Install Node.js
        if command -v dnf &> /dev/null; then
            dnf install -y nodejs npm
        else
            yum install -y nodejs npm
        fi
        ;;
    
    *)
        echo -e "${YELLOW}Unsupported distribution: $DISTRO${NC}"
        echo -e "${YELLOW}Trying alternative installation via snap...${NC}"
        
        if command -v snap &> /dev/null; then
            snap install node --classic
        else
            echo -e "${RED}Snap not available. Please install Node.js manually${NC}"
            echo -e "${BLUE}Visit: https://nodejs.org/en/download/${NC}"
            exit 1
        fi
        ;;
esac

# Verify installation
echo -e "${BLUE}Verifying Node.js installation...${NC}"
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    echo -e "${GREEN}✓ Node.js installed successfully: $NODE_VERSION${NC}"
    echo -e "${GREEN}✓ npm installed successfully: $NPM_VERSION${NC}"
    
    # Test Node.js
    echo -e "${BLUE}Testing Node.js...${NC}"
    node -e "console.log('Node.js is working correctly!')"
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Node.js Installation Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}You can now run the PhimGG import scripts${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. cd ~/Film_Flex_Release/scripts/data"
    echo -e "  2. ./test-cron-manual.sh"
    echo -e "  3. ./setup-cron.sh (if needed)"
    
else
    echo -e "${RED}✗ Installation failed${NC}"
    echo -e "${BLUE}Please try manual installation:${NC}"
    echo -e "  Ubuntu/Debian: apt-get install nodejs npm"
    echo -e "  CentOS/RHEL: yum install nodejs npm"
    exit 1
fi