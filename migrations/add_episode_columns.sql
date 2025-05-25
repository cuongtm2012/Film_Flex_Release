-- Add missing episode columns to movies table
-- This fixes the import error where episode_current and episode_total columns don't exist

DO $$
BEGIN
    -- Add episode_current column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'episode_current'
    ) THEN
        ALTER TABLE movies ADD COLUMN episode_current TEXT;
        RAISE NOTICE 'Added episode_current column to movies table';
    ELSE
        RAISE NOTICE 'episode_current column already exists';
    END IF;

    -- Add episode_total column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movies' 
        AND column_name = 'episode_total'
    ) THEN
        ALTER TABLE movies ADD COLUMN episode_total TEXT;
        RAISE NOTICE 'Added episode_total column to movies table';
    ELSE
        RAISE NOTICE 'episode_total column already exists';
    END IF;

    -- Set default values for existing records
    UPDATE movies 
    SET episode_current = 'Full' 
    WHERE episode_current IS NULL;
    
    UPDATE movies 
    SET episode_total = '1' 
    WHERE episode_total IS NULL;
    
    RAISE NOTICE 'Updated default values for episode columns';
END $$;

-- Fix episodes table - add missing name column
DO $$
BEGIN
    -- Ensure episodes table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'episodes') THEN
        CREATE TABLE episodes (
            id SERIAL PRIMARY KEY,
            movie_slug TEXT,
            name TEXT,
            slug TEXT,
            filename TEXT,
            link_embed TEXT,
            link_m3u8 TEXT,
            server_name TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            modified_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created episodes table';
    ELSE
        RAISE NOTICE 'Episodes table already exists';
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE episodes ADD COLUMN name TEXT;
        RAISE NOTICE 'Added name column to episodes table';
        
        -- If title column exists, copy it to name column
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'episodes' 
            AND column_name = 'title'
        ) THEN
            UPDATE episodes SET name = title WHERE name IS NULL AND title IS NOT NULL;
            RAISE NOTICE 'Copied title values to name column';
        END IF;
    ELSE
        RAISE NOTICE 'name column already exists in episodes table';
    END IF;

    -- Add other required columns if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN slug TEXT;
        RAISE NOTICE 'Added slug column to episodes table';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'movie_slug'
    ) THEN
        ALTER TABLE episodes ADD COLUMN movie_slug TEXT;
        RAISE NOTICE 'Added movie_slug column to episodes table';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'server_name'
    ) THEN
        ALTER TABLE episodes ADD COLUMN server_name TEXT;
        RAISE NOTICE 'Added server_name column to episodes table';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'filename'
    ) THEN
        ALTER TABLE episodes ADD COLUMN filename TEXT;
        RAISE NOTICE 'Added filename column to episodes table';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'link_embed'
    ) THEN
        ALTER TABLE episodes ADD COLUMN link_embed TEXT;
        RAISE NOTICE 'Added link_embed column to episodes table';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'episodes' 
        AND column_name = 'link_m3u8'
    ) THEN
        ALTER TABLE episodes ADD COLUMN link_m3u8 TEXT;
        RAISE NOTICE 'Added link_m3u8 column to episodes table';
    END IF;

    RAISE NOTICE 'Episodes table schema fix completed';
END $$;