-- Migration to add last_login column to users table if it doesn't exist
-- and fix any missing last_login data

DO $$
BEGIN
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        RAISE NOTICE 'Added last_login column to users table';
    ELSE
        RAISE NOTICE 'last_login column already exists in users table';
    END IF;

    -- Update users with NULL last_login to use created_at as fallback
    -- This provides a reasonable default for existing users
    UPDATE users 
    SET last_login = created_at 
    WHERE last_login IS NULL;
    
    RAISE NOTICE 'Updated users with NULL last_login values';
END$$;

-- Create index on last_login for better performance when querying user activity
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Verify the changes
SELECT 
    COUNT(*) as total_users,
    COUNT(last_login) as users_with_last_login,
    COUNT(*) - COUNT(last_login) as users_without_last_login
FROM users;