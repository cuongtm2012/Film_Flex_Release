#!/bin/bash

# Production Database Sync Script
# This script synchronizes the production database schema with local database schema

echo "=== FilmFlex Production Database Sync ==="

# Set database connection
export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex"

echo "1. Backing up existing data..."

# Create backup of existing movies data
sudo -u postgres psql -d filmflex << 'EOF'
-- Create backup table
CREATE TABLE IF NOT EXISTS movies_backup AS SELECT * FROM movies;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Data backup created successfully"
else
    echo "❌ Data backup failed"
    exit 1
fi

echo "2. Dropping and recreating movies table with correct schema..."

sudo -u postgres psql -d filmflex << 'EOF'
-- Drop existing movies table
DROP TABLE IF EXISTS movies CASCADE;

-- Recreate movies table with exact local schema
CREATE TABLE public.movies (
	id serial4 NOT NULL,
	movie_id text NOT NULL,
	slug text NOT NULL,
	"name" text NOT NULL,
	origin_name text NULL,
	poster_url text NULL,
	thumb_url text NULL,
	"year" int4 NULL,
	"type" text NULL,
	quality text NULL,
	lang text NULL,
	"time" text NULL,
	"view" int4 DEFAULT 0 NULL,
	description text NULL,
	status text DEFAULT 'ongoing'::text NULL,
	trailer_url text NULL,
	"section" text NULL,
	is_recommended bool DEFAULT false NULL,
	categories jsonb DEFAULT '[]'::jsonb NULL,
	countries jsonb DEFAULT '[]'::jsonb NULL,
	actors text NULL,
	directors text NULL,
	episode_current text NULL,
	episode_total text NULL,
	modified_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT movies_movie_id_unique UNIQUE (movie_id),
	CONSTRAINT movies_pkey PRIMARY KEY (id),
	CONSTRAINT movies_slug_unique UNIQUE (slug)
);

-- Create indexes to match local schema
CREATE INDEX idx_movies_episode ON public.movies USING btree (episode_current, episode_total);
CREATE INDEX idx_movies_is_recommended ON public.movies USING btree (is_recommended);
CREATE INDEX idx_movies_section ON public.movies USING btree (section);

-- Grant permissions
GRANT ALL ON TABLE movies TO filmflex;
GRANT USAGE, SELECT ON SEQUENCE movies_id_seq TO filmflex;

-- Handle episodes table schema to match local database
DROP TABLE IF EXISTS episodes CASCADE;

-- Create episodes table with exact local schema
CREATE TABLE public.episodes (
	id serial4 NOT NULL,
	"name" text NOT NULL,
	slug text NOT NULL,
	movie_slug text NOT NULL,
	server_name text NOT NULL,
	filename text NULL,
	link_embed text NOT NULL,
	link_m3u8 text NULL,
	CONSTRAINT episodes_pkey PRIMARY KEY (id),
	CONSTRAINT episodes_slug_unique UNIQUE (slug)
);

-- Grant permissions for episodes table
GRANT ALL ON TABLE episodes TO filmflex;
GRANT USAGE, SELECT ON SEQUENCE episodes_id_seq TO filmflex;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Movies table recreated with correct schema"
else
    echo "❌ Movies table recreation failed"
    exit 1
fi

echo "3. Migrating existing data with schema conversion..."

sudo -u postgres psql -d filmflex << 'EOF'
-- Insert data from backup with proper schema mapping
INSERT INTO movies (
    movie_id,
    slug,
    name,
    origin_name,
    poster_url,
    thumb_url,
    year,
    type,
    quality,
    lang,
    time,
    view,
    description,
    status,
    trailer_url,
    section,
    is_recommended,
    categories,
    countries,
    actors,
    directors,
    episode_current,
    episode_total,
    modified_at
)
SELECT 
    COALESCE(movie_id, 'movie_' || id::text) as movie_id,
    slug,
    name,
    origin_name,
    poster_url,
    thumb_url,
    year,
    type,
    quality,
    lang,
    time,
    COALESCE(view, 0) as view,
    COALESCE(description, content, '') as description,
    COALESCE(status, 'ongoing') as status,
    trailer_url,
    COALESCE(section, 'movies') as section,
    COALESCE(is_recommended, false) as is_recommended,
    -- Convert text[] to jsonb for categories
    CASE 
        WHEN categories IS NULL THEN '[]'::jsonb
        WHEN categories::text LIKE '{%}' THEN array_to_json(categories::text[])::jsonb
        ELSE categories::jsonb
    END as categories,
    -- Convert text[] to jsonb for countries  
    CASE 
        WHEN countries IS NULL THEN '[]'::jsonb
        WHEN countries::text LIKE '{%}' THEN array_to_json(countries::text[])::jsonb
        ELSE countries::jsonb
    END as countries,
    actors,
    directors,
    episode_current,
    episode_total,
    COALESCE(modified_at, created_at, now()) as modified_at
FROM movies_backup
ON CONFLICT (slug) DO UPDATE SET
    movie_id = EXCLUDED.movie_id,
    name = EXCLUDED.name,
    origin_name = EXCLUDED.origin_name,
    modified_at = now();

EOF

if [ $? -eq 0 ]; then
    echo "✅ Data migration completed successfully"
else
    echo "❌ Data migration failed"
    exit 1
fi

echo "4. Verifying schema and data..."

# Verify table structure
SCHEMA_CHECK=$(sudo -u postgres psql -d filmflex -t -c "\d movies" | grep -E "categories|countries" | grep jsonb | wc -l)

if [ "$SCHEMA_CHECK" = "2" ]; then
    echo "✅ Schema verification passed - categories and countries are jsonb"
else
    echo "❌ Schema verification failed"
    exit 1
fi

# Check data count
DATA_COUNT=$(sudo -u postgres psql -d filmflex -t -c "SELECT COUNT(*) FROM movies;")
DATA_COUNT=$(echo $DATA_COUNT | tr -d ' ')

echo "✅ Total movies in database: $DATA_COUNT"

# Check recommended movies
RECOMMENDED_COUNT=$(sudo -u postgres psql -d filmflex -t -c "SELECT COUNT(*) FROM movies WHERE is_recommended = true;")
RECOMMENDED_COUNT=$(echo $RECOMMENDED_COUNT | tr -d ' ')

echo "✅ Recommended movies: $RECOMMENDED_COUNT"

echo "5. Testing API endpoint..."

# Test the recommended movies endpoint
API_RESPONSE=$(curl -s http://localhost:5001/api/movies/recommended)
echo "API Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"status":true'; then
    echo "✅ API endpoint is working correctly"
else
    echo "❌ API endpoint may have issues"
fi

echo "6. Cleaning up backup table..."
sudo -u postgres psql -d filmflex -c "DROP TABLE IF EXISTS movies_backup;"

echo "=== Production database sync completed ==="
echo "Database schema now matches local development environment"
