# Enable GitHub Actions - Step by Step Guide

## 🎯 Vấn Đề

Tab **Actions** không hiển thị trong GitHub repository.

![Current State](file:///Users/jack/.gemini/antigravity/brain/2041ba5c-9274-4778-a7c1-fc95d8ba9100/uploaded_image_1767153488838.png)

## ✅ Giải Pháp

### Bước 1: Vào Settings

1. Click vào tab **Settings** (đã thấy trong screenshot)
2. Bạn cần quyền **Admin** hoặc **Write** để enable Actions

### Bước 2: Enable Actions

#### Trong Settings sidebar (bên trái):

1. Scroll xuống section **"Code and automation"**
2. Click vào **"Actions"**
3. Click vào **"General"**

#### Trong Actions General settings:

**Actions permissions:**
- ✅ Chọn: **"Allow all actions and reusable workflows"**
  
  Hoặc nếu muốn bảo mật hơn:
- ✅ Chọn: **"Allow cuongtm2012, and select non-cuongtm2012, actions and reusable workflows"**

**Workflow permissions:**
- ✅ Chọn: **"Read and write permissions"**
- ✅ Check: **"Allow GitHub Actions to create and approve pull requests"**

**Click "Save"** ở cuối trang

### Bước 3: Verify Actions Tab

1. Quay lại trang chính của repository
2. Refresh trang (F5 hoặc Cmd+R)
3. Tab **Actions** sẽ xuất hiện giữa **Pull requests** và **Projects**

### Bước 4: Push Workflow File

```bash
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release

# Add workflow và docs
git add .github/workflows/auto-deploy-production.yml
git add docs/GITHUB_ACTIONS_DEPLOYMENT.md
git add docs/GITHUB_ACTIONS_QUICK_START.md

# Commit
git commit -m "feat: add GitHub Actions auto-deployment workflow

- Add auto-deploy-production.yml for CI/CD
- Auto trigger on push to main branch
- Support manual deployment with multiple modes
- Add comprehensive documentation"

# Push to GitHub
git push origin main
```

### Bước 5: Check Actions Tab

Sau khi push:

1. Vào repository trên GitHub
2. Click tab **Actions** (giờ đã hiện)
3. Bạn sẽ thấy:
   - Workflow **"Auto Deploy to Production"** trong sidebar
   - Workflow run đầu tiên (nếu push vào main)

## 🔍 Troubleshooting

### Vẫn không thấy Actions tab?

**Kiểm tra 1: Repository Type**
- Private repository: Cần enable Actions trong Settings
- Public repository: Actions thường được enable mặc định

**Kiểm tra 2: Organization Settings**
Nếu repository thuộc về Organization:
1. Vào Organization Settings
2. Actions → General
3. Enable Actions cho organization
4. Allow repositories to use Actions

**Kiểm tra 3: Permissions**
- Bạn cần quyền **Admin** hoặc **Write** để xem Actions
- Nếu chỉ có quyền **Read**, không thấy Actions tab

**Kiểm tra 4: Browser Cache**
- Clear browser cache
- Thử browser khác hoặc Incognito mode
- Hard refresh: Ctrl+Shift+R (Windows) hoặc Cmd+Shift+R (Mac)

## 📝 Expected Result

Sau khi enable, bạn sẽ thấy:

```
Code | Issues | Pull requests | Actions | Projects | Wiki | Security | Insights | Settings
                                  ↑
                            Tab này sẽ xuất hiện
```

Click vào **Actions** tab, bạn sẽ thấy:

- **All workflows** trong sidebar
- **Auto Deploy to Production** workflow
- Nút **"Run workflow"** để manual trigger
- Workflow runs history (nếu đã có runs)

## 🚀 Next Steps

Sau khi Actions tab đã hiện:

1. **Setup GitHub Secrets**
   - Settings → Secrets and variables → Actions
   - Add: `SERVER_HOST`, `SERVER_USER`, `SSH_PASSWORD`

2. **Test Manual Deployment**
   - Actions tab → Auto Deploy to Production
   - Run workflow → Select options → Run

3. **Test Auto Deployment**
   - Make a small change
   - Push to main
   - Watch workflow auto-trigger

## 💡 Tips

- **First time setup**: Có thể mất 1-2 phút để Actions tab xuất hiện sau khi enable
- **Workflow file**: Phải có file trong `.github/workflows/` để workflow hiện trong list
- **Permissions**: Đảm bảo workflow có đủ permissions để deploy

---

**Need help?** Check [GITHUB_ACTIONS_DEPLOYMENT.md](GITHUB_ACTIONS_DEPLOYMENT.md) for detailed guide.
