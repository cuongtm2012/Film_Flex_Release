# Test JSON validation fixes on production server
Write-Host "=== Testing JSON Validation Fixes on Production ===" -ForegroundColor Green

# Production server connection (adjust as needed)
$productionServer = "root@your-production-server"  # Replace with actual server

Write-Host "1. Copying test script to production server..." -ForegroundColor Yellow

# Copy the test script to production (if using SSH)
# scp test-json-validation.js $productionServer:/root/Film_Flex_Release/

Write-Host "2. Running JSON validation test..." -ForegroundColor Yellow

# Commands to run on production server
$testCommands = @"
cd /root/Film_Flex_Release
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node test-json-validation.js
"@

Write-Host "Run these commands on your production server:" -ForegroundColor Cyan
Write-Host $testCommands -ForegroundColor White

Write-Host "`n3. Alternative: Run import with fixed validation..." -ForegroundColor Yellow

$importCommands = @"
cd /root/Film_Flex_Release/scripts/data
export DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
node import-movies-sql.cjs --single-page --page-size=3
"@

Write-Host "To test the import script with fixes:" -ForegroundColor Cyan
Write-Host $importCommands -ForegroundColor White

Write-Host "`n4. Expected Results:" -ForegroundColor Yellow
Write-Host "- JSON validation should pass for all movies" -ForegroundColor White
Write-Host "- Database inserts should succeed without 'invalid input syntax for type json' errors" -ForegroundColor White
Write-Host "- Categories and countries should be properly formatted as JSON arrays" -ForegroundColor White
