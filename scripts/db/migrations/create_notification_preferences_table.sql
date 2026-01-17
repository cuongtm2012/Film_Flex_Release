-- Migration: Create notification_preferences table
-- Run this on production database

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  new_movies BOOLEAN DEFAULT true,
  new_episodes BOOLEAN DEFAULT true,
  recommendations BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Verify
SELECT COUNT(*) as preferences_count FROM notification_preferences;
