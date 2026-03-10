-- Migration: User Preferences for Personalized Recommendations
-- Description: Add user_preferences table to store favorite genres and onboarding status
-- Author: PhimGG Team
-- Date: 2025-12-31

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    favorite_genres JSONB DEFAULT '[]'::jsonb,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_genres ON user_preferences USING GIN(favorite_genres);
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding ON user_preferences(onboarding_completed);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user genre preferences for personalized movie recommendations';
COMMENT ON COLUMN user_preferences.favorite_genres IS 'Array of genre slugs that user prefers, e.g. ["hanh-dong", "kinh-di"]';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Flag indicating if user has completed genre selection onboarding';

-- Sample data for testing (optional)
-- INSERT INTO user_preferences (user_id, favorite_genres, onboarding_completed)
-- VALUES (1, '["hanh-dong", "kinh-di", "hai-huoc"]'::jsonb, true);
