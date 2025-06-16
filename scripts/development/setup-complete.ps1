# Set environment variables
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
$env:SESSION_SECRET = "local_development_secret"
$env:PORT = "3000"
$env:DEBUG = "*"
$env:NODE_OPTIONS="--trace-warnings"

# Add PostgreSQL to PATH
$pgPath = "C:\Program Files\PostgreSQL\17\bin"
if (-not ($env:Path -split ';' -contains $pgPath)) {
    $env:Path += ";$pgPath"
}

Write-Host "Setting up FilmFlex..." -ForegroundColor Cyan

# Create necessary directories
Write-Host "`nStep 1: Creating necessary directories..." -ForegroundColor Green
if (-not (Test-Path "dist")) { 
    Write-Host "Creating dist directory..."
    New-Item -ItemType Directory -Path "dist" 
}
if (-not (Test-Path "dist\public")) { 
    Write-Host "Creating dist\public directory..."
    New-Item -ItemType Directory -Path "dist\public" 
}
if (-not (Test-Path "logs")) { 
    Write-Host "Creating logs directory..."
    New-Item -ItemType Directory -Path "logs" 
}

# Test database connection
Write-Host "`nStep 2: Testing database connection..." -ForegroundColor Green
try {
    Write-Host "Attempting to connect to PostgreSQL..."
    $output = & psql -U postgres -c "\l" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database connection failed! Error:" -ForegroundColor Red
        Write-Host $output
        Write-Host "Please make sure PostgreSQL is running and the password is correct" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Database connection successful!" -ForegroundColor Green
} catch {
    Write-Host "Failed to connect to database: $_" -ForegroundColor Red
    Write-Host "Please make sure PostgreSQL is running and the password is correct" -ForegroundColor Yellow
    exit 1
}

# Initialize database
Write-Host "`nStep 3: Initializing database..." -ForegroundColor Green
try {
    Write-Host "Running database initialization script..."
    & psql -U postgres -f init-db.sql
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database initialization failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database initialized successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to initialize database: $_" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`nStep 4: Installing dependencies..." -ForegroundColor Green
Write-Host "Running npm install..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed successfully!" -ForegroundColor Green

# Build client
Write-Host "`nStep 5: Building client..." -ForegroundColor Green
Write-Host "Running npm build..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build client!" -ForegroundColor Red
    exit 1
}
Write-Host "Client built successfully!" -ForegroundColor Green

# Push database schema
Write-Host "`nStep 6: Pushing database schema..." -ForegroundColor Green
Write-Host "Running database schema push..."
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push database schema!" -ForegroundColor Red
    exit 1
}
Write-Host "Database schema pushed successfully!" -ForegroundColor Green

# Get timestamp for log file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "logs\server_$timestamp.log"

Write-Host "`nStep 7: Starting server..." -ForegroundColor Green
Write-Host "Server will be available at http://localhost:3000"
Write-Host "Debug interface will be available at chrome://inspect"
Write-Host "Logging output to $logFile"
Write-Host "`nPress Ctrl+C to stop the server`n"

# Start the server with all output captured
try {
    Write-Host "Starting server process..."
    $env:NODE_OPTIONS="--trace-warnings --inspect"
    npx tsx server/index.ts 2>&1 | Tee-Object -FilePath $logFile
} catch {
    Write-Host "`nServer failed to start: $_" -ForegroundColor Red
    Write-Host "Check $logFile for details"
    
    # Display the last few lines of the log file if it exists
    if (Test-Path $logFile) {
        Write-Host "`nLast few lines of the log file:" -ForegroundColor Yellow
        Get-Content $logFile -Tail 20
    }
    exit 1
} 