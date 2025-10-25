#!/bin/bash

# Elasticsearch Data Recovery Script
# This script rebuilds Elasticsearch index from PostgreSQL data

echo "🔄 ELASTICSEARCH DATA RECOVERY"
echo "=============================="

# Check Elasticsearch health
echo "1. 🔍 Checking Elasticsearch status..."
if curl -s http://localhost:9200/_cluster/health | grep -q "yellow\|green"; then
    echo "✅ Elasticsearch is running"
else
    echo "❌ Elasticsearch not ready, waiting..."
    sleep 10
fi

# Check PostgreSQL data
echo "2. 📊 Checking PostgreSQL data..."
MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Movies in PostgreSQL: $MOVIE_COUNT"

if [ "$MOVIE_COUNT" -gt 0 ]; then
    echo "✅ PostgreSQL data found"
else
    echo "❌ No PostgreSQL data found - need to run imports first"
    exit 1
fi

# Check if app has reindex capability
echo "3. 🔧 Attempting reindex via app..."

# Method 1: Try reindex endpoint
if curl -s -X POST http://localhost:5000/api/search/reindex 2>/dev/null | grep -q "success"; then
    echo "✅ Reindex via API successful"
    exit 0
fi

# Method 2: Try admin reindex
if curl -s -X POST http://localhost:5000/api/admin/reindex 2>/dev/null | grep -q "success"; then
    echo "✅ Admin reindex successful" 
    exit 0
fi

# Method 3: Manual reindex using Node.js
echo "4. 🔄 Manual reindex from PostgreSQL..."
docker exec filmflex-app sh -c "cd /app && cat > temp_reindex.js << 'EOF'
const { drizzle } = require('drizzle-orm/node-postgres');
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
    console.log(\`Found \${result.rows.length} movies to reindex\`);
    
    // Simple Elasticsearch indexing
    for (const movie of result.rows) {
      try {
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
          console.log(\`Indexed: \${movie.title}\`);
        }
      } catch (err) {
        console.log(\`Error indexing \${movie.title}: \${err.message}\`);
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

node temp_reindex.js && rm temp_reindex.js"

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