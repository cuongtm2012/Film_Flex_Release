# 🚀 PhimGG Environment Quick Reference

## Chuyển đổi môi trường nhanh

```bash
# Development
./scripts/deployment/switch-env.sh dev

# Production  
./scripts/deployment/switch-env.sh prod

# Xem môi trường hiện tại
./scripts/deployment/switch-env.sh show
```

## Production Environment Variables (Quan trọng!)

### 🔐 Security (BẮT BUỘC thay đổi!)
```env
SESSION_SECRET=<tạo-chuỗi-ngẫu-nhiên-32-ký-tự>
ENCRYPTION_KEY=<tạo-chuỗi-ngẫu-nhiên-32-ký-tự>
```

**Tạo secret:**
```bash
openssl rand -base64 32
```

### 🌐 Server & Domain
```env
NODE_ENV=production
PORT=5000
SERVER_IP=38.54.14.154
DOMAIN=phimgg.com
PUBLIC_URL=https://phimgg.com
```

### 💾 Database
```env
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex
```

### 🔍 Elasticsearch
```env
ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200
ELASTICSEARCH_ENABLED=true
```

### 🔑 OAuth & Firebase (Nên cấu hình qua Admin Panel)
Cấu hình trong **Admin Dashboard → Settings**. Credentials sẽ được mã hóa và lưu vào DB.

Yêu cầu duy nhất trong `.env`:
```env
ENCRYPTION_KEY=<chuỗi-ngẫu-nhiên-32-ký-tự>
```

### 📧 Email (Cần cấu hình)
```env
SENDGRID_API_KEY=<your-sendgrid-api-key>
FROM_EMAIL=noreply@phimgg.com
```

## Deploy workflow

```bash
# 1. Backup
./scripts/deployment/switch-env.sh backup

# 2. Switch to production
./scripts/deployment/switch-env.sh prod

# 3. Update secrets trong .env
nano .env

# 4. Deploy
./scripts/deployment/deploy-production.sh

# 5. Verify
./scripts/deployment/health-check.sh
```

## Files

- `.env` - Môi trường hiện tại (đang dùng)
- `.env.production` - Template production
- `.env.example` - Template development
- `.env.backup.*` - Backup files

## Xem chi tiết

📖 Đọc hướng dẫn đầy đủ: `docs/ENVIRONMENT_SETUP.md`
