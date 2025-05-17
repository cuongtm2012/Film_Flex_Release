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
  ('popular_tv')
ON CONFLICT (section_name) DO NOTHING; 