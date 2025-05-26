-- Schema fixes for FilmFlex database to match local DB format
-- This script synchronizes production DB with local DB schema

-- First, check if we need to convert text[] columns to jsonb
DO $$
BEGIN
    -- Check if categories column exists and is text[] type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' 
        AND column_name = 'categories' 
        AND data_type = 'ARRAY'
    ) THEN
        -- Convert text[] to jsonb for categories
        ALTER TABLE movies ALTER COLUMN categories TYPE jsonb USING 
            CASE 
                WHEN categories IS NULL THEN '[]'::jsonb
                ELSE array_to_json(categories)::jsonb
            END;
        ALTER TABLE movies ALTER COLUMN categories SET DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Converted categories from text[] to jsonb';
    END IF;

    -- Check if countries column exists and is text[] type  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movies' 
        AND column_name = 'countries' 
        AND data_type = 'ARRAY'
    ) THEN
        -- Convert text[] to jsonb for countries
        ALTER TABLE movies ALTER COLUMN countries TYPE jsonb USING 
            CASE 
                WHEN countries IS NULL THEN '[]'::jsonb
                ELSE array_to_json(countries)::jsonb
            END;
        ALTER TABLE movies ALTER COLUMN countries SET DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Converted countries from text[] to jsonb';
    END IF;
END $$;

-- Add missing columns to movies table if they don't exist to match local schema
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS movie_id TEXT,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS section TEXT,
ADD COLUMN IF NOT EXISTS episode_current TEXT,
ADD COLUMN IF NOT EXISTS episode_total TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing',
ADD COLUMN IF NOT EXISTS trailer_url TEXT,
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS countries JSONB DEFAULT '[]'::jsonb;

-- Add view column with proper default
ALTER TABLE movies ADD COLUMN IF NOT EXISTS view INTEGER DEFAULT 0;

-- Add modified_at with proper default if it doesn't exist
ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT now();

-- Ensure audit_logs table has required columns
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraints to match local schema
DO $$
BEGIN
    -- Add movie_id unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'movies' AND constraint_name = 'movies_movie_id_unique'
    ) THEN
        -- First populate movie_id for existing records if NULL
        UPDATE movies SET movie_id = 'movie_' || id WHERE movie_id IS NULL;
        ALTER TABLE movies ADD CONSTRAINT movies_movie_id_unique UNIQUE (movie_id);
    END IF;

    -- Add slug unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'movies' AND constraint_name = 'movies_slug_unique'
    ) THEN
        ALTER TABLE movies ADD CONSTRAINT movies_slug_unique UNIQUE (slug);
    END IF;
END $$;

-- Add indexes for better performance to match local schema
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended);
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at);
CREATE INDEX IF NOT EXISTS idx_movies_episode ON movies(episode_current, episode_total);

-- Update any movies without section to have default section
UPDATE movies SET section = 'movies' WHERE section IS NULL;

-- Handle episodes table schema
DO $$
BEGIN
    -- Check if episodes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'episodes') THEN
        -- Drop and recreate episodes table to match exact local schema
        DROP TABLE IF EXISTS episodes CASCADE;
        RAISE NOTICE 'Dropped existing episodes table';
    END IF;
    
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
    
    -- Grant permissions
    GRANT ALL ON TABLE episodes TO filmflex;
    GRANT USAGE, SELECT ON SEQUENCE episodes_id_seq TO filmflex;
    
    RAISE NOTICE 'Created episodes table with local schema format';
END $$;

-- Set some default recommended movies for testing (only if no recommended movies exist)
UPDATE movies 
SET is_recommended = true 
WHERE id IN (
  SELECT id FROM movies 
  WHERE is_recommended = false OR is_recommended IS NULL 
  ORDER BY created_at DESC 
  LIMIT 3
) AND (SELECT COUNT(*) FROM movies WHERE is_recommended = true) = 0;

COMMIT;
