#!/bin/bash

# Cloudflare Worker Secrets Management Script
# This script helps you securely upload OAuth secrets to Cloudflare

echo "🔐 Cloudflare Worker OAuth Secrets Setup"
echo "========================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please login to Cloudflare first:"
    wrangler login
fi

echo ""
echo "📝 You'll be prompted to enter your OAuth credentials securely."
echo "   These will be encrypted and stored in Cloudflare's secure storage."
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local description=$2
    
    echo "Setting $description..."
    if wrangler secret put $secret_name; then
        echo "✅ $description set successfully"
    else
        echo "❌ Failed to set $description"
        return 1
    fi
    echo ""
}

# Set all OAuth secrets
echo "🚀 Setting up OAuth secrets for your Worker..."
echo ""

# Google OAuth secrets
echo "📱 Google OAuth Configuration:"
set_secret "GOOGLE_CLIENT_ID" "Google Client ID"
set_secret "GOOGLE_CLIENT_SECRET" "Google Client Secret"

# Facebook OAuth secrets  
echo "📘 Facebook OAuth Configuration:"
set_secret "FACEBOOK_APP_ID" "Facebook App ID"
set_secret "FACEBOOK_APP_SECRET" "Facebook App Secret"

# Session secret
echo "🔐 Session Configuration:"
set_secret "SESSION_SECRET" "Session Secret (use a long random string)"

echo "🎉 All secrets have been configured successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Update your OAuth app redirect URIs to point to your Worker"
echo "   2. Deploy your Worker: wrangler deploy"
echo "   3. Test your OAuth flows"
echo ""
echo "🔍 To view configured secrets (names only): wrangler secret list"
echo "🗑️  To delete a secret: wrangler secret delete SECRET_NAME"