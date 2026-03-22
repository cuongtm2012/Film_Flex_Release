# GitHub Actions Auto-Deployment Guide

## 📋 Tổng Quan

Hướng dẫn setup và sử dụng GitHub Actions để tự động deploy PhimGG lên production server (38.54.14.154) khi code được merge vào `main` branch.

**Luồng deploy:** Docker image được **build trên GitHub Actions** và push lên Docker Hub. Trên server chỉ chạy `docker pull` + `docker-compose up -d app` (không build, không cần kết nối npm registry trên server).

## 🔧 Setup Instructions

### Bước 1: Cấu Hình GitHub Secrets

Vào **Repository Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Required Secrets

| Secret Name | Value | Mô Tả |
|------------|-------|-------|
| `DOCKERHUB_USERNAME` | e.g. `cuongtm2012` | Docker Hub username (để push image) |
| `DOCKERHUB_TOKEN` | Access Token từ Docker Hub | Docker Hub PAT (Settings → Security → New Access Token), quyền Read/Write |
| `SERVER_HOST` | `38.54.14.154` | IP address của production server |
| `SERVER_USER` | `root` | SSH username |
| `ENCRYPTION_KEY` | (giá trị bí mật) | Dùng cho app runtime |
| `SESSION_SECRET` | (giá trị bí mật) | Dùng cho app runtime |

#### Authentication Secrets (Chọn 1 trong 2)

**Option A: SSH Password** (Đơn giản, ít bảo mật hơn)
```
SSH_PASSWORD = Cuongtm2012$
```

**Option B: SSH Key** (Recommended, bảo mật hơn)
```
SSH_PRIVATE_KEY = <nội dung private key>
SSH_KNOWN_HOSTS = <server fingerprint>
```

### Bước 2: Tạo SSH Key (Nếu chọn Option B)

#### 2.1. Tạo SSH Key Pair trên máy local

```bash
# Tạo ED25519 key (recommended)
ssh-keygen -t ed25519 -C "github-actions-phimgg" -f ~/.ssh/github_actions_phimgg

# Hoặc RSA key (nếu server không hỗ trợ ED25519)
ssh-keygen -t rsa -b 4096 -C "github-actions-phimgg" -f ~/.ssh/github_actions_phimgg
```

Khi được hỏi passphrase, **để trống** (nhấn Enter) để GitHub Actions có thể sử dụng tự động.

#### 2.2. Copy Public Key lên Server

```bash
# Copy public key lên server
ssh-copy-id -i ~/.ssh/github_actions_phimgg.pub root@38.54.14.154

# Hoặc copy thủ công
cat ~/.ssh/github_actions_phimgg.pub
# Copy output và paste vào server:/root/.ssh/authorized_keys
```

#### 2.3. Test SSH Connection

```bash
# Test connection với key
ssh -i ~/.ssh/github_actions_phimgg root@38.54.14.154 'echo "SSH connection successful"'
```

#### 2.4. Lấy Private Key và Known Hosts

```bash
# Lấy private key (copy toàn bộ output)
cat ~/.ssh/github_actions_phimgg

# Lấy server fingerprint
ssh-keyscan -H 38.54.14.154
```

#### 2.5. Thêm vào GitHub Secrets

- **SSH_PRIVATE_KEY**: Copy toàn bộ nội dung private key (bao gồm `-----BEGIN ... KEY-----` và `-----END ... KEY-----`)
- **SSH_KNOWN_HOSTS**: Copy output của `ssh-keyscan`

### Bước 3: Verify Workflow File

Kiểm tra workflow file đã được tạo:

```bash
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release
cat .github/workflows/auto-deploy-production.yml
```

### Bước 4: Commit và Push Workflow

```bash
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release

# Add workflow file
git add .github/workflows/auto-deploy-production.yml

# Commit
git commit -m "feat: add GitHub Actions auto-deployment workflow"

# Push to main (hoặc push to feature branch trước)
git push origin main
```

## 🚀 Sử Dụng

### Auto Deployment (Tự Động)

Workflow sẽ **tự động chạy** khi:
- Code được push/merge vào `main` branch
- Không phải là thay đổi trong `.md`, `.gitignore`, `docs/`, hoặc `.github/workflows/`

**Quy trình:**
1. Developer merge PR vào `main`
2. GitHub Actions tự động trigger workflow
3. Build application
4. Deploy lên production server
5. Run health checks
6. Thông báo kết quả

### Manual Deployment (Thủ Công)

Để chạy deployment thủ công:

