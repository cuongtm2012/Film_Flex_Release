-- Fix missing tables for comment system
-- This script creates the missing movie_reactions and user_comment_reactions tables

-- Create movie_reactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'movie_reactions') THEN
        CREATE TABLE movie_reactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            movie_slug TEXT NOT NULL,
            reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'heart')),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, movie_slug, reaction_type)
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_movie_reactions_user_id ON movie_reactions(user_id);
        CREATE INDEX idx_movie_reactions_movie_slug ON movie_reactions(movie_slug);
        CREATE INDEX idx_movie_reactions_type ON movie_reactions(reaction_type);
        
        RAISE NOTICE 'Created movie_reactions table with indexes';
    ELSE
        RAISE NOTICE 'movie_reactions table already exists';
    END IF;
END $$;

-- Create user_comment_reactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_comment_reactions') THEN
        CREATE TABLE user_comment_reactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, comment_id)
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_user_comment_reactions_user_id ON user_comment_reactions(user_id);
        CREATE INDEX idx_user_comment_reactions_comment_id ON user_comment_reactions(comment_id);
        CREATE INDEX idx_user_comment_reactions_type ON user_comment_reactions(reaction_type);
        
        RAISE NOTICE 'Created user_comment_reactions table with indexes';
    ELSE
        RAISE NOTICE 'user_comment_reactions table already exists';
    END IF;
END $$;

-- Ensure comments table has the required columns
DO $$
BEGIN
    -- Add likes column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'likes'
    ) THEN
        ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0;
        RAISE NOTICE 'Added likes column to comments table';
    END IF;
    
    -- Add dislikes column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'comments' 
        AND column_name = 'dislikes'
    ) THEN
        ALTER TABLE comments ADD COLUMN dislikes INTEGER DEFAULT 0;
        RAISE NOTICE 'Added dislikes column to comments table';
    END IF;
END $$;

-- Fix google_id column issue (from your previous migration)
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

-- Ensure avatar and display_name columns exist for OAuth
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

-- Show final status
SELECT 'Database migration completed successfully!' as status;