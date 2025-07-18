# FilmFlex Unified Windows Deployment Manager
# Consolidates all Windows-side deployment, upload, and management functionality
# Version: 1.0 - Unified PowerShell Script

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('status', 'upload', 'deploy', 'fix', 'restart', 'logs', 'health', 'help')]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Option = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$SERVER = "154.205.142.255"
$USERNAME = "root"
$PASSWORD = "Cuongtm2012$"
$LOCAL_PATH = $PSScriptRoot
$REMOTE_PATH = "/root/Film_Flex_Release"
$DEPLOY_SCRIPT = "filmflex-deploy.sh"

# Functions
function Write-Status {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Status "Success: $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-Status "Warning: $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-Status "Error: $Message" "Red"
}

function Write-Info {
    param([string]$Message)
    Write-Status "Info: $Message" "Cyan"
}

function Test-PuttyTools {
    $pscpPath = Get-Command pscp -ErrorAction SilentlyContinue
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    
    if (-not $pscpPath -or -not $plinkPath) {
        Write-Error "PuTTY tools (pscp, plink) not found in PATH"
        Write-Info "Please install PuTTY and add it to your system PATH"
        Write-Info "Download from: https://www.putty.org/"
        return $false
    }
    return $true
}

function Invoke-ServerCommand {
    param([string]$CommandToRun, [string]$Description = "")
    
    if ($Description) {
        Write-Info $Description
    }
    
    try {
        & plink -ssh -pw $PASSWORD "$USERNAME@$SERVER" $CommandToRun
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-Error "Failed to execute command: $CommandToRun"
        throw $_
    }
}

function Upload-Files {
    Write-Status "Uploading Files to Server" "Blue"
    Write-Status "=========================" "Blue"
    
    if (-not (Test-PuttyTools)) { return $false }
    
    # Upload main deployment script
    Write-Info "Uploading unified deployment script..."
    & pscp -pw $PASSWORD "$LOCAL_PATH\$DEPLOY_SCRIPT" "${USERNAME}@${SERVER}:${REMOTE_PATH}/"
    if ($LASTEXITCODE -ne 0) { 
        Write-Error "Failed to upload $DEPLOY_SCRIPT"
        return $false 
    }
    
    # Upload server configuration files
    $filesToUpload = @(
        @{Local="server\index.ts"; Remote="server/index.ts"},
        @{Local=".env"; Remote=".env"},
        @{Local="package.json"; Remote="package.json"}
    )
    
    foreach ($file in $filesToUpload) {
        if (Test-Path "$LOCAL_PATH\$($file.Local)") {
            Write-Info "Uploading $($file.Local)..."
            & pscp -pw $PASSWORD "$LOCAL_PATH\$($file.Local)" "${USERNAME}@${SERVER}:${REMOTE_PATH}/$($file.Remote)"
            if ($LASTEXITCODE -ne 0) { 
                Write-Warning "Failed to upload $($file.Local)"
            }
        }
    }
    
    # Make deployment script executable
    Invoke-ServerCommand "chmod +x ${REMOTE_PATH}/${DEPLOY_SCRIPT}" "Making deployment script executable"
    
    Write-Success "Files uploaded successfully"
    return $true
}

function Get-ServerStatus {
    Write-Status "Checking Server Status" "Blue"
    Write-Status "======================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    try {
        $statusCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} status"
        Invoke-ServerCommand $statusCommand "Getting application status from server"
    }
    catch {
        Write-Error "Failed to check server status"
        Write-Info "You may need to upload files first: .\filmflex-manager.ps1 upload"
    }
}

function Start-Deployment {
    param([string]$Type = "quick")
    
    Write-Status "Starting $Type Deployment" "Blue"
    Write-Status "=========================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    # Upload files first
    if (-not (Upload-Files)) {
        Write-Error "File upload failed, cannot proceed with deployment"
        return
    }
    
    try {
        $deployCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} deploy ${Type}"
        Invoke-ServerCommand $deployCommand "Running $Type deployment on server"
        Write-Success "Deployment completed successfully"
        
        # Show final status
        Write-Info "Checking final status..."
        Start-Sleep 2
        Get-ServerStatus
    }
    catch {
        Write-Error "Deployment failed"
        Write-Info "Try checking logs: .\filmflex-manager.ps1 logs"
    }
}

