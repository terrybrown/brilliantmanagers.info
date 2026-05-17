-- Rename level 'Needs Improvement' to 'Developing' in the scores table.
-- The application code no longer uses the old string; this migration keeps
-- stored data consistent with the updated Level type.
UPDATE scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';
