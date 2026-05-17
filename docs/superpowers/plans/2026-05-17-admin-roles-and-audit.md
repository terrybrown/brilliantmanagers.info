# Admin Roles & Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SuperAdmin and OrgAdmin roles, a SuperAdmin section in the sidebar with Users / Audit Log / Organisations panels, and a site-wide audit log that captures all data mutations.

**Architecture:** Global roles live in a `user_roles` table; per-org roles in `org_members`. A service-role Supabase client bypasses RLS for admin reads. `logAudit()` is called explicitly in every server action after the primary mutation succeeds — failure never breaks the user's action.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase (Postgres + RLS), Vitest + Testing Library, TypeScript.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `supabase/migrations/20260517000000_admin_roles.sql` | All 6 new tables + RLS + bootstrap seed |
| `lib/supabase/admin.ts` | Service-role Supabase client (bypasses RLS) |
| `lib/auth/roles.ts` | `isSuperAdmin`, `getOrgRole` helpers |
| `lib/audit.ts` | `logAudit` helper |
| `lib/db/user-roles.ts` | SuperAdmin grant/revoke + list-all-users |
| `app/(app)/admin/layout.tsx` | Server-side SuperAdmin guard for all /admin routes |
| `app/(app)/admin/users/page.tsx` | Users panel |
| `app/(app)/admin/users/actions.ts` | Grant/revoke SuperAdmin actions |
| `app/(app)/admin/audit-log/page.tsx` | Audit log panel |
| `app/(app)/admin/organisations/page.tsx` | Organisations panel (list + delete) |
| `app/(app)/admin/organisations/actions.ts` | Delete org action |
| `__tests__/lib/auth/roles.test.ts` | Tests for `isSuperAdmin` and `getOrgRole` |
| `__tests__/lib/audit.test.ts` | Tests for `logAudit` |
| `__tests__/lib/db/user-roles.test.ts` | Tests for grant/revoke/list |
| `components/app/__tests__/Sidebar.test.tsx` | Tests for admin nav section rendering |

### Modified files
| Path | Change |
|------|--------|
| `components/app/Sidebar.tsx` | Add `isSuperAdmin` prop + admin nav section |
| `components/app/AppShell.tsx` | Accept + forward `isSuperAdmin` prop |
| `app/(app)/layout.tsx` | Call `isSuperAdmin`, pass result to AppShell |
| `app/(app)/scorecard/actions.ts` | Add `logAudit` after mutation |
| `app/(app)/growth/actions.ts` | Add `logAudit` after each mutation |
| `app/(app)/connections/actions.ts` | Add `logAudit` after each mutation |
| `app/(app)/profile/actions.ts` | Add `logAudit` after mutation |
| `app/(app)/dashboard/actions.ts` | Add `logAudit` after each mutation |
| `app/(app)/manager/[userId]/actions.ts` | Add `logAudit` after mutation |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260517000000_admin_roles.sql`

- [ ] **Step 1: Create the migrations directory and SQL file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260517000000_admin_roles.sql`:

```sql
-- Helper: check if current user is a member of an org.
-- SECURITY DEFINER avoids RLS recursion in policies below.
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
CREATE POLICY "member read" ON organisations
  FOR SELECT USING (is_org_member(id));

-- org_members: per-org role
CREATE TABLE org_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('org_admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
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

-- Bootstrap: grant super_admin to the site owner
INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'super_admin', id
FROM auth.users
WHERE email = 'terry@hairylemon.net';
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor → paste the full file contents → Run.

Verify by running in the SQL Editor:
```sql
SELECT * FROM user_roles;
```
Expected: one row with `role = 'super_admin'` for terry@hairylemon.net.

---

## Task 2: Service-role Supabase client

**Files:**
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Check SUPABASE_SERVICE_ROLE_KEY is in .env.local**

```bash
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

If absent, add it: `SUPABASE_SERVICE_ROLE_KEY=<value from Supabase dashboard → Settings → API → service_role key>`

- [ ] **Step 2: Create the admin client**

```ts
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260517000000_admin_roles.sql lib/supabase/admin.ts .env.local
git commit -m "feat: add admin roles migration and service-role client"
```

---

## Task 3: `lib/auth/roles.ts`

