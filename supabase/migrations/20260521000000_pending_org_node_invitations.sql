-- supabase/migrations/20260521000000_pending_org_node_invitations.sql

CREATE TABLE pending_org_node_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text        NOT NULL,
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

-- Deletion via service role (OTP confirm + cancel action) — no user DELETE policy needed

CREATE INDEX ON pending_org_node_invitations (invited_email);
CREATE INDEX ON pending_org_node_invitations (node_id);
