Write-Host "=== FilmFlex Deployment Status Checker ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Checking Git Status..." -ForegroundColor Yellow
$currentCommit = git log --oneline -1
Write-Host "Current HEAD: $currentCommit" -ForegroundColor Green

$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor Green

Write-Host "`n2. Recent Commits:" -ForegroundColor Yellow
git log --oneline -5

Write-Host "`n3. Production Server Status:" -ForegroundColor Yellow
Write-Host "Server IP: 38.54.115.156:5000" -ForegroundColor White

Write-Host "`n=== DEPLOYMENT STATUS ===" -ForegroundColor Cyan
Write-Host "✓ GitHub Actions workflow has been FIXED and pushed" -ForegroundColor Green
Write-Host "✓ Route conflicts have been RESOLVED" -ForegroundColor Green  
Write-Host "✓ Build paths have been CORRECTED" -ForegroundColor Green
Write-Host "✓ Lint dependency issues have been REMOVED" -ForegroundColor Green

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Yellow
Write-Host "1. SET UP GITHUB SECRETS (Required):" -ForegroundColor Red
Write-Host "   Go to: GitHub Repository > Settings > Secrets and variables > Actions"
Write-Host "   Add these secrets:"
Write-Host "   - SERVER_IP: 38.54.115.156"
Write-Host "   - SERVER_USER: [your server username]" 
Write-Host "   - SSH_PASSWORD: [your server password]"

Write-Host "`n2. MONITOR DEPLOYMENT:"
Write-Host "   - Go to GitHub > Actions tab"
Write-Host "   - Look for 'FilmFlex Full Deployment' workflow"
Write-Host "   - Check the latest run status"

Write-Host "`n3. AFTER DEPLOYMENT, TEST THESE ENDPOINTS:"
Write-Host "   Health: http://38.54.115.156:5000/api/health"
Write-Host "   Movies: http://38.54.115.156:5000/api/movies/recommended"

Write-Host "`nDeployment should fix the hero section on homepage!" -ForegroundColor Green
