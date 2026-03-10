# Deployment Scripts — Legacy vs Current

## Đang dùng (current)

| Script | Dùng bởi |
|--------|----------|
| `fix-deployment.sh` | `.github/workflows/auto-deploy-production.yml` — fallback khi không có docker-compose.production.yml |
| `health-check.sh` | Wrapper → `../maintenance/health-check.sh`; có thể gọi tay hoặc cron |
| `lib/common-functions.sh` | Thư viện dùng chung (một số script legacy có thể source) |

Cron/conf trên server (tùy setup): `cron-docker-wrapper.sh`, `filmflex-cron.conf`, `enhanced-cron.conf`, `manage-cron.sh`, `switch-env.sh`, v.v.

## Legacy (đã chuyển vào `legacy/`)

Các script sau **không** được bất kỳ workflow GitHub Actions nào gọi. Đã chuyển vào `legacy/` để tránh nhầm với flow chính.

| Script (trong `legacy/`) | Ghi chú |
|--------------------------|--------|
| `deploy-production.sh` | Deploy production cũ (PM2/build trên server). Thay bằng auto-deploy-production.yml. |
| `quick-deploy.sh` | Quick deploy cũ. Thay bằng auto-deploy-production. |
| `deploy.sh` | Master orchestrator cũ. Thay bằng auto-deploy-production. |
| `full-deploy.sh` | Full deploy cũ (gọi fix-deployment.sh). Thay bằng auto-deploy-production. |
| `final-deploy.sh` | Final deploy cũ (PM2, Nginx, DB, …). filmflex-deploy.yml (nếu chạy) dùng để trích SQL từ đây; file nằm tại `legacy/final-deploy.sh`. |
| `selective-deploy.sh` | Selective deploy. Không dùng trong CI. |
| `filmflex-server.cjs` | Server script cũ. Không dùng trong CI. |

**docker-deploy.sh** từng được `filmflex-deploy.yml` gọi nhưng **không còn tồn tại** trong repo. Workflow đã được cập nhật dùng `fix-deployment.sh` thay thế.

## Thêm script mới

Deploy production nên thực hiện qua **GitHub Actions** (auto-deploy-production.yml). Chỉ thêm script shell trong `deployment/` khi cần thao tác tay trên server (ví dụ cron, health-check, switch-env).
