-- Migration: Add movie reactions table for interactive rating system
-- Created: 2025-06-04
-- Description: Adds movie_reactions table to track user reactions (like, dislike, heart) to movies
--              Replaces static ratings with dynamic interactive reactions

-- Create the movie_reactions table
CREATE TABLE IF NOT EXISTS movie_reactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_slug TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'heart')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure one reaction per user per movie
    UNIQUE(user_id, movie_slug)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movie_reactions_user_id ON movie_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_reactions_movie_slug ON movie_reactions(movie_slug);
CREATE INDEX IF NOT EXISTS idx_movie_reactions_reaction_type ON movie_reactions(reaction_type);

-- Migration complete
COMMENT ON TABLE movie_reactions IS 'Tracks individual user reactions to movies with mutual exclusivity (like OR dislike OR heart, not multiple)';
COMMENT ON COLUMN movie_reactions.reaction_type IS 'Type of reaction: like, dislike, or heart';
COMMENT ON CONSTRAINT movie_reactions_user_id_movie_slug_key ON movie_reactions IS 'Ensures one reaction per user per movie';