1. Vào GitHub repository
2. Click tab **Actions**
3. Chọn workflow **"Auto Deploy to Production"**
4. Click **"Run workflow"**
5. Chọn options:
   - **Branch**: `main` (hoặc branch khác)
   - **Deployment mode**: 
     - `app-only` (default) - Deploy app only
     - `full` - Deploy app + database
     - `with-elasticsearch` - Deploy app + Elasticsearch
     - `sync-elasticsearch` - Deploy app + sync ES data
   - **Force deployment**: Bỏ qua checks (nếu cần)
   - **Skip health check**: Bỏ qua health check (không khuyến nghị)
6. Click **"Run workflow"**

## 📊 Monitor Deployment

### Xem Workflow Progress

1. Vào tab **Actions** trong GitHub repository
2. Click vào workflow run đang chạy
3. Xem progress của từng job:
   - **Build Application** - Build code
   - **Deploy to Production Server** - Deploy lên server
   - **Deployment Notification** - Thông báo kết quả

### Xem Logs Chi Tiết

**Trên GitHub:**
- Click vào từng step để xem logs chi tiết
- Download logs nếu cần troubleshoot

**Trên Server:**
```bash
# SSH vào server
ssh root@38.54.14.154

# Xem deployment logs
tail -f /var/log/filmflex/github-deploy-*.log

# Xem deployment reports
ls -lt /var/log/filmflex/deployment-report-*.txt | head -5
cat /var/log/filmflex/deployment-report-<timestamp>.txt

# Xem container logs
docker logs filmflex-app --tail 100 -f
```

## 🔍 Verification

### Kiểm Tra Deployment Thành Công

```bash
# SSH vào server
ssh root@38.54.14.154

# Kiểm tra containers
docker ps | grep filmflex

# Kiểm tra application health
curl http://localhost:5000/api/health

# Kiểm tra external access
curl http://38.54.14.154:5000/
```

### Expected Output

**Docker containers:**
```
filmflex-app        Up X minutes    0.0.0.0:5000->5000/tcp
```

**Health check:**
```json
{"status":"ok","timestamp":"..."}
```

## 🌐 Production với Nginx – Frontend & Backend

Khi production dùng **Nginx** làm reverse proxy (SSL, rate limit, static files), cấu hình như sau.

### Luồng request

| Thành phần | Vai trò |
|------------|--------|
| **Nginx** | Listen 80/443, serve static frontend, proxy `/api` và auth về Node |
| **Node (filmflex-app)** | Chạy trong Docker, listen `5000`, chỉ xử lý API và fallback SPA |
| **Frontend static** | Nginx đọc từ **host path** `/var/www/filmflex/dist/public` |

### Vị trí source frontend (trên server)

- **Đường dẫn Nginx dùng:** `root /var/www/filmflex/dist/public` (trong `nginx/phimgg.com.conf`).
- **Nội dung:** Build frontend (Vite) → `dist/public/` (index.html, assets/, v.v.).
- **Cập nhật:** Mỗi lần deploy, GitHub Actions:
  1. Giải nén deployment package vào `~/Film_Flex_Release/` (có `dist/`, `nginx/`).
  2. **Sync frontend** vào thư mục Nginx: `cp -rf ~/Film_Flex_Release/dist /var/www/filmflex/`.
  3. **Sync Nginx config:** `00-limit_req_zones.conf` và `default.conf` → `/etc/nginx/conf.d/`, sau đó `nginx -t && systemctl reload nginx`.
  4. Nginx sẽ serve bản mới từ `/var/www/filmflex/dist/public`.

**Tóm tắt:** Frontend **không** nằm trong container; Nginx trên host đọc từ **`/var/www/filmflex/dist/public`**. Container `filmflex-app` chỉ chạy backend (API). Workflow đã có bước sync `dist` và Nginx config sau mỗi deploy.

**Redis:** Container `filmflex-redis` chạy trong Docker stack, app kết nối qua `REDIS_HOST=redis` để cache movies/categories.

### Cấu hình Nginx liên quan

- **Static (HTML/JS/CSS/assets):** `try_files $uri $uri/ /index.html @backend` → ưu tiên file trong `root`, không có thì trả `index.html` (SPA), cuối cùng fallback `@backend`.
- **API:** `location /api/` → `proxy_pass http://127.0.0.1:5000` (Node trong Docker map port `5000:5000`).
- **Auth routes:** `location ~ ^/(login|register|auth)/` → cũng proxy về `127.0.0.1:5000`.

### Kiểm tra sau deploy

```bash
# Frontend đã sync chưa
ls -la /var/www/filmflex/dist/public/

# Nginx đọc đúng root
nginx -t

# API qua Nginx
curl -sI https://phimgg.com/api/health
```

## 🚨 Troubleshooting

### 1. SSH Connection Failed

**Lỗi:** `Permission denied (publickey,password)`

**Giải pháp:**
```bash
# Kiểm tra SSH key trên server
ssh root@38.54.14.154
cat ~/.ssh/authorized_keys

# Kiểm tra permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Test SSH connection từ local
ssh -i ~/.ssh/github_actions_phimgg root@38.54.14.154
```

