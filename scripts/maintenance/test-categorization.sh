#!/bin/bash

################################################################################
# Quick Test Script for Movie Categorization
# 
# Description:
#   Tests the categorization logic without making database changes
#   Shows what would be categorized into each section
#   Tests 4 sections only (Anime uses backend fallback)
#
# Usage:
#   ./test-categorization.sh
#
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Movie Categorization Test"
echo "=========================================="
echo ""

# Check if Docker container is running
if docker ps --format '{{.Names}}' | grep -q "filmflex-postgres"; then
    echo "✅ PostgreSQL container is running"
    DB_CONNECTION="docker exec filmflex-postgres psql -U filmflex -d filmflex -t -A"
else
    echo "❌ PostgreSQL container not found. Testing with local connection..."
    DB_CONNECTION="psql -U filmflex -d filmflex -t -A"
fi

echo ""
echo "Testing categorization queries (4 sections)..."
echo "Note: Anime section uses backend fallback (no script categorization)"
echo ""

# Test Trending
echo "📊 TRENDING (Last year + High views):"
echo "----------------------------------------"
CURRENT_YEAR=$(date +%Y)
LAST_YEAR=$((CURRENT_YEAR - 1))

$DB_CONNECTION -c "
SELECT 
    m.slug,
    m.name,
    m.year,
    COALESCE(m.view, 0) as views,
    COUNT(DISTINCT mr.id) as reactions,
    (COALESCE(m.view, 0) * 0.7 + COUNT(DISTINCT mr.id) * 10 * 0.3) as score
FROM movies m
LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
WHERE m.year >= ${LAST_YEAR}
GROUP BY m.id, m.slug, m.name, m.year
ORDER BY score DESC
LIMIT 10;
" | head -10

echo ""
echo "📅 LATEST (Newest by year + update time):"
echo "----------------------------------------"
$DB_CONNECTION -c "
SELECT 
    m.slug,
    m.name,
    m.year,
    m.modified_at::date,
    (m.year * 1000 - EXTRACT(EPOCH FROM (NOW() - m.modified_at)) / 86400)::INTEGER as score
FROM movies m
WHERE m.year IS NOT NULL AND m.year > 1900 AND m.year <= ${CURRENT_YEAR}
ORDER BY score DESC
LIMIT 10;
" | head -10

echo ""
echo "⭐ TOP RATED (High ratings + views):"
echo "----------------------------------------"
$DB_CONNECTION -c "
SELECT 
    m.slug,
    m.name,
    COALESCE(m.view, 0) as views,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
    COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislikes
FROM movies m
LEFT JOIN movie_reactions mr ON m.slug = mr.movie_slug
WHERE COALESCE(m.view, 0) > 100
GROUP BY m.id, m.slug, m.name
ORDER BY (
    (COALESCE(SUM(CASE WHEN mr.reaction_type = 'like' THEN 1 ELSE 0 END), 0) - 
     COALESCE(SUM(CASE WHEN mr.reaction_type = 'dislike' THEN 1 ELSE 0 END), 0)) * 0.6 + 
    (COALESCE(m.view, 0) / 100.0) * 0.4
) DESC
LIMIT 10;
" | head -10

echo ""
echo "📺 POPULAR TV (Series + High views):"
echo "----------------------------------------"
$DB_CONNECTION -c "
SELECT 
    m.slug,
    m.name,
    m.type,
    COALESCE(m.view, 0) as views,
    m.episode_current || '/' || m.episode_total as episodes
FROM movies m
WHERE (
    m.type IN ('series', 'tvshows', 'tv_series') OR
    m.episode_total IS NOT NULL OR
    m.episode_current IS NOT NULL
)
AND m.type != 'hoathinh'
ORDER BY m.view DESC NULLS LAST
LIMIT 10;
" | head -10

echo ""
echo "ℹ️  ANIME (Backend Fallback - Not Categorized by Script):"
echo "----------------------------------------"
echo "Anime section uses automatic backend detection:"
echo "  - type = 'hoathinh' OR"
echo "  - categories containing 'anime' or 'hoạt hình'"
echo ""
echo "Sample anime movies in database:"
$DB_CONNECTION -c "
SELECT 
    m.slug,
    m.name,
    m.type,
    m.year
FROM movies m
WHERE (
    m.type = 'hoathinh' OR
    m.categories::text ILIKE '%anime%' OR
    m.categories::text ILIKE '%hoạt hình%'
)
ORDER BY m.year DESC NULLS LAST, m.modified_at DESC
LIMIT 5;
" | head -5

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ 4 sections tested (Trending, Latest, Top Rated, Popular TV)"
echo "  ℹ️  Anime uses backend fallback (no script categorization)"
echo ""
echo "Next steps:"
echo "1. Review the results above"
echo "2. Run: ./categorize-movies.sh --dry-run (to test without changes)"
echo "3. Run: ./categorize-movies.sh (to actually categorize 4 sections)"
echo ""
