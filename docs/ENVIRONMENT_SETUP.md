# PhimGG Environment Configuration Guide

## 📋 Tổng quan

Dự án PhimGG có 2 môi trường chính:
- **Development** - Môi trường phát triển (local)
- **Production** - Môi trường production (server 38.54.14.154 / phimgg.com)

## 📁 Các file môi trường

```
.env                    # File môi trường hiện tại (được sử dụng)
.env.example           # Template cho development
.env.production        # Template cho production
.env.backup.*          # Backup files (tự động tạo)
```

## 🔄 Chuyển đổi môi trường

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
# Chuyển sang Development
./scripts/deployment/switch-env.sh dev

# Chuyển sang Production
./scripts/deployment/switch-env.sh prod

# Xem môi trường hiện tại
./scripts/deployment/switch-env.sh show

# Backup file .env hiện tại
./scripts/deployment/switch-env.sh backup
```

### Cách 2: Thủ công

```bash
# Development
cp .env.example .env

# Production
cp .env.production .env
```

## ⚙️ Cấu hình Production

### 1. Database Configuration
```env
# Trong Docker container
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex

# Từ host machine (nếu cần)
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
```

### 2. Server & Domain
```env
NODE_ENV=production
PORT=5000
SERVER_IP=38.54.14.154
DOMAIN=phimgg.com
PUBLIC_URL=https://phimgg.com
CLIENT_URL=https://phimgg.com
```

### 3. CORS Configuration
```env
ALLOWED_ORIGINS=*
CORS_ORIGIN=*
CORS_CREDENTIALS=true
```

### 4. Security (QUAN TRỌNG!)
```env
# Thay đổi thành chuỗi ngẫu nhiên mạnh
SESSION_SECRET=your_strong_random_secret_here
ENCRYPTION_KEY=your_strong_encryption_key_here
```

**Tạo secret key mạnh:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. OAuth Configuration

**QUAN TRỌNG**: PhimGG lưu OAuth credentials trong **DATABASE**, không phải trong file `.env`!

#### Cách hoạt động:
1. OAuth credentials được lưu trong bảng `system_settings` của database
2. Credentials nhạy cảm (secrets) được **mã hóa** bằng `ENCRYPTION_KEY`
3. Khi khởi động, ứng dụng tự động load và decrypt credentials từ database
4. **Bạn KHÔNG cần** set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc. trong `.env`

#### Cấu hình OAuth:

**Bước 1: Set ENCRYPTION_KEY trong `.env`**
```env
# QUAN TRỌNG: Key này dùng để mã hóa/giải mã credentials trong DB
ENCRYPTION_KEY=your_strong_encryption_key_here
```

**Tạo ENCRYPTION_KEY mạnh:**
```bash
# Tạo 32-byte hex key
openssl rand -hex 32

# Hoặc base64
openssl rand -base64 32
```

**Bước 2: Cấu hình OAuth qua Admin Panel**

Sau khi deploy, truy cập Admin Panel để cấu hình OAuth:

1. **Google OAuth:**
   - Truy cập: https://console.cloud.google.com/
   - Tạo OAuth 2.0 Client ID
   - Thêm Authorized redirect URIs:
     - `https://phimgg.com/api/auth/google/callback`
     - `http://38.54.14.154:5000/api/auth/google/callback`
   - Copy Client ID và Client Secret
   - Vào Admin Panel → Settings → OAuth
   - Nhập Google Client ID và Client Secret
   - Enable Google OAuth

2. **Facebook OAuth:**
   - Truy cập: https://developers.facebook.com/
   - Tạo Facebook App
   - Thêm Valid OAuth Redirect URIs:
     - `https://phimgg.com/api/auth/facebook/callback`
     - `http://38.54.14.154:5000/api/auth/facebook/callback`
   - Copy App ID và App Secret
   - Vào Admin Panel → Settings → OAuth
   - Nhập Facebook App ID và App Secret
   - Enable Facebook OAuth

**Bước 3: Verify**
```bash
# Kiểm tra logs khi khởi động
docker logs filmflex-app | grep OAuth

# Bạn sẽ thấy:
# ✅ Google OAuth enabled - credentials loaded from database
# ✅ Facebook OAuth enabled - credentials loaded from database
```

#### Fallback to Environment Variables

Nếu không tìm thấy credentials trong database, hệ thống sẽ fallback sang environment variables:
```env
# Chỉ dùng nếu KHÔNG lưu trong database
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

### 6. Email Service

**Tương tự OAuth**, Email API keys cũng có thể lưu trong database!

#### Option 1: Lưu trong Database (Khuyến nghị cho Production)
```bash
# 1. Set ENCRYPTION_KEY trong .env (để mã hóa API key)
ENCRYPTION_KEY=your_strong_key

