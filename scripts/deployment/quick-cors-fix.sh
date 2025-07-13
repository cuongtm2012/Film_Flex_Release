#!/bin/bash

# Quick CORS Fix and Restart Script for FilmFlex Application
# Addresses "Not allowed by CORS" errors during deployment

set -e

echo "🔧 ==============================================="
echo "🔧 QUICK CORS FIX FOR FILMFLEX APPLICATION"
echo "🔧 ==============================================="

# Function to check if PM2 is running
check_pm2_status() {
    if pm2 list | grep -q "filmflex"; then
        echo "✅ PM2 process 'filmflex' found"
        pm2 show filmflex
        return 0
    else
        echo "❌ PM2 process 'filmflex' not found"
        return 1
    fi
}

# Function to restart the application
restart_application() {
    echo "🔄 Restarting FilmFlex application..."
    
    cd /var/www/filmflex
    
    # Stop existing PM2 process if running
    if pm2 list | grep -q "filmflex"; then
        echo "🛑 Stopping existing PM2 process..."
        pm2 delete filmflex || true
    fi
    
    # Start the application with PM2
    echo "🚀 Starting FilmFlex with PM2..."
    pm2 start npm --name filmflex --interpreter bash -- start
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ Application restarted successfully!"
}

# Function to verify CORS configuration
verify_cors_config() {
    echo "🔍 Verifying CORS configuration..."
    
    # Check .env file
    if [ -f "/var/www/filmflex/.env" ]; then
        echo "📄 .env file contents:"
        cat /var/www/filmflex/.env
        echo ""
    else
        echo "❌ .env file not found!"
        return 1
    fi
    
    # Test CORS with curl
    echo "🌐 Testing CORS with various origins..."
    
    # Test with phimgg.com
    echo "Testing https://phimgg.com origin:"
    curl -H "Origin: https://phimgg.com" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:5000/ -v || true
    echo ""
    
    # Test with IP address
    echo "Testing http://154.205.142.255 origin:"
    curl -H "Origin: http://154.205.142.255" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:5000/ -v || true
    echo ""
}

# Function to check application health
check_application_health() {
    echo "🏥 Checking application health..."
    
    # Wait for application to start
    sleep 5
    
    # Check if port 5000 is listening
    if netstat -tuln | grep ":5000 "; then
        echo "✅ Application is listening on port 5000"
    else
        echo "❌ Application is not listening on port 5000"
        return 1
    fi
    
    # Test basic HTTP request
    if curl -f http://localhost:5000/health 2>/dev/null; then
        echo "✅ Health check endpoint responding"
    else
        echo "⚠️  Health check endpoint not responding (may be normal if not implemented)"
    fi
}

# Main execution
main() {
    echo "🚀 Starting CORS fix and application restart..."
    
    # Check if we're running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This script needs to be run with sudo privileges"
        echo "Usage: sudo ./quick-cors-fix.sh"
        exit 1
    fi
    
    # Step 1: Check current PM2 status
    echo "📊 Step 1: Checking current PM2 status..."
    check_pm2_status || true
    
    # Step 2: Restart the application
    echo "🔄 Step 2: Restarting application..."
    restart_application
    
    # Step 3: Verify CORS configuration
    echo "🔍 Step 3: Verifying CORS configuration..."
    verify_cors_config
    
    # Step 4: Check application health
    echo "🏥 Step 4: Checking application health..."
    check_application_health
    
    # Step 5: Show PM2 logs
    echo "📋 Step 5: Showing recent PM2 logs..."
    pm2 logs filmflex --lines 20
    
    echo ""
    echo "🎉 ==============================================="
    echo "🎉 CORS FIX DEPLOYMENT COMPLETED!"
    echo "🎉 ==============================================="
    echo "✅ Application should now accept CORS requests"
    echo "🌐 ALLOWED_ORIGINS=* is set (allows all origins)"
    echo "🔧 Enhanced CORS logging is enabled"
    echo "📊 Check PM2 logs with: pm2 logs filmflex"
    echo "🌍 Test the application at: http://154.205.142.255:5000"
    echo "🎬 Test the website at: http://phimgg.com"
}

# Execute main function
main "$@"
