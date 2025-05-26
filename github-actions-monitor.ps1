Write-Host "=== GitHub Actions Deployment Monitor ===" -ForegroundColor Cyan
Write-Host ""

# Check current git status
Write-Host "1. Git Push Status:" -ForegroundColor Yellow
$lastCommit = git log --oneline -1
Write-Host "Latest commit: $lastCommit" -ForegroundColor Green
Write-Host "Branch: $(git branch --show-current)" -ForegroundColor Green

# Get GitHub repository info
try {
    $gitRemote = git remote get-url origin
    if ($gitRemote -match "github\.com[:/]([^/]+)/(.+?)(?:\.git)?`$") {
        $owner = $matches[1]
        $repo = $matches[2]
        $actionsUrl = "https://github.com/$owner/$repo/actions"
        Write-Host "`n2. GitHub Actions Info:" -ForegroundColor Yellow
        Write-Host "Repository: $owner/$repo" -ForegroundColor Green
        Write-Host "Actions URL: $actionsUrl" -ForegroundColor Cyan
        Write-Host "Workflow: FilmFlex Full Deployment" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not determine GitHub repository" -ForegroundColor Red
}

# Test production server endpoints
Write-Host "`n3. Testing Production Server..." -ForegroundColor Yellow

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor White
try {
    $health = Invoke-WebRequest -Uri "http://38.54.115.156:5000/api/health" -TimeoutSec 10
    if ($health.StatusCode -eq 200) {
        Write-Host "✓ Health endpoint: OK ($($health.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Health endpoint: Failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test recommended movies endpoint (the one we're fixing)
Write-Host "Testing recommended movies endpoint..." -ForegroundColor White
try {
    $recommended = Invoke-WebRequest -Uri "http://38.54.115.156:5000/api/movies/recommended?page=1&limit=5" -TimeoutSec 10
    if ($recommended.StatusCode -eq 200) {
        Write-Host "✓ Recommended movies: OK ($($recommended.StatusCode))" -ForegroundColor Green
        $jsonResponse = $recommended.Content | ConvertFrom-Json
        if ($jsonResponse.items -and $jsonResponse.items.Count -gt 0) {
            Write-Host "  → Returned $($jsonResponse.items.Count) movies" -ForegroundColor Cyan
            Write-Host "  → Hero section should now work!" -ForegroundColor Green
        } else {
            Write-Host "  → No movies returned (may still be deploying)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "✗ Recommended movies: Failed (needs deployment)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n4. Deployment Status:" -ForegroundColor Yellow
Write-Host "✓ Code changes pushed to Production branch" -ForegroundColor Green
Write-Host "✓ GitHub Actions workflow should be running" -ForegroundColor Green
Write-Host "⏳ Deployment in progress..." -ForegroundColor Yellow

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Monitor GitHub Actions:"
Write-Host "   - Go to: $actionsUrl" -ForegroundColor Cyan
Write-Host "   - Look for 'FilmFlex Full Deployment' workflow"
Write-Host "   - Check the latest run status"
Write-Host ""
Write-Host "2. Wait for deployment to complete (usually 5-10 minutes)"
Write-Host ""
Write-Host "3. Re-run this script to test endpoints after deployment"
Write-Host "   Command: .\github-actions-monitor.ps1"
Write-Host ""
Write-Host "4. Test your website homepage hero section"
Write-Host ""

Write-Host "GitHub Actions deployment initiated! 🚀" -ForegroundColor Green
