#!/bin/bash

# Quick Check Script
echo "⚡ QUICK SYSTEM CHECK"
echo "===================="

# Basic checks
echo "1. Checking if we can run docker commands..."
docker --version

echo ""
echo "2. Checking filmflex containers..."
docker ps | grep filmflex | head -5

echo ""
echo "3. Quick Elasticsearch test..."
curl -s http://localhost:9200/_cluster/health | head -1

echo ""
echo "4. Quick PostgreSQL test..."
docker exec filmflex-postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) as movie_count FROM movies;" 2>/dev/null | tail -2

echo ""
echo "5. Quick app test..."
curl -s -I http://localhost:5000/ | head -1

echo ""
echo "✅ Basic checks completed!"
echo ""
echo "📋 Next steps:"
echo "   - If any component failed, check docker logs"
echo "   - Run: bash scripts/tools/debug-elasticsearch.sh for detailed info"
echo "   - Run: bash scripts/tools/recover-elasticsearch-simple.sh to fix"