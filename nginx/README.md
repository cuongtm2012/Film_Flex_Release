# Nginx config cho Production (phimgg.com)

## Trên server (chỉ dùng khi dùng `conf.d`)

- **`00-limit_req_zones.conf`** – Chỉ chứa `limit_req_zone` (phải nằm trong context `http`, không được nằm trong `server`). Copy vào `/etc/nginx/conf.d/00-limit_req_zones.conf`.
- **`default.conf`** – Cấu hình site (HTTP/HTTPS, root static, proxy API). Copy vào `/etc/nginx/conf.d/default.conf`.

Sau khi copy cả hai:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Nếu server dùng `sites-available` / `sites-enabled` thì dùng `phimgg.com.conf` (zones đã khai báo trong `nginx.conf` của repo).
