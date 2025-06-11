-- Fix permissions for movie_reactions table
-- This script ensures the filmflex user has proper access to all tables

-- Create the movie_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS movie_reactions (
    id SERIAL PRIMARY KEY,
    movie_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    user_session VARCHAR(255),
    reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'love', 'angry', 'sad', 'wow')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_movie_reaction UNIQUE (movie_id, COALESCE(user_id, 0), COALESCE(user_session, ''))
);

-- Grant all necessary permissions to the filmflex user
GRANT ALL PRIVILEGES ON TABLE movie_reactions TO filmflex;
GRANT USAGE, SELECT ON SEQUENCE movie_reactions_id_seq TO filmflex;

-- Ensure all other tables have proper permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO filmflex;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO filmflex;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO filmflex;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO filmflex;

-- Refresh the privileges
\c filmflex_db filmflex;