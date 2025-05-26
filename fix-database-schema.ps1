# FilmFlex Database Schema Fix and Setup Script for Windows
# This script applies database fixes and sets up sample data for development

Write-Host "=== FilmFlex Database Schema Fix ===" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the FilmFlex project root directory" -ForegroundColor Red
    exit 1
}

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
    Write-Host "✅ Loaded environment variables from .env file"
} else {
    Write-Host "⚠️  No .env file found"
}

$DATABASE_URL = $env:DATABASE_URL
if (-not $DATABASE_URL) {
    $DATABASE_URL = "postgresql://filmflex:filmflex2024@localhost:5432/filmflex"
    Write-Host "Using default database URL"
}

Write-Host "1. Applying database schema fixes..." -ForegroundColor Yellow

# Apply schema migration
$schemaFile = "migrations\fix_schema_for_recommended_movies.sql"
if (Test-Path $schemaFile) {
    try {
        # You may need to adjust this command based on your PostgreSQL setup
        psql -d filmflex -f $schemaFile
        Write-Host "✅ Database schema fixes applied successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database schema fixes failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "You may need to run this manually or check your PostgreSQL connection" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Schema file not found: $schemaFile" -ForegroundColor Red
}

Write-Host "2. Checking for sample data..." -ForegroundColor Yellow

$sampleDataFile = "scripts\data\debug_page_1.json"
if (Test-Path $sampleDataFile) {
    Write-Host "✅ Sample data file found" -ForegroundColor Green
    
    # Check if we should import sample data
    $choice = Read-Host "Do you want to import sample movie data? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        Push-Location "scripts\data"
        try {
            node import-sample-movies.cjs
            Write-Host "✅ Sample data imported successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Sample data import failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        Pop-Location
    }
} else {
    Write-Host "⚠️  Sample data file not found: $sampleDataFile" -ForegroundColor Yellow
}

Write-Host "3. Summary of changes made:" -ForegroundColor Yellow
Write-Host "  - Fixed categories and countries JSONB formatting in import-movies-sql.cjs"
Write-Host "  - Created schema migration for missing columns"
Write-Host "  - Created sample data import script"
Write-Host "  - Created production deployment scripts"

Write-Host "`n=== Setup completed ===" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit and push these changes to your repository"
Write-Host "2. Deploy to production using GitHub Actions"
Write-Host "3. The fixes will be automatically applied to prevent future issues"
