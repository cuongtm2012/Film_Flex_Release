#!/bin/bash
# Database Verification Script

echo "🔍 Verifying database content..."

# For Docker container
if docker ps | grep -q "filmflex-postgres"; then
    echo "Docker PostgreSQL verification:"
    docker exec filmflex-postgres psql -U filmflex -d filmflex -c "
    SELECT 
        'movies' as table_name, COUNT(*) as row_count FROM movies
    UNION ALL
    SELECT 'episodes', COUNT(*) FROM episodes
    UNION ALL  
    SELECT 'users', COUNT(*) FROM users
    UNION ALL
    SELECT 'view_history', COUNT(*) FROM view_history
    UNION ALL
    SELECT 'watchlist', COUNT(*) FROM watchlist
    ORDER BY table_name;
    "
fi

echo ""
echo "Expected counts from local export:"
echo "Movies: 301"
echo "Episodes: 7047" 
echo "Users: 9"
