CREATE TABLE IF NOT EXISTS featured_sections (
  id SERIAL PRIMARY KEY,
  section_name VARCHAR(50) NOT NULL UNIQUE,
  film_ids INTEGER[] NOT NULL DEFAULT '{}',
  display_order INTEGER[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sections
INSERT INTO featured_sections (section_name) VALUES
  ('trending_now'),
  ('latest_movies'),
  ('top_rated'),
  ('popular_tv'),
  ('anime')
ON CONFLICT (section_name) DO NOTHING;

-- Add is_recommended column to movies table
ALTER TABLE movies ADD COLUMN is_recommended BOOLEAN DEFAULT FALSE;

-- Add section column to movies table if it doesn't exist
ALTER TABLE movies ADD COLUMN IF NOT EXISTS section VARCHAR(50) DEFAULT NULL;