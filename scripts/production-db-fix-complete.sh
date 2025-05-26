#!/bin/bash

# Production Database Schema Fix and Sample Data Import
# This script fixes database schema issues and imports sample data for testing

echo "=== FilmFlex Production Database Fix ==="

# Set database connection
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

echo "1. Applying database schema fixes..."

# Apply schema fixes
sudo -u postgres psql -d filmflex << 'EOF'
-- Add missing columns to movies table if they don't exist
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS episode_current TEXT,
ADD COLUMN IF NOT EXISTS episode_total TEXT;

-- Ensure audit_logs table has required columns
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended);
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at);

-- Update any movies without section to have default section
UPDATE movies SET section = 'movies' WHERE section IS NULL;

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database schema fixes applied successfully"
else
    echo "❌ Database schema fixes failed"
    exit 1
fi

echo "2. Checking if sample data is needed..."

# Check if we have any movies in the database
MOVIE_COUNT=$(sudo -u postgres psql -d filmflex -t -c "SELECT COUNT(*) FROM movies;")
MOVIE_COUNT=$(echo $MOVIE_COUNT | tr -d ' ')

if [ "$MOVIE_COUNT" = "0" ]; then
    echo "No movies found. Importing sample data..."
    
    # Navigate to data directory
    cd /root/Film_Flex_Release/scripts/data
    
    # Run sample import if debug data exists
    if [ -f "debug_page_1.json" ]; then
        node import-sample-movies.cjs
        echo "✅ Sample data imported successfully"
    else
        echo "⚠️  No sample data file found (debug_page_1.json)"
    fi
else
    echo "✅ Database already contains $MOVIE_COUNT movies"
    
    # Set some movies as recommended if none are marked
    RECOMMENDED_COUNT=$(sudo -u postgres psql -d filmflex -t -c "SELECT COUNT(*) FROM movies WHERE is_recommended = true;")
    RECOMMENDED_COUNT=$(echo $RECOMMENDED_COUNT | tr -d ' ')
    
    if [ "$RECOMMENDED_COUNT" = "0" ]; then
        echo "Setting some movies as recommended for testing..."
        sudo -u postgres psql -d filmflex -c "
        UPDATE movies 
        SET is_recommended = true 
        WHERE id IN (
          SELECT id FROM movies 
          ORDER BY created_at DESC 
          LIMIT 3
        );"
        echo "✅ Marked 3 movies as recommended"
    else
        echo "✅ Already have $RECOMMENDED_COUNT recommended movies"
    fi
fi

echo "3. Testing API endpoint..."

# Test the recommended movies endpoint
API_RESPONSE=$(curl -s http://localhost:5001/api/movies/recommended)
echo "API Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"status":true'; then
    echo "✅ API endpoint is working correctly"
else
    echo "❌ API endpoint may have issues"
fi

echo "=== Database fix and setup completed ==="
