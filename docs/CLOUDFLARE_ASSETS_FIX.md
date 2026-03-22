# Fix: CSS/JS trả MIME type text/html (Cloudflare + assets)

## Triệu chứng
- Trang trắng, console báo: "MIME type ('text/html') is not a supported stylesheet MIME type"
- File assets có trên server nhưng browser nhận index.html thay vì CSS/JS

## Nguyên nhân
1. **Cloudflare cache** – Cache response cũ (404/index.html) cho URL /assets/*
2. **Rocket Loader** – Có thể gây conflict với module scripts

## Cách xử lý

### 1. Cập nhật Nginx (thêm location /assets/)

Đã cập nhật `nginx/default.conf`. Trên server:

```bash
# Copy từ repo (sau khi git pull)
sudo cp ~/Film_Flex_Release/nginx/default.conf /etc/nginx/conf.d/default.conf
# Hoặc apply thủ công: thêm block location /assets/ trước location /
sudo nginx -t && sudo systemctl reload nginx
```

### 2. Purge Cloudflare cache (quan trọng)

1. Đăng nhập **Cloudflare Dashboard** → chọn domain **phimgg.com**
2. Vào **Caching** → **Configuration**
3. Bấm **Purge Everything** (hoặc Purge by URL nếu chỉ purge /assets/*)
4. Đợi vài phút rồi hard refresh trình duyệt (Ctrl+Shift+R)

### 3. (Tùy chọn) Tắt Rocket Loader

Nếu vẫn lỗi sau purge:
1. Cloudflare → **Speed** → **Optimization**
2. Tắt **Rocket Loader**

Rocket Loader có thể gây lỗi với ES modules và defer/async scripts.

### 4. Test trực tiếp qua IP (bypass Cloudflare)

```bash
# Thêm vào /etc/hosts để test: 38.54.14.154 phimgg-test.local
curl -sI https://phimgg.com/assets/index-BA2WcQBW.css -H "Host: phimgg.com" --resolve phimgg.com:443:38.54.14.154 | head -5
# Phải thấy: content-type: text/css
```

Nếu qua IP trả đúng content-type → vấn đề ở Cloudflare cache.
