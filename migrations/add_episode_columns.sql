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