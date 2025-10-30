#!/bin/bash

# Debug Script - Check each component step by step
echo "🐞 ELASTICSEARCH DEBUG SCRIPT"
echo "============================="

echo ""
echo "1. 🐳 CONTAINER STATUS:"
echo "----------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep filmflex

echo ""
echo "2. 📡 ELASTICSEARCH CONNECTION:"
echo "------------------------------"
echo "Testing localhost:9200..."
curl -s http://localhost:9200/ 2>/dev/null || echo "❌ Cannot connect to Elasticsearch"

echo ""
echo "3. 🗄️ POSTGRESQL CONNECTION:"
echo "----------------------------"
echo "Testing database connection..."
docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT 1;" 2>/dev/null && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL connection failed"

echo ""
echo "4. 📊 DATA COUNTS:"
echo "-----------------"
# PostgreSQL count
PG_COUNT=$(docker exec filmflex-postgres psql -U filmflex -d filmflex -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | tr -d ' \n' || echo "ERROR")
echo "PostgreSQL movies: $PG_COUNT"

# Elasticsearch count
ES_COUNT=$(curl -s "http://localhost:9200/movies/_count" 2>/dev/null | grep -o '"count":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "ERROR")
echo "Elasticsearch docs: $ES_COUNT"

echo ""
echo "5. 🌐 WEB APP STATUS:"
echo "--------------------"
echo "Testing localhost:5000..."
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null || echo "ERROR")
echo "App response code: $APP_STATUS"

echo ""
echo "6. 🔍 ELASTICSEARCH INDICES:"
echo "----------------------------"
curl -s "http://localhost:9200/_cat/indices?v" 2>/dev/null || echo "❌ Cannot list indices"

echo ""
echo "7. 🔧 SUGGESTED ACTIONS:"
echo "----------------------"
if [ "$ES_COUNT" = "0" ] || [ "$ES_COUNT" = "ERROR" ]; then
    echo "❌ Elasticsearch has no data"
    echo "💡 Run: bash scripts/tools/recover-elasticsearch-simple.sh"
    echo "💡 Or import fresh data: bash scripts/deployment/cron-docker-wrapper.sh node scripts/data/import-movies-docker.cjs --max-pages=1"
else
    echo "✅ Elasticsearch has $ES_COUNT documents"
fi

if [ "$PG_COUNT" = "0" ] || [ "$PG_COUNT" = "ERROR" ]; then
    echo "❌ PostgreSQL has no movie data"
    echo "💡 Run movie import first"
else
    echo "✅ PostgreSQL has $PG_COUNT movies"
fi