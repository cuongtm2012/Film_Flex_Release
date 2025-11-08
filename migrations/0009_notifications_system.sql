-- Migration: Notification System with FCM Integration
-- Created: 2025-11-08

-- Table: user_devices - Store FCM tokens for user devices
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  device_type VARCHAR(50) DEFAULT 'web',
  device_name VARCHAR(255),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_devices
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_token ON user_devices(device_token);
CREATE INDEX idx_user_devices_active ON user_devices(is_active) WHERE is_active = true;

-- Table: notifications - User notifications (new movies, episodes, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_movie', 'new_episode', 'admin', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data (movie_id, episode_id, etc.)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Foreign keys for related content
  movie_id INTEGER REFERENCES movies(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_type CHECK (type IN ('new_movie', 'new_episode', 'admin', 'system', 'watchlist'))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_movie_id ON notifications(movie_id) WHERE movie_id IS NOT NULL;

-- Table: admin_notifications - Admin-created notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'announcement', -- 'announcement', 'maintenance', 'feature', 'alert'
  target_type VARCHAR(50) DEFAULT 'all', -- 'all', 'active_users', 'specific_users'
  target_user_ids INTEGER[], -- Array of user IDs if target_type = 'specific_users'
  data JSONB, -- Additional metadata
  
  -- Scheduling
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'failed'
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'sent', 'failed', 'sending')),
  CONSTRAINT valid_target CHECK (target_type IN ('all', 'active_users', 'specific_users'))
);

-- Indexes for admin_notifications
CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX idx_admin_notifications_scheduled ON admin_notifications(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Table: notification_logs - Track notification delivery
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  admin_notification_id INTEGER REFERENCES admin_notifications(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT,
  status VARCHAR(50) NOT NULL, -- 'pending', 'sent', 'failed', 'delivered', 'clicked'
  error_message TEXT,
  fcm_message_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_log_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'clicked'))
);

-- Indexes for notification_logs
CREATE INDEX idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_admin ON notification_logs(admin_notification_id);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_notifications_updated_at BEFORE UPDATE ON admin_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_logs_updated_at BEFORE UPDATE ON notification_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP 
    AND is_read = true;
END;
$$ language 'plpgsql';

-- Comments
COMMENT ON TABLE user_devices IS 'Store FCM device tokens for push notifications';
COMMENT ON TABLE notifications IS 'User notifications for new content and system messages';
COMMENT ON TABLE admin_notifications IS 'Admin-created notifications with scheduling support';
COMMENT ON TABLE notification_logs IS 'Track notification delivery status';

COMMENT ON COLUMN notifications.data IS 'JSON data: {movie_slug, episode_number, url, image_url, etc.}';
COMMENT ON COLUMN admin_notifications.target_user_ids IS 'Array of user IDs when target_type is specific_users';
COMMENT ON COLUMN notification_logs.fcm_message_id IS 'Firebase Cloud Messaging message ID for tracking';