### 2. Build Failed

**Lỗi:** Build errors trong workflow

**Giải pháp:**
```bash
# Test build locally
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release
npm ci
npm run build

# Kiểm tra TypeScript errors
npm run check
```

### 3. Deployment Script Failed

**Lỗi:** Deployment script returns error

**Giải pháp:**
```bash
# SSH vào server và test script
ssh root@38.54.14.154
cd ~/Film_Flex_Release/scripts/deployment
./deploy-production.sh --app-only --help

# Xem logs chi tiết
tail -100 /var/log/filmflex/github-deploy-*.log
```

### 4. Health Check Failed

**Lỗi:** Health check timeout hoặc failed

**Giải pháp:**
```bash
# Kiểm tra application logs
ssh root@38.54.14.154
docker logs filmflex-app --tail 100

# Kiểm tra container status
docker ps -a | grep filmflex

# Restart container nếu cần
docker restart filmflex-app

# Test health endpoint
curl -v http://localhost:5000/api/health
```

### 5. Workflow Không Trigger

**Lỗi:** Push code nhưng workflow không chạy

**Giải pháp:**
- Kiểm tra branch name (phải là `main`)
- Kiểm tra paths-ignore (có thể file thay đổi bị ignore)
- Kiểm tra workflow file syntax (YAML format)
- Xem Actions tab → All workflows → Kiểm tra workflow có enabled không

## 🔄 Rollback

### Automatic Rollback

Workflow **KHÔNG** tự động rollback. Nếu deployment fail, cần rollback thủ công.

### Manual Rollback

```bash
# SSH vào server
ssh root@38.54.14.154

# Option 1: Restore từ backup
cd ~
ls -lt Film_Flex_Release_backup_* | head -1
BACKUP_DIR=$(ls -dt Film_Flex_Release_backup_* | head -1)
rm -rf Film_Flex_Release
mv "$BACKUP_DIR" Film_Flex_Release

# Option 2: Git checkout previous commit
cd ~/Film_Flex_Release
git log --oneline -5
git checkout <previous-commit-hash>

# Re-deploy
cd scripts/deployment
./deploy-production.sh --app-only

# Verify
curl http://localhost:5000/api/health
```

## 📝 Best Practices

### 1. Testing Before Merge

```bash
# Tạo feature branch
git checkout -b feature/my-feature

# Develop và test locally
npm run dev

# Build và test
npm run build
npm start

# Merge vào main sau khi test
git checkout main
git merge feature/my-feature
git push origin main
```

### 2. Monitor Deployments

- Luôn xem workflow logs khi deploy
- Kiểm tra health check results
- Monitor application logs sau deployment
- Set up alerts (optional)

### 3. Deployment Schedule

- **Tránh deploy** vào giờ cao điểm (8-10 PM)
- **Nên deploy** vào giờ thấp điểm (2-6 AM)
- **Manual deployment** cho các thay đổi lớn

### 4. Security

- **KHÔNG** commit secrets vào code
- **SỬ DỤNG** GitHub Secrets cho credentials
- **ƯU TIÊN** SSH key thay vì password
- **ROTATE** SSH keys định kỳ (3-6 tháng)

## 🎯 Deployment Modes

### app-only (Default)
```yaml
deployment_mode: app-only
```
- Deploy application code only
- Kết nối database hiện có
- **Khuyến nghị** cho hầu hết deployments

### full
```yaml
deployment_mode: full
```
- Deploy cả app và database
- **CHÚ Ý**: Có thể ảnh hưởng database
- Chỉ dùng khi cần thiết

### with-elasticsearch
```yaml
deployment_mode: with-elasticsearch
```
- Deploy app + start Elasticsearch service
- Dùng khi cần search functionality

### sync-elasticsearch
```yaml
deployment_mode: sync-elasticsearch
```
- Deploy app + force sync Elasticsearch data
- Dùng khi cần re-index search data

## 📞 Support

### Deployment Issues
- Check workflow logs trong GitHub Actions
- Check server logs: `/var/log/filmflex/`
- Check container logs: `docker logs filmflex-app`

### Emergency Contact
- Server: `ssh root@38.54.14.154`
- Application: `http://38.54.14.154:5000`
- Logs: `/var/log/filmflex/`

## ✅ Checklist

Trước khi deploy production:

- [ ] Code đã được test locally
- [ ] Build thành công locally
- [ ] GitHub Secrets đã được setup
- [ ] SSH connection đã được test
- [ ] Backup hiện tại đã được tạo (tự động)
- [ ] Deployment mode đã được chọn đúng
- [ ] Monitor logs trong quá trình deploy
- [ ] Health check passed
- [ ] Application hoạt động bình thường

---

**🎉 Deployment workflow đã sẵn sàng sử dụng!**
