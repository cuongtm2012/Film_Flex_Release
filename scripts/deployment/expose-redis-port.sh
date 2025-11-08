#!/bin/bash
# Expose Redis port 6379 for external connections

echo "Configuring Redis for external access..."

# Option 1: If Redis is running in Docker, expose port in docker-compose
# (Already configured in docker-compose.yml with ports: "6379:6379")

# Option 2: If Redis is native, update redis.conf
if [ -f /etc/redis/redis.conf ]; then
    echo "Updating Redis configuration..."
    
    # Backup original config
    sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
    
    # Allow external connections (change bind from 127.0.0.1 to 0.0.0.0)
    sudo sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
    
    # Disable protected mode (or set a password)
    sudo sed -i 's/^protected-mode yes/protected-mode no/' /etc/redis/redis.conf
    
    # Restart Redis
    sudo systemctl restart redis-server
    
    echo "✓ Redis configured for external access"
    echo "⚠ WARNING: Redis is now accessible without password!"
    echo "   Consider setting a password with: requirepass your_password"
fi

# Check if port 6379 is accessible
if command -v ufw &> /dev/null; then
    echo "Opening firewall port 6379..."
    sudo ufw allow 6379/tcp
    echo "✓ Firewall configured"
fi

echo ""
echo "Testing Redis connection..."
redis-cli ping

echo ""
echo "Redis is now accessible at: $(hostname -I | awk '{print $1}'):6379"
echo ""
echo "Test from local machine:"
echo "  redis-cli -h $(hostname -I | awk '{print $1}') ping"
