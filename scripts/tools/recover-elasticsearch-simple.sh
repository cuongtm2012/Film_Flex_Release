#!/bin/bash

# Simple Elasticsearch Recovery Script
echo "🔄 ELASTICSEARCH RECOVERY - Simple Version"
echo "=========================================="

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 - SUCCESS"
    else
        echo "❌ $1 - FAILED"
        return 1
    fi
}

# Step 1: Check containers
echo "1. 🔍 Checking containers..."
docker ps | grep filmflex
check_status "Container check"

# Step 2: Check Elasticsearch
echo ""
echo "2. 📡 Checking Elasticsearch..."
ES_HEALTH=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null)
if echo "$ES_HEALTH" | grep -q "green\|yellow"; then
    echo "✅ Elasticsearch is running"
else
    echo "❌ Elasticsearch not responding. Checking container..."
    docker logs filmflex-elasticsearch --tail=10
fi

# Step 3: Check PostgreSQL data
echo ""
echo "3. 📊 Checking PostgreSQL data..."
MOVIE_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' \n')
echo "Movies in PostgreSQL: $MOVIE_COUNT"

if [ "$MOVIE_COUNT" -gt 0 ]; then
    echo "✅ PostgreSQL has data"
else
    echo "❌ No PostgreSQL data - need to import first"
fi

# Step 4: Try simple reindex methods
echo ""
echo "4. 🔄 Trying reindex methods..."

# Method A: API endpoint
echo "Method A: API reindex..."
API_RESULT=$(curl -s -X POST http://localhost:5000/api/search/reindex 2>/dev/null)
if echo "$API_RESULT" | grep -q "success\|completed\|done"; then
    echo "✅ API reindex worked"
    exit 0
else
    echo "❌ API reindex failed: $API_RESULT"
fi

# Method B: Direct Elasticsearch
echo ""
echo "Method B: Direct Elasticsearch reset..."
curl -s -X DELETE "http://localhost:9200/movies" >/dev/null 2>&1
curl -s -X PUT "http://localhost:9200/movies" -H 'Content-Type: application/json' -d'{
  "mappings": {
    "properties": {
      "title": {"type": "text"},
      "slug": {"type": "keyword"},
      "description": {"type": "text"},
      "year": {"type": "integer"},
      "country": {"type": "keyword"},
      "categories": {"type": "keyword"}
    }
  }
}' >/dev/null 2>&1

check_status "Elasticsearch index reset"

# Step 5: Check results
echo ""
echo "5. 📊 Final check..."
sleep 2

ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
echo "Elasticsearch document count: $ES_COUNT"

echo ""
echo "🎯 SUMMARY:"
echo "- PostgreSQL movies: $MOVIE_COUNT"
echo "- Elasticsearch docs: $ES_COUNT"
echo ""
echo "💡 If Elasticsearch is still empty, run:"
echo "   bash scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=1"