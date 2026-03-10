#!/bin/bash

# Script kiểm tra CSP headers có chứa Google Ads domains không

echo "🔍 Kiểm tra Content Security Policy Headers..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL to test
URL="${1:-http://localhost:5000}"

echo "📡 Testing URL: $URL"
echo ""

# Get CSP header
CSP=$(curl -s -I "$URL" | grep -i "content-security-policy:" | cut -d' ' -f2-)

if [ -z "$CSP" ]; then
    echo -e "${RED}❌ Không tìm thấy CSP header!${NC}"
    exit 1
fi

echo "✅ CSP Header found!"
echo ""

# Check for Google Ads domains
echo "🔍 Checking Google Ads domains in frame-src..."
echo ""

DOMAINS=(
    "googleads.g.doubleclick.net"
    "tpc.googlesyndication.com"
    "www.google.com"
    "pagead2.googlesyndication.com"
)

ALL_PASSED=true

for domain in "${DOMAINS[@]}"; do
    if echo "$CSP" | grep -q "$domain"; then
        echo -e "  ${GREEN}✓${NC} $domain"
    else
        echo -e "  ${RED}✗${NC} $domain ${RED}(MISSING)${NC}"
        ALL_PASSED=false
    fi
done

echo ""

# Check frame-src specifically
if echo "$CSP" | grep -q "frame-src"; then
    echo -e "${GREEN}✅ frame-src directive exists${NC}"
    
    # Extract frame-src content
    FRAME_SRC=$(echo "$CSP" | grep -o "frame-src[^;]*")
    echo ""
    echo "📋 Full frame-src directive:"
    echo "$FRAME_SRC" | sed 's/frame-src/  /'
else
    echo -e "${RED}❌ frame-src directive NOT FOUND!${NC}"
    ALL_PASSED=false
fi

echo ""

# Check worker-src
if echo "$CSP" | grep -q "worker-src"; then
    echo -e "${GREEN}✅ worker-src directive exists${NC}"
else
    echo -e "${YELLOW}⚠️  worker-src directive missing (optional)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}✅ All Google Ads domains are allowed in CSP!${NC}"
    echo ""
    echo "✨ News page should now load Google Ads without CSP errors"
    exit 0
else
    echo -e "${RED}❌ Some Google Ads domains are missing from CSP${NC}"
    echo ""
    echo "⚠️  Please check server/middleware/security.ts"
    exit 1
fi
