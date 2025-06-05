-- Migration: Update movie reactions constraints for independent heart reactions
-- Created: 2025-01-25
-- Description: Removes the unique constraint to allow multiple reactions per user per movie
--              This enables heart reactions to be independent of like/dislike reactions

-- Drop the existing unique constraint
ALTER TABLE movie_reactions DROP CONSTRAINT IF EXISTS movie_reactions_user_id_movie_slug_key;

-- Add a new unique constraint that allows multiple reactions but prevents duplicate reaction types
-- This allows a user to have both 'like' and 'heart' but not multiple 'like' reactions
ALTER TABLE movie_reactions ADD CONSTRAINT movie_reactions_user_movie_reaction_unique 
    UNIQUE(user_id, movie_slug, reaction_type);

-- Add comments to explain the new constraint behavior
COMMENT ON CONSTRAINT movie_reactions_user_movie_reaction_unique ON movie_reactions IS 
    'Prevents duplicate reaction types per user per movie while allowing multiple different reaction types';

-- Migration complete
COMMENT ON TABLE movie_reactions IS 'Tracks individual user reactions to movies. Heart reactions are independent, Like/Dislike are mutually exclusive';
