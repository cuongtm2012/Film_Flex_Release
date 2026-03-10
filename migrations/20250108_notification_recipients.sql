-- Migration: Add notification_recipients table and update admin_notifications
-- Created: 2025-01-08

-- Table to track notification delivery status for each user
CREATE TABLE IF NOT EXISTS notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(notification_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_user_id ON notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(status);
CREATE INDEX idx_notification_recipients_created_at ON notification_recipients(created_at DESC);

-- Update admin_notifications table to add new status fields
ALTER TABLE admin_notifications 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_success INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_failed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);

-- Update trigger for notification_recipients updated_at
CREATE OR REPLACE FUNCTION update_notification_recipient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_recipient_updated_at
  BEFORE UPDATE ON notification_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_recipient_timestamp();

-- Function to update admin_notifications stats when recipients status changes
CREATE OR REPLACE FUNCTION update_admin_notification_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_notifications
  SET 
    sent_success = (
      SELECT COUNT(*) FROM notification_recipients 
      WHERE notification_id = NEW.notification_id AND status = 'sent'
    ),
    sent_failed = (
      SELECT COUNT(*) FROM notification_recipients 
      WHERE notification_id = NEW.notification_id AND status = 'failed'
    ),
    sent_count = (
      SELECT COUNT(*) FROM notification_recipients 
      WHERE notification_id = NEW.notification_id AND status = 'sent'
    )
  WHERE id = NEW.notification_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_notification_stats
  AFTER INSERT OR UPDATE ON notification_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notification_stats();

-- Add comments for documentation
COMMENT ON TABLE notification_recipients IS 'Tracks delivery status of each notification to individual users';
COMMENT ON COLUMN notification_recipients.status IS 'Delivery status: pending, sent, failed';
COMMENT ON COLUMN notification_recipients.retry_count IS 'Number of retry attempts for failed deliveries';
COMMENT ON COLUMN admin_notifications.status IS 'Overall notification status: pending, processing, completed, failed';
COMMENT ON COLUMN admin_notifications.total_recipients IS 'Total number of users to receive this notification';
