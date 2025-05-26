#!/usr/bin/env pwsh

# Execute FilmFlex Production Deployment
# This script connects to the production server and runs the deployment

param(
    [string]$ServerIP = "38.54.115.156",
    [string]$Username = "root",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
FilmFlex Production Deployment Executor

This script connects to your production server and executes the deployment script.

Usage:
    .\execute-deployment.ps1 [-ServerIP <IP>] [-Username <username>] [-Help]

Parameters:
    -ServerIP   : Production server IP address (default: 38.54.115.156)
    -Username   : SSH username (default: root)
    -Help       : Show this help message

Examples:
    .\execute-deployment.ps1
    .\execute-deployment.ps1 -ServerIP "38.54.115.156" -Username "root"
"@
    exit 0
}

# Define colors
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$ForegroundColor = [System.ConsoleColor]::White
    )
    $currentColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $Host.UI.RawUI.ForegroundColor = $currentColor
}

function Write-Banner {
    Write-ColorOutput "" $Cyan
    Write-ColorOutput "========================================" $Cyan
    Write-ColorOutput "    FilmFlex Production Deployment" $Cyan
    Write-ColorOutput "========================================" $Cyan
    Write-ColorOutput "" $Cyan
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🚀 $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

# Main execution
Write-Banner

Write-Step "Connecting to production server: $Username@$ServerIP"
Write-ColorOutput "You will be prompted for the server password (Cuongtm2012$)" $Yellow
Write-ColorOutput ""

# Check if SSH is available
try {
    $sshVersion = ssh -V 2>&1
    Write-Success "SSH client found: $sshVersion"
} catch {
    Write-Error "SSH client not found. Please install OpenSSH or use PuTTY."
    Write-ColorOutput "To install OpenSSH on Windows:" $Yellow
    Write-ColorOutput "1. Go to Settings > Apps > Optional Features" $Yellow
    Write-ColorOutput "2. Add OpenSSH Client" $Yellow
    Write-ColorOutput "Or use: Add-WindowsCapability -Online -Name OpenSSH.Client" $Yellow
    exit 1
}

Write-ColorOutput ""
Write-Step "Executing deployment on the server..."
Write-ColorOutput ""

# Create the SSH command sequence
$sshCommands = @"
echo "Connected to production server successfully!"
echo ""
echo "Current directory: \$(pwd)"
echo "Available files:"
ls -la deploy-production.sh 2>/dev/null || echo "deploy-production.sh not found in current directory"
echo ""

# Check if the script exists and make it executable
if [ -f "deploy-production.sh" ]; then
    echo "✅ Found deploy-production.sh"
    chmod +x deploy-production.sh
    echo "✅ Made script executable"
    echo ""
    echo "🚀 Starting FilmFlex deployment..."
    echo "This may take 10-20 minutes depending on your server speed."
    echo ""
    sudo ./deploy-production.sh
else
    echo "❌ deploy-production.sh not found in current directory"
    echo "Available files:"
    ls -la
    echo ""
    echo "Please ensure the script is uploaded to the server."
    echo "You may need to navigate to the correct directory or upload the file again."
fi
"@

try {
    # Execute SSH connection with the commands
    Write-ColorOutput "Connecting via SSH..." $Blue
    Write-ColorOutput "Password: Cuongtm2012$" $Yellow
    Write-ColorOutput ""
    
    # Use SSH to connect and execute the deployment
    $sshCommands | ssh $Username@$ServerIP
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput ""
        Write-Success "Deployment completed successfully!"
        Write-ColorOutput ""
        Write-ColorOutput "🌐 Your FilmFlex application should now be accessible at:" $Green
        Write-ColorOutput "   Main site: http://$ServerIP" $Cyan
        Write-ColorOutput "   Admin panel: http://$ServerIP/admin" $Cyan
        Write-ColorOutput "   API: http://$ServerIP/api" $Cyan
        Write-ColorOutput ""
        Write-ColorOutput "📋 To manage your application:" $Yellow
        Write-ColorOutput "   SSH: ssh $Username@$ServerIP" $Cyan
        Write-ColorOutput "   Check logs: pm2 logs filmflex" $Cyan
        Write-ColorOutput "   Restart: pm2 restart filmflex" $Cyan
        Write-ColorOutput "   Status: pm2 status" $Cyan
    } else {
        Write-Warning "Deployment may have encountered issues. Check the output above."
    }
    
} catch {
    Write-Error "Failed to connect to server: $($_.Exception.Message)"
    Write-ColorOutput ""
    Write-ColorOutput "Troubleshooting:" $Yellow
    Write-ColorOutput "1. Verify server IP: $ServerIP" $Cyan
    Write-ColorOutput "2. Verify username: $Username" $Cyan
    Write-ColorOutput "3. Verify password: Cuongtm2012$" $Cyan
    Write-ColorOutput "4. Check network connectivity" $Cyan
    Write-ColorOutput "5. Ensure SSH service is running on the server" $Cyan
}

Write-ColorOutput ""
Write-ColorOutput "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