**Files:**
- Create: `__tests__/lib/auth/roles.test.ts`
- Create: `lib/auth/roles.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/auth/roles.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { isSuperAdmin, getOrgRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

function makeChain(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data })
  const eq = vi.fn()
  eq.mockReturnValue({ eq, maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  mockCreateClient.mockResolvedValue({ from })
  return { from }
}

describe('isSuperAdmin', () => {
  it('returns true when a super_admin row exists', async () => {
    makeChain({ role: 'super_admin' })
    expect(await isSuperAdmin('user-1')).toBe(true)
  })

  it('returns false when no row exists', async () => {
    makeChain(null)
    expect(await isSuperAdmin('user-2')).toBe(false)
  })
})

describe('getOrgRole', () => {
  it('returns org_admin when member has that role', async () => {
    makeChain({ role: 'org_admin' })
    expect(await getOrgRole('user-1', 'org-1')).toBe('org_admin')
  })

  it('returns member when member has that role', async () => {
    makeChain({ role: 'member' })
    expect(await getOrgRole('user-1', 'org-1')).toBe('member')
  })

  it('returns null when user is not a member', async () => {
    makeChain(null)
    expect(await getOrgRole('user-1', 'org-1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/auth/roles.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth/roles'`

- [ ] **Step 3: Implement**

```ts
// lib/auth/roles.ts
import { createClient } from '@/lib/supabase/server'

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle()
  return data !== null
}

export async function getOrgRole(
  userId: string,
  orgId: string
): Promise<'org_admin' | 'member' | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()
  return (data?.role as 'org_admin' | 'member') ?? null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/auth/roles.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/roles.ts __tests__/lib/auth/roles.test.ts
git commit -m "feat: add isSuperAdmin and getOrgRole helpers"
```

---

## Task 4: `lib/audit.ts`

**Files:**
- Create: `__tests__/lib/audit.test.ts`
- Create: `lib/audit.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/audit.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { logAudit } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

describe('logAudit', () => {
  it('inserts an audit log entry with all fields', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    await logAudit({
      actorId: 'user-1',
      action: 'goal.create',
      entityType: 'goal',
      entityId: 'goal-abc',
      metadata: { skill_key: 'communication' },
    })

    expect(from).toHaveBeenCalledWith('audit_log')
    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'goal.create',
      entity_type: 'goal',
      entity_id: 'goal-abc',
      metadata: { skill_key: 'communication' },
    })
  })

  it('omits optional fields when not provided', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    await logAudit({ actorId: 'user-1', action: 'profile.update', entityType: 'profile' })

    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'profile.update',
      entity_type: 'profile',
      entity_id: null,
      metadata: null,
    })
  })

  it('does not throw when insert throws', async () => {
    const from = vi.fn().mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('DB error')),
    })
    mockCreateClient.mockResolvedValue({ from })

    await expect(
      logAudit({ actorId: 'user-1', action: 'goal.create', entityType: 'goal' })
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/audit.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/audit'`

- [ ] **Step 3: Implement**

```ts
// lib/audit.ts
import { createClient } from '@/lib/supabase/server'

export async function logAudit(params: {
  actorId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('audit_log').insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    console.warn('[audit] Failed to write entry for action:', params.action)
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/audit.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/audit.ts __tests__/lib/audit.test.ts
git commit -m "feat: add logAudit helper"
```

---

## Task 5: `lib/db/user-roles.ts`

