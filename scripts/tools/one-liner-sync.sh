#!/bin/bash

# One-liner sync - fastest possible
echo "⚡ ONE-LINER ELASTICSEARCH SYNC"
echo "==============================="

# Try API first
echo "Trying API sync..."
if curl -s -X POST "http://localhost:5000/api/elasticsearch/sync/full" | grep -q "success\|true\|completed"; then
    echo "✅ API sync successful"
else
    echo "❌ API failed, trying direct method..."
    
    # Direct method - get 20 movies and index them
    docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "
    SELECT 'curl -s -X PUT \"http://localhost:9200/movies/_doc/' || id || '\" -H \"Content-Type: application/json\" -d '\"'\"'{\"title\":\"' || REPLACE(title, '\"', '\\"') || '\",\"slug\":\"' || slug || '\"}\"'\"' || '\""' 
    FROM movies LIMIT 20
    " | bash
    
    echo "✅ Direct method completed"
fi

# Quick check
sleep 2
ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
echo "📊 Result: $ES_COUNT documents in Elasticsearch"

if [ "$ES_COUNT" -gt 0 ]; then
    echo "🎉 SUCCESS!"
else
    echo "❌ Failed - try full sync: bash scripts/tools/fast-sync-elasticsearch.sh"
fi