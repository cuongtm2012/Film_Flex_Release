#!/bin/bash

echo "🚀 FilmFlex Quick Deployment - Always Latest Main Branch"
echo "========================================================"
echo "📅 Date: $(date)"
echo "🌐 Target: phimgg.com Production"
echo ""

# Load common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/lib/common-functions.sh" ]; then
    source "$SCRIPT_DIR/lib/common-functions.sh"
else
    # Fallback functions
    print_status() { echo -e "\033[0;32m✅ $1\033[0m"; }
    print_warning() { echo -e "\033[1;33m⚠️  $1\033[0m"; }
    print_error() { echo -e "\033[0;31m❌ $1\033[0m"; }
    print_info() { echo -e "\033[0;34mℹ️  $1\033[0m"; }
    print_header() { echo -e "\033[0;35m🎯 $1\033[0m"; }
fi

# Ensure we're in the project root
cd "$(dirname "$0")/../.." || exit 1
print_info "Working directory: $(pwd)"

print_header "Step 1: Ensuring Latest Main Branch Code"
if git rev-parse --git-dir >/dev/null 2>&1; then
    # Stash any local changes
    git stash 2>/dev/null || true
    
    # Fetch all latest changes
    print_info "Fetching latest changes from origin..."
    git fetch origin --prune
    
    # Switch to main branch
    print_info "Switching to main branch..."
    git checkout main 2>/dev/null || git checkout -b main origin/main
    
    # Hard reset to latest main
    print_info "Updating to absolute latest main branch code..."
    git reset --hard origin/main
    
    # Clean everything
    git clean -fdx
    
    # Verify we have the latest
    current_commit=$(git rev-parse HEAD)
    remote_commit=$(git rev-parse origin/main)
    
    if [ "$current_commit" = "$remote_commit" ]; then
        print_status "✅ Source code is now at latest main branch"
        print_info "Latest commit: ${current_commit:0:8}"
        git log --oneline -1 2>/dev/null || true
    else
        print_error "❌ Failed to update to latest main branch"
        exit 1
    fi
else
    print_error "❌ Not a Git repository - cannot ensure latest code"
    exit 1
fi

print_header "Step 2: Running Production Deployment"
if [ -f "scripts/deployment/deploy-production.sh" ]; then
    # Use the new --app-only flag for faster deployment
    chmod +x scripts/deployment/deploy-production.sh
    ./scripts/deployment/deploy-production.sh --app-only
    deployment_exit_code=$?
else
    print_error "❌ Deployment script not found"
    exit 1
fi

print_header "Step 3: Verifying Deployment"
if [ $deployment_exit_code -eq 0 ]; then
    print_status "✅ Deployment completed successfully"
    
    # Quick verification
    sleep 10
    
    # Test local application
    if curl -s -f http://localhost:5000/api/health > /dev/null; then
        print_status "✅ Application is responding locally"
    else
        print_warning "⚠️  Application not responding locally yet"
    fi
    
    # Test domain if reachable
    if curl -s -f https://phimgg.com > /dev/null 2>&1; then
        print_status "✅ Domain https://phimgg.com is accessible"
    else
        print_info "ℹ️  Domain test skipped (may not be reachable from server)"
    fi
else
    print_error "❌ Deployment failed with exit code: $deployment_exit_code"
    exit $deployment_exit_code
fi

echo ""
print_status "🎉 Quick Deployment Complete!"
print_status "📱 Website: https://phimgg.com"
print_status "🔧 Direct: http://38.54.14.154:5000"
echo ""
print_info "What was deployed:"
current_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
print_info "• Latest main branch code: $(git log --oneline -1 2>/dev/null || echo "Commit ${current_commit:0:8}")"
print_info "• Updated application container with latest code"
print_info "• Enhanced CORS settings for all access methods"
echo ""
print_info "Quick commands for monitoring:"
print_info "• Check logs: docker compose -f docker-compose.server.yml logs -f"
print_info "• Check status: docker compose -f docker-compose.server.yml ps"
print_info "• Full health check: ./scripts/deployment/health-check.sh"
print_info "• Check domain: ./scripts/deployment/check-domain.sh"
echo ""
print_status "Your FilmFlex application is now running the latest code! 🎬"