**Files:**
- Create: `__tests__/lib/db/user-roles.test.ts`
- Create: `lib/db/user-roles.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/user-roles.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { grantSuperAdmin, revokeSuperAdmin, listAllUsersWithRoles } from '@/lib/db/user-roles'
import { createAdminClient } from '@/lib/supabase/admin'

const mockAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('grantSuperAdmin', () => {
  it('inserts a super_admin row via admin client', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockAdminClient.mockReturnValue({ from })

    await grantSuperAdmin('user-1', 'granter-1')

    expect(from).toHaveBeenCalledWith('user_roles')
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      role: 'super_admin',
      granted_by: 'granter-1',
    })
  })

  it('throws when insert returns an error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'duplicate key' } })
    const from = vi.fn().mockReturnValue({ insert })
    mockAdminClient.mockReturnValue({ from })

    await expect(grantSuperAdmin('user-1', 'granter-1')).rejects.toThrow()
  })
})

describe('revokeSuperAdmin', () => {
  it('deletes the super_admin row', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    const from = vi.fn().mockReturnValue({ delete: del })
    mockAdminClient.mockReturnValue({ from })

    await revokeSuperAdmin('user-1')

    expect(del).toHaveBeenCalled()
    expect(eq1).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eq2).toHaveBeenCalledWith('role', 'super_admin')
  })
})

describe('listAllUsersWithRoles', () => {
  it('returns users with is_super_admin flag', async () => {
    const profiles = [
      { id: 'u1', email: 'a@x.com', display_name: 'Alice', created_at: '2024-01-01' },
      { id: 'u2', email: 'b@x.com', display_name: 'Bob', created_at: '2024-01-02' },
    ]
    const superAdmins = [{ user_id: 'u1' }]

    const profilesQuery = { data: profiles }
    const superAdminQuery = { data: superAdmins }

    const from = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(profilesQuery),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(superAdminQuery),
        }),
      })
    mockAdminClient.mockReturnValue({ from })

    const result = await listAllUsersWithRoles()

    expect(result).toHaveLength(2)
    expect(result[0].is_super_admin).toBe(true)
    expect(result[1].is_super_admin).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/db/user-roles.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/user-roles'`

- [ ] **Step 3: Implement**

```ts
// lib/db/user-roles.ts
import { createAdminClient } from '@/lib/supabase/admin'

export interface UserWithRole {
  id: string
  email: string | null
  display_name: string | null
  created_at: string
  is_super_admin: boolean
}

export async function grantSuperAdmin(userId: string, grantedBy: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'super_admin',
    granted_by: grantedBy,
  })
  if (error) throw error
}

export async function revokeSuperAdmin(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'super_admin')
  if (error) throw error
}

export async function listAllUsersWithRoles(): Promise<UserWithRole[]> {
  const supabase = createAdminClient()
  const [{ data: profiles }, { data: superAdmins }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin'),
  ])
  const superAdminIds = new Set((superAdmins ?? []).map((r: { user_id: string }) => r.user_id))
  return (profiles ?? []).map((p: { id: string; email: string | null; display_name: string | null; created_at: string }) => ({
    id: p.id,
    email: p.email,
    display_name: p.display_name,
    created_at: p.created_at,
    is_super_admin: superAdminIds.has(p.id),
  }))
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/db/user-roles.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/user-roles.ts __tests__/lib/db/user-roles.test.ts
git commit -m "feat: add user-roles DB helpers (grant/revoke/list)"
```

---

## Task 6: Sidebar — admin nav section

**Files:**
- Create: `components/app/__tests__/Sidebar.test.tsx`
- Modify: `components/app/Sidebar.tsx`
- Modify: `components/app/AppShell.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/app/__tests__/Sidebar.test.tsx
import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('Sidebar admin section', () => {
  it('hides admin nav items when isSuperAdmin is false', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={false} />)
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument()
    expect(screen.queryByText('Organisations')).not.toBeInTheDocument()
  })

  it('shows admin nav items when isSuperAdmin is true and sidebar is expanded', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={true} />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
    expect(screen.getByText('Organisations')).toBeInTheDocument()
  })

  it('admin links point to correct routes', () => {
    render(<Sidebar isExpanded={true} onToggle={() => {}} isSuperAdmin={true} />)
    expect(screen.getByText('Users').closest('a')).toHaveAttribute('href', '/admin/users')
    expect(screen.getByText('Audit Log').closest('a')).toHaveAttribute('href', '/admin/audit-log')
    expect(screen.getByText('Organisations').closest('a')).toHaveAttribute('href', '/admin/organisations')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run components/app/__tests__/Sidebar.test.tsx
```

Expected: FAIL — `isSuperAdmin` prop not accepted / admin items not rendered

- [ ] **Step 3: Update Sidebar**

