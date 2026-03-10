# Legacy deployment scripts

Các script trong thư mục này **không được** workflow GitHub Actions gọi. Deploy production dùng **auto-deploy-production.yml** và trên server chỉ cần `fix-deployment.sh` (fallback).

| Script | Ghi chú |
|--------|--------|
| `deploy.sh` | Master orchestrator cũ |
| `deploy-production.sh` | Deploy production cũ (PM2/build trên server) |
| `quick-deploy.sh` | Quick deploy cũ |
| `full-deploy.sh` | Full deploy cũ |
| `final-deploy.sh` | Final deploy cũ; workflow filmflex-deploy.yml (nếu chạy) dùng để trích SQL từ đây |
| `selective-deploy.sh` | Selective deploy cũ |
| `filmflex-server.cjs` | Server script cũ |

Xem [../LEGACY.md](../LEGACY.md) và [scripts/LEGACY.md](../../LEGACY.md) để biết flow hiện tại và khi nào có thể xóa hẳn thư mục này.
