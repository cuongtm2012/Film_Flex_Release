# PowerShell Script to Change PostgreSQL filmflex User Password
# For use on production server via SSH or direct access

param(
    [string]$NewPassword = "filmflex2024"
)

Write-Host "🔧 PostgreSQL Password Change Script" -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Blue

# Function to execute PostgreSQL commands
function Invoke-PostgresCommand {
    param([string]$Command)
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "sudo"
    $processInfo.Arguments = "-u postgres psql -c `"$Command`""
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null
    $process.WaitForExit()
    
    return @{
        ExitCode = $process.ExitCode
        Output = $process.StandardOutput.ReadToEnd()
        Error = $process.StandardError.ReadToEnd()
    }
}

# Step 1: Update filmflex user password
Write-Host "Step 1: Updating filmflex user password..." -ForegroundColor Yellow

$sqlCommand = @"
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'filmflex') THEN
        CREATE USER filmflex WITH PASSWORD '$NewPassword';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        ALTER USER filmflex CREATEDB;
        RAISE NOTICE 'Created filmflex user with password: $NewPassword';
    ELSE
        ALTER USER filmflex PASSWORD '$NewPassword';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        RAISE NOTICE 'Updated filmflex user password to: $NewPassword';
    END IF;
END`$`$;
"@

# Execute the command using bash
$bashCommand = "sudo -u postgres psql -c `"$sqlCommand`""
$result = bash -c $bashCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL user password updated successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update PostgreSQL user password" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    exit 1
}

# Step 2: Test the new password
Write-Host "Step 2: Testing new password..." -ForegroundColor Yellow

$env:PGPASSWORD = $NewPassword
$testCommand = "psql -h localhost -U filmflex -d filmflex -c `"SELECT version();`""
$testResult = bash -c $testCommand 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Password test successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Password test failed. Checking database existence..." -ForegroundColor Red
    
    # Try to create database if it doesn't exist
    bash -c "sudo -u postgres createdb filmflex 2>/dev/null || echo 'Database may already exist'"
    bash -c "sudo -u postgres psql -c `"GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;`" || true"
    
    # Test again
    $env:PGPASSWORD = $NewPassword
    $testResult2 = bash -c "psql -h localhost -U filmflex -d filmflex -c `"SELECT 1;`"" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Password test successful after database creation!" -ForegroundColor Green
    } else {
        Write-Host "❌ Password test still failing" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Display connection info
Write-Host "Step 3: Connection Information" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
Write-Host "Database User: filmflex" -ForegroundColor Cyan
Write-Host "Database Password: $NewPassword" -ForegroundColor Cyan
Write-Host "Database Name: filmflex" -ForegroundColor Cyan
Write-Host "Connection String: postgresql://filmflex:$NewPassword@localhost:5432/filmflex" -ForegroundColor Cyan

# Step 4: Check user permissions
Write-Host "Step 4: Verifying user permissions..." -ForegroundColor Yellow
bash -c "sudo -u postgres psql -c `"\du filmflex`""

# Step 5: Update environment file
Write-Host "Step 5: Updating environment configuration..." -ForegroundColor Yellow

$envFile = "$env:HOME/.env"
$connectionString = "DATABASE_URL=postgresql://filmflex:$NewPassword@localhost:5432/filmflex?sslmode=disable"

if (Test-Path $envFile) {
    # Backup existing env file
    $backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envFile $backupFile
    
    # Update DATABASE_URL in env file
    $content = Get-Content $envFile
    $updatedContent = $content -replace 'DATABASE_URL=.*', $connectionString
    
    if ($content -match 'DATABASE_URL=') {
        $updatedContent | Set-Content $envFile
        Write-Host "✅ Updated DATABASE_URL in $envFile" -ForegroundColor Green
    } else {
        Add-Content $envFile $connectionString
        Write-Host "✅ Added DATABASE_URL to $envFile" -ForegroundColor Green
    }
} else {
    $connectionString | Set-Content $envFile
    Write-Host "✅ Created $envFile with DATABASE_URL" -ForegroundColor Green
}

# Step 6: Final verification
Write-Host "Step 6: Final verification..." -ForegroundColor Yellow

$env:PGPASSWORD = $NewPassword
$finalTest = bash -c "psql -h localhost -U filmflex -d filmflex -c `"SELECT 'Connection successful!' as status;`"" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All tests passed! PostgreSQL password change complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Blue
    Write-Host "1. Restart your application to use the new password"
    Write-Host "2. Update any PM2 ecosystem config files if needed"
    Write-Host "3. Test your application login"
    Write-Host ""
    Write-Host "Connection Details:" -ForegroundColor Blue
    Write-Host "  User: filmflex"
    Write-Host "  Password: $NewPassword"
    Write-Host "  Database: filmflex"
    Write-Host "  Full URL: postgresql://filmflex:$NewPassword@localhost:5432/filmflex?sslmode=disable"
} else {
    Write-Host "❌ Final verification failed" -ForegroundColor Red
    Write-Host "Manual intervention may be required."
    exit 1
}
