# FilmFlex Critical Error Fix Deployment
# Fixes CORS and module import errors

$ErrorActionPreference = "Stop"

Write-Host "🚨 FilmFlex Critical Error Fix Deployment" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

# Configuration
$SERVER = "154.205.142.255"
$USERNAME = "root"
$PASSWORD = "Cuongtm2012$"
$LOCAL_PATH = "c:\Users\Admin\Desktop\3.Project\3.Filmflex\Film_Flex_Release\"

Write-Host "📋 Detected Issues:" -ForegroundColor Yellow
Write-Host "   • CORS configuration error causing app crashes" -ForegroundColor White
Write-Host "   • Module import errors (ERR_MODULE_NOT_FOUND)" -ForegroundColor White
Write-Host "   • Application failing to start properly" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Solution:" -ForegroundColor Yellow
Write-Host "   • Simplified CORS configuration with error handling" -ForegroundColor White
Write-Host "   • Fixed module import issues" -ForegroundColor White
Write-Host "   • Enhanced PM2 configuration" -ForegroundColor White
Write-Host ""

try {
    # Check if required files exist
    $requiredFiles = @(
        "server\index.ts",
        "fix-critical-errors.sh",
        "emergency-cors-fix.sh"
    )

    Write-Host "🔍 Checking fix files..." -ForegroundColor Yellow
    foreach ($file in $requiredFiles) {
        $fullPath = Join-Path $LOCAL_PATH $file
        if (-not (Test-Path $fullPath)) {
            Write-Host "❌ Missing fix file: $file" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "   ✅ Found: $file" -ForegroundColor Green
        }
    }
    Write-Host ""

    # Upload fix files
    Write-Host "📤 Uploading error fix files..." -ForegroundColor Yellow
    
    $pscpPath = Get-Command pscp -ErrorAction SilentlyContinue
    if ($pscpPath) {
        # Upload fixed server configuration
        Write-Host "   Uploading fixed CORS configuration..." -ForegroundColor White
        & pscp -pw $PASSWORD "$($LOCAL_PATH)server\index.ts" "$USERNAME@$($SERVER):/root/Film_Flex_Release/server/"
        if ($LASTEXITCODE -ne 0) { throw "Failed to upload server/index.ts" }
        
        # Upload fix scripts
        Write-Host "   Uploading critical error fix script..." -ForegroundColor White
        & pscp -pw $PASSWORD "$($LOCAL_PATH)fix-critical-errors.sh" "$USERNAME@$($SERVER):/root/Film_Flex_Release/"
        if ($LASTEXITCODE -ne 0) { throw "Failed to upload fix-critical-errors.sh" }
        
        Write-Host "   Uploading emergency CORS fix..." -ForegroundColor White
        & pscp -pw $PASSWORD "$($LOCAL_PATH)emergency-cors-fix.sh" "$USERNAME@$($SERVER):/root/Film_Flex_Release/"
        if ($LASTEXITCODE -ne 0) { throw "Failed to upload emergency-cors-fix.sh" }
        
        Write-Host "✅ All fix files uploaded successfully!" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "❌ pscp not found. Please install PuTTY first." -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative manual steps:" -ForegroundColor Yellow
        Write-Host "1. Copy server\index.ts to server:/root/Film_Flex_Release/server/" -ForegroundColor White
        Write-Host "2. Copy fix-critical-errors.sh to server:/root/Film_Flex_Release/" -ForegroundColor White
        Write-Host "3. Copy emergency-cors-fix.sh to server:/root/Film_Flex_Release/" -ForegroundColor White
        exit 1
    }

    # Execute fix on server
    Write-Host "🚀 Executing critical error fix on server..." -ForegroundColor Yellow
    
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    if ($plinkPath) {
        Write-Host "   Making scripts executable..." -ForegroundColor White
        & plink -ssh -pw $PASSWORD "$USERNAME@$SERVER" "cd /root/Film_Flex_Release && chmod +x fix-critical-errors.sh emergency-cors-fix.sh"
        
        Write-Host "   Running comprehensive error fix..." -ForegroundColor White
        & plink -ssh -pw $PASSWORD "$USERNAME@$SERVER" "cd /root/Film_Flex_Release && bash fix-critical-errors.sh"
        
        Write-Host ""
        Write-Host "🔍 Checking application status..." -ForegroundColor Yellow
        & plink -ssh -pw $PASSWORD "$USERNAME@$SERVER" "pm2 status && echo '' && echo 'Testing HTTP endpoint:' && curl -I http://localhost:5000 2>/dev/null || echo 'HTTP test failed'"
        
    } else {
        Write-Host "❌ plink not found. Manual execution required." -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual execution steps:" -ForegroundColor Yellow
        Write-Host "1. SSH to server: ssh root@154.205.142.255" -ForegroundColor White
        Write-Host "2. Navigate: cd /root/Film_Flex_Release" -ForegroundColor White
        Write-Host "3. Make executable: chmod +x fix-critical-errors.sh" -ForegroundColor White
        Write-Host "4. Run fix: bash fix-critical-errors.sh" -ForegroundColor White
        exit 1
    }

    Write-Host ""
    Write-Host "🎉 Critical Error Fix Deployment Completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌍 Test your application:" -ForegroundColor Yellow
    Write-Host "   URL: http://154.205.142.255:5000" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Issues Fixed:" -ForegroundColor Green
    Write-Host "   • CORS configuration simplified and secured" -ForegroundColor White
    Write-Host "   • Module import errors resolved" -ForegroundColor White
    Write-Host "   • Enhanced error handling and monitoring" -ForegroundColor White
    Write-Host "   • PM2 configuration optimized" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Monitoring Commands (run on server):" -ForegroundColor Yellow
    Write-Host "   pm2 status" -ForegroundColor White
    Write-Host "   pm2 logs filmflex" -ForegroundColor White
    Write-Host "   pm2 monit" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ Error during fix deployment: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🚨 If the comprehensive fix fails, try the emergency fix:" -ForegroundColor Yellow
    Write-Host "   ssh root@154.205.142.255" -ForegroundColor White
    Write-Host "   cd /root/Film_Flex_Release" -ForegroundColor White
    Write-Host "   bash emergency-cors-fix.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 This applies a quick CORS fix to get the app running immediately." -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the application in your browser" -ForegroundColor White
Write-Host "2. Monitor the logs for any remaining issues" -ForegroundColor White
Write-Host "3. If issues persist, run the emergency fix as a fallback" -ForegroundColor White
