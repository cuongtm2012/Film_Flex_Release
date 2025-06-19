#!/bin/bash

# Setup script for FilmFlex deployment scripts
# Makes all scripts executable and sets up basic environment

echo "🔧 Setting up FilmFlex deployment scripts..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Make all scripts executable
chmod +x "$SCRIPT_DIR"/*.sh
echo "✅ Made all scripts executable"

# Create necessary directories
sudo mkdir -p /var/www/filmflex
sudo mkdir -p /var/backups/filmflex
sudo mkdir -p /var/log/filmflex
echo "✅ Created directories"

# Set ownership
sudo chown -R www-data:www-data /var/www/filmflex 2>/dev/null || true
echo "✅ Set ownership"

echo ""
echo "📋 Available Scripts:"
echo "  production-deploy.sh  - Full production deployment"
echo "  quick-update.sh      - Quick code updates"
echo "  rollback.sh          - Emergency rollback"
echo "  health-check.sh      - Health monitoring"
echo ""
echo "🚀 Usage Examples:"
echo "  sudo ./production-deploy.sh"
echo "  sudo ./quick-update.sh"
echo "  ./health-check.sh"
echo ""
echo "✅ Setup completed!"
