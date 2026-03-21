#!/bin/bash
# Sửa lỗi: limit_req_zone không được phép trong server block
# Chạy trên server với root: sudo bash scripts/deployment/fix-nginx-limit-req.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔧 Fix Nginx limit_req_zone config..."
echo ""

# 1. Đảm bảo 00-limit_req_zones.conf tồn tại (chứa định nghĩa zone trong http context)
if [ -f "$REPO_ROOT/nginx/00-limit_req_zones.conf" ]; then
  cp "$REPO_ROOT/nginx/00-limit_req_zones.conf" /etc/nginx/conf.d/00-limit_req_zones.conf
  echo "✓ Đã copy 00-limit_req_zones.conf"
else
  echo "Tạo 00-limit_req_zones.conf..."
  cat > /etc/nginx/conf.d/00-limit_req_zones.conf << 'EOF'
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/s;
EOF
  echo "✓ Đã tạo 00-limit_req_zones.conf"
fi

# 2. Copy default.conf từ repo (không chứa limit_req_zone, chỉ dùng limit_req)
if [ -f "$REPO_ROOT/nginx/default.conf" ]; then
  cp "$REPO_ROOT/nginx/default.conf" /etc/nginx/conf.d/default.conf
  echo "✓ Đã copy default.conf"
fi

# 3. Test và reload
echo ""
echo "Chạy nginx -t..."
if nginx -t 2>&1; then
  echo ""
  echo "✓ Config OK. Reload nginx..."
  systemctl reload nginx
  echo "✓ Done! https://phimgg.com sẽ hoạt động."
else
  echo ""
  echo "✗ nginx -t vẫn lỗi. Kiểm tra file config."
  exit 1
fi
