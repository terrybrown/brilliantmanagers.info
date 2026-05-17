-- Rename level 'Needs Improvement' to 'Developing' in scores and manager_scores.
-- Constraints must be dropped before the UPDATE so the new value is accepted.

-- Step 1: drop old constraints
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_level_check;
ALTER TABLE manager_scores DROP CONSTRAINT IF EXISTS manager_scores_level_check;

-- Step 2: backfill data
UPDATE scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';

UPDATE manager_scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';

-- Step 3: add updated constraints
ALTER TABLE scores ADD CONSTRAINT scores_level_check
  CHECK (level IN ('Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'));

ALTER TABLE manager_scores ADD CONSTRAINT manager_scores_level_check
  CHECK (level IN ('Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'));
