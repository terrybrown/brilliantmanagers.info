-- supabase/migrations/20260521000001_reflections_round_metadata.sql
ALTER TABLE assessment_rounds
  ADD COLUMN title     TEXT,
  ADD COLUMN notes     TEXT,
  ADD COLUMN remind_at DATE;

UPDATE assessment_rounds
SET title = CONCAT(
  'Q', EXTRACT(QUARTER FROM created_at)::int,
  ' ', EXTRACT(YEAR FROM created_at)::int
)
WHERE title IS NULL;
