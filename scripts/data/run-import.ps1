# FilmFlex Database Setup and Import Helper
# This script handles database setup and runs the import process

# Define colors for PowerShell output
$esc = [char]27
$reset = "$esc[0m"
$blue = "$esc[34m"
$green = "$esc[32m"
$red = "$esc[31m"
$yellow = "$esc[33m"

# Configuration
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "filmflex"
$DB_USER = "filmflex"
$DB_PASS = "filmflex2024"

# Set environment variables
$env:DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
$env:NODE_ENV = "production"

# Get script directory paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$APP_DIR = Split-Path -Parent $SCRIPT_DIR
$LOG_DIR = Join-Path $APP_DIR "log"

# Ensure log directory exists
if (!(Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
}

Write-Host "${blue}================================================="
Write-Host "       FilmFlex Database Import Helper"
Write-Host "=================================================${reset}"

# Verify database connection
try {
    Write-Host "${blue}Verifying database connection...${reset}"
    $result = & psql $env:DATABASE_URL -c "\conninfo" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed"
    }
    Write-Host "${green}Database connection successful${reset}"
} catch {
    Write-Host "${red}Error: Database connection failed. Please check your PostgreSQL installation and credentials.${reset}"
    Write-Host "${red}Error details: $_${reset}"
    exit 1
}

# Apply database migrations
Write-Host "${blue}Applying database migrations...${reset}"
$migrationSql = @"
-- Add episode fields to movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS episode_current TEXT,
ADD COLUMN IF NOT EXISTS episode_total TEXT;

-- Update episode fields index
CREATE INDEX IF NOT EXISTS idx_movies_episode ON movies(episode_current, episode_total);

-- Fix any existing NULL episode_total values
UPDATE movies 
SET episode_total = (
    SELECT COUNT(*)::TEXT 
    FROM episodes 
    WHERE episodes.movie_slug = movies.slug
)
WHERE episode_total IS NULL;

-- Set default values for episode fields
UPDATE movies 
SET episode_current = COALESCE(episode_current, 'Full')
WHERE episode_current IS NULL;

UPDATE movies 
SET episode_total = COALESCE(episode_total, '1')
WHERE episode_total IS NULL OR episode_total = '0' OR episode_total = '';
"@

try {
    $migrationSql | psql $env:DATABASE_URL
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed"
    }
    Write-Host "${green}Database migrations applied successfully${reset}"
} catch {
    Write-Host "${red}Error applying migrations: $_${reset}"
    exit 1
}

# Run the import script
Write-Host "${blue}Starting movie import process...${reset}"
try {
    $importScript = Join-Path $APP_DIR "scripts\data\import-movies-sql.cjs"
    & node $importScript
    if ($LASTEXITCODE -ne 0) {
        throw "Import script failed"
    }
    Write-Host "${green}Movie import completed successfully${reset}"
} catch {
    Write-Host "${red}Error running import script: $_${reset}"
    exit 1
}

Write-Host "${blue}================================================="
Write-Host "                Process completed"
Write-Host "=================================================${reset}"
