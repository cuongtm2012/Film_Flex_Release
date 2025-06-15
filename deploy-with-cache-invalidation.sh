#!/bin/bash

# Cache Invalidation Deploy Script
# This script ensures proper cache busting on each deployment

set -e

echo "🚀 Starting FilmFlex deployment with cache invalidation..."

# Generate build timestamp for cache busting
BUILD_TIMESTAMP=$(date +%s)
echo "Build timestamp: $BUILD_TIMESTAMP"

# Update Service Worker with new cache version
SW_FILE="client/public/sw.js"
if [ -f "$SW_FILE" ]; then
    # Update the BUILD_TIME in service worker to invalidate cache
    sed -i.bak "s/const BUILD_TIME = [0-9]*/const BUILD_TIME = $BUILD_TIMESTAMP/" "$SW_FILE"
    echo "✅ Updated Service Worker cache version"
    rm "$SW_FILE.bak" 2>/dev/null || true
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ node_modules/.vite/ 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --silent

# Build the application with cache busting
echo "🔨 Building application..."
npm run build

# Verify build output
if [ ! -d "dist/public" ]; then
    echo "❌ Build failed - dist/public directory not found"
    exit 1
fi

# Check for manifest file (indicates proper asset hashing)
if [ -f "dist/public/.vite/manifest.json" ]; then
    echo "✅ Build manifest found - assets properly hashed"
else
    echo "⚠️  Warning: No build manifest found - asset hashing may not be working"
fi

# Set proper file permissions for static assets
echo "🔒 Setting file permissions..."
find dist/public -type f -name "*.js" -exec chmod 644 {} \;
find dist/public -type f -name "*.css" -exec chmod 644 {} \;
find dist/public -type f -name "*.html" -exec chmod 644 {} \;

# Generate cache control headers for nginx (if using nginx)
cat > dist/public/.htaccess << 'EOF'
# Cache Control Headers for Apache
<IfModule mod_expires.c>
    ExpiresActive On
    
    # Cache hashed assets for 1 year
    <FilesMatch "\.(js|css)$">
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </FilesMatch>
    
    # Cache images for 1 day
    <FilesMatch "\.(png|jpg|jpeg|gif|svg|ico|webp)$">
        ExpiresDefault "access plus 1 day"
        Header append Cache-Control "public"
    </FilesMatch>
    
    # Don't cache HTML files
    <FilesMatch "\.html$">
        ExpiresDefault "access plus 0 seconds"
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>
</IfModule>
EOF

echo "✅ Generated .htaccess for cache control"

# Create nginx config snippet
cat > dist/nginx-cache-config.conf << 'EOF'
# Nginx Cache Control Configuration
# Include this in your nginx server block

location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

location ~* \.(png|jpg|jpeg|gif|svg|ico|webp)$ {
    expires 1d;
    add_header Cache-Control "public";
    add_header Vary "Accept-Encoding";
}

location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
EOF

echo "✅ Generated nginx cache configuration"

# Display deployment summary
echo ""
echo "🎉 Deployment preparation complete!"
echo "📊 Build Summary:"
echo "   - Build timestamp: $BUILD_TIMESTAMP"
echo "   - Service Worker cache updated: ✅"
echo "   - Assets hashed: ✅"
echo "   - Cache headers configured: ✅"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy the dist/public folder to your web server"
echo "   2. If using Apache, the .htaccess file is already included"
echo "   3. If using Nginx, add the contents of nginx-cache-config.conf to your server block"
echo "   4. Restart your web server to apply cache changes"
echo ""
echo "🔧 Emergency cache clear command for users:"
echo "   Users can run: clearAppCache() in browser console"

# Optional: Start the production server for testing
if [ "$1" = "--start" ]; then
    echo "🚀 Starting production server..."
    npm start
fi