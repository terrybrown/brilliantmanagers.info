-- Add missing write policies for org tables.
-- All SELECT policies already exist in 20260517000000_admin_roles.sql.

-- Helper: true if current user is org_admin for the given org
CREATE OR REPLACE FUNCTION is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id  = _org_id
      AND user_id = auth.uid()
      AND role    = 'org_admin'
  )
$$;

-- ── organisations ─────────────────────────────────────────────────────────────

-- Any authenticated user can create an org they own.
CREATE POLICY "authenticated create org" ON organisations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only the org_admin can rename the org.
CREATE POLICY "org admin update org" ON organisations
  FOR UPDATE USING (is_org_admin(id));

-- Deletion is performed via the admin panel using the service-role client,
-- which bypasses RLS — no user-facing DELETE policy needed.

-- ── org_members ───────────────────────────────────────────────────────────────

-- Self-insert covers the creator becoming the first org_admin.
-- is_org_admin covers an existing admin adding further members.
CREATE POLICY "org admin or self insert member" ON org_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_org_admin(org_id)
  );

-- Only org_admin can change another member's role.
CREATE POLICY "org admin update member role" ON org_members
  FOR UPDATE USING (is_org_admin(org_id));

-- Only org_admin can remove members.
CREATE POLICY "org admin remove member" ON org_members
  FOR DELETE USING (is_org_admin(org_id));

-- ── org_nodes ─────────────────────────────────────────────────────────────────

CREATE POLICY "org admin create node" ON org_nodes
  FOR INSERT WITH CHECK (is_org_admin(org_id));

CREATE POLICY "org admin update node" ON org_nodes
  FOR UPDATE USING (is_org_admin(org_id));

-- Cascade on parent_id handles child nodes automatically.
CREATE POLICY "org admin delete node" ON org_nodes
  FOR DELETE USING (is_org_admin(org_id));

-- ── org_node_members ──────────────────────────────────────────────────────────

-- org_node_members has no org_id column; derive it from org_nodes.
CREATE POLICY "org admin add node member" ON org_node_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_nodes n
      WHERE n.id = node_id AND is_org_admin(n.org_id)
    )
  );

CREATE POLICY "org admin remove node member" ON org_node_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_nodes n
      WHERE n.id = node_id AND is_org_admin(n.org_id)
    )
  );
