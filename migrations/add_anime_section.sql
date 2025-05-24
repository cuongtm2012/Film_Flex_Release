-- Add anime section to featured_sections table
INSERT INTO featured_sections (section_name, film_ids, display_order, created_at, updated_at)
VALUES ('anime', '[]', '[]', NOW(), NOW())
ON CONFLICT (section_name) DO NOTHING;
