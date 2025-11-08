#!/bin/bash
# Setup Redis and run migration on Ubuntu server

echo "=== Installing Redis ==="
sudo apt update
sudo apt install -y redis-server

echo "=== Configuring Redis ==="
# Enable Redis to start on boot
sudo systemctl enable redis-server

# Start Redis
sudo systemctl start redis-server

# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

echo "=== Redis installation completed ==="
echo "Redis is running on localhost:6379"
