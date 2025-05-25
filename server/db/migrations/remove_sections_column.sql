-- Remove deprecated sections column
ALTER TABLE movies DROP COLUMN IF EXISTS sections;