function Start-Fix {
    param([string]$Type = "all")
    
    Write-Status "Starting Fix Process: $Type" "Blue"
    Write-Status "=========================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    try {
        $fixCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} fix ${Type}"
        Invoke-ServerCommand $fixCommand "Running fix process on server"
        Write-Success "Fix process completed"
        
        # Check status after fix
        Write-Info "Checking status after fix..."
        Start-Sleep 2
        Get-ServerStatus
    }
    catch {
        Write-Error "Fix process failed"
        Write-Info "Try checking logs: .\filmflex-manager.ps1 logs"
    }
}

function Restart-Application {
    Write-Status "Restarting Application" "Blue"
    Write-Status "======================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    try {
        $restartCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} restart"
        Invoke-ServerCommand $restartCommand "Restarting application on server"
        Write-Success "Application restarted successfully"
    }
    catch {
        Write-Error "Failed to restart application"
    }
}

function Get-Logs {
    param([string]$Lines = "20")
    
    Write-Status "Viewing Application Logs" "Blue"
    Write-Status "========================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    try {
        $logsCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} logs ${Lines}"
        Invoke-ServerCommand $logsCommand "Getting application logs from server"
    }
    catch {
        Write-Error "Failed to retrieve logs"
    }
}

function Start-HealthCheck {
    Write-Status "Running Health Check" "Blue"
    Write-Status "====================" "Blue"
    
    if (-not (Test-PuttyTools)) { return }
    
    try {
        $healthCommand = "cd ${REMOTE_PATH}; ./${DEPLOY_SCRIPT} health"
        Invoke-ServerCommand $healthCommand "Running comprehensive health check"
    }
    catch {
        Write-Error "Health check failed"
    }
}

function Show-Help {
    Write-Status "FilmFlex Unified Windows Deployment Manager" "Green"
    Write-Status "============================================" "Green"
    Write-Host ""
    Write-Status "Usage: .\filmflex-manager.ps1 [command] [options]" "White"
    Write-Host ""
    Write-Status "Commands:" "Yellow"
    Write-Status "  status                     Check application status on server" "White"
    Write-Status "  upload                     Upload files to server" "White"
    Write-Status "  deploy [quick|full]        Deploy application (default: quick)" "White"
    Write-Status "  fix [cors|errors|all]      Fix specific issues (default: all)" "White"
    Write-Status "  restart                    Restart application" "White"
    Write-Status "  logs [lines]               View logs (default: 20 lines)" "White"
    Write-Status "  health                     Run comprehensive health check" "White"
    Write-Host ""
    Write-Status "Examples:" "Yellow"
    Write-Status "  .\filmflex-manager.ps1 status" "Cyan"
    Write-Status "  .\filmflex-manager.ps1 deploy quick" "Cyan"
    Write-Status "  .\filmflex-manager.ps1 fix cors" "Cyan"
    Write-Status "  .\filmflex-manager.ps1 logs 50" "Cyan"
    Write-Host ""
    Write-Status "Prerequisites:" "Yellow"
    Write-Status "  - PuTTY tools (pscp, plink) must be installed and in PATH" "White"
    Write-Status "  - Server credentials configured correctly" "White"
    Write-Host ""
    Write-Status "Server Details:" "Yellow"
    Write-Status "  Server: $SERVER" "White"
    Write-Status "  Username: $USERNAME" "White"
    Write-Status "  Remote Path: $REMOTE_PATH" "White"
}

# Main execution
try {
    switch ($Command.ToLower()) {
        "status" {
            Get-ServerStatus
        }
        "upload" {
            Upload-Files | Out-Null
        }
        "deploy" {
            $deployType = if ($Option -and $Option -in @("quick", "full")) { $Option } else { "quick" }
            Start-Deployment -Type $deployType
        }
        "fix" {
            $fixType = if ($Option -and $Option -in @("cors", "errors", "all")) { $Option } else { "all" }
            Start-Fix -Type $fixType
        }
        "restart" {
            Restart-Application
        }
        "logs" {
            $logLines = if ($Option -and $Option -match '^\d+$') { $Option } else { "20" }
            Get-Logs -Lines $logLines
        }
        "health" {
            Start-HealthCheck
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "Unknown command: $Command"
            Show-Help
        }
    }
}
catch {
    Write-Error "Error executing command: $($_.Exception.Message)"
    Write-Info "Run '.\filmflex-manager.ps1 help' for usage information"
}

Write-Host ""
Write-Status "FilmFlex Management Complete" "Green"
