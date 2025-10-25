#!/bin/bash

# Container Structure Checker & Rebuild Script

echo "🔍 CONTAINER STRUCTURE CHECKER"
echo "=============================="

echo "1. 📦 Checking container structure..."
echo "Container working directory:"
docker exec filmflex-app pwd

echo -e "\nContainer /app contents:"
docker exec filmflex-app ls -la /app/

echo -e "\nLooking for client directory:"
docker exec filmflex-app find /app -name "client" -type d 2>/dev/null || echo "No client directory found"

echo -e "\nLooking for package.json files:"
docker exec filmflex-app find /app -name "package.json" 2>/dev/null

echo -e "\nLooking for dist directory:"
docker exec filmflex-app ls -la /app/dist/ 2>/dev/null || echo "No dist directory found"

echo -e "\n2. 🔄 Container rebuild approach..."
echo "Since container structure is different, rebuilding entire container..."

cd /root/Film_Flex_Release

echo "Stopping app container..."
docker compose -f docker-compose.server.yml stop app

echo "Building with no cache..."
docker compose -f docker-compose.server.yml build --no-cache app

echo "Starting app container..."
docker compose -f docker-compose.server.yml up -d app

echo "Waiting for container to start..."
sleep 10

echo "3. 🧪 Testing rebuilt container..."
if docker exec filmflex-app echo "Container is running" 2>/dev/null; then
    echo "✅ Container rebuilt successfully"
    
    # Test website response
    echo "Testing website response..."
    sleep 5
    FILMFLEX_COUNT=$(curl -s "https://phimgg.com?v=$(date +%s)" | grep -oi "filmflex" | wc -l)
    PHIMGG_COUNT=$(curl -s "https://phimgg.com?v=$(date +%s)" | grep -oi "phimgg" | wc -l)
    
    echo "📊 New results:"
    echo "FilmFlex references: $FILMFLEX_COUNT"
    echo "PhimGG references: $PHIMGG_COUNT"
    
    if [ "$FILMFLEX_COUNT" -lt 10 ]; then
        echo "✅ SUCCESS! Significant reduction in FilmFlex references"
    else
        echo "⚠️  Still need browser cache clearing"
    fi
else
    echo "❌ Container rebuild failed"
    exit 1
fi

echo -e "\n🎯 INSTRUCTIONS:"
echo "1. Hard refresh your browser (Ctrl+Shift+R)"
echo "2. Or try incognito/private browsing"
echo "3. Footer should now show PhimGG instead of FilmFlex"