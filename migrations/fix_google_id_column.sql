-- Add google_id column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'google_id'
    ) THEN
        ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
        RAISE NOTICE 'Added google_id column to users table';
    ELSE
        RAISE NOTICE 'google_id column already exists in users table';
    END IF;
END $$;

-- Also ensure avatar and display_name columns exist for OAuth
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar TEXT;
        RAISE NOTICE 'Added avatar column to users table';
    ELSE
        RAISE NOTICE 'avatar column already exists in users table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE users ADD COLUMN display_name TEXT;
        RAISE NOTICE 'Added display_name column to users table';
    ELSE
        RAISE NOTICE 'display_name column already exists in users table';
    END IF;
END $$;
