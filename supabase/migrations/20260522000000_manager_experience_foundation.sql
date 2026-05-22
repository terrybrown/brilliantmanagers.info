-- Drop and recreate assessment_rounds status constraint to add 'scheduled'
-- Must drop before update (23514 error if rows exist outside old value set)
ALTER TABLE assessment_rounds DROP CONSTRAINT IF EXISTS assessment_rounds_status_check;
ALTER TABLE assessment_rounds ADD CONSTRAINT assessment_rounds_status_check
  CHECK (status IN ('in_progress', 'complete', 'scheduled'));

-- Add manager preference columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS manager_scoring_blind BOOLEAN NOT NULL DEFAULT FALSE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN (
                'manager_scoring_needed',
                'connection_request_received',
                'connection_accepted',
                'round_scheduled'
              )),
  payload     JSONB       NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
