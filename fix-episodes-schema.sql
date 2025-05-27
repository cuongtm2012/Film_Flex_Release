-- Fix Episodes Table Schema
-- This script adds missing columns to the episodes table to match the expected schema

\echo 'Fixing episodes table schema...'

-- Add missing columns to episodes table if they don't exist
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE episodes ADD COLUMN name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added name column to episodes table';
    ELSE
        RAISE NOTICE 'name column already exists in episodes table';
    END IF;

    -- Add slug column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN slug TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added slug column to episodes table';
    ELSE
        RAISE NOTICE 'slug column already exists in episodes table';
    END IF;

    -- Add filename column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'filename'
    ) THEN
        ALTER TABLE episodes ADD COLUMN filename TEXT;
        RAISE NOTICE 'Added filename column to episodes table';
    ELSE
        RAISE NOTICE 'filename column already exists in episodes table';
    END IF;

    -- Add link_m3u8 column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'link_m3u8'
    ) THEN
        ALTER TABLE episodes ADD COLUMN link_m3u8 TEXT;
        RAISE NOTICE 'Added link_m3u8 column to episodes table';
    ELSE
        RAISE NOTICE 'link_m3u8 column already exists in episodes table';
    END IF;

    -- Ensure movie_slug column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'movie_slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN movie_slug TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added movie_slug column to episodes table';
    ELSE
        RAISE NOTICE 'movie_slug column already exists in episodes table';
    END IF;

    -- Ensure server_name column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'server_name'
    ) THEN
        ALTER TABLE episodes ADD COLUMN server_name TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added server_name column to episodes table';
    ELSE
        RAISE NOTICE 'server_name column already exists in episodes table';
    END IF;

    -- Ensure link_embed column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'link_embed'
    ) THEN
        ALTER TABLE episodes ADD COLUMN link_embed TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added link_embed column to episodes table';
    ELSE
        RAISE NOTICE 'link_embed column already exists in episodes table';
    END IF;
END$$;

-- Update NULL values to empty strings for NOT NULL columns
UPDATE episodes SET name = '' WHERE name IS NULL;
UPDATE episodes SET slug = '' WHERE slug IS NULL;
UPDATE episodes SET movie_slug = '' WHERE movie_slug IS NULL;
UPDATE episodes SET server_name = '' WHERE server_name IS NULL;
UPDATE episodes SET link_embed = '' WHERE link_embed IS NULL;

-- Make columns NOT NULL if they aren't already
DO $$
BEGIN
    -- Make name column NOT NULL
    BEGIN
        ALTER TABLE episodes ALTER COLUMN name SET NOT NULL;
        RAISE NOTICE 'Set name column to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'name column already NOT NULL or could not be set';
    END;

    -- Make slug column NOT NULL
    BEGIN
        ALTER TABLE episodes ALTER COLUMN slug SET NOT NULL;
        RAISE NOTICE 'Set slug column to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'slug column already NOT NULL or could not be set';
    END;

    -- Make movie_slug column NOT NULL
    BEGIN
        ALTER TABLE episodes ALTER COLUMN movie_slug SET NOT NULL;
        RAISE NOTICE 'Set movie_slug column to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'movie_slug column already NOT NULL or could not be set';
    END;

    -- Make server_name column NOT NULL
    BEGIN
        ALTER TABLE episodes ALTER COLUMN server_name SET NOT NULL;
        RAISE NOTICE 'Set server_name column to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'server_name column already NOT NULL or could not be set';
    END;

    -- Make link_embed column NOT NULL
    BEGIN
        ALTER TABLE episodes ALTER COLUMN link_embed SET NOT NULL;
        RAISE NOTICE 'Set link_embed column to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'link_embed column already NOT NULL or could not be set';
    END;
END$$;

-- Add unique constraint on slug if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'episodes_slug_unique' AND conrelid = 'episodes'::regclass
    ) THEN
        -- First remove any duplicate slugs
        DELETE FROM episodes a USING episodes b 
        WHERE a.id < b.id AND a.slug = b.slug AND a.slug != '';
        
        -- Add unique constraint
        ALTER TABLE episodes ADD CONSTRAINT episodes_slug_unique UNIQUE (slug);
        RAISE NOTICE 'Added unique constraint to slug column';
    ELSE
        RAISE NOTICE 'Unique constraint on slug already exists';
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_episodes_movie_slug ON episodes(movie_slug);
CREATE INDEX IF NOT EXISTS idx_episodes_server_name ON episodes(server_name);

\echo 'Episodes table schema fix completed!'

-- Show the current structure of episodes table
\d episodes;