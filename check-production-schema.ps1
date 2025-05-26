# Production Database Schema Verification Script
# This script checks the current state of production database

Write-Host "=== Production Database Schema Check ===" -ForegroundColor Green

# Check what columns currently exist on production
$checkScript = @"
-- Check current movies table structure
SELECT 
    'movies' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movies' 
AND column_name IN ('categories', 'countries', 'is_recommended', 'section', 'episode_current', 'episode_total', 'movie_id', 'description')

UNION ALL

-- Check episodes table structure
SELECT 
    'episodes' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'episodes'
ORDER BY table_name, column_name;

-- Check total movies count
SELECT COUNT(*) as total_movies FROM movies;

-- Check recommended movies count  
SELECT COUNT(*) as recommended_movies FROM movies WHERE is_recommended = true;

-- Check if episodes table exists and its structure
SELECT 
    'episodes_check' as info,
    COUNT(*) as total_episodes 
FROM episodes;

-- Check categories/countries data type specifically
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'movies' 
AND column_name IN ('categories', 'countries');

-- Check episodes table constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('movies', 'episodes')
AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_name;
"@

Write-Host "SQL Query to run on production:" -ForegroundColor Yellow
Write-Host $checkScript

Write-Host "`nTo check production database, run this on the server:" -ForegroundColor Cyan
Write-Host "sudo -u postgres psql -d filmflex" -ForegroundColor White
Write-Host "Then paste the SQL above" -ForegroundColor White

Write-Host "`nExpected Results:" -ForegroundColor Yellow
Write-Host "Movies Table:" -ForegroundColor White
Write-Host "- categories and countries should be 'jsonb' type to match local" -ForegroundColor White
Write-Host "- is_recommended, section, episode_current, episode_total should exist" -ForegroundColor White
Write-Host "- movie_id column should exist with unique constraint" -ForegroundColor White
Write-Host "- Some movies should have is_recommended = true" -ForegroundColor White
Write-Host "`nEpisodes Table:" -ForegroundColor White
Write-Host "- Should exist with exact schema: id, name, slug, movie_slug, server_name, filename, link_embed, link_m3u8" -ForegroundColor White
Write-Host "- Should have PRIMARY KEY on id and UNIQUE constraint on slug" -ForegroundColor White
Write-Host "- Should be empty initially (episodes imported with movies)" -ForegroundColor White
