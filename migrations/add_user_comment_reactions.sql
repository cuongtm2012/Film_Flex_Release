-- Migration: Add user comment reactions table for mutual exclusivity
-- Created: 2025-06-04
-- Description: Adds user_comment_reactions table to track individual user reactions to comments
--              Implements mutual exclusivity so users can only like OR dislike a comment, not both

-- Create the user_comment_reactions table
CREATE TABLE IF NOT EXISTS user_comment_reactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure one reaction per user per comment (mutual exclusivity)
    UNIQUE(user_id, comment_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_comment_reactions_user_id ON user_comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_comment_reactions_comment_id ON user_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_user_comment_reactions_reaction_type ON user_comment_reactions(reaction_type);

-- Migration complete
COMMENT ON TABLE user_comment_reactions IS 'Tracks individual user reactions to comments with mutual exclusivity (like OR dislike, not both)';
COMMENT ON COLUMN user_comment_reactions.reaction_type IS 'Type of reaction: like or dislike';
COMMENT ON CONSTRAINT user_comment_reactions_user_id_comment_id_key ON user_comment_reactions IS 'Ensures mutual exclusivity - one reaction per user per comment';