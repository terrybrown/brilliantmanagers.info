-- supabase/migrations/20260521000000_pending_org_node_invitations.sql

CREATE TABLE pending_org_node_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL CHECK (invited_email = lower(invited_email)),
  -- org_id is denormalised from org_nodes for OTP confirm convenience (avoids extra JOIN)
  org_id        uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  node_id       uuid        NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invited_email, node_id)
);

ALTER TABLE pending_org_node_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inviter_select" ON pending_org_node_invitations
  FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "inviter_insert" ON pending_org_node_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- No UPDATE policy: rows are immutable; only service role may mutate after insert
-- Deletion via service role (OTP confirm + cancel action) — no user DELETE policy needed

CREATE INDEX ON pending_org_node_invitations (inviter_id);
CREATE INDEX ON pending_org_node_invitations (node_id);
-- Note: UNIQUE (invited_email, node_id) above already covers leftmost-prefix email lookups
