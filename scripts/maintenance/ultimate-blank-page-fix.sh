#!/bin/bash

# Ultimate Blank Page Fix Deployment Script
# This script addresses all known causes of blank page issues
# Version: 3.0 - Comprehensive Fix Edition

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DATE=$(date '+%Y%m%d%H%M%S')
APP_VERSION=$(date '+%Y%m%d%H')
BUILD_TIME=$(date +%s)

echo -e "${BLUE}"
echo "============================================="
echo "    PhimGG Blank Page Fix Deployment"
echo "    Version: 3.0 - Ultimate Solution"
echo "    Build Time: $BUILD_TIME"
echo "    App Version: $APP_VERSION"
echo "============================================="
echo -e "${NC}"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

# Step 1: Update Service Worker with new build time
log "Step 1: Updating Service Worker cache version..."
SW_FILE="client/public/sw.js"
if [ -f "$SW_FILE" ]; then
    # Update BUILD_TIME in service worker
    sed -i.bak "s/const BUILD_TIME = [0-9]*/const BUILD_TIME = $BUILD_TIME/" "$SW_FILE"
    success "Service Worker updated with BUILD_TIME: $BUILD_TIME"
    rm "$SW_FILE.bak" 2>/dev/null || true
else
    error "Service Worker file not found: $SW_FILE"
    exit 1
fi

# Step 2: Update app version in HTML
log "Step 2: Updating app version in HTML..."
HTML_FILE="client/index.html"
if [ -f "$HTML_FILE" ]; then
    # Update APP_VERSION in HTML
    sed -i.bak "s/const APP_VERSION = '[0-9]*'/const APP_VERSION = '$APP_VERSION'/" "$HTML_FILE"
    success "HTML updated with APP_VERSION: $APP_VERSION"
    rm "$HTML_FILE.bak" 2>/dev/null || true
else
    error "HTML file not found: $HTML_FILE"
    exit 1
fi

# Step 3: Clean all previous builds and caches
log "Step 3: Cleaning previous builds..."
rm -rf dist/ client/dist/ server/dist/ node_modules/.vite/ .vite/ 2>/dev/null || true
success "Build directories cleaned"

# Step 4: Install dependencies with clean slate
log "Step 4: Installing dependencies..."
if npm ci --silent; then
    success "Dependencies installed"
else
    warning "npm ci failed, trying npm install..."
    if npm install --silent; then
        success "Dependencies installed with npm install"
    else
        error "Failed to install dependencies"
        exit 1
    fi
fi

# Step 5: Build with enhanced error handling
log "Step 5: Building application with cache busting..."
if npm run build; then
    success "Build completed successfully"
else
    error "Build failed"
    exit 1
fi

# Step 6: Verify build output
log "Step 6: Verifying build output..."
REQUIRED_FILES=(
    "dist/public/index.html"
    "dist/public/assets"
    "dist/index.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -e "$file" ]; then
        success "Found: $file"
    else
        error "Missing: $file"
        exit 1
    fi
done

# Step 7: Create deployment info file
log "Step 7: Creating deployment info..."
cat > dist/deployment-info.json << EOF
{
  "buildTime": $BUILD_TIME,
  "appVersion": "$APP_VERSION",
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)"
}
EOF
success "Deployment info created"

# Step 8: Generate cache invalidation headers
log "Step 8: Generating cache control configuration..."

# Create .htaccess for Apache
cat > dist/public/.htaccess << 'EOF'
# Aggressive Cache Control for Blank Page Fix
<IfModule mod_expires.c>
    ExpiresActive On
    
    # Never cache HTML files
    <FilesMatch "\.(html|htm)$">
        ExpiresDefault "access plus 0 seconds"
        Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>
    
    # Cache hashed assets for 1 year
    <FilesMatch "\.(js|css|woff|woff2|ttf|eot)$">
        ExpiresDefault "access plus 1 year"
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
    
    # Cache images for 1 week
    <FilesMatch "\.(png|jpg|jpeg|gif|svg|ico|webp)$">
        ExpiresDefault "access plus 1 week"
        Header set Cache-Control "public, max-age=604800"
    </FilesMatch>
    
    # Never cache service worker
    <FilesMatch "sw\.js$">
        ExpiresDefault "access plus 0 seconds"
        Header set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
        Header set Pragma "no-cache"
    </FilesMatch>
</IfModule>

# Prevent caching of manifest and other critical files
<FilesMatch "\.(manifest|json)$">
    Header set Cache-Control "no-cache, max-age=0"
</FilesMatch>
EOF

# Create nginx config
cat > dist/nginx-cache.conf << 'EOF'
# Nginx Cache Control for Blank Page Fix
# Add this to your nginx server block

# Never cache HTML files
location ~* \.html?$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
}

