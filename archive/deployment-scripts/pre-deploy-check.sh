#!/bin/bash

# Pre-deployment dependency check and fix script
# This script ensures all required dependencies are installed before deployment

echo "🔍 Pre-deployment Dependency Check"
echo "=================================="

# Function to check if a package is installed
check_package() {
    local package=$1
    if npm list "$package" >/dev/null 2>&1; then
        echo "✅ $package is installed"
        return 0
    else
        echo "❌ $package is missing"
        return 1
    fi
}

# Function to install missing package
install_package() {
    local package=$1
    local dev_flag=$2
    echo "📦 Installing $package..."
    if [ "$dev_flag" = "--dev" ]; then
        npm install "$package" --save-dev --silent >/dev/null 2>&1
    else
        npm install "$package" --silent >/dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ $package installed successfully"
    else
        echo "⚠️ Failed to install $package"
    fi
}

# Check critical dependencies
echo "🔍 Checking critical dependencies..."

# Check dev dependencies
if ! check_package "@vitejs/plugin-react"; then
    install_package "@vitejs/plugin-react" "--dev"
fi

if ! check_package "esbuild"; then
    install_package "esbuild" "--dev"
fi

if ! check_package "typescript"; then
    install_package "typescript" "--dev"
fi

# Check production dependencies
if ! check_package "cors"; then
    install_package "cors"
fi

if ! check_package "express"; then
    install_package "express"
fi

# Fix @shared/schema import issue
echo "🔧 Fixing @shared/schema import..."
if [ ! -f "shared/index.js" ]; then
    echo "// ES Module export for shared schema" > shared/index.js
    echo "export * from './schema.js';" >> shared/index.js
    echo "✅ Created shared/index.js"
fi

# Clean and reinstall if needed
if [ "$1" = "--force-reinstall" ]; then
    echo "🧹 Force reinstalling all dependencies..."
    rm -rf node_modules package-lock.json
    npm install
fi

echo "✅ Pre-deployment dependency check completed"
