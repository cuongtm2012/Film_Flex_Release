# Xử lý RAM sắp đầy trên Production

## 0. Có scripts trên server và chạy

Scripts nằm trong repo. Sau khi deploy bằng **GitHub Actions** hoặc `git pull` trên server, thư mục `scripts/maintenance/` đã có sẵn.

**Trên server** (SSH vào rồi `cd` vào thư mục repo, ví dụ `/root/Film_Flex_Release`):

**1. Tạo swap (chạy một lần):**

```bash
sudo bash scripts/maintenance/setup-swap.sh
free -h   # kiểm tra đã có swap
```

**2. Kiểm tra RAM (chạy thử):**

```bash
bash scripts/maintenance/memory-guard.sh
```

**3. (Tùy chọn) Bật cron tự động kiểm tra RAM mỗi 10 phút:**

```bash
sudo mkdir -p /var/log/filmflex
sudo tee /etc/cron.d/filmflex-memory-guard << 'EOF'
SHELL=/bin/bash
*/10 * * * * root /root/Film_Flex_Release/scripts/maintenance/memory-guard.sh --auto >> /var/log/filmflex/memory-guard.log 2>&1
EOF
```

**4. Health-check tổng thể (tùy chọn):**

```bash
bash scripts/maintenance/health-check.sh --full
# hoặc nhanh: --critical
```

---

## 1. Xử lý ngay (khi available < 100MB)

Chạy **trên production server** (SSH vào rồi chạy lần lượt).

### Bước 1: Thêm Swap 2GB (quan trọng nhất)

```bash
# Trên server (root)
cd /root/Film_Flex_Release   # hoặc đường dẫn chứa repo
sudo bash scripts/maintenance/setup-swap.sh
```

Hoặc thủ công:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Bước 2: Xem process/container nào tốn RAM

```bash
docker stats --no-stream
```

Thường **Elasticsearch** hoặc **filmflex-app** ăn nhiều nhất.

### Bước 3: Giảm tải tạm (restart container tốn RAM)

Ưu tiên restart Elasticsearch (không ảnh hưởng DB, app vẫn chạy):

```bash
docker restart filmflex-elasticsearch
```

Sau vài phút kiểm tra lại: `free -h` và `curl -s http://localhost:5000/api/health`.

### Bước 4: (Tùy chọn) Giới hạn heap Elasticsearch

Nếu dùng `docker-compose` có Elasticsearch, chỉnh env:

```yaml
environment:
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
```

Rồi `docker compose up -d` lại. Trên server đang chạy image riêng thì cần chỉnh khi build/deploy.

---

## 2. Tự động tránh lặp lại (plan)

### 2.1. Script memory-guard (kiểm tra + hành động)

- **Script:** `scripts/maintenance/memory-guard.sh`
- **Chế độ chỉ kiểm tra:** `./memory-guard.sh` → ghi log, không restart.
- **Chế độ tự động:** `./memory-guard.sh --auto` → khi available < 80MB sẽ restart container (mặc định: `filmflex-elasticsearch`).
- **Một lần thêm swap nếu chưa có:** `./memory-guard.sh --setup-swap`

### 2.2. Cron chạy định kỳ

Chạy mỗi **10 phút**, có auto-action khi critical:

```bash
sudo tee /etc/cron.d/filmflex-memory-guard << 'EOF'
SHELL=/bin/bash
*/10 * * * * root /root/Film_Flex_Release/scripts/maintenance/memory-guard.sh --auto >> /var/log/filmflex/memory-guard.log 2>&1
EOF
```

Đảm bảo thư mục log tồn tại:

```bash
sudo mkdir -p /var/log/filmflex
```

### 2.3. Health-check có cảnh báo RAM

Script `scripts/maintenance/health-check.sh` đã có kiểm tra memory usage %. Nên chạy health-check định kỳ (vd: mỗi 4h) để thấy cảnh báo sớm:

```bash
# Đã có sẵn trong cron (nếu đã setup)
0 */4 * * * root /root/Film_Flex_Release/scripts/maintenance/health-check.sh --critical
```

### 2.4. Giới hạn RAM container (Docker)

Trong `docker-compose` có thể thêm để không cho một service chiếm hết RAM:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 768M
  elasticsearch:
    environment:
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    deploy:
      resources:
        limits:
          memory: 1g
```

Áp dụng khi dùng compose đó để deploy.

---

## 3. Tóm tắt nhanh

| Việc | Lệnh / File |
|------|-------------|
| Thêm swap 2GB ngay | `sudo bash scripts/maintenance/setup-swap.sh` |
| Kiểm tra RAM + log | `scripts/maintenance/memory-guard.sh` |
| Tự động xử lý khi critical | `memory-guard.sh --auto` + cron mỗi 10 phút |
| Xem process tốn RAM | `docker stats --no-stream` |
| Restart ES để giảm tải | `docker restart filmflex-elasticsearch` |

Sau khi thêm swap và (nếu cần) restart ES, chạy lại `free -h` và health check để xác nhận server ổn định.