```tsx
// components/app/Sidebar.tsx
'use client'
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  Network,
  Users,
  ScrollText,
  Building2,
} from 'lucide-react'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/connections', icon: Link2, label: 'Connections', id: 'nav-connections' },
  { href: '/organisation', icon: Network, label: 'Organisation' },
] as const

const ADMIN_NAV_ITEMS = [
  { href: '/admin/users', icon: Users, label: 'Users', id: 'nav-admin-users' },
  { href: '/admin/audit-log', icon: ScrollText, label: 'Audit Log', id: 'nav-admin-audit' },
  { href: '/admin/organisations', icon: Building2, label: 'Organisations', id: 'nav-admin-orgs' },
] as const

interface SidebarProps {
  isExpanded: boolean
  onToggle: () => void
  isSuperAdmin?: boolean
}

export function Sidebar({ isExpanded, onToggle, isSuperAdmin = false }: SidebarProps) {
  return (
    <div
      style={{
        width: isExpanded ? 220 : 56,
        background: '#111827',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'flex-start' : 'center',
        padding: isExpanded ? '12px 8px' : '12px 0',
        gap: 4,
        flexShrink: 0,
        position: 'relative',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isExpanded={isExpanded}
          id={'id' in item ? item.id : undefined}
        />
      ))}

      <div style={{ flex: 1 }} />

      {isSuperAdmin && (
        <>
          <div
            style={{
              width: '100%',
              height: 1,
              background: '#1f2937',
              margin: '4px 0',
              flexShrink: 0,
            }}
          />
          {isExpanded && (
            <span
              style={{
                fontSize: 10,
                color: '#4b5563',
                padding: '2px 10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Admin
            </span>
          )}
          {ADMIN_NAV_ITEMS.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
              id={item.id}
            />
          ))}
        </>
      )}

      <button
        onClick={onToggle}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 20,
          height: 20,
          background: '#1f2937',
          border: '1px solid #334155',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#64748b',
          zIndex: 10,
        }}
      >
        {isExpanded ? '‹' : '›'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Update AppShell to accept and forward `isSuperAdmin`**

```tsx
// components/app/AppShell.tsx
'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const LS_KEY = 'bm_sidebar_expanded'

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function AppShell({
  user,
  showBeta,
  isSuperAdmin = false,
  children,
}: {
  user: UserInfo
  showBeta: boolean
  isSuperAdmin?: boolean
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    try {
      setIsExpanded(localStorage.getItem(LS_KEY) === 'true')
    } catch {
      // localStorage unavailable — keep default false
    }
  }, [])

  function handleToggle() {
    setIsExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEY, String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0f1e',
      }}
    >
      <Sidebar isExpanded={isExpanded} onToggle={handleToggle} isSuperAdmin={isSuperAdmin} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar user={user} showBeta={showBeta} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run components/app/__tests__/Sidebar.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add components/app/Sidebar.tsx components/app/AppShell.tsx components/app/__tests__/Sidebar.test.tsx
git commit -m "feat: add admin nav section to sidebar"
```

---

## Task 7: AppLayout — pass `isSuperAdmin` to AppShell

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Update the layout**

```tsx
// app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { AppShell } from '@/components/app/AppShell'

function getInitials(displayName: string | null, email: string | null): string {
  const name = displayName ?? email ?? '?'
  const parts = name.split(/[\s@]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, superAdmin] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    isSuperAdmin(user.id),
  ])

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initials = getInitials(displayName, email)

  return (
    <AppShell
      user={{ displayName, email, initials }}
      showBeta={true}
      isSuperAdmin={superAdmin}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat: pass isSuperAdmin from layout to AppShell"
```

---

## Task 8: Admin layout (SuperAdmin server guard)

**Files:**
- Create: `app/(app)/admin/layout.tsx`

- [ ] **Step 1: Create the layout**

```tsx
// app/(app)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/admin/layout.tsx"
git commit -m "feat: add admin layout with SuperAdmin guard"
```

---

## Task 9: Admin Users page + actions

**Files:**
- Create: `app/(app)/admin/users/page.tsx`
- Create: `app/(app)/admin/users/actions.ts`

- [ ] **Step 1: Create the actions**

```ts
// app/(app)/admin/users/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { grantSuperAdmin, revokeSuperAdmin } from '@/lib/db/user-roles'
import { logAudit } from '@/lib/audit'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')
  return user
}

