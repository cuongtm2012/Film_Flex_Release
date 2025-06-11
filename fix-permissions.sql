-- Fix permissions for movie_reactions table
-- This script ensures the filmflex user has proper access to all tables

-- Connect to the correct database as postgres user
\c filmflex_db;

-- Create the movie_reactions table if it doesn't exist (simplified constraint)
CREATE TABLE IF NOT EXISTS movie_reactions (
    id SERIAL PRIMARY KEY,
    movie_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    user_session VARCHAR(255),
    reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'angry', 'sad', 'wow')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a unique index instead of constraint (handles NULLs better)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_movie_reaction 
ON movie_reactions (movie_id, COALESCE(user_id, -1), COALESCE(user_session, ''));

-- Grant all necessary permissions to the filmflex user
GRANT ALL PRIVILEGES ON TABLE movie_reactions TO filmflex;
GRANT USAGE, SELECT ON SEQUENCE movie_reactions_id_seq TO filmflex;

-- Ensure all other tables have proper permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO filmflex;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO filmflex;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO filmflex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO filmflex;

-- Show confirmation
SELECT 'Database permissions fixed successfully!' as status;