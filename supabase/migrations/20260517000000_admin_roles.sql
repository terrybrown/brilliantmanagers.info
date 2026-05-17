-- user_roles: global roles (super_admin only for now)
CREATE TABLE user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('super_admin')),
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- organisations
CREATE TABLE organisations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- org_members: per-org role (must exist before is_org_member function)
CREATE TABLE org_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('org_admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is a member of an org.
-- SECURITY DEFINER avoids RLS recursion in policies below.
-- Defined after org_members so the SQL body validates successfully.
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = p_org_id
      AND org_members.user_id = auth.uid()
  )
$$;

-- Policies that depend on is_org_member
CREATE POLICY "member read" ON organisations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "member read" ON org_members
  FOR SELECT USING (is_org_member(org_id));

-- org_nodes: adjacency-list hierarchy tree
CREATE TABLE org_nodes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES org_nodes(id) ON DELETE CASCADE,
  name       text NOT NULL,
  node_type  text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member read" ON org_nodes
  FOR SELECT USING (is_org_member(org_id));

-- org_node_members: places users at nodes
CREATE TABLE org_node_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id    uuid NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, user_id)
);
ALTER TABLE org_node_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member read" ON org_node_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_nodes n
      WHERE n.id = org_node_members.node_id
        AND is_org_member(n.org_id)
    )
  );

-- audit_log: append-only, all mutations
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes on FK columns not covered by UNIQUE constraints
CREATE INDEX ON org_nodes (org_id);
CREATE INDEX ON org_nodes (parent_id);
CREATE INDEX ON org_members (user_id);

-- Bootstrap: grant super_admin to the site owner
INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'super_admin', id
FROM auth.users
WHERE email = 'terry@hairylemon.net';
