# Legacy Scripts & Flows

Scripts và flow được đánh dấu **legacy** không còn dùng trong CI/CD chính. Deploy production hiện dùng **GitHub Actions** (workflow `auto-deploy-production.yml`).

## Flow deploy hiện tại (đang dùng)

| Thành phần | Mô tả |
|------------|--------|
| **CI/CD** | `.github/workflows/auto-deploy-production.yml` — build image trên CI, server chỉ `docker pull` + `docker-compose up` hoặc `fix-deployment.sh` |
| **Script deploy duy nhất được gọi** | `scripts/deployment/fix-deployment.sh` — fallback khi không có `docker-compose.production.yml` |
| **Health check** | `scripts/deployment/health-check.sh` (wrapper) → `scripts/maintenance/health-check.sh` |

## Thư mục / script legacy

| Vị trí | Ghi chú |
|--------|--------|
| `scripts/deployment/legacy/` | Các script deploy cũ (deploy.sh, deploy-production.sh, quick-deploy.sh, full-deploy.sh, final-deploy.sh, selective-deploy.sh, …). Không workflow nào gọi trực tiếp; giữ để tham khảo hoặc chạy tay. |
| `scripts/deployment/deploy-production.sh` | Đã chuyển vào `legacy/` — không dùng trong CI. |
| `scripts/deployment/quick-deploy.sh` | Đã chuyển vào `legacy/` — không dùng trong CI. |
| `scripts/deployment/deploy.sh` | Đã chuyển vào `legacy/` — không dùng trong CI. |
| `scripts/deployment/full-deploy.sh` | Đã chuyển vào `legacy/` — không dùng trong CI. |
| `scripts/deployment/final-deploy.sh` | Đã chuyển vào `legacy/` — workflow `filmflex-deploy.yml` (nếu chạy) dùng `legacy/final-deploy.sh` cho bước db-fix. |

## Workflow `filmflex-deploy.yml`

Workflow **filmflex-deploy.yml** là flow deploy cũ (build + upload artifact + chạy script trên server). Khuyến nghị dùng **auto-deploy-production.yml** (build image trên CI, server pull). Nếu vẫn chạy filmflex-deploy.yml thì:

- Bước db-fix-only đọc SQL từ `scripts/deployment/legacy/final-deploy.sh`.
- Bước Docker deploy gọi `fix-deployment.sh` (thay cho `docker-deploy.sh` không còn tồn tại).

## Xóa hẳn legacy

Sau khi confirm không còn workflow hay doc nào tham chiếu script trong `legacy/`, có thể xóa cả thư mục `scripts/deployment/legacy/` để tránh nhầm lẫn.