export async function grantSuperAdminAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId) return
  await grantSuperAdmin(userId, actor.id)
  await logAudit({
    actorId: actor.id,
    action: 'role.grant',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
}

export async function revokeSuperAdminAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId || userId === actor.id) return
  await revokeSuperAdmin(userId)
  await logAudit({
    actorId: actor.id,
    action: 'role.revoke',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
}
```

- [ ] **Step 2: Create the page**

```tsx
// app/(app)/admin/users/page.tsx
import { createClient } from '@/lib/supabase/server'
import { listAllUsersWithRoles } from '@/lib/db/user-roles'
import { grantSuperAdminAction, revokeSuperAdminAction } from './actions'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const users = await listAllUsersWithRoles()

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-sm">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td className="px-4 py-3 text-white">{u.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  {u.is_super_admin ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      SuperAdmin
                    </span>
                  ) : (
                    <span className="text-slate-500">User</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== user!.id && (
                    <form action={u.is_super_admin ? revokeSuperAdminAction : grantSuperAdminAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="text-xs text-slate-400 underline hover:text-white"
                      >
                        {u.is_super_admin ? 'Revoke admin' : 'Grant admin'}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/admin/users/page.tsx" "app/(app)/admin/users/actions.ts"
git commit -m "feat: admin users page with grant/revoke SuperAdmin"
```

---

## Task 10: Admin Audit Log page

**Files:**
- Create: `app/(app)/admin/audit-log/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/(app)/admin/audit-log/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'

interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface Profile {
  id: string
  email: string | null
}

export default async function AdminAuditLogPage() {
  const supabase = createAdminClient()

  const { data: entries } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const auditEntries = (entries ?? []) as AuditEntry[]
  const actorIds = [...new Set(auditEntries.filter(e => e.actor_id).map(e => e.actor_id!))]

  const { data: profileRows } = actorIds.length > 0
    ? await supabase.from('profiles').select('id, email').in('id', actorIds)
    : { data: [] as Profile[] }

  const emailById = Object.fromEntries(
    ((profileRows ?? []) as Profile[]).map(p => [p.id, p.email ?? p.id])
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Audit Log</h1>
      <p className="mb-4 text-xs text-slate-500">Showing last 50 entries</p>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-xs">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Time</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Actor</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Action</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Entity</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">ID</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Metadata</th>
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {auditEntries.map(entry => (
              <tr key={entry.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {entry.actor_id ? (emailById[entry.actor_id] ?? entry.actor_id.slice(0, 8)) : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-amber-400">{entry.action}</td>
                <td className="px-3 py-2 text-slate-400">{entry.entity_type}</td>
                <td className="px-3 py-2 font-mono text-slate-500">
                  {entry.entity_id ? entry.entity_id.slice(0, 8) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {entry.metadata ? (
                    <span title={JSON.stringify(entry.metadata, null, 2)}>
                      {JSON.stringify(entry.metadata).slice(0, 60)}
                      {JSON.stringify(entry.metadata).length > 60 ? '…' : ''}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {auditEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/admin/audit-log/page.tsx"
git commit -m "feat: admin audit log page"
```

---

## Task 11: Admin Organisations page + actions

**Files:**
- Create: `app/(app)/admin/organisations/page.tsx`
- Create: `app/(app)/admin/organisations/actions.ts`

- [ ] **Step 1: Create the actions**

```ts
// app/(app)/admin/organisations/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

export async function deleteOrgAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')

  const orgId = formData.get('orgId') as string
  if (!orgId) return

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('organisations').delete().eq('id', orgId)
  if (error) throw error

  await logAudit({
    actorId: user.id,
    action: 'org.delete',
    entityType: 'organisation',
    entityId: orgId,
  })
  revalidatePath('/admin/organisations')
}
```

- [ ] **Step 2: Create the page**

```tsx
// app/(app)/admin/organisations/page.tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteOrgAction } from './actions'

interface OrgRow {
  id: string
  name: string
  created_at: string
  org_members: { role: string; profiles: { email: string | null; display_name: string | null } | null }[]
}

export default async function AdminOrganisationsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organisations')
    .select('id, name, created_at, org_members(role, profiles(email, display_name))')
    .order('created_at', { ascending: false })

  const orgs = (data ?? []) as OrgRow[]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-sm">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Admin(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Members</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {orgs.map(org => {
              const admins = org.org_members.filter(m => m.role === 'org_admin')
              return (
                <tr key={org.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {admins.length > 0
                      ? admins.map(a => a.profiles?.email ?? '—').join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{org.org_members.length}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteOrgAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-500 underline hover:text-red-400"
                        onClick={e => {
                          if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) {
                            e.preventDefault()
                          }
                        }}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No organisations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/admin/organisations/page.tsx" "app/(app)/admin/organisations/actions.ts"
git commit -m "feat: admin organisations page with delete"
```

---

## Task 12: Instrument existing server actions with `logAudit`

**Files:**
- Modify: `app/(app)/scorecard/actions.ts`
- Modify: `app/(app)/growth/actions.ts`
- Modify: `app/(app)/connections/actions.ts`
- Modify: `app/(app)/profile/actions.ts`
- Modify: `app/(app)/dashboard/actions.ts`
- Modify: `app/(app)/manager/[userId]/actions.ts`

- [ ] **Step 1: Update `scorecard/actions.ts`**

Read the current file, then replace with:

```ts
// app/(app)/scorecard/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import { logAudit } from '@/lib/audit'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await upsertScore(roundId, pillar, skillKey, level)
  await maybeCompleteRound(roundId)

  if (user) {
    await logAudit({
      actorId: user.id,
      action: 'scorecard.submit',
      entityType: 'score',
      entityId: roundId,
      metadata: { pillar, skillKey, level },
    })
  }
}
```

- [ ] **Step 2: Update `growth/actions.ts`**

Add `logAudit` calls after each mutation. Import `logAudit` at the top, then after each action's primary mutation:

- After `upsertPlan(...)` in `saveGoalAction`: add
  ```ts
  await logAudit({ actorId: user.id, action: 'goal.create', entityType: 'goal', entityId: plan.id, metadata: { skill_key, pillar } })
  ```

- After `markPlanComplete(planId)` in `markGoalCompleteAction`: add
  ```ts
  await logAudit({ actorId: user.id, action: 'goal.complete', entityType: 'goal', entityId: planId })
  ```

- After `addEvidence(...)` in `addEvidenceAction`: add
  ```ts
  await logAudit({ actorId: user.id, action: 'goal.evidence.add', entityType: 'goal_evidence', entityId: plan_id })
  ```

The full updated file:

```ts
// app/(app)/growth/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan, markPlanComplete, updateLastCheckin } from '@/lib/db/development-plans'
import { bulkAddGoalResources, addGoalResource, removeGoalResource } from '@/lib/db/goal-resources'
import { addEvidence } from '@/lib/db/goal-evidence'
import { logAudit } from '@/lib/audit'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function saveGoalAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const checkin_raw = formData.get('checkin_frequency_weeks') as string
  const checkin_frequency_weeks = checkin_raw ? parseInt(checkin_raw, 10) : null
  const resource_ids_raw = formData.get('resource_ids') as string

  if (!skill_key || !pillar || !goal) return

  const plan = await upsertPlan(user.id, {
    skill_key,
    pillar,
    goal,
    target_date,
    status: 'planned',
    checkin_frequency_weeks,
  })

  if (resource_ids_raw) {
    const resource_ids: string[] = JSON.parse(resource_ids_raw)
    await bulkAddGoalResources(plan.id, resource_ids, user.id)
  }

  await logAudit({
    actorId: user.id,
    action: 'goal.create',
    entityType: 'goal',
    entityId: plan.id,
    metadata: { skill_key, pillar },
  })

  revalidatePath('/growth')
  redirect(`/growth/goal/${plan.id}`)
}

export async function markGoalCompleteAction(planId: string): Promise<void> {
  const user = await getAuthenticatedUser()
  await markPlanComplete(planId)
  await logAudit({
    actorId: user.id,
    action: 'goal.complete',
    entityType: 'goal',
    entityId: planId,
  })
  revalidatePath('/growth')
  revalidatePath(`/growth/goal/${planId}`)
}

export async function addEvidenceAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const plan_id = formData.get('plan_id') as string
  const what_you_did = formData.get('what_you_did') as string
  const impact = formData.get('impact') as string
  const url = (formData.get('url') as string) || null

  if (!plan_id || !what_you_did || !impact) return

  await addEvidence(plan_id, user.id, { what_you_did, impact, url })
  await updateLastCheckin(plan_id)
  await logAudit({
    actorId: user.id,
    action: 'goal.evidence.add',
    entityType: 'goal_evidence',
    entityId: plan_id,
  })

  revalidatePath(`/growth/goal/${plan_id}`)
}

export async function addGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  const user = await getAuthenticatedUser()
  await addGoalResource(planId, resourceId, user.id)
  revalidatePath(`/growth/goal/${planId}`)
}

export async function removeGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  await getAuthenticatedUser()
  await removeGoalResource(planId, resourceId)
  revalidatePath(`/growth/goal/${planId}`)
}
```

- [ ] **Step 3: Update `connections/actions.ts`**

```ts
// app/(app)/connections/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'
import { logAudit } from '@/lib/audit'

export async function inviteConnection(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'

  await createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })

  await logAudit({
    actorId: user.id,
    action: 'connection.create',
    entityType: 'connection',
    metadata: { otherEmail: email, initiatorRole: role },
  })
}

export async function acceptConnectionAction(connectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await acceptConnection(connectionId)

  if (user) {
    await logAudit({
      actorId: user.id,
      action: 'connection.accept',
      entityType: 'connection',
      entityId: connectionId,
    })
  }
}
```

- [ ] **Step 4: Update `profile/actions.ts`**

```ts
// app/(app)/profile/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/profiles'
import { logAudit } from '@/lib/audit'

export async function updateProfileAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const display_name = (formData.get('display_name') as string).trim()
  const job_title = (formData.get('job_title') as string).trim()
  const bio = (formData.get('bio') as string).trim()

  await updateProfile(user.id, { display_name, job_title, bio })
  await logAudit({
    actorId: user.id,
    action: 'profile.update',
    entityType: 'profile',
    entityId: user.id,
  })
  revalidatePath('/profile')
}
```

- [ ] **Step 5: Update `dashboard/actions.ts`**

```ts
// app/(app)/dashboard/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertScheduledRound, deleteScheduledRound } from '@/lib/db/scheduled-rounds'
import { logAudit } from '@/lib/audit'

export async function setScheduledRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const date = formData.get('scheduled_date') as string
  if (!date) return

  await upsertScheduledRound(user.id, date)
  await logAudit({
    actorId: user.id,
    action: 'round.schedule',
    entityType: 'scheduled_round',
    metadata: { scheduled_date: date },
  })
  revalidatePath('/dashboard')
}

export async function cancelScheduledRoundAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await deleteScheduledRound(user.id)
  await logAudit({
    actorId: user.id,
    action: 'round.cancel',
    entityType: 'scheduled_round',
  })
  revalidatePath('/dashboard')
}
```

- [ ] **Step 6: Update `manager/[userId]/actions.ts`**

```ts
// app/(app)/manager/[userId]/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { upsertManagerScore } from '@/lib/db/manager-scores'
import { logAudit } from '@/lib/audit'
import type { Level } from '@/lib/skills'

export async function saveManagerScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await upsertManagerScore(roundId, user.id, skillKey, level)
  await logAudit({
    actorId: user.id,
    action: 'manager_score.submit',
    entityType: 'manager_score',
    entityId: roundId,
    metadata: { pillar, skillKey, level },
  })
}
```

- [ ] **Step 7: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (the logAudit mock prevents real DB calls in any test that imports these actions)

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/scorecard/actions.ts" "app/(app)/growth/actions.ts" "app/(app)/connections/actions.ts" "app/(app)/profile/actions.ts" "app/(app)/dashboard/actions.ts" "app/(app)/manager"
git commit -m "feat: instrument all server actions with logAudit"
```

---

## Final verification

- [ ] Start the dev server and verify manually:

```bash
npm run develop
```

1. Sign in as terry@hairylemon.net → Admin section appears in sidebar
2. Navigate to `/admin/users` → see all users, grant/revoke works
3. Navigate to `/admin/audit-log` → entries appear as actions are taken
4. Navigate to `/admin/organisations` → empty table (orgs come in Plan 2)
5. Sign in as a non-SuperAdmin user → no admin section in sidebar, `/admin/users` redirects to `/dashboard`

- [ ] Run the full test suite one final time

```bash
npx vitest run
```

Expected: all tests pass
