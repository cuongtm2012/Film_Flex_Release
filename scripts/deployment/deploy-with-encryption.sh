#!/bin/bash

# Helper script to deploy with ENCRYPTION_KEY
# This ensures OAuth credentials can be decrypted from database

set -e

# Check if ENCRYPTION_KEY is set
if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ ERROR: ENCRYPTION_KEY environment variable is not set"
    echo "Please set it before running deployment:"
    echo "  export ENCRYPTION_KEY=your_encryption_key_here"
    exit 1
fi

echo "✅ ENCRYPTION_KEY is set"
echo "🚀 Deploying with OAuth support..."

# Navigate to project root
cd "$(dirname "$0")/../.."

# Deploy using docker-compose
docker-compose down
docker-compose up -d --build

echo "✅ Deployment complete!"
echo "Checking OAuth initialization..."

# Wait for app to start
sleep 10

# Check logs for OAuth initialization
docker logs filmflex-app --tail 20 | grep -E "(OAuth|ENCRYPTION)" || echo "No OAuth logs yet"

echo ""
echo "📋 Verify OAuth is working:"
echo "  docker logs filmflex-app | grep OAuth"
echo ""
echo "Expected output:"
echo "  ✅ Google OAuth enabled - credentials loaded from database"
echo "  ✅ Facebook OAuth enabled - credentials loaded from database"
