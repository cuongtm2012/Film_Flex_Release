# Tối ưu FilmFlex cho VPS 4GB RAM

Hướng dẫn chạy FilmFlex ổn định trên VPS 4GB RAM.

## Phân bổ RAM (tổng ~2.7GB)

| Service        | Giới hạn  | Ghi chú                    |
|----------------|-----------|----------------------------|
| PostgreSQL     | 768MB     | Đủ cho 20k+ movies         |
| Node.js app    | 512MB     | Heap 384MB via NODE_OPTIONS|
| Elasticsearch  | 640–768MB | Heap 384–512MB             |
| Nginx          | 64MB      | Nhẹ                        |
| Hệ thống + buffer | ~1GB  | Swap + burst               |

## Các thay đổi đã áp dụng

### 1. Docker Compose

Các file `docker-compose.prod.yml`, `docker-compose.server.yml`, `docker-compose.production.yml` đã có:

- **deploy.resources.limits.memory** – giới hạn RAM mỗi container
- **NODE_OPTIONS=--max-old-space-size=384** – giới hạn heap Node.js
- **ES_JAVA_OPTS=-Xms384m -Xmx384m** hoặc 512m – giảm heap Elasticsearch

### 2. Swap (bắt buộc)

Tạo swap 2GB để tránh OOM:

```bash
sudo bash scripts/maintenance/setup-swap.sh
free -h   # Kiểm tra swap
```

### 3. Memory guard (nên dùng)

Cron chạy mỗi 10 phút để tự restart Elasticsearch khi RAM còn ít:

```bash
sudo mkdir -p /var/log/filmflex
sudo tee /etc/cron.d/filmflex-memory-guard << 'EOF'
SHELL=/bin/bash
*/10 * * * * root /root/Film_Flex_Release/scripts/maintenance/memory-guard.sh --auto >> /var/log/filmflex/memory-guard.log 2>&1
EOF
```

## Chạy lại sau khi tối ưu

```bash
cd ~/Film_Flex_Release

# Nếu dùng docker-compose.prod.yml
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Nếu dùng docker-compose.server.yml
docker compose -f docker-compose.server.yml down
docker compose -f docker-compose.server.yml up -d

# Kiểm tra
docker stats --no-stream
bash scripts/maintenance/health-check.sh
```

## Tắt Elasticsearch (nếu cần)

Nếu vẫn thiếu RAM, có thể tắt Elasticsearch (app sẽ dùng PostgreSQL full-text search):

```bash
docker stop filmflex-elasticsearch
# Và set ELASTICSEARCH_ENABLED=false cho container app
```

Lúc đó còn ~2GB cho app + postgres + nginx.

## Kiểm tra

```bash
# RAM từng container
docker stats --no-stream

# Tổng RAM + swap
free -h

# Health check
bash scripts/maintenance/health-check.sh
```
