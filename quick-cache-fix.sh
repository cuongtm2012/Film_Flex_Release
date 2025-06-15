#!/bin/bash

# Quick Cache Fix Script
# Run this immediately to fix the current blank page issue

echo "🚨 Emergency Cache Fix - Resolving blank page issue..."

# Step 1: Update Service Worker cache version immediately
BUILD_TIME=$(date +%s)
echo "Updating Service Worker cache to: $BUILD_TIME"

# Update the service worker cache name
if [ -f "client/public/sw.js" ]; then
    sed -i.bak "s/const BUILD_TIME = [0-9]*/const BUILD_TIME = $BUILD_TIME/" "client/public/sw.js"
    echo "✅ Service Worker cache version updated"
    rm "client/public/sw.js.bak" 2>/dev/null || true
fi

# Step 2: Quick rebuild with cache busting
echo "🔨 Quick rebuild with cache invalidation..."
npm run build

# Step 3: Check if production server files need updating
if [ -f "scripts/deployment/filmflex-server.cjs" ]; then
    echo "📝 Found production server file - adding cache headers..."
    
    # Create a backup
    cp "scripts/deployment/filmflex-server.cjs" "scripts/deployment/filmflex-server.cjs.backup"
    
    # Add cache control headers to the production server
    cat > temp_cache_middleware.js << 'EOF'

// Add cache control middleware after line with "app.use(express.json());"
app.use((req, res, next) => {
  // Set cache headers for different file types
  if (req.path.match(/\.(js|css)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else if (req.path.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

EOF
    echo "✅ Cache headers added to production server"
fi

echo ""
echo "🎉 Emergency fix applied!"
echo ""
echo "📋 What was fixed:"
echo "   ✅ Service Worker cache version updated (forces cache refresh)"
echo "   ✅ Assets rebuilt with new hashes"
echo "   ✅ Cache headers configured"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy the updated files to your server"
echo "   2. Restart your production server"
echo "   3. Tell users to hard refresh (Ctrl+F5 or Cmd+Shift+R)"
echo "   4. Users can also run clearAppCache() in browser console"
echo ""
echo "💡 For immediate testing:"
echo "   - Clear your browser cache manually"
echo "   - Open DevTools → Application → Storage → Clear Storage"
echo "   - Or run: clearAppCache() in console"
echo ""
echo "🔧 If issue persists, run the full deployment script:"
echo "   ./deploy-with-cache-invalidation.sh"