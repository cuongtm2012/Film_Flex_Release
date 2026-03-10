#!/bin/bash

# Elasticsearch Data Recovery Script
# This script rebuilds Elasticsearch index from PostgreSQL data

echo "🔄 ELASTICSEARCH DATA RECOVERY"
echo "=============================="

# Function to check status
check_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
        return 0
    else
        echo "❌ $1"
        return 1
    fi
}

# Check Elasticsearch health
echo "1. 🔍 Checking Elasticsearch status..."
ES_RESPONSE=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null)
if echo "$ES_RESPONSE" | grep -q "yellow\|green"; then
    echo "✅ Elasticsearch is running"
else
    echo "❌ Elasticsearch not ready - Response: $ES_RESPONSE"
    echo "Waiting 10 seconds and retrying..."
    sleep 10
    if ! curl -s http://localhost:9200/_cluster/health | grep -q "yellow\|green"; then
        echo "❌ Elasticsearch still not ready - check container logs"
        docker logs filmflex-elasticsearch --tail=10
    fi
fi

# Check PostgreSQL data
echo "2. 📊 Checking PostgreSQL data..."
MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' \n' | grep -o '[0-9]*' || echo "0")
echo "Movies in PostgreSQL: $MOVIE_COUNT"

if [ "$MOVIE_COUNT" -gt 0 ] 2>/dev/null; then
    echo "✅ PostgreSQL data found ($MOVIE_COUNT movies)"
else
    echo "❌ No PostgreSQL data found (count: '$MOVIE_COUNT')"
    echo "💡 Need to run movie import first:"
    echo "   bash scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=1"
    exit 1
fi

# Try reindex via app API
echo "3. 🔧 Attempting reindex via app API..."

# Method 1: Try reindex endpoint
echo "Trying /api/search/reindex..."
API_RESULT=$(curl -s -X POST http://localhost:5000/api/search/reindex 2>/dev/null)
if echo "$API_RESULT" | grep -q "success\|completed\|reindex"; then
    echo "✅ Reindex via API successful - Response: $API_RESULT"
    exit 0
else
    echo "❌ API reindex failed - Response: $API_RESULT"
fi

# Method 2: Try admin reindex
echo "Trying /api/admin/reindex..."
ADMIN_RESULT=$(curl -s -X POST http://localhost:5000/api/admin/reindex 2>/dev/null)
if echo "$ADMIN_RESULT" | grep -q "success\|completed\|reindex"; then
    echo "✅ Admin reindex successful - Response: $ADMIN_RESULT"
    exit 0
else
    echo "❌ Admin reindex failed - Response: $ADMIN_RESULT"
fi

# Method 3: Manual reindex using Node.js
echo "4. 🔄 Manual reindex from PostgreSQL..."

# Create reindex script
cat > /tmp/temp_reindex.js << 'EOF'
const { Client } = require('pg');

async function reindexMovies() {
  try {
    console.log('Starting manual reindex...');
    
    // Connect to PostgreSQL
    const client = new Client({
      host: 'filmflex-postgres',
      port: 5432,
      database: 'filmflex',
      user: 'filmflex',
      password: 'filmflex123'
    });
    
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Get all movies
    const result = await client.query('SELECT * FROM movies LIMIT 100');
    console.log(`Found ${result.rows.length} movies to reindex`);
    
    // Simple Elasticsearch indexing
    for (const movie of result.rows) {
      try {
        const fetch = require('node-fetch');
        const response = await fetch('http://filmflex-elasticsearch:9200/movies/_doc/' + movie.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: movie.title,
            slug: movie.slug,
            description: movie.description,
            year: movie.year,
            country: movie.country,
            categories: movie.categories
          })
        });
        
        if (response.ok) {
          console.log(`Indexed: ${movie.title}`);
        }
      } catch (err) {
        console.log(`Error indexing ${movie.title}: ${err.message}`);
      }
    }
    
    await client.end();
    console.log('Reindex completed');
    
  } catch (error) {
    console.error('Reindex failed:', error);
  }
}

reindexMovies();
EOF

# Run the reindex script
docker exec filmflex-app sh -c "cd /app && node /tmp/temp_reindex.js"
rm -f /tmp/temp_reindex.js

# Check results
echo "5. 📊 Checking reindex results..."
sleep 5

ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "Movies in Elasticsearch: $ES_COUNT"

if [ "$ES_COUNT" -gt 0 ]; then
    echo "✅ SUCCESS! Elasticsearch data recovered"
    echo "🔍 Search functionality should work now"
else
    echo "❌ Manual reindex may have failed"
    echo "💡 Try running movie import which will also populate search"
    echo "   docker exec filmflex-app node scripts/data/import-movies-docker.cjs --max-pages=1"
fi

echo "
🎯 Next steps:
1. Test search on website
2. If search still doesn't work, run a fresh import:
   bash /root/Film_Flex_Release/scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=1
"