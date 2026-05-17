-- Rename level 'Needs Improvement' to 'Developing' in scores and manager_scores.
-- Also updates CHECK constraints on both tables to accept the new name.

UPDATE scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';

UPDATE manager_scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';

-- Update CHECK constraint on scores
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_level_check;
ALTER TABLE scores ADD CONSTRAINT scores_level_check
  CHECK (level IN ('Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'));

-- Update CHECK constraint on manager_scores
ALTER TABLE manager_scores DROP CONSTRAINT IF EXISTS manager_scores_level_check;
ALTER TABLE manager_scores ADD CONSTRAINT manager_scores_level_check
  CHECK (level IN ('Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'));
