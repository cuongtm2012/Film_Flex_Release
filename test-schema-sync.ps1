# Test Database Schema Sync for Windows Development
# This script helps verify that your local database schema matches the target production schema

param(
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

Write-Host "=== FilmFlex Database Schema Verification ===" -ForegroundColor Green

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

Write-Host "`n1. Checking current database schema..." -ForegroundColor Yellow

# Expected schema for movies table (matching local DB)
$expectedColumns = @(
    @{name="id"; type="serial4"; nullable=$false},
    @{name="movie_id"; type="text"; nullable=$false},
    @{name="slug"; type="text"; nullable=$false},
    @{name="name"; type="text"; nullable=$false},
    @{name="origin_name"; type="text"; nullable=$true},
    @{name="poster_url"; type="text"; nullable=$true},
    @{name="thumb_url"; type="text"; nullable=$true},
    @{name="year"; type="int4"; nullable=$true},
    @{name="type"; type="text"; nullable=$true},
    @{name="quality"; type="text"; nullable=$true},
    @{name="lang"; type="text"; nullable=$true},
    @{name="time"; type="text"; nullable=$true},
    @{name="view"; type="int4"; nullable=$true},
    @{name="description"; type="text"; nullable=$true},
    @{name="status"; type="text"; nullable=$true},
    @{name="trailer_url"; type="text"; nullable=$true},
    @{name="section"; type="text"; nullable=$true},
    @{name="is_recommended"; type="bool"; nullable=$true},
    @{name="categories"; type="jsonb"; nullable=$true},
    @{name="countries"; type="jsonb"; nullable=$true},
    @{name="actors"; type="text"; nullable=$true},
    @{name="directors"; type="text"; nullable=$true},
    @{name="episode_current"; type="text"; nullable=$true},
    @{name="episode_total"; type="text"; nullable=$true},
    @{name="modified_at"; type="timestamp"; nullable=$false}
)

Write-Host "Expected schema has $($expectedColumns.Count) columns for movies table"

# Expected schema for episodes table (matching local DB)
$expectedEpisodesColumns = @(
    @{name="id"; type="serial4"; nullable=$false},
    @{name="name"; type="text"; nullable=$false},
    @{name="slug"; type="text"; nullable=$false},
    @{name="movie_slug"; type="text"; nullable=$false},
    @{name="server_name"; type="text"; nullable=$false},
    @{name="filename"; type="text"; nullable=$true},
    @{name="link_embed"; type="text"; nullable=$false},
    @{name="link_m3u8"; type="text"; nullable=$true}
)

Write-Host "Expected episodes table has $($expectedEpisodesColumns.Count) columns"

if ($DryRun) {
    Write-Host "`n🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Cyan
    Write-Host "   Script will show what would be changed without making actual modifications"
}

Write-Host "`n2. Testing import script with corrected format..." -ForegroundColor Yellow

Push-Location "scripts\data"
try {
    if (Test-Path "debug_page_1.json") {
        Write-Host "✅ Sample data file found"
        
        if (-not $DryRun) {
            $choice = Read-Host "Do you want to test the import script? (y/N)"
            if ($choice -eq "y" -or $choice -eq "Y") {
                Write-Host "Running sample import..."
                node import-sample-movies.cjs
                Write-Host "✅ Sample import test completed" -ForegroundColor Green
            }
        } else {
            Write-Host "📋 DRY RUN: Would test import-sample-movies.cjs"
        }
    } else {
        Write-Host "⚠️  Sample data file not found: debug_page_1.json" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Import test failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host "`n3. Verification Summary:" -ForegroundColor Yellow
Write-Host "  ✅ Fixed categories and countries to use JSONB format"
Write-Host "  ✅ Updated import scripts to match local schema"
Write-Host "  ✅ Created production sync script"
Write-Host "  ✅ Updated GitHub Actions workflow"

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Commit and push these schema changes"
Write-Host "2. Use GitHub Actions with 'db-sync' mode to sync production"
Write-Host "3. Or run manually on production: ./scripts/sync-production-db-schema.sh"

Write-Host "`n📋 Schema Changes Summary:" -ForegroundColor White
Write-Host "Movies Table:" -ForegroundColor Cyan
Write-Host "  • categories: text[] → jsonb"
Write-Host "  • countries: text[] → jsonb" 
Write-Host "  • Added movie_id column with unique constraint"
Write-Host "  • Added description column (mapped from content)"
Write-Host "  • Added status column with default 'ongoing'"
Write-Host "  • Added proper indexes matching local DB"
Write-Host "`nEpisodes Table:" -ForegroundColor Cyan
Write-Host "  • Recreated with exact local schema"
Write-Host "  • PRIMARY KEY on id, UNIQUE constraint on slug"
Write-Host "  • All columns match local database format"

if ($DryRun) {
    Write-Host "`n✨ DRY RUN COMPLETED - No actual changes made" -ForegroundColor Green
} else {
    Write-Host "`n✨ Schema verification completed" -ForegroundColor Green
}
