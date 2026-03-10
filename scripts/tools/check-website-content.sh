#!/bin/bash

# Website Content Checker Script
# This script checks website content to verify branding changes

echo "🔍 PHIMGG WEBSITE CONTENT CHECKER"
echo "================================="

# Test 1: Basic content check
echo "1. Testing basic page content..."
CONTENT=$(curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" https://phimgg.com)

echo "📋 Page Title:"
echo "$CONTENT" | grep -o '<title>.*</title>'

echo -e "\n🏷️  Meta Description:"
echo "$CONTENT" | grep -o 'name="description" content="[^"]*"'

echo -e "\n📊 Brand References:"
echo "PhimGG count: $(echo "$CONTENT" | grep -oi "phimgg" | wc -l)"
echo "FilmFlex count: $(echo "$CONTENT" | grep -oi "filmflex" | wc -l)"

echo -e "\n🦶 Footer Content Check:"
echo "$CONTENT" | grep -A10 -B5 "© 2025\|copyright\|All rights reserved" | head -20

echo -e "\n📱 JavaScript Variables:"
echo "$CONTENT" | grep -o "filmflex\|PhimGG" | sort | uniq -c

echo -e "\n🔧 Cache Headers Check:"
curl -I https://phimgg.com 2>/dev/null | grep -i "cache\|etag\|expires"

echo -e "\n🌐 Testing Different Endpoints:"
for endpoint in "/" "/movies" "/api/health"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://phimgg.com$endpoint")
    echo "https://phimgg.com$endpoint - HTTP $STATUS"
done

echo -e "\n📦 Service Worker Check:"
SW_CONTENT=$(curl -s https://phimgg.com/sw.js 2>/dev/null)
if [ ! -z "$SW_CONTENT" ]; then
    echo "Service Worker exists"
    echo "FilmFlex references in SW: $(echo "$SW_CONTENT" | grep -oi "filmflex" | wc -l)"
else
    echo "No Service Worker found"
fi

echo -e "\n🎯 Recommendation:"
FILMFLEX_COUNT=$(echo "$CONTENT" | grep -oi "filmflex" | wc -l)
PHIMGG_COUNT=$(echo "$CONTENT" | grep -oi "phimgg" | wc -l)

if [ "$FILMFLEX_COUNT" -gt 0 ]; then
    echo "❌ Still found $FILMFLEX_COUNT FilmFlex references"
    echo "🔧 Try: Clear browser cache, hard refresh, or check JavaScript console"
    echo "💡 The issue is likely browser-side caching of JavaScript/CSS files"
else
    echo "✅ No FilmFlex references found - website is properly updated!"
fi

if [ "$PHIMGG_COUNT" -gt 10 ]; then
    echo "✅ Found $PHIMGG_COUNT PhimGG references - branding looks good!"
fi