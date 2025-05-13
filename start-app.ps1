# Run this script after setup-postgres.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Green
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist"
}
if (-not (Test-Path "dist/public")) {
    New-Item -ItemType Directory -Path "dist/public"
}
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Build the client
Write-Host "Building client..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build client" -ForegroundColor Red
    exit 1
}

# Generate timestamp for log file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "logs/server_${timestamp}.log"

# Start the server
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "Server logs will be written to: $logFile" -ForegroundColor Yellow
Write-Host "Server will be available at: http://localhost:3000" -ForegroundColor Yellow

try {
    # Start the server and capture output
    $serverProcess = Start-Process -FilePath "node" -ArgumentList "dist/index.js" -NoNewWindow -PassThru -RedirectStandardOutput $logFile
    
    # Wait a moment for the server to start
    Start-Sleep -Seconds 2
    
    # Check if the server is still running
    if (-not $serverProcess.HasExited) {
        Write-Host "Server started successfully!" -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        
        # Keep the script running and wait for the server process
        $serverProcess.WaitForExit()
    } else {
        Write-Host "Server failed to start. Check the log file for details:" -ForegroundColor Red
        if (Test-Path $logFile) {
            Get-Content $logFile -Tail 10
        }
    }
} catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    if (Test-Path $logFile) {
        Write-Host "Last few lines of log file:" -ForegroundColor Yellow
        Get-Content $logFile -Tail 10
    }
    exit 1
} 