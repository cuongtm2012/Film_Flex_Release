#!/bin/bash

# Install Docker Compose on Ubuntu VPS
echo "🔧 Installing Docker Compose..."

# Method 1: Install using Docker's official method (recommended)
echo "📥 Downloading Docker Compose..."

# Download the latest stable release
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symlink for global access
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
echo "✅ Verifying Docker Compose installation..."
docker-compose --version

if command -v docker-compose &> /dev/null; then
    echo "🎉 Docker Compose installed successfully!"
    echo "📋 Version: $(docker-compose --version)"
else
    echo "❌ Installation failed. Trying alternative method..."
    
    # Alternative method: Install via pip
    echo "🔄 Trying pip installation..."
    sudo apt update
    sudo apt install -y python3-pip
    sudo pip3 install docker-compose
    
    # Verify again
    docker-compose --version
fi

echo "✅ Docker Compose setup complete!"