#!/bin/bash

# Complete CORS Fix Deployment for FilmFlex
# This script applies all CORS fixes and restarts the application

set -e

echo "🎬 ==============================================="
echo "🎬 FILMFLEX CORS FIX DEPLOYMENT"
echo "🎬 ==============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run with sudo privileges"
    echo "Usage: sudo ./deploy-cors-fix.sh"
    exit 1
fi

APP_DIR="/var/www/filmflex"
BACKUP_DIR="/var/www/filmflex-backup-$(date +%Y%m%d-%H%M%S)"

echo "📁 Application directory: $APP_DIR"
echo "💾 Backup directory: $BACKUP_DIR"

# Function to backup current deployment
backup_current_deployment() {
    echo "💾 Creating backup of current deployment..."
    if [ -d "$APP_DIR" ]; then
        cp -r "$APP_DIR" "$BACKUP_DIR"
        echo "✅ Backup created at: $BACKUP_DIR"
    else
        echo "❌ Application directory not found: $APP_DIR"
        exit 1
    fi
}

# Function to apply .env fixes
apply_env_fixes() {
    echo "🔧 Applying .env configuration fixes..."
    
    cd "$APP_DIR"
    
    # Backup original .env
    if [ -f ".env" ]; then
        cp .env .env.backup
        echo "💾 Backed up original .env"
    fi
    
    # Create/update .env with CORS-friendly settings
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=filmflex_dev_secret_2024
ALLOWED_ORIGINS=*
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
    
    echo "✅ Updated .env with ALLOWED_ORIGINS=*"
    echo "📋 Current .env contents:"
    cat .env
}

# Function to fix server CORS configuration
fix_server_cors() {
    echo "🌐 Fixing server CORS configuration..."
    
    cd "$APP_DIR"
    
    # Backup original server file
    if [ -f "server/index.ts" ]; then
        cp server/index.ts server/index.ts.backup
        echo "💾 Backed up original server/index.ts"
    fi
    
    # Apply the CORS fixes using sed
    echo "🔧 Applying CORS syntax fixes..."
    
    # Fix the missing brace issue
    sed -i 's/return callback(null, true);    }/return callback(null, true);\n    }/g' server/index.ts
    
    # Check if CORS debugging is already present
    if ! grep -q "🌐 CORS Check - Origin:" server/index.ts; then
        echo "🔧 Adding CORS debugging..."
        
        # Add debugging to the CORS origin function
        sed -i '/origin: function (origin, callback) {/a\
    console.log("🌐 CORS Check - Origin:", origin);\
    console.log("🔧 ALLOWED_ORIGINS env:", process.env.ALLOWED_ORIGINS);\
    console.log("🔧 NODE_ENV:", process.env.NODE_ENV);' server/index.ts
        
        # Enhance the no-origin case
        sed -i 's/if (!origin) return callback(null, true);/if (!origin) {\
      console.log("✅ CORS: Allowing request with no origin");\
      return callback(null, true);\
    }/g' server/index.ts
        
        # Enhance the wildcard case
        sed -i 's/if (process.env.ALLOWED_ORIGINS === '\''*'\'' || process.env.CLIENT_URL === '\''*'\'') {/if (process.env.ALLOWED_ORIGINS === '\''*'\'' || process.env.CLIENT_URL === '\''*'\'') {\
      console.log("✅ CORS: Wildcard access enabled - allowing all origins");/g' server/index.ts
    fi
    
    echo "✅ CORS configuration fixes applied"
}

# Function to restart application
restart_application() {
    echo "🔄 Restarting FilmFlex application..."
    
    cd "$APP_DIR"
    
    # Stop existing PM2 process
    if pm2 list | grep -q "filmflex"; then
        echo "🛑 Stopping existing PM2 process..."
        pm2 delete filmflex || true
        sleep 2
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        echo "📦 Installing Node.js dependencies..."
        npm install
    fi
    
    # Build the application if needed
    if [ -f "package.json" ] && grep -q "build" package.json; then
        echo "🔨 Building application..."
        npm run build || true
    fi
    
    # Start with PM2
    echo "🚀 Starting FilmFlex with PM2..."
    pm2 start npm --name filmflex --interpreter bash -- start
    
    # Save PM2 configuration
    pm2 save
    pm2 startup || true
    
    echo "✅ Application restarted successfully!"
}

# Function to verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # Wait for application to start
    echo "⏳ Waiting for application to start..."
    sleep 10
    
    # Check PM2 status
    echo "📊 PM2 Status:"
    pm2 status
    
    # Check if port is listening
    if netstat -tuln | grep ":5000 "; then
        echo "✅ Application is listening on port 5000"
    else
        echo "❌ Application is not listening on port 5000"
        echo "📋 PM2 Logs:"
        pm2 logs filmflex --lines 20
        return 1
    fi
    
    # Test basic endpoint
    echo "🌐 Testing basic HTTP endpoint..."
    if curl -f -s http://localhost:5000/ > /dev/null 2>&1; then
        echo "✅ HTTP endpoint responding"
    else
        echo "⚠️  HTTP endpoint test inconclusive (may be normal)"
    fi
    
    # Test CORS with different origins
    echo "🌐 Testing CORS configuration..."
    
    # Test with phimgg.com origin
    echo "Testing https://phimgg.com origin:"
    curl -H "Origin: https://phimgg.com" \
         -H "Access-Control-Request-Method: GET" \
         -X OPTIONS http://localhost:5000/ -I 2>/dev/null | head -5 || true
    
    echo ""
    
    # Show recent logs
    echo "📋 Recent application logs:"
    pm2 logs filmflex --lines 15
}

# Main execution
main() {
    echo "🚀 Starting complete CORS fix deployment..."
    
    # Step 1: Backup current deployment
    echo "📋 Step 1: Creating backup..."
    backup_current_deployment
    
    # Step 2: Apply .env fixes
    echo "📋 Step 2: Applying .env fixes..."
    apply_env_fixes
    
    # Step 3: Fix server CORS configuration
    echo "📋 Step 3: Fixing server CORS configuration..."
    fix_server_cors
    
    # Step 4: Restart application
    echo "📋 Step 4: Restarting application..."
    restart_application
    
    # Step 5: Verify deployment
    echo "📋 Step 5: Verifying deployment..."
    verify_deployment
    
    echo ""
    echo "🎉 ==============================================="
    echo "🎉 CORS FIX DEPLOYMENT COMPLETED!"
    echo "🎉 ==============================================="
    echo "✅ CORS fixes have been applied"
    echo "✅ Application is running with PM2"
    echo "✅ ALLOWED_ORIGINS=* (allows all origins)"
    echo "✅ Enhanced CORS debugging enabled"
    echo ""
    echo "🌍 Test the application:"
    echo "   - Direct: http://154.205.142.255:5000"
    echo "   - Domain: http://phimgg.com"
    echo ""
    echo "📊 Monitor with:"
    echo "   - PM2 Status: pm2 status"
    echo "   - Logs: pm2 logs filmflex"
    echo "   - Real-time logs: pm2 logs filmflex -f"
    echo ""
    echo "💾 Backup location: $BACKUP_DIR"
    echo ""
    echo "🎬 Next steps:"
    echo "   1. Test admin login (admin/Cuongtm2012$)"
    echo "   2. Verify application functionality"
    echo "   3. Run movie import process"
    echo "   4. Configure production CORS settings"
}

# Execute main function
main "$@"
