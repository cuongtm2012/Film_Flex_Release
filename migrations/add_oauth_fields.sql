-- Add OAuth fields to users table
ALTER TABLE users 
  ADD COLUMN google_id TEXT UNIQUE,
  ADD COLUMN avatar TEXT,
  ADD COLUMN display_name TEXT;

-- Make password field nullable for OAuth users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add constraint to ensure either password or google_id is present
ALTER TABLE users ADD CONSTRAINT check_auth_method 
  CHECK (password IS NOT NULL OR google_id IS NOT NULL);