# Cache hashed assets for 1 year
location ~* \.(js|css|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Cache images for 1 week
location ~* \.(png|jpg|jpeg|gif|svg|ico|webp)$ {
    expires 1w;
    add_header Cache-Control "public, max-age=604800";
}

# Never cache service worker
location = /sw.js {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header Pragma "no-cache";
}

# Main app route
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
EOF

success "Cache control configurations created"

# Step 9: Create troubleshooting script
log "Step 9: Creating troubleshooting utilities..."
cat > dist/troubleshoot-blank-page.js << 'EOF'
// Blank Page Troubleshooting Utility
// Run this in browser console: copy and paste, then press Enter

(function() {
    console.log('🔧 PhimGG Blank Page Troubleshooter Started');
    
    const info = {
        url: location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        rootElement: document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML || 'EMPTY',
        errors: [],
        caches: []
    };
    
    // Check for common issues
    console.log('📊 Diagnostic Information:');
    console.log('- URL:', info.url);
    console.log('- Root Element:', info.rootElement ? 'Found' : 'Missing');
    console.log('- Root Content:', info.rootContent.length > 0 ? 'Has Content' : 'EMPTY (This is the problem!)');
    
    // Check caches
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            info.caches = cacheNames;
            console.log('- Caches Found:', cacheNames);
            
            // Show problematic caches
            const oldCaches = cacheNames.filter(name => 
                name.includes('v1') || name.includes('v2') || name.includes('phimgg')
            );
            
            if (oldCaches.length > 0) {
                console.warn('⚠️ Old/Problematic Caches Found:', oldCaches);
            }
        });
    }
    
    // Check for JavaScript errors
    const originalError = console.error;
    console.error = function(...args) {
        info.errors.push(args.join(' '));
        originalError.apply(console, args);
    };
    
    // Provide fix options
    console.log('\n🔧 Available Fixes:');
    console.log('1. clearAllCaches() - Clear all caches and reload');
    console.log('2. forceReload() - Hard reload with cache bypass');
    console.log('3. resetApp() - Complete app reset');
    console.log('4. enableDebugMode() - Enable detailed logging');
    
    // Fix functions
    window.clearAllCaches = async function() {
        console.log('🧹 Clearing all caches...');
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ All caches cleared');
            }
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('✅ Service workers unregistered');
            }
            
            location.reload();
        } catch (error) {
            console.error('Failed to clear caches:', error);
            location.reload();
        }
    };
    
    window.forceReload = function() {
        console.log('🔄 Force reloading...');
        location.reload(true);
    };
    
    window.resetApp = function() {
        console.log('🔄 Resetting app completely...');
        localStorage.clear();
        sessionStorage.clear();
        clearAllCaches();
    };
    
    window.enableDebugMode = function() {
        localStorage.setItem('filmflex-debug', 'true');
        console.log('🔧 Debug mode enabled - reload to see debug logs');
        location.reload();
    };
    
    // Auto-detect blank page and offer fix
    if (info.rootContent.length === 0 || info.rootContent.trim() === '') {
        console.error('🚨 BLANK PAGE DETECTED!');
        console.log('🔧 Recommended action: Run clearAllCaches()');
        
        // Show user-friendly message
        if (confirm('Blank page detected! Clear all caches and reload?')) {
            clearAllCaches();
        }
    }
    
    console.log('🔧 Troubleshooter loaded. Diagnostic info saved to window.troubleshootInfo');
    window.troubleshootInfo = info;
})();
EOF

success "Troubleshooting utility created"

# Step 10: Display deployment summary
echo ""
success "🎉 Blank Page Fix Deployment Complete!"
echo ""
log "📊 Deployment Summary:"
log "   • Build Time: $BUILD_TIME"
log "   • App Version: $APP_VERSION"
log "   • Service Worker cache updated"
log "   • HTML version tracking updated"
log "   • Assets built with proper hashing"
log "   • Cache control headers configured"
log "   • Troubleshooting utilities created"
echo ""
log "📝 Files Created:"
log "   • dist/deployment-info.json - Deployment metadata"
log "   • dist/public/.htaccess - Apache cache headers"
log "   • dist/nginx-cache.conf - Nginx cache config"
log "   • dist/troubleshoot-blank-page.js - Browser troubleshooting"
echo ""
log "🚀 Next Steps:"
log "   1. Deploy the dist/ folder to your production server"
log "   2. Restart your web server"
log "   3. Test the application"
log "   4. If blank page persists, users can run the troubleshooter"
echo ""
log "🔧 For Users Experiencing Issues:"
log "   • Open browser console (F12)"
log "   • Run: filmflexCache.clearAll()"
log "   • Or visit: /troubleshoot-blank-page.js and copy-paste the script"
echo ""
warning "Remember to update your web server configuration with the cache headers!"
success "Deployment script completed successfully! 🎬"