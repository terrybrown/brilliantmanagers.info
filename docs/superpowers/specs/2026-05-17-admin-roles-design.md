# Admin Roles Design

**Date:** 2026-05-17
**Status:** Approved

## Overview

Add a three-tier role system — SuperAdmin, OrgAdmin, User — plus a full Organisation hierarchy feature and a site-wide audit log. SuperAdmin sees an internal admin section in the sidebar. OrgAdmin manages their org's structure and members. User is the default with no special privileges.

---

## 1. Data Model

Six new tables. All in the `public` schema with RLS enabled.

### `user_roles`
Global roles (SuperAdmin only for now).

```sql
CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('super_admin')),
  granted_by  uuid REFERENCES auth.users(id),  -- null = bootstrap seed
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- Authenticated users can read their own row
CREATE POLICY "own row" ON user_roles FOR SELECT
  USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE — server actions use service role
```

### `organisations`

```sql
CREATE TABLE organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
-- Members can read their org
CREATE POLICY "member read" ON organisations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = organisations.id
        AND org_members.user_id = auth.uid()
    )
  );
-- No direct client mutations
```

### `org_members`
Per-org role. A user can be a member of multiple orgs.

```sql
CREATE TABLE org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('org_admin', 'member')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
-- Members can read their org's member list
CREATE POLICY "member read" ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
    )
  );
-- No direct client mutations
```

### `org_nodes`
Adjacency-list hierarchy tree within an org.

```sql
CREATE TABLE org_nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES org_nodes(id) ON DELETE CASCADE,  -- null = root
  name        text NOT NULL,
  node_type   text,  -- free-text label e.g. "Division", "Team" — not an enum
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member read" ON org_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_nodes.org_id
        AND org_members.user_id = auth.uid()
    )
  );
-- No direct client mutations
```

### `org_node_members`
Places users at nodes. Placing a user triggers auto-connection logic (see Section 4).

```sql
CREATE TABLE org_node_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     uuid NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, user_id)
);
ALTER TABLE org_node_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member read" ON org_node_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_nodes n
      JOIN org_members om ON om.org_id = n.org_id
      WHERE n.id = org_node_members.node_id
        AND om.user_id = auth.uid()
    )
  );
-- No direct client mutations
```

### `audit_log`
Append-only. Server actions write via service role; SuperAdmin reads via server component.

```sql
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id),  -- null for system events
  action       text NOT NULL,       -- dot-notation: entity.verb
  entity_type  text NOT NULL,
  entity_id    text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Authenticated users can insert (server actions call this)
CREATE POLICY "authenticated insert" ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- No client SELECT — SuperAdmin reads via server component using service role
```

### Bootstrap seed (run once in Supabase SQL editor after migration)

```sql
INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'super_admin', id
FROM auth.users
WHERE email = 'terry@hairylemon.net';
```

---

## 2. Role Model

| Role | Stored in | Scope |
|------|-----------|-------|
| User | (default, no row needed) | n/a |
| OrgAdmin | `org_members.role = 'org_admin'` | per-org |
| SuperAdmin | `user_roles.role = 'super_admin'` | global |

**SuperAdmin assignment:**
- Bootstrap: seed SQL above (one-time, no code required)
- Subsequent grants: SuperAdmin uses the Users panel → inserts a `user_roles` row with `granted_by = actor_id`
- Revoke: SuperAdmin uses the Users panel → deletes the `user_roles` row; cannot revoke own SuperAdmin

**OrgAdmin assignment:**
- Org creator: org creation transaction inserts `org_members` row with `role = 'org_admin'`
- Subsequent promotion: any OrgAdmin of the org can promote any member to OrgAdmin
- Demotion: any OrgAdmin can demote another OrgAdmin to member (cannot demote self if last OrgAdmin)

**Role helpers — `lib/auth/roles.ts`:**

```ts
export async function isSuperAdmin(userId: string): Promise<boolean>
export async function getOrgRole(userId: string, orgId: string): Promise<'org_admin' | 'member' | null>
```

Both query Supabase server-side. Used by server components, server actions, and middleware.

---

## 3. SuperAdmin UI

### Sidebar
`Sidebar.tsx` receives `isSuperAdmin: boolean` prop. When true, a visually separated "Admin" section renders at the bottom of the nav (above the collapse toggle), with a subtle label and three nav items:

| Label | Route | Icon |
|-------|-------|------|
| Users | `/admin/users` | `Users` |
| Audit Log | `/admin/audit-log` | `ScrollText` |
| Organisations | `/admin/organisations` | `Building2` |

### Route protection
`middleware.ts` redirects `/admin/*` to `/dashboard` if the user is not a SuperAdmin. Admin pages also call `isSuperAdmin` at the top of the server component (belt-and-suspenders — never trust middleware alone).

### `/admin/users`
Table of all profiles: display name, email, joined date, role badge. Per-row actions:
- **Grant SuperAdmin** (if not already SuperAdmin)
- **Revoke SuperAdmin** (if SuperAdmin; disabled for the acting user's own row)

### `/admin/audit-log`
Paginated table, 50 rows per page, newest first. Columns: timestamp, actor email, action, entity type, entity ID, metadata (collapsed JSON snippet). Filter bar: actor email search, action prefix (e.g. `goal.*`).

### `/admin/organisations`
Table of all orgs: name, OrgAdmin(s), member count, created date. Per-row:
- Link to read-only org hierarchy detail view
- Delete org (with confirmation)

---

## 4. Organisation & Hierarchy

### Creating an org
`/organisation` page detects whether the user belongs to any org. If not, it shows a "Create Organisation" form (just a name field). Submission:
1. Insert `organisations` row
2. Insert `org_members` row with `role = 'org_admin'` for the creator
3. Redirect to the org management view

### OrgAdmin management view
Full management UI within `/organisation`:

- **Org name** — editable inline
- **Hierarchy tree** — visual tree of `org_nodes`, each showing name, optional type label, and assigned members
- **Add child node** — any node can have children added; fields: name (required), type (optional free text)
- **Add person to node** — by email (same UX pattern as Connections)
  - Look up user by email in `profiles`
  - If not yet an `org_members` row for this org, insert one with `role = 'member'`
  - Insert `org_node_members` row
  - Run auto-connection logic (see below)
- **Rename node** — inline
- **Remove node** — warns if node has members or children; cascade deletes children
- **Promote member to OrgAdmin** — any OrgAdmin can promote any member of the org

### Auto-connection logic
When a user is placed at a node:
1. Walk up the `org_nodes` tree (via `parent_id`) to find the nearest ancestor node that has at least one `org_node_members` entry
2. For each user found at that ancestor node, create a `connections` row (`manager_id = ancestor_user`, `direct_report_id = new_user`, `status = 'active'`, `initiated_by = acting_org_admin`) — skip if a connection between that pair already exists

### Member read-only view
A regular member sees the org hierarchy with their position highlighted. No edit controls.

### Multiple orgs
A user in multiple orgs sees an org picker at the top of `/organisation`. OrgAdmin sees the management UI for each of their orgs separately.

---

## 5. Audit Log

### Action naming — dot-notation

| Action | Trigger |
|--------|---------|
| `scorecard.submit` | Scorecard round submitted |
| `goal.create` | Goal created |
| `goal.update` | Goal updated |
| `goal.complete` | Goal marked complete |
| `connection.create` | Connection requested |
| `connection.accept` | Connection accepted |
| `profile.update` | Profile fields saved |
| `org.create` | Organisation created |
| `org.update` | Org name changed |
| `org.delete` | Org deleted |
| `org_node.create` | Hierarchy node added |
| `org_node.update` | Node renamed |
| `org_node.delete` | Node removed |
| `org_node_member.add` | User placed at node |
| `org_node_member.remove` | User removed from node |
| `org_member.promote` | Member promoted to OrgAdmin |
| `org_member.demote` | OrgAdmin demoted to member |
| `role.grant` | SuperAdmin granted |
| `role.revoke` | SuperAdmin revoked |

### Helper — `lib/audit.ts`

```ts
export async function logAudit(params: {
  actorId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void>
```

Called after the primary mutation succeeds in every server action. If the audit insert fails, logs a server-side warning but does not throw — audit failure must not break the user's action.

### Existing server actions to instrument
`scorecard/actions.ts`, `growth/actions.ts`, `connections/actions.ts`, `profile/actions.ts`, `dashboard/actions.ts`, `manager/[userId]/actions.ts` — plus all new admin and org actions.

---

## 6. Access Control

### Middleware
`middleware.ts` adds a check: requests to `/admin/*` that are not from a SuperAdmin redirect to `/dashboard`.

### Server components
`AppLayout` calls `isSuperAdmin` once and passes the result into `AppShell` → `Sidebar`. Each admin page calls `isSuperAdmin` again at the top before rendering.

### Server actions
- Every admin action (grant/revoke role, delete org, etc.) calls `isSuperAdmin` at entry and throws `Unauthorized` if false
- Every org action calls `getOrgRole` and verifies `'org_admin'` before mutating
- No action trusts the client

### Supabase RLS summary
All client-side access is read-only (SELECT policies scoped to membership). All mutations go through server actions using the service role client — the client Supabase instance has no INSERT/UPDATE/DELETE grants on any of the new tables.

---

## New files

| Path | Purpose |
|------|---------|
| `lib/auth/roles.ts` | `isSuperAdmin`, `getOrgRole` helpers |
| `lib/audit.ts` | `logAudit` helper |
| `lib/db/organisations.ts` | Org CRUD queries |
| `lib/db/org-nodes.ts` | Node tree queries |
| `lib/db/org-members.ts` | Membership queries |
| `lib/db/user-roles.ts` | SuperAdmin grant/revoke queries |
| `app/(app)/admin/users/page.tsx` | Users panel |
| `app/(app)/admin/audit-log/page.tsx` | Audit log panel |
| `app/(app)/admin/organisations/page.tsx` | Organisations panel |
| `app/(app)/admin/layout.tsx` | SuperAdmin guard layout |

## Modified files

| Path | Change |
|------|--------|
| `middleware.ts` | Add `/admin/*` guard |
| `app/(app)/layout.tsx` | Pass `isSuperAdmin` to AppShell |
| `components/app/AppShell.tsx` | Accept + forward `isSuperAdmin` |
| `components/app/Sidebar.tsx` | Render admin nav section when SuperAdmin |
| `app/(app)/organisation/page.tsx` | Replace placeholder with full org UI |
| All existing `actions.ts` files | Add `logAudit` calls |
