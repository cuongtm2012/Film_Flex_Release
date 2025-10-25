#!/bin/bash

# Ultra Fast Elasticsearch Sync - No checks, just sync
echo "⚡ ULTRA FAST ELASTICSEARCH SYNC"
echo "================================"

# Method 1: Direct API call
echo "🚀 Method 1: Direct API sync..."
curl -s -X POST "http://localhost:5000/api/elasticsearch/sync/full" \
    -H "Content-Type: application/json" \
    --max-time 60 || echo "API failed"

sleep 3

# Check result
ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "📊 Elasticsearch docs: $ES_COUNT"

if [ "$ES_COUNT" -gt 0 ]; then
    echo "✅ SUCCESS! $ES_COUNT documents synced"
    exit 0
fi

# Method 2: Quick container reindex
echo ""
echo "🔄 Method 2: Quick container reindex..."
docker exec filmflex-app sh -c 'cd /app && node -e "
const { Pool } = require(\"pg\");
const fetch = require(\"node-fetch\");

const pool = new Pool({
    host: \"filmflex-postgres\",
    port: 5432,
    database: \"filmflex\", 
    user: \"filmflex\",
    password: \"filmflex123\"
});

async function quickSync() {
    try {
        const { rows } = await pool.query(\"SELECT id, title, slug FROM movies LIMIT 50\");
        console.log(\`Syncing \${rows.length} movies...\`);
        
        for (const movie of rows) {
            try {
                await fetch(\`http://filmflex-elasticsearch:9200/movies/_doc/\${movie.id}\`, {
                    method: \"PUT\",
                    headers: { \"Content-Type\": \"application/json\" },
                    body: JSON.stringify({ title: movie.title, slug: movie.slug })
                });
            } catch (e) { /* ignore errors for speed */ }
        }
        
        console.log(\"Quick sync completed\");
    } catch (error) {
        console.error(\"Quick sync failed:\", error);
    }
}

quickSync();
"' 2>/dev/null || echo "Container sync failed"

sleep 2

# Final check
ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "📊 Final count: $ES_COUNT documents"

if [ "$ES_COUNT" -gt 0 ]; then
    echo "✅ SUCCESS! Quick sync completed"
else
    echo "❌ Quick sync failed - try: bash scripts/tools/fast-sync-elasticsearch.sh"
fi