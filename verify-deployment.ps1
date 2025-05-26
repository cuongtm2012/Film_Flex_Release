# Post-Deployment Verification Script
# Run this after GitHub Actions deployment completes

Write-Host "🔍 FilmFlex Deployment Verification" -ForegroundColor Green
Write-Host "Testing production server: 38.54.115.156" -ForegroundColor Yellow

# Test 1: Health check
Write-Host "`n[1/3] Testing server health..." -ForegroundColor Blue
try {
    $health = Invoke-RestMethod -Uri "http://38.54.115.156:5000/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Server is healthy" -ForegroundColor Green
    Write-Host "   Uptime: $([math]::Round($health.uptime/3600, 2)) hours" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Recommended Movies Endpoint (the fix we deployed)
Write-Host "`n[2/3] Testing recommended movies endpoint..." -ForegroundColor Blue
try {
    $uri = "http://38.54.115.156:5000/api/movies/recommended?page=1&limit=5"
    $movies = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
    
    if ($movies.status -eq $true -and $movies.items) {
        Write-Host "✅ DEPLOYMENT SUCCESSFUL! Recommended movies endpoint is working" -ForegroundColor Green
        Write-Host "   Returned: $($movies.items.Count) movies" -ForegroundColor Cyan
        Write-Host "   Total available: $($movies.pagination.totalItems)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Endpoint responded but with unexpected format" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Recommended movies endpoint still failing" -ForegroundColor Red
    Write-Host "   This means deployment didn't complete or failed" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Sample movie detail (to verify general functionality)
Write-Host "`n[3/3] Testing movie detail endpoint..." -ForegroundColor Blue
try {
    $movieDetail = Invoke-RestMethod -Uri "http://38.54.115.156:5000/api/movies" -Method Get -TimeoutSec 10
    Write-Host "✅ Movie listing endpoint is working" -ForegroundColor Green
} catch {
    Write-Host "❌ Movie detail endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "If recommended movies endpoint is working ✅, your deployment was successful!"
Write-Host "If it's still failing ❌, check GitHub Actions logs or re-run deployment."
Write-Host ""
Write-Host "🔗 Useful Links:"
Write-Host "• GitHub Actions: https://github.com/cuongtm2012/Film_Flex_Release/actions"
Write-Host "• Live Site: http://38.54.115.156:5000"
Write-Host "• API Health: http://38.54.115.156:5000/api/health"
