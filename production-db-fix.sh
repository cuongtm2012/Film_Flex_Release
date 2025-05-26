#!/bin/bash
# FilmFlex Production Database Sync & Fix Script
# Run this on the production server at /root/Film_Flex_Release

echo "=== FilmFlex Production Database Sync & Fix ==="
echo "Current directory: $(pwd)"
echo "Date: $(date)"
echo ""

# Step 1: Check current application status
echo "[1/7] Checking current application status..."
pm2 status
echo ""

# Step 2: Check database connection and current schema
echo "[2/7] Checking database connection..."
psql -h localhost -U filmflex -d filmflex -c "\dt" 2>/dev/null || echo "Database connection issue detected"
echo ""

# Step 3: Check for missing columns in movies table
echo "[3/7] Checking movies table schema..."
psql -h localhost -U filmflex -d filmflex -c "\d movies" 2>/dev/null || echo "Cannot describe movies table"
echo ""

# Step 4: Check application logs for specific errors
echo "[4/7] Checking recent application logs..."
pm2 logs filmflex --lines 20 --nostream
echo ""

# Step 5: Test current endpoint
echo "[5/7] Testing current recommended movies endpoint..."
curl -s http://localhost:5000/api/movies/recommended | jq . 2>/dev/null || curl -s http://localhost:5000/api/movies/recommended
echo ""

# Step 6: Run database migration/push
echo "[6/7] Running database migration..."
npm run db:push
echo ""

# Step 7: Restart application and test
echo "[7/7] Restarting application and testing..."
pm2 restart filmflex
sleep 3
echo "Testing after restart:"
curl -s http://localhost:5000/api/movies/recommended | jq . 2>/dev/null || curl -s http://localhost:5000/api/movies/recommended
echo ""

echo "=== Diagnostic Complete ==="
