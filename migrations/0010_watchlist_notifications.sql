-- Episode Notifications System Migration
-- Creates tables for tracking episodes and notifying users

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_slug VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'new_episode',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Episode tracking for watchlist
CREATE TABLE IF NOT EXISTS watchlist_episode_snapshots (
  id SERIAL PRIMARY KEY,
  movie_slug VARCHAR(255) NOT NULL UNIQUE,
  episode_count INTEGER NOT NULL DEFAULT 0,
  last_episode_slug VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watchlist_snapshots_slug ON watchlist_episode_snapshots(movie_slug);
