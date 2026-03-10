-- Migration: Add Firebase Admin SDK configuration
-- Run this on production database

INSERT INTO system_settings (key, value, encrypted, category, description) 
VALUES 
  ('firebase_admin_project_id', NULL, false, 'push_notifications', 'Firebase Admin SDK Project ID'),
  ('firebase_admin_private_key', NULL, true, 'push_notifications', 'Firebase Admin SDK Private Key (encrypted)'),
  ('firebase_admin_client_email', NULL, false, 'push_notifications', 'Firebase Admin SDK Client Email'),
  ('firebase_notifications_enabled', 'false', false, 'push_notifications', 'Enable/disable push notifications')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT key, encrypted, category FROM system_settings WHERE category = 'push_notifications';
