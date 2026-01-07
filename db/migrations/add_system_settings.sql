-- Create system_settings table for storing API keys and configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  encrypted BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default settings (will be encrypted by application)
INSERT INTO system_settings (key, value, encrypted, category, description) VALUES
  ('resend_api_key', NULL, TRUE, 'api_keys', 'Resend API key for email services'),
  ('deepseek_api_key', NULL, TRUE, 'api_keys', 'DeepSeek API key for AI services'),
  ('google_client_id', NULL, FALSE, 'sso', 'Google OAuth Client ID'),
  ('google_client_secret', NULL, TRUE, 'sso', 'Google OAuth Client Secret'),
  ('facebook_app_id', NULL, FALSE, 'sso', 'Facebook App ID'),
  ('facebook_app_secret', NULL, TRUE, 'sso', 'Facebook App Secret'),
  ('google_oauth_enabled', 'false', FALSE, 'sso', 'Enable Google OAuth'),
  ('facebook_oauth_enabled', 'false', FALSE, 'sso', 'Enable Facebook OAuth')
ON CONFLICT (key) DO NOTHING;
