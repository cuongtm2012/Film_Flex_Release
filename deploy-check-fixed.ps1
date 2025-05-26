# PowerShell Deployment Script for FilmFlex Production Server
# This script will check deployment status and guide you through GitHub Actions setup

param(
    [string]$ServerIP = "38.54.115.156",
    [string]$Username = "root",
    [string]$DeploymentMode = "standard"
)

Write-Host "FilmFlex Production Deployment Script" -ForegroundColor Green
Write-Host "Target Server: $ServerIP" -ForegroundColor Yellow
Write-Host "Deployment Mode: $DeploymentMode" -ForegroundColor Yellow

# Step 1: Build the project
Write-Host "`n[1/6] Building project..." -ForegroundColor Blue
try {
    npm run build | Out-Null
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Test server connectivity
Write-Host "`n[2/6] Testing server connectivity..." -ForegroundColor Blue
$testConnection = Test-NetConnection -ComputerName $ServerIP -Port 22 -WarningAction SilentlyContinue
if ($testConnection.TcpTestSucceeded) {
    Write-Host "✓ Server is reachable on SSH port 22" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot reach server on SSH port 22" -ForegroundColor Red
    Write-Host "Please check server connectivity and SSH access" -ForegroundColor Yellow
}

# Step 3: Check current server status
Write-Host "`n[3/6] Checking current server status..." -ForegroundColor Blue
try {
    $healthCheck = Invoke-RestMethod -Uri "http://${ServerIP}:5000/api/health" -Method Get -TimeoutSec 10
    Write-Host "✓ Server is running - Uptime: $($healthCheck.uptime) seconds" -ForegroundColor Green
} catch {
    Write-Host "✗ Server health check failed: $_" -ForegroundColor Red
}

# Step 4: Test the recommended movies endpoint (the one we fixed)
Write-Host "`n[4/6] Testing recommended movies endpoint..." -ForegroundColor Blue
try {
    $uri = "http://${ServerIP}:5000/api/movies/recommended?page=1" + "&" + "limit=5"
    $recommendedTest = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
    Write-Host "✓ Recommended movies endpoint is working" -ForegroundColor Green
    Write-Host "   Returned $($recommendedTest.items.Count) movies" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Recommended movies endpoint failed - THIS NEEDS DEPLOYMENT" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 5: GitHub Actions Setup Check
Write-Host "`n[5/6] GitHub Actions Setup Check..." -ForegroundColor Blue

# Check if we can determine GitHub repo
try {
    $gitRemote = git remote get-url origin 2>$null
    if ($gitRemote) {
        Write-Host "✓ Git remote found: $gitRemote" -ForegroundColor Green
        
        # Extract repo info - simplified regex for PowerShell
        if ($gitRemote -match "github\.com[:/]([^/]+)/([^/\s]+)") {
            $owner = $matches[1]
            $repo = $matches[2] -replace "\.git$", ""
            Write-Host "✓ Repository: $owner/$repo" -ForegroundColor Green
            
            $actionsUrl = "https://github.com/$owner/$repo/actions"
            Write-Host "📋 Actions URL: $actionsUrl" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "⚠ Could not determine GitHub repository" -ForegroundColor Yellow
}

# Check workflow file
if (Test-Path ".github\workflows\filmflex-deploy.yml") {
    Write-Host "✓ GitHub Actions workflow file exists" -ForegroundColor Green
} else {
    Write-Host "✗ GitHub Actions workflow file missing" -ForegroundColor Red
}

# Step 6: Deployment instructions
Write-Host "`n[6/6] Deployment Instructions:" -ForegroundColor Blue
Write-Host ""
Write-Host "OPTION 1 - GitHub Actions (Recommended):" -ForegroundColor Yellow
Write-Host "🔧 SETUP REQUIRED FIRST:"
Write-Host "   1. Go to GitHub repository -> Settings -> Secrets and variables -> Actions"
Write-Host "   2. Add these secrets:"
Write-Host "      • SERVER_IP = 38.54.115.156"
Write-Host "      • SERVER_USER = root"  
Write-Host "      • SSH_PASSWORD = [your server password]"
Write-Host ""
Write-Host "🚀 THEN DEPLOY:"
Write-Host "   1. Go to GitHub repository -> Actions tab"
Write-Host "   2. Select 'FilmFlex Full Deployment' workflow"
Write-Host "   3. Click 'Run workflow' -> Select branch 'Production'"
Write-Host "   4. Choose deployment mode: $DeploymentMode"
Write-Host "   5. Click 'Run workflow'"
Write-Host "   📖 Full guide: See GITHUB_ACTIONS_SETUP.md"
Write-Host ""

Write-Host "OPTION 2 - SSH Manual Deployment:" -ForegroundColor Yellow
Write-Host "1. SSH to server: ssh root@$ServerIP"
Write-Host "2. Navigate to: cd /root/Film_Flex_Release/scripts/deployment"
Write-Host "3. Run: ./final-deploy.sh"
Write-Host ""

Write-Host "OPTION 3 - Force GitHub Deployment:" -ForegroundColor Yellow
Write-Host "1. Make a small commit: git commit --allow-empty -m 'Force deployment'"
Write-Host "2. Push to trigger workflow: git push origin Production"
Write-Host ""

# Check git status
Write-Host "Current Git Status:" -ForegroundColor Cyan
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host $gitStatus -ForegroundColor Yellow
} else {
    Write-Host "Working tree clean" -ForegroundColor Green
}
$lastCommit = git log --oneline -1 2>$null
if ($lastCommit) {
    Write-Host "Last commit: $lastCommit" -ForegroundColor Cyan
}

Write-Host "`nDeployment check completed!" -ForegroundColor Green
