# Script kiểm tra CSP headers có chứa Google Ads domains không

param(
    [string]$Url = "http://localhost:5000"
)

Write-Host ""
Write-Host "🔍 Kiểm tra Content Security Policy Headers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Testing URL: $Url" -ForegroundColor White
Write-Host ""

try {
    # Get headers
    $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing
    $cspHeader = $response.Headers['Content-Security-Policy']
    
    if (-not $cspHeader) {
        Write-Host "❌ Không tìm thấy CSP header!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ CSP Header found!" -ForegroundColor Green
    Write-Host ""
    
    # Check for Google Ads domains
    Write-Host "🔍 Checking Google Ads domains in CSP..." -ForegroundColor Cyan
    Write-Host ""
    
    $domains = @(
        "googleads.g.doubleclick.net",
        "tpc.googlesyndication.com",
        "www.google.com",
        "pagead2.googlesyndication.com"
    )
    
    $allPassed = $true
    
    foreach ($domain in $domains) {
        if ($cspHeader -match [regex]::Escape($domain)) {
            Write-Host "  ✓ $domain" -ForegroundColor Green
        }
        else {
            Write-Host "  ✗ $domain (MISSING)" -ForegroundColor Red
            $allPassed = $false
        }
    }
    
    Write-Host ""
    
    # Check frame-src specifically
    if ($cspHeader -match "frame-src") {
        Write-Host "✅ frame-src directive exists" -ForegroundColor Green
        
        # Extract frame-src content
        if ($cspHeader -match "frame-src\s+([^;]+)") {
            $frameSrc = $matches[1]
            Write-Host ""
            Write-Host "📋 Full frame-src directive:" -ForegroundColor Yellow
            Write-Host "  $frameSrc" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "❌ frame-src directive NOT FOUND!" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host ""
    
    # Check worker-src
    if ($cspHeader -match "worker-src") {
        Write-Host "✅ worker-src directive exists" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  worker-src directive missing (optional)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    
    if ($allPassed) {
        Write-Host "✅ All Google Ads domains are allowed in CSP!" -ForegroundColor Green
        Write-Host ""
        Write-Host "✨ News page should now load Google Ads without CSP errors" -ForegroundColor Cyan
        exit 0
    }
    else {
        Write-Host "❌ Some Google Ads domains are missing from CSP" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  Please check server/middleware/security.ts" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Error connecting to server:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure the server is running:" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor Cyan
    exit 1
}