# 2. Cấu hình qua Admin Panel
# - Vào Admin Panel → Settings → API Keys
# - Nhập Resend API Key hoặc SendGrid API Key
# - API key sẽ được mã hóa và lưu trong database
```

#### Option 2: Set trong Environment (Development/Testing)
```env
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@phimgg.com
FROM_NAME=PhimGG
```

#### Option 3: SMTP (Alternative)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 7. Firebase Push Notifications

Cũng giống như OAuth và Email, Firebase credentials có thể được lưu trong database.

#### Cấu hình qua Admin Panel (Khuyến nghị)
1. Truy cập: **Admin Dashboard → Settings → Analytics & API Keys**
2. Nhập các thông tin từ file JSON service account của Firebase:
   - **Project ID**
   - **Client Email**
   - **Private Key** (bao gồm cả BEGIN/END PRIVATE KEY)
3. Bật **Enable Push Notifications**

#### Cấu hình qua Environment (Fallback)
Nếu bạn muốn cấu hình cứng trong `.env`:
```env
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 8. Elasticsearch
```env
# Trong Docker network
ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_AUTO_SYNC=true

# Từ host machine (nếu cần)
# ELASTICSEARCH_NODE=http://localhost:9200
```

## 🚀 Deployment Workflow

### Development → Production

1. **Backup môi trường hiện tại**
```bash
./scripts/deployment/switch-env.sh backup
```

2. **Chuyển sang production**
```bash
./scripts/deployment/switch-env.sh prod
```

3. **Cập nhật secrets và credentials**
```bash
nano .env
# Cập nhật:
# - SESSION_SECRET
# - ENCRYPTION_KEY
# - GOOGLE_CLIENT_ID/SECRET
# - FACEBOOK_APP_ID/SECRET
# - SENDGRID_API_KEY
```

4. **Deploy lên server**
```bash
# Build và deploy
./scripts/deployment/deploy-production.sh

# Hoặc quick deploy
./scripts/deployment/quick-deploy.sh
```

5. **Verify deployment**
```bash
# Check health
./scripts/deployment/health-check.sh

# Check logs
docker compose -f docker-compose.server.yml logs -f app
```

## 🔍 Kiểm tra cấu hình

### Xem môi trường hiện tại
```bash
./scripts/deployment/switch-env.sh show
```

### Kiểm tra trong container
```bash
# SSH vào server
ssh root@38.54.14.154

# Kiểm tra environment variables
docker exec filmflex-app env | grep NODE_ENV
docker exec filmflex-app env | grep DATABASE_URL
docker exec filmflex-app env | grep PUBLIC_URL
```

### Test kết nối
```bash
# Test database
docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"

# Test application
curl http://localhost:5000/api/health

# Test từ bên ngoài
curl http://38.54.14.154:5000/api/health
curl https://phimgg.com/api/health
```

## 📝 Checklist trước khi deploy Production

- [ ] Đã backup file `.env` hiện tại
- [ ] Đã cập nhật `SESSION_SECRET` với giá trị mạnh
- [ ] Đã cập nhật `ENCRYPTION_KEY` với giá trị mạnh
- [ ] Đã cấu hình Google OAuth credentials
- [ ] Đã cấu hình Facebook OAuth credentials
- [ ] Đã cấu hình Email service (SendGrid hoặc SMTP)
- [ ] Đã kiểm tra `DATABASE_URL` đúng
- [ ] Đã kiểm tra `PUBLIC_URL` và `DOMAIN`
- [ ] Đã test CORS settings
- [ ] Đã kiểm tra Elasticsearch configuration
- [ ] Đã test kết nối database
- [ ] Đã test application health endpoint

## 🔒 Security Best Practices

1. **Không commit file `.env` vào Git**
   - File `.env` đã được thêm vào `.gitignore`
   - Chỉ commit `.env.example` và `.env.production` (không có secrets)

2. **Sử dụng secrets mạnh**
   - SESSION_SECRET: ít nhất 32 ký tự ngẫu nhiên
   - ENCRYPTION_KEY: ít nhất 32 ký tự ngẫu nhiên

3. **Bảo vệ OAuth credentials**
   - Không share credentials
   - Rotate credentials định kỳ
   - Giới hạn redirect URIs

4. **Backup định kỳ**
   - Backup `.env` trước mỗi lần deploy
   - Lưu trữ backup an toàn

## 🆘 Troubleshooting

### Lỗi: Cannot connect to database
```bash
# Kiểm tra container đang chạy
docker ps | grep postgres

# Kiểm tra DATABASE_URL
grep DATABASE_URL .env

# Test kết nối
docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT 1;"
```

### Lỗi: OAuth không hoạt động
```bash
# Kiểm tra credentials
grep -E "(GOOGLE|FACEBOOK)" .env

# Kiểm tra redirect URIs trong console
# Google: https://console.cloud.google.com/
# Facebook: https://developers.facebook.com/
```

### Lỗi: CORS issues
```bash
# Kiểm tra CORS settings
grep -E "CORS|ALLOWED_ORIGINS" .env

# Nếu cần, set ALLOWED_ORIGINS=*
```

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker compose logs -f app`
2. Chạy health check: `./scripts/deployment/health-check.sh`
3. Xem environment: `./scripts/deployment/switch-env.sh show`

---

**Last Updated**: 2026-01-23  
**Version**: 1.0  
**Maintainer**: PhimGG Team
