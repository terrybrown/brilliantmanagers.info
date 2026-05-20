-- supabase/migrations/20260520000000_pending_invitations.sql

CREATE TABLE pending_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
  inviter_role  text        NOT NULL CHECK (inviter_role IN ('manager', 'direct_report')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inviter_id, invited_email)
);

ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Inviters can see and create their own rows
CREATE POLICY "inviter_select" ON pending_invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "inviter_insert" ON pending_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- Deletion is performed via the service role key (bypasses RLS)
-- No DELETE policy needed for authenticated users

CREATE INDEX ON pending_invitations (invited_email);
CREATE INDEX ON pending_invitations (inviter_id);
