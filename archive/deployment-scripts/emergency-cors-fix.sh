#!/bin/bash

# Emergency CORS Fix - Quick and Simple
# This is the fastest way to fix the current CORS errors

echo "🚨 Emergency CORS Fix"
echo "===================="
echo ""

# Stop the application
echo "🛑 Stopping application..."
pm2 stop filmflex 2>/dev/null || pm2 stop all 2>/dev/null || true
sleep 2

# Navigate to the deployment directory
cd /var/www/filmflex || {
    echo "❌ Deployment directory not found"
    exit 1
}

# Create a simple CORS fix by updating the built file directly
echo "🔧 Applying emergency CORS fix..."

# Backup the current dist/index.js
cp dist/index.js dist/index.js.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Create a simple CORS override
cat > cors-fix.js << 'EOF'
// Emergency CORS fix - replace the problematic CORS function
const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, 'dist', 'index.js');

if (fs.existsSync(distFile)) {
    let content = fs.readFileSync(distFile, 'utf8');
    
    // Replace the problematic CORS origin function with a simple one
    const corsFixPattern = /origin:\s*function\s*\([^}]+\}\s*\)/s;
    const simpleCorsFunction = `origin: function (origin, callback) {
        // Simple CORS - allow all origins for now
        return callback(null, true);
    }`;
    
    if (corsFixPattern.test(content)) {
        content = content.replace(corsFixPattern, simpleCorsFunction);
        fs.writeFileSync(distFile, content);
        console.log('✅ CORS function simplified');
    } else {
        console.log('⚠️ CORS pattern not found in built file');
    }
} else {
    console.log('❌ Built file not found');
}
EOF

# Run the CORS fix
node cors-fix.js

# Start the application
echo "🚀 Starting application..."
pm2 start ecosystem.config.cjs 2>/dev/null || pm2 start dist/index.js --name filmflex

# Wait and check
echo "⏳ Waiting for startup..."
sleep 5

# Quick status check
echo "📊 Quick status check:"
if pm2 list | grep filmflex | grep -q online; then
    echo "✅ PM2: Online"
else
    echo "❌ PM2: Not online"
fi

if curl -f -s --max-time 5 http://localhost:5000/ >/dev/null 2>&1; then
    echo "✅ HTTP: Responding"
    echo ""
    echo "🎉 Emergency fix applied successfully!"
    echo "Application should be accessible at: http://38.54.14.154:5000"
else
    echo "❌ HTTP: Not responding"
    echo "Check logs: pm2 logs filmflex"
fi

# Clean up
rm -f cors-fix.js

echo ""
echo "Note: This is a temporary fix. Run the full fix script for a permanent solution."
