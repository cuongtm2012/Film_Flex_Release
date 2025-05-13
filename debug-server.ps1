# Set environment variables
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
$env:SESSION_SECRET = "local_development_secret"
$env:PORT = "3000"
$env:DEBUG = "*"

Write-Host "Testing database connection..."
try {
    $output = & psql -U postgres -c "\l" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database connection failed! Error:" -ForegroundColor Red
        Write-Host $output
        exit 1
    }
} catch {
    Write-Host "Failed to connect to database: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Starting server in debug mode..."
Write-Host "Server will be available at http://localhost:3000"
Write-Host "Debug interface will be available at chrome://inspect"
Write-Host ""

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Get timestamp for log file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "logs\server_$timestamp.log"

Write-Host "Logging output to $logFile"
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

# Start the server and capture all output
try {
    npx tsx --inspect server/index.ts 2>&1 | Tee-Object -FilePath $logFile
} catch {
    Write-Host "Server failed to start: $_" -ForegroundColor Red
    Write-Host "Check $logFile for details"
} 