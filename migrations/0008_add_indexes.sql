-- Migration: Add performance indexes for movies table
-- Created: 2026-01-06
-- Purpose: Optimize movie queries by adding indexes on frequently queried columns

-- Index for sorting by modified_at (latest movies)
CREATE INDEX IF NOT EXISTS idx_movies_modified_at ON movies(modified_at DESC NULLS LAST);

-- Index for sorting by view count (popular movies)
CREATE INDEX IF NOT EXISTS idx_movies_view ON movies(view DESC NULLS LAST);

-- Index for sorting by year (newest movies)
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year DESC NULLS LAST);

-- Composite index for DISTINCT ON (slug) queries
CREATE INDEX IF NOT EXISTS idx_movies_slug_modified ON movies(slug, modified_at DESC);

-- Index for filtering by section
CREATE INDEX IF NOT EXISTS idx_movies_section ON movies(section) WHERE section IS NOT NULL;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type) WHERE type IS NOT NULL;

-- Index for filtering by is_recommended
CREATE INDEX IF NOT EXISTS idx_movies_is_recommended ON movies(is_recommended) WHERE is_recommended = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_movies_type_section ON movies(type, section) WHERE type IS NOT NULL AND section IS NOT NULL;

-- Add comments
COMMENT ON INDEX idx_movies_modified_at IS 'Index for sorting movies by modification date';
COMMENT ON INDEX idx_movies_view IS 'Index for sorting movies by view count (popularity)';
COMMENT ON INDEX idx_movies_year IS 'Index for sorting movies by release year';
COMMENT ON INDEX idx_movies_slug_modified IS 'Composite index for DISTINCT ON (slug) queries';
COMMENT ON INDEX idx_movies_section IS 'Index for filtering movies by section';
COMMENT ON INDEX idx_movies_type IS 'Index for filtering movies by type';
COMMENT ON INDEX idx_movies_is_recommended IS 'Index for filtering recommended movies';
COMMENT ON INDEX idx_movies_type_section IS 'Composite index for type and section filters';
