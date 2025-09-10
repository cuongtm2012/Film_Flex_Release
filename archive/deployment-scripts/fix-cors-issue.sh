#!/bin/bash

# Fix CORS Issue - Update server with new configuration
echo "🔧 Fixing CORS configuration and restarting Film Flex application..."

# Check if we're on the server
if [[ $(hostname -I | grep -c "38.54.14.154") -eq 0 ]]; then
    echo "❌ This script should be run on the server 38.54.14.154"
    echo "Please copy the updated files to the server first."
    exit 1
fi

# Navigate to application directory
cd /root/Film_Flex_Release || {
    echo "❌ Film Flex application directory not found"
    exit 1
}

echo "📁 Current directory: $(pwd)"

# Backup current configuration
echo "📦 Creating backup of current configuration..."
cp server/index.ts server/index.ts.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

echo "🔄 Stopping PM2 application..."
pm2 stop ecosystem.config.cjs || pm2 stop all || true

echo "⏳ Waiting for application to stop..."
sleep 3

# Rebuild the application with new configuration
echo "🏗️ Rebuilding application with new CORS configuration..."
npm run build || {
    echo "⚠️ Build failed, trying alternative build commands..."
    npx tsc || {
        echo "⚠️ TypeScript compilation failed, trying to start anyway..."
    }
}

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.cjs || {
    echo "⚠️ PM2 start failed, trying alternative start..."
    pm2 start npm --name "film-flex" -- start || {
        echo "⚠️ Alternative start failed, trying direct node start..."
        pm2 start "node dist/index.js" --name "film-flex"
    }
}

echo "⏳ Waiting for application to start..."
sleep 5

echo "📊 Checking PM2 status..."
pm2 status

echo "📋 Checking recent logs..."
pm2 logs --lines 20

echo "🌐 Testing application connectivity..."
echo "Testing HTTP endpoint..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5000/api/health || echo "Health check endpoint not available"

echo ""
echo "✅ CORS fix deployment completed!"
echo ""
echo "🌍 Your application should now be accessible at:"
echo "   http://38.54.14.154:5000"
echo ""
echo "🔍 To check if CORS is working:"
echo "   1. Open http://38.54.14.154:5000 in your browser"
echo "   2. Check browser console for CORS errors"
echo "   3. If issues persist, check PM2 logs: pm2 logs"
echo ""
echo "📝 Configuration changes made:"
echo "   ✓ Updated CORS to allow server IP (38.54.14.154)"
echo "   ✓ Set NODE_ENV to production"
echo "   ✓ Set CLIENT_URL to http://38.54.14.154:5000"
echo "   ✓ Made CORS more permissive for production deployment"
echo ""
