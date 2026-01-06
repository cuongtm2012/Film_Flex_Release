-- Migration: Create sync_metadata table
-- Purpose: Store Elasticsearch sync metadata to persist lastSyncTime across app restarts
-- Created: 2026-01-06

CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_metadata_key ON sync_metadata(key);

-- Insert initial record for elasticsearch sync
INSERT INTO sync_metadata (key, value)
VALUES ('elasticsearch_last_sync', '{"lastSyncTime": null, "lastFullSync": null, "syncCount": 0}')
ON CONFLICT (key) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS sync_metadata_updated_at_trigger ON sync_metadata;
CREATE TRIGGER sync_metadata_updated_at_trigger
  BEFORE UPDATE ON sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_metadata_updated_at();

-- Add comment to table
COMMENT ON TABLE sync_metadata IS 'Stores metadata for Elasticsearch synchronization including last sync times and statistics';
COMMENT ON COLUMN sync_metadata.key IS 'Unique identifier for the metadata entry';
COMMENT ON COLUMN sync_metadata.value IS 'JSON data containing sync metadata (lastSyncTime, lastFullSync, syncCount, etc.)';
