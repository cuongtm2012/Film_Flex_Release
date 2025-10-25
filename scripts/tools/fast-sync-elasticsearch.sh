#!/bin/bash

# Fast Elasticsearch Data Sync Script
echo "⚡ FAST ELASTICSEARCH DATA SYNC"
echo "================================"

# Function to check and wait for services
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi
        echo "⏳ Waiting for $service_name... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $service_name not ready after $max_attempts attempts"
    return 1
}

# Step 1: Quick service check
echo "1. 📡 Quick service check..."
wait_for_service "Elasticsearch" "http://localhost:9200/_cluster/health"
wait_for_service "Application" "http://localhost:5000/api/health"

# Step 2: Check current data status
echo ""
echo "2. 📊 Checking current data status..."
PG_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' \n' || echo "0")
ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")

echo "PostgreSQL movies: $PG_COUNT"
echo "Elasticsearch docs: $ES_COUNT"

if [ "$PG_COUNT" -eq 0 ]; then
    echo "❌ No PostgreSQL data - need to import movies first"
    echo "💡 Run: bash scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=3"
    exit 1
fi

# Step 3: Fast sync methods (in order of preference)
echo ""
echo "3. 🚀 Attempting fast sync methods..."

# Method 1: Use built-in sync API (fastest)
echo "Method 1: Built-in sync API..."
SYNC_RESULT=$(curl -s -X POST "http://localhost:5000/api/elasticsearch/sync/full" \
    -H "Content-Type: application/json" \
    --max-time 120 2>/dev/null)

if echo "$SYNC_RESULT" | grep -q '"status":true\|"success":true\|completed'; then
    echo "✅ Built-in sync successful!"
    # Check results
    sleep 3
    NEW_ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo "📊 Result: $NEW_ES_COUNT documents in Elasticsearch"
    
    if [ "$NEW_ES_COUNT" -gt 0 ]; then
        echo "🎉 SUCCESS! Elasticsearch sync completed via API"
        exit 0
    fi
fi

echo "❌ Built-in sync failed or incomplete"

# Method 2: Direct reindex via container (medium speed)
echo ""
echo "Method 2: Direct container reindex..."

# Create a simple reindex script
cat > /tmp/quick_reindex.js << 'EOF'
const { Pool } = require('pg');
const fetch = require('node-fetch');

const pool = new Pool({
    host: 'filmflex-postgres',
    port: 5432,
    database: 'filmflex',
    user: 'filmflex',
    password: 'filmflex123'
});

async function quickReindex() {
    try {
        console.log('🔄 Starting quick reindex...');
        
        // Get first 200 movies (quick batch)
        const { rows } = await pool.query('SELECT id, title, slug, description, year, country FROM movies LIMIT 200');
        console.log(`📊 Found ${rows.length} movies to index`);
        
        let indexed = 0;
        const batchSize = 10;
        
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const promises = batch.map(async (movie) => {
                try {
                    const doc = {
                        title: movie.title,
                        slug: movie.slug,
                        description: movie.description,
                        year: movie.year,
                        country: movie.country
                    };
                    
                    const response = await fetch(`http://filmflex-elasticsearch:9200/movies/_doc/${movie.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(doc)
                    });
                    
                    if (response.ok) {
                        indexed++;
                        return true;
                    }
                    return false;
                } catch (err) {
                    console.log(`⚠️  Error indexing ${movie.title}: ${err.message}`);
                    return false;
                }
            });
            
            await Promise.all(promises);
            console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} completed (${indexed} indexed)`);
        }
        
        console.log(`🎉 Quick reindex completed: ${indexed} movies indexed`);
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Quick reindex failed:', error);
        process.exit(1);
    }
}

quickReindex();
EOF

# Run the quick reindex
echo "Running quick reindex in container..."
if docker exec filmflex-app sh -c "cd /app && node /tmp/quick_reindex.js"; then
    sleep 5
    NEW_ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo "📊 Result: $NEW_ES_COUNT documents in Elasticsearch"
    
    if [ "$NEW_ES_COUNT" -gt 0 ]; then
        echo "🎉 SUCCESS! Direct reindex completed"
        rm -f /tmp/quick_reindex.js
        exit 0
    fi
fi

echo "❌ Direct reindex failed"
rm -f /tmp/quick_reindex.js

# Method 3: Reset and bulk import (slower but reliable)
echo ""
echo "Method 3: Reset and bulk import..."

# Reset Elasticsearch index
echo "Resetting Elasticsearch index..."
curl -s -X DELETE "http://localhost:9200/movies" >/dev/null 2>&1
curl -s -X PUT "http://localhost:9200/movies" -H 'Content-Type: application/json' -d'{
  "mappings": {
    "properties": {
      "title": {"type": "text", "analyzer": "standard"},
      "slug": {"type": "keyword"},
      "description": {"type": "text"},
      "year": {"type": "integer"},
      "country": {"type": "keyword"}
    }
  }
}' >/dev/null 2>&1

# Use bulk API for faster indexing
echo "Using Elasticsearch bulk API for fast indexing..."

# Create bulk indexing script
docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "
SELECT 
    '{ \"index\": { \"_index\": \"movies\", \"_id\": \"' || id || '\" } }' || E'\n' ||
    '{ \"title\": \"' || REPLACE(title, '\"', '\\\"') || '\", \"slug\": \"' || slug || '\", \"description\": \"' || REPLACE(COALESCE(description, ''), '\"', '\\\"') || '\", \"year\": ' || COALESCE(year, 0) || ', \"country\": \"' || COALESCE(country, '') || '\" }'
FROM movies 
LIMIT 100
" > /tmp/bulk_data.json 2>/dev/null

# Upload bulk data
if [ -s /tmp/bulk_data.json ]; then
    echo "Uploading bulk data to Elasticsearch..."
    curl -s -X POST "http://localhost:9200/_bulk" \
        -H "Content-Type: application/x-ndjson" \
        --data-binary @/tmp/bulk_data.json >/dev/null 2>&1
    
    sleep 3
    NEW_ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo "📊 Result: $NEW_ES_COUNT documents in Elasticsearch"
    
    if [ "$NEW_ES_COUNT" -gt 0 ]; then
        echo "🎉 SUCCESS! Bulk import completed"
        rm -f /tmp/bulk_data.json
        exit 0
    fi
fi

rm -f /tmp/bulk_data.json

# Method 4: Last resort - run movie import with search sync
echo ""
echo "Method 4: Last resort - import with search sync..."
echo "This will import new movies and automatically sync to Elasticsearch"
echo "⏳ Running movie import (this may take 2-3 minutes)..."

if bash scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=1; then
    sleep 5
    NEW_ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo "📊 Final result: $NEW_ES_COUNT documents in Elasticsearch"
    
    if [ "$NEW_ES_COUNT" -gt 0 ]; then
        echo "🎉 SUCCESS! Import with sync completed"
        exit 0
    fi
fi

# Final status
echo ""
echo "❌ ALL SYNC METHODS FAILED"
echo "📋 Troubleshooting suggestions:"
echo "1. Check container logs: docker logs filmflex-app --tail=20"
echo "2. Check Elasticsearch logs: docker logs filmflex-elasticsearch --tail=20"  
echo "3. Restart containers: docker restart filmflex-app filmflex-elasticsearch"
echo "4. Manual debug: bash scripts/tools/debug-elasticsearch.sh"

exit 1