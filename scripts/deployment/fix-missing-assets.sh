#!/bin/bash
# Sửa lỗi: CSS/JS trả MIME text/html - assets không tồn tại
# Chạy trên server

set -e
REPO="${1:-$HOME/Film_Flex_Release}"
TARGET="/var/www/filmflex"

echo "🔍 Kiểm tra assets..."
echo ""

# 1. Kiểm tra thư mục hiện tại
echo "1. Nội dung /var/www/filmflex/dist/public/:"
ls -la "$TARGET/dist/public/" 2>/dev/null || echo "  Không tồn tại!"
echo ""

echo "2. Thư mục assets:"
ls "$TARGET/dist/public/assets/" 2>/dev/null | head -10 || echo "  ❌ assets/ KHÔNG tồn tại - đây là nguyên nhân!"
echo ""

# 2. File index.html reference gì?
echo "3. Assets được reference trong index.html:"
grep -oE 'src="[^"]*"|href="[^"]*"' "$TARGET/dist/public/index.html" 2>/dev/null | head -5 || echo "  Không đọc được"
echo ""

# 3. Nếu có repo với dist mới
if [ -d "$REPO/dist/public/assets" ]; then
  echo "4. Tìm thấy dist trong repo. Sync..."
  mkdir -p "$TARGET"
  cp -rf "$REPO/dist" "$TARGET/"
  echo "  ✓ Đã copy dist từ $REPO"
else
  echo "4. ❌ Repo không có dist/public/assets"
  echo "   Cần build lại và deploy:"
  echo "   - Push code lên GitHub để trigger deploy"
  echo "   - Hoặc build local: npm run build && scp -r dist user@server:/tmp/"
  echo "   - Trên server: cp -rf /tmp/dist /var/www/filmflex/"
fi
echo ""
echo "Chạy lại: ls $TARGET/dist/public/assets/"
ls -la "$TARGET/dist/public/assets/" 2>/dev/null || true
