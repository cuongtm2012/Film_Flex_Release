#!/usr/bin/env pwsh
# GitHub Actions Deployment Status Checker
# This script checks the status of the FilmFlex deployment

Write-Host "=== FilmFlex Deployment Status Checker ===" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "1. Checking Git Status..." -ForegroundColor Yellow
$currentCommit = git log --oneline -1
Write-Host "Current HEAD: $currentCommit" -ForegroundColor Green

# Check if we're on Production branch
$currentBranch = git branch --show-current
Write-Host "Current Branch: $currentBranch" -ForegroundColor Green

# Check recent pushes
Write-Host "`n2. Recent Commits:" -ForegroundColor Yellow
git log --oneline -5

# Check production server connectivity
Write-Host "`n3. Testing Production Server Connectivity..." -ForegroundColor Yellow
try {
    $response = Test-NetConnection -ComputerName "38.54.115.156" -Port 5000 -WarningAction SilentlyContinue
    if ($response.TcpTestSucceeded) {
        Write-Host "✓ Server is reachable on port 5000" -ForegroundColor Green
        
        # Try to check health endpoint
        try {
            $healthCheck = Invoke-WebRequest -Uri "http://38.54.115.156:5000/api/health" -TimeoutSec 10
            Write-Host "✓ Health endpoint response: $($healthCheck.StatusCode)" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠ Health endpoint not responding (expected if old code is running)" -ForegroundColor Yellow
        }
        
        # Check recommended movies endpoint
        try {
            $recommendedCheck = Invoke-WebRequest -Uri "http://38.54.115.156:5000/api/movies/recommended" -TimeoutSec 10
            Write-Host "✓ Recommended movies endpoint response: $($recommendedCheck.StatusCode)" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ Recommended movies endpoint failing (this is what we're fixing)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Server is not reachable on port 5000" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. GitHub Actions Deployment Status:" -ForegroundColor Yellow
Write-Host "   📁 Repository: Your GitHub repository"
Write-Host "   🔄 Workflow: .github/workflows/filmflex-deploy.yml"
Write-Host "   🌿 Branch: Production (triggers on push)"
Write-Host ""

Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The workflow fixes have been pushed to the Production branch." -ForegroundColor Green
Write-Host "GitHub Actions should now trigger automatically."
Write-Host ""
Write-Host "REQUIRED: Set up GitHub Secrets (if not already done):" -ForegroundColor Yellow
Write-Host "1. Go to your GitHub repository"
Write-Host "2. Navigate to Settings > Secrets and variables > Actions"
Write-Host "3. Add these Repository Secrets:"
Write-Host "   - SERVER_IP: 38.54.115.156"
Write-Host "   - SERVER_USER: [your server username]"
Write-Host "   - SSH_PASSWORD: [your server password]"
Write-Host ""
Write-Host "To monitor deployment:" -ForegroundColor Yellow
Write-Host "1. Go to your GitHub repository"
Write-Host "2. Click the 'Actions' tab"
Write-Host "3. Look for the 'FilmFlex Full Deployment' workflow"
Write-Host "4. Check the latest run status"
Write-Host ""
Write-Host "After successful deployment, test:" -ForegroundColor Yellow
Write-Host "- Health: http://38.54.115.156:5000/api/health"
Write-Host "- Recommended Movies: http://38.54.115.156:5000/api/movies/recommended"
Write-Host ""
Write-Host "=== END ===" -ForegroundColor Cyan
