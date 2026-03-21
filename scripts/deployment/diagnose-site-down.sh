#!/bin/bash
# Chẩn đoán khi https://phimgg.com không load sau deploy
# Chạy trên server: bash scripts/deployment/diagnose-site-down.sh

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  if [ "$1" = "ok" ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
    [ -n "$3" ] && echo "  → $3"
  fi
}

echo "=========================================="
echo "🔍 Chẩn đoán phimgg.com không load"
echo "=========================================="
echo ""

echo "1. DOCKER CONTAINERS"
echo "--------------------"
if docker ps --format '{{.Names}}' | grep -q filmflex-app; then
  check ok "filmflex-app đang chạy"
  docker ps --filter name=filmflex-app --format "   Status: {{.Status}}"
else
  check fail "filmflex-app KHÔNG chạy" "Chạy: docker compose -f docker-compose.production.yml up -d app"
fi

if docker ps --format '{{.Names}}' | grep -q filmflex-postgres; then
  check ok "filmflex-postgres đang chạy"
else
  check fail "filmflex-postgres KHÔNG chạy"
fi
echo ""

echo "2. APP PORT 5000"
echo "----------------"
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:5000/api/health 2>/dev/null | grep -q 200; then
  check ok "API localhost:5000 trả về 200"
else
  check fail "API localhost:5000 không phản hồi" "Xem log: docker logs filmflex-app --tail 50"
fi
echo ""

echo "3. FRONTEND STATIC (/var/www/filmflex)"
echo "--------------------------------------"
if [ -f /var/www/filmflex/dist/public/index.html ]; then
  check ok "index.html tồn tại"
  ls -la /var/www/filmflex/dist/public/ | head -5
else
  check fail "index.html KHÔNG tồn tại" "Deploy chưa sync dist. Chạy: cp -rf ~/Film_Flex_Release/dist /var/www/filmflex/"
fi
echo ""

echo "4. NGINX"
echo "--------"
if systemctl is-active --quiet nginx 2>/dev/null; then
  check ok "Nginx service đang chạy"
else
  check fail "Nginx KHÔNG chạy" "Chạy: sudo systemctl start nginx"
fi

if [ -f /etc/nginx/conf.d/default.conf ] || [ -f /etc/nginx/conf.d/00-limit_req_zones.conf ]; then
  check ok "Nginx config tồn tại"
else
  check fail "Nginx config có thể thiếu" "Copy nginx/default.conf và nginx/00-limit_req_zones.conf vào /etc/nginx/conf.d/"
fi

if sudo nginx -t 2>&1 | grep -q "successful"; then
  check ok "nginx -t pass"
else
  check fail "nginx -t FAIL" "Chạy: sudo nginx -t"
  sudo nginx -t 2>&1 || true
fi
echo ""

echo "5. SSL CERT"
echo "-----------"
if [ -f /etc/letsencrypt/live/phimgg.com/fullchain.pem ]; then
  check ok "SSL cert tồn tại"
else
  check fail "SSL cert thiếu" "Chạy: certbot --nginx -d phimgg.com -d www.phimgg.com"
fi
echo ""

echo "6. CURL TEST (từ server)"
echo "------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -k https://127.0.0.1/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  check ok "Nginx localhost trả HTTP $HTTP_CODE"
else
  check fail "Nginx localhost trả HTTP $HTTP_CODE"
fi
echo ""

echo "=========================================="
echo "📋 HÀNH ĐỘNG GỢI Ý"
echo "=========================================="
echo ""
echo "Nếu app container không chạy:"
echo "  cd ~/Film_Flex_Release"
echo "  docker compose -f docker-compose.production.yml up -d app"
echo ""
echo "Nếu thiếu frontend:"
echo "  cp -rf ~/Film_Flex_Release/dist /var/www/filmflex/"
echo ""
echo "Nếu nginx lỗi:"
echo "  sudo nginx -t"
echo "  sudo systemctl restart nginx"
echo ""
echo "Xem log app:"
echo "  docker logs filmflex-app --tail 100"
echo ""
echo "Xem log nginx:"
echo "  tail -50 /var/log/nginx/phimgg.com.error.log"
echo ""
