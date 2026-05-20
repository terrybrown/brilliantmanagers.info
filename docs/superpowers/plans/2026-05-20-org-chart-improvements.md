# Org Chart Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `OrgHierarchy` into focused sub-components, add inline child-node creation with optimistic UI, replace the "see members" toggle with always-visible avatar stacks and an inline management panel, and allow adding unregistered users to nodes via invite.

**Architecture:** `OrgHierarchy` gains `useOptimistic` + `useTransition` and passes form-action callbacks down to `NodeRow → AddNodeForm`. `MemberStack` lives on each row and handles the add-member invite path. A new `pending_org_node_invitations` table stores deferred placements; the OTP confirm hook processes them on registration.

**Tech Stack:** Next.js 16 App Router · React 19 (`useOptimistic`, `useTransition`, `useFormStatus`) · Supabase (RLS, admin client) · Vitest + Testing Library · Mailgun · TypeScript

---

## File Map

| Status | Path | Purpose |
|---|---|---|
| Create | `supabase/migrations/20260521000000_pending_org_node_invitations.sql` | New table + RLS |
| Create | `lib/db/pending-org-node-invitations.ts` | DB helper (create, getByEmail, deleteByEmail, deleteById) |
| Create | `lib/email/templates/org-node-invite.ts` | Invite email template |
| Modify | `lib/db/org-nodes.ts` | Add `pendingInvites` to `OrgNode`; extend `getNodesForOrg` |
| Modify | `app/(app)/organisation/actions.ts` | Update `addMemberToNodeAction` (invite path); add `cancelPendingOrgNodeInvitationAction` |
| Modify | `app/auth/confirm/actions.ts` | Process `pending_org_node_invitations` on OTP confirm |
| Create | `components/org/AddNodeForm.tsx` | Inline add-node form with `useFormStatus` |
| Create | `components/org/MemberStack.tsx` | Avatar stack + inline member panel |
| Create | `components/org/NodeRow.tsx` | Single hierarchy row |
| Modify | `components/org/OrgHierarchy.tsx` | Refactor: `useOptimistic`, delegate to sub-components |
| Create | `__tests__/lib/db/pending-org-node-invitations.test.ts` | |
| Create | `__tests__/lib/email/org-node-invite.test.ts` | |
| Modify | `__tests__/lib/db/org-nodes.test.ts` | Extend `getNodesForOrg` tests |
| Modify | `__tests__/app/auth/confirm/actions.test.ts` | Extend confirm tests |
| Create | `__tests__/components/org/AddNodeForm.test.tsx` | |
| Create | `__tests__/components/org/MemberStack.test.tsx` | |
| Create | `__tests__/components/org/NodeRow.test.tsx` | |

---

### Task 1: Database migration — `pending_org_node_invitations`

**Files:**
- Create: `supabase/migrations/20260521000000_pending_org_node_invitations.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run via the Supabase dashboard (SQL editor) or `supabase db push` against your project.

- [ ] **Step 3: Verify RLS rejects unauthenticated requests**

```bash
SUPABASE_URL="https://jxanausntacmzgnzzncu.supabase.co"
ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Should return []
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/pending_org_node_invitations?select=*"

# Should return a 42501 RLS violation
curl -s -X POST -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"invited_email":"x@x.com","org_id":"00000000-0000-0000-0000-000000000001","node_id":"00000000-0000-0000-0000-000000000002"}' \
  "$SUPABASE_URL/rest/v1/pending_org_node_invitations"
```

Expected: first request returns `[]`, second returns a 403/RLS error body.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521000000_pending_org_node_invitations.sql
git commit -m "feat: add pending_org_node_invitations table"
```

---

### Task 2: DB helper — `lib/db/pending-org-node-invitations.ts`

**Files:**
- Create: `lib/db/pending-org-node-invitations.ts`
- Create: `__tests__/lib/db/pending-org-node-invitations.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/pending-org-node-invitations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const mock = createClient as ReturnType<typeof vi.fn>
const adminMock = createAdminClient as ReturnType<typeof vi.fn>

describe('createPendingOrgNodeInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts a row using the user client', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) })

    const { createPendingOrgNodeInvitation } = await import('@/lib/db/pending-org-node-invitations')
    await createPendingOrgNodeInvitation({ inviterId: 'u1', invitedEmail: 'a@x.com', orgId: 'org1', nodeId: 'n1' })

    expect(upsert).toHaveBeenCalledWith(
      { inviter_id: 'u1', invited_email: 'a@x.com', org_id: 'org1', node_id: 'n1' },
      { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
    )
  })

  it('throws when the upsert errors', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) })

    const { createPendingOrgNodeInvitation } = await import('@/lib/db/pending-org-node-invitations')
    await expect(createPendingOrgNodeInvitation({ inviterId: 'u1', invitedEmail: 'a@x.com', orgId: 'org1', nodeId: 'n1' }))
      .rejects.toThrow()
  })
})

describe('getPendingOrgNodeInvitationsByEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns rows using the admin client', async () => {
    const rows = [{ id: 'inv1', org_id: 'org1', node_id: 'n1' }]
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) })

    const { getPendingOrgNodeInvitationsByEmail } = await import('@/lib/db/pending-org-node-invitations')
    const result = await getPendingOrgNodeInvitationsByEmail('a@x.com')

    expect(result).toEqual(rows)
    expect(eq).toHaveBeenCalledWith('invited_email', 'a@x.com')
  })

  it('throws on error', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const select = vi.fn().mockReturnValue({ eq })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) })

    const { getPendingOrgNodeInvitationsByEmail } = await import('@/lib/db/pending-org-node-invitations')
    await expect(getPendingOrgNodeInvitationsByEmail('a@x.com')).rejects.toThrow()
  })
})

describe('deletePendingOrgNodeInvitationsByEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes by email using admin client', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    const { deletePendingOrgNodeInvitationsByEmail } = await import('@/lib/db/pending-org-node-invitations')
    await deletePendingOrgNodeInvitationsByEmail('a@x.com')

    expect(eq).toHaveBeenCalledWith('invited_email', 'a@x.com')
  })

  it('throws on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const del = vi.fn().mockReturnValue({ eq })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    const { deletePendingOrgNodeInvitationsByEmail } = await import('@/lib/db/pending-org-node-invitations')
    await expect(deletePendingOrgNodeInvitationsByEmail('a@x.com')).rejects.toThrow()
  })
})

describe('deletePendingOrgNodeInvitationById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes by id using admin client', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    const { deletePendingOrgNodeInvitationById } = await import('@/lib/db/pending-org-node-invitations')
    await deletePendingOrgNodeInvitationById('inv-1')

    expect(eq).toHaveBeenCalledWith('id', 'inv-1')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- pending-org-node-invitations
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the helper**

```ts
// lib/db/pending-org-node-invitations.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createPendingOrgNodeInvitation(params: {
  inviterId: string
  invitedEmail: string
  orgId: string
  nodeId: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pending_org_node_invitations')
    .upsert(
      {
        inviter_id: params.inviterId,
        invited_email: params.invitedEmail,
        org_id: params.orgId,
        node_id: params.nodeId,
      },
      { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

export async function getPendingOrgNodeInvitationsByEmail(
  email: string
): Promise<Array<{ id: string; org_id: string; node_id: string }>> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pending_org_node_invitations')
    .select('id, org_id, node_id')
    .eq('invited_email', email)
  if (error) throw error
  return data ?? []
}

export async function deletePendingOrgNodeInvitationsByEmail(email: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('pending_org_node_invitations')
    .delete()
    .eq('invited_email', email)
  if (error) throw error
}

export async function deletePendingOrgNodeInvitationById(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('pending_org_node_invitations')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- pending-org-node-invitations
```

Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/pending-org-node-invitations.ts __tests__/lib/db/pending-org-node-invitations.test.ts
git commit -m "feat: pending_org_node_invitations DB helper"
```

---

### Task 3: Email template — `lib/email/templates/org-node-invite.ts`

**Files:**
- Create: `lib/email/templates/org-node-invite.ts`
- Create: `__tests__/lib/email/org-node-invite.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/email/org-node-invite.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildOrgNodeInviteEmail } from '@/lib/email/templates/org-node-invite'

afterEach(() => vi.unstubAllEnvs())

describe('buildOrgNodeInviteEmail', () => {
  it('includes the org name in the subject', () => {
    const { subject } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(subject).toContain('Acme Corp')
  })

  it('includes the node name and org name in the html body', () => {
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('Engineering')
    expect(html).toContain('Acme Corp')
  })

  it('includes the inviter name in the html body', () => {
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('Alice')
  })

  it('links to /login using NEXT_PUBLIC_APP_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    const { html } = buildOrgNodeInviteEmail({
      inviterName: 'Alice',
      orgName: 'Acme Corp',
      nodeName: 'Engineering',
    })
    expect(html).toContain('https://app.example.com/login')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- org-node-invite
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the template**

```ts
// lib/email/templates/org-node-invite.ts
interface OrgNodeInviteEmailParams {
  inviterName: string
  orgName: string
  nodeName: string
}

interface EmailContent {
  subject: string
  html: string
}

export function buildOrgNodeInviteEmail({
  inviterName,
  orgName,
  nodeName,
}: OrgNodeInviteEmailParams): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brilliantmanagers.info'
  const signUpUrl = `${appUrl}/login`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:1px solid #1f2937;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;">Brilliant Managers</p>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Hi there,</p>
        <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          <strong style="color:#f1f5f9;">${inviterName}</strong> has added you to the
          <strong style="color:#f1f5f9;">${nodeName}</strong> group within
          <strong style="color:#f1f5f9;">${orgName}</strong> on Brilliant Managers.
        </p>
        <p style="margin:0 0 24px;color:#cbd5e1;font-size:15px;line-height:1.6;">
          When you sign in, you'll be placed there automatically.
        </p>
        <div style="margin:28px 0;">
          <a href="${signUpUrl}"
             style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                    font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">
            Join ${orgName} →
          </a>
        </div>
        <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.5;">
          If you weren't expecting this, you can safely ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

  return {
    subject: `You've been invited to join ${orgName} on Brilliant Managers`,
    html,
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- org-node-invite
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/email/templates/org-node-invite.ts __tests__/lib/email/org-node-invite.test.ts
git commit -m "feat: org node invite email template"
```

---

### Task 4: Extend `OrgNode` type and `getNodesForOrg`

**Files:**
- Modify: `lib/db/org-nodes.ts`
- Modify: `__tests__/lib/db/org-nodes.test.ts`

- [ ] **Step 1: Add failing tests for the extended `getNodesForOrg`**

Add these new `describe` blocks to the bottom of `__tests__/lib/db/org-nodes.test.ts` (keep the existing tests):

```ts
// Add to bottom of __tests__/lib/db/org-nodes.test.ts

describe('getNodesForOrg with pendingInvites', () => {
  it('attaches pendingInvites to each node', async () => {
    const nodes = [
      { id: 'n1', org_id: 'org-1', parent_id: null, name: 'Eng', node_type: null,
        created_at: '2024-01-01', org_node_members: [] },
    ]
    const order = vi.fn().mockResolvedValue({ data: nodes, error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    // Admin mock: first call for profiles (empty), second call for pending invites
    const inFn = vi.fn()
      .mockResolvedValueOnce({ data: [] })          // profiles
      .mockResolvedValueOnce({ data: [            // pending invites
        { id: 'inv-1', node_id: 'n1', invited_email: 'x@x.com' },
      ] })
    const adminSelect = vi.fn().mockReturnValue({ in: inFn })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ select: adminSelect }) })

    const result = await getNodesForOrg('org-1')
    expect(result[0].pendingInvites).toEqual([{ id: 'inv-1', invited_email: 'x@x.com' }])
  })

  it('returns empty pendingInvites when none exist', async () => {
    const nodes = [
      { id: 'n1', org_id: 'org-1', parent_id: null, name: 'Eng', node_type: null,
        created_at: '2024-01-01', org_node_members: [] },
    ]
    const order = vi.fn().mockResolvedValue({ data: nodes, error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const inFn = vi.fn()
      .mockResolvedValueOnce({ data: [] })   // profiles
      .mockResolvedValueOnce({ data: [] })   // pending invites
    const adminSelect = vi.fn().mockReturnValue({ in: inFn })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ select: adminSelect }) })

    const result = await getNodesForOrg('org-1')
    expect(result[0].pendingInvites).toEqual([])
  })
})
```

Also update the existing `getNodesForOrg` passing test to expect `pendingInvites: []` on the result (since the mock will now be called twice for admin):

In the existing `'returns nodes with member data fetched via admin client'` test, update the adminMock setup:

```ts
// Replace the existing adminMock setup in that test with:
const inFn = vi.fn()
  .mockResolvedValueOnce({ data: [{ id: 'u1', email: 'a@x.com', display_name: 'Alice' }] }) // profiles
  .mockResolvedValueOnce({ data: [] }) // pending invites (empty)
const adminSelect = vi.fn().mockReturnValue({ in: inFn })
adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ select: adminSelect }) })

// And add to the assertions:
expect(result[0].pendingInvites).toEqual([])
```

Do the same update for the `'returns null profile fields when profile not found'` test.

- [ ] **Step 2: Run tests to confirm the new tests fail**

```bash
npm test -- org-nodes
```

Expected: existing tests PASS, new `pendingInvites` tests FAIL.

- [ ] **Step 3: Update `OrgNode` interface and `getNodesForOrg`**

In `lib/db/org-nodes.ts`, add `pendingInvites` to `OrgNode` and extend `getNodesForOrg`:

```ts
// lib/db/org-nodes.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RawNodeRow {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  org_node_members: { user_id: string }[]
}

interface RawNodeInsertRow {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
}

export interface OrgNode {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  members: { user_id: string; email: string | null; display_name: string | null }[]
  pendingInvites: { id: string; invited_email: string }[]
}

export async function createNode(params: {
  orgId: string
  parentId: string | null
  name: string
  nodeType?: string | null
}): Promise<OrgNode> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_nodes')
    .insert({
      org_id: params.orgId,
      parent_id: params.parentId ?? null,
      name: params.name,
      node_type: params.nodeType ?? null,
    })
    .select('id, org_id, parent_id, name, node_type, created_at')
    .single()
  if (error) throw error
  if (!data) throw new Error('No data returned from org_nodes insert')
  const raw = data as RawNodeInsertRow
  return { ...raw, members: [], pendingInvites: [] }
}

// Caller must verify org_admin role — RLS enforces this for user-scoped clients.
export async function renameNode(nodeId: string, orgId: string, name: string, nodeType: string | null): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_nodes')
    .update({ name, node_type: nodeType })
    .eq('id', nodeId)
    .eq('org_id', orgId)
  if (error) throw error
}

// Cascade on org_nodes.parent_id handles child nodes automatically.
export async function deleteNode(nodeId: string, orgId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_nodes')
    .delete()
    .eq('id', nodeId)
    .eq('org_id', orgId)
  if (error) throw error
}

export async function getNodesForOrg(orgId: string): Promise<OrgNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_nodes')
    .select('id, org_id, parent_id, name, node_type, created_at, org_node_members(user_id)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const nodes = (data as RawNodeRow[]) ?? []
  if (nodes.length === 0) return []

  const allUserIds = [...new Set(nodes.flatMap(n => n.org_node_members.map(m => m.user_id)))]
  const nodeIds = nodes.map(n => n.id)
  const adminSupabase = createAdminClient()

  const [profilesResult, pendingResult] = await Promise.all([
    allUserIds.length > 0
      ? adminSupabase.from('profiles').select('id, email, display_name').in('id', allUserIds)
      : Promise.resolve({ data: [] as { id: string; email: string | null; display_name: string | null }[] }),
    adminSupabase
      .from('pending_org_node_invitations')
      .select('id, node_id, invited_email')
      .in('node_id', nodeIds),
  ])

  const profileMap = new Map<string, { email: string | null; display_name: string | null }>()
  for (const p of profilesResult.data ?? []) profileMap.set(p.id, p)

  const pendingByNodeId = new Map<string, { id: string; invited_email: string }[]>()
  for (const invite of (pendingResult.data ?? []) as { id: string; node_id: string; invited_email: string }[]) {
    const existing = pendingByNodeId.get(invite.node_id) ?? []
    existing.push({ id: invite.id, invited_email: invite.invited_email })
    pendingByNodeId.set(invite.node_id, existing)
  }

  return nodes.map(node => ({
    id: node.id,
    org_id: node.org_id,
    parent_id: node.parent_id,
    name: node.name,
    node_type: node.node_type,
    created_at: node.created_at,
    members: node.org_node_members.map(m => ({
      user_id: m.user_id,
      email: profileMap.get(m.user_id)?.email ?? null,
      display_name: profileMap.get(m.user_id)?.display_name ?? null,
    })),
    pendingInvites: pendingByNodeId.get(node.id) ?? [],
  }))
}
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npm test -- org-nodes
```

Expected: PASS (all tests including the new pendingInvites tests)

- [ ] **Step 5: Run the full suite to check for regressions**

```bash
npm test
```

Expected: all green (the `OrgNode` type change will surface any consumers that need `pendingInvites` — they'll TypeScript-error, not test-fail, so check the build too)

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 6: Fix any TypeScript errors from the `OrgNode` change**

`createNode` already returns `pendingInvites: []`. If any other place constructs an `OrgNode` literal, add `pendingInvites: []` to it. The most likely place is inside tests that mock `OrgNode` objects — update them.

- [ ] **Step 7: Commit**

```bash
git add lib/db/org-nodes.ts __tests__/lib/db/org-nodes.test.ts
git commit -m "feat: add pendingInvites to OrgNode type and getNodesForOrg"
```

---

### Task 5: Update `addMemberToNodeAction` — invite path

**Files:**
- Modify: `app/(app)/organisation/actions.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/(app)/organisation/actions.test.ts`:

```ts
// __tests__/app/(app)/organisation/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOrgRole: vi.fn(),
  profileSelect: vi.fn(),
  orgSelect: vi.fn(),
  nodeSelect: vi.fn(),
  actorProfileSelect: vi.fn(),
  createPendingInvite: vi.fn(),
  sendEmail: vi.fn(),
  addUserToNode: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/auth/roles', () => ({ getOrgRole: mocks.getOrgRole }))
vi.mock('@/lib/db/pending-org-node-invitations', () => ({
  createPendingOrgNodeInvitation: mocks.createPendingInvite,
}))
vi.mock('@/lib/email/mailgun', () => ({ sendEmail: mocks.sendEmail }))
vi.mock('@/lib/db/org-node-members', () => ({ addUserToNode: mocks.addUserToNode }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@x.com' } },
      }),
    },
    from: (table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ maybeSingle: mocks.profileSelect }) }) }
      if (table === 'organisations') return { select: () => ({ eq: () => ({ single: mocks.orgSelect }) }) }
      if (table === 'org_nodes') return { select: () => ({ eq: () => ({ single: mocks.nodeSelect }) }) }
      return {}
    },
  }),
}))

describe('addMemberToNodeAction — invite path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrgRole.mockResolvedValue('org_admin')
    mocks.profileSelect.mockResolvedValue({ data: null, error: null }) // no account
    mocks.orgSelect.mockResolvedValue({ data: { name: 'Acme Corp' }, error: null })
    mocks.nodeSelect.mockResolvedValue({ data: { name: 'Engineering' }, error: null })
    mocks.createPendingInvite.mockResolvedValue(undefined)
    mocks.sendEmail.mockResolvedValue(undefined)
  })

  it('creates a pending invite and returns {} when email has no account', async () => {
    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'new@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.createPendingInvite).toHaveBeenCalledWith({
      inviterId: 'admin-1',
      invitedEmail: 'new@example.com',
      orgId: 'org-1',
      nodeId: 'node-1',
    })
    expect(mocks.sendEmail).toHaveBeenCalled()
  })

  it('returns {} even when email send fails (does not block)', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('Mailgun down'))

    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'new@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.createPendingInvite).toHaveBeenCalled()
  })

  it('adds user directly when profile exists', async () => {
    mocks.profileSelect.mockResolvedValue({ data: { id: 'existing-user' }, error: null })
    mocks.addUserToNode.mockResolvedValue(undefined)

    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'existing@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.addUserToNode).toHaveBeenCalledWith({
      nodeId: 'node-1',
      userId: 'existing-user',
      actorId: 'admin-1',
    })
    expect(mocks.createPendingInvite).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- "actions.test"
```

Expected: FAIL (invite path returns `{ error: 'No account found...' }` currently)

- [ ] **Step 3: Update `addMemberToNodeAction` in `app/(app)/organisation/actions.ts`**

Add imports at the top of the file:

```ts
import { createPendingOrgNodeInvitation } from '@/lib/db/pending-org-node-invitations'
import { buildOrgNodeInviteEmail } from '@/lib/email/templates/org-node-invite'
import { sendEmail } from '@/lib/email/mailgun'
```

Replace the `addMemberToNodeAction` function body (keep the signature and guard unchanged):

```ts
export async function addMemberToNodeAction(formData: FormData): Promise<{ error?: string }> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!orgId || !nodeId || !email) return { error: 'Missing fields' }

  const actor = await requireOrgAdmin(orgId)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (profile) {
    await addUserToNode({ nodeId, userId: profile.id, actorId: actor.id })
    await logAudit({ actorId: actor.id, action: 'org_node_member.add', entityType: 'org_node_member', entityId: nodeId, metadata: { email } })
    revalidatePath('/people')
    return {}
  }

  // Unregistered user — create pending invite and send email
  const [{ data: orgData }, { data: nodeData }, { data: actorProfile }] = await Promise.all([
    supabase.from('organisations').select('name').eq('id', orgId).single(),
    supabase.from('org_nodes').select('name').eq('id', nodeId).single(),
    supabase.from('profiles').select('display_name, email').eq('id', actor.id).single(),
  ])

  await createPendingOrgNodeInvitation({ inviterId: actor.id, invitedEmail: email, orgId, nodeId })
  await logAudit({ actorId: actor.id, action: 'org_node_invite.create', entityType: 'org_node', entityId: nodeId, metadata: { email } })

  try {
    const { subject, html } = buildOrgNodeInviteEmail({
      inviterName: actorProfile?.display_name ?? actorProfile?.email ?? 'A colleague',
      orgName: orgData?.name ?? 'your organisation',
      nodeName: nodeData?.name ?? 'a team',
    })
    await sendEmail({ to: email, subject, html })
  } catch (err) {
    console.error('Failed to send org node invite email:', err)
  }

  revalidatePath('/people')
  return {}
}
```

Also add `cancelPendingOrgNodeInvitationAction` to `app/(app)/organisation/actions.ts`:

```ts
import { deletePendingOrgNodeInvitationById } from '@/lib/db/pending-org-node-invitations'

export async function cancelPendingOrgNodeInvitationAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const invitationId = formData.get('invitationId') as string
  if (!orgId || !invitationId) return

  const actor = await requireOrgAdmin(orgId)
  await deletePendingOrgNodeInvitationById(invitationId)
  await logAudit({ actorId: actor.id, action: 'org_node_invite.cancel', entityType: 'org_node', entityId: invitationId })
  revalidatePath('/people')
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- "actions.test"
```

Expected: PASS

- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: all green

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/organisation/actions.ts lib/db/pending-org-node-invitations.ts \
  __tests__/app/\(app\)/organisation/actions.test.ts
git commit -m "feat: invite unregistered users to org nodes; add cancel pending invite action"
```

---

### Task 6: OTP confirm — process `pending_org_node_invitations`

**Files:**
- Modify: `app/auth/confirm/actions.ts`
- Modify: `__tests__/app/auth/confirm/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to `__tests__/app/auth/confirm/actions.test.ts`. The existing `vi.mock('@/lib/supabase/admin')` mock needs to handle the new table. Update the `createAdminClient` mock's `from` function to also handle `pending_org_node_invitations`:

At the top of the test file, add new mock functions to the `mocks` object:

```ts
// Add to the mocks vi.hoisted block:
nodeInvitesSelect: vi.fn(),
nodeInvitesDelete: vi.fn(),
orgMembersUpsert: vi.fn(),
nodeMembersInsert: vi.fn(),
```

Update the `createAdminClient` mock to handle the new tables:

```ts
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: (table: string) => {
      if (table === 'pending_invitations') {
        return {
          select: () => ({ eq: mocks.pendingSelect }),
          delete: () => ({ eq: mocks.pendingDelete }),
        }
      }
      if (table === 'connections') {
        return { insert: mocks.connectionsInsert }
      }
      if (table === 'pending_org_node_invitations') {
        return {
          select: () => ({ eq: mocks.nodeInvitesSelect }),
          delete: () => ({ eq: mocks.nodeInvitesDelete }),
        }
      }
      if (table === 'org_members') {
        return { upsert: mocks.orgMembersUpsert }
      }
      if (table === 'org_node_members') {
        return { insert: mocks.nodeMembersInsert }
      }
      return {}
    },
  }),
}))
```

Add to `beforeEach`:

```ts
mocks.nodeInvitesSelect.mockResolvedValue({ data: [], error: null })
mocks.nodeInvitesDelete.mockResolvedValue({ error: null })
mocks.orgMembersUpsert.mockResolvedValue({ error: null })
mocks.nodeMembersInsert.mockResolvedValue({ error: null })
```

Add new tests at the bottom:

```ts
describe('confirmLogin — pending_org_node_invitations processing', () => {
  it('inserts into org_members and org_node_members for each pending org node invite', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.nodeInvitesSelect.mockResolvedValue({
      data: [{ id: 'ni-1', org_id: 'org-1', node_id: 'node-1' }],
      error: null,
    })

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(mocks.orgMembersUpsert).toHaveBeenCalledWith(
      { org_id: 'org-1', user_id: 'new-user', role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
    expect(mocks.nodeMembersInsert).toHaveBeenCalledWith(
      { node_id: 'node-1', user_id: 'new-user' }
    )
    expect(mocks.nodeInvitesDelete).toHaveBeenCalledWith('invited_email', 'new@example.com')
  })

  it('still redirects to /dashboard when node invite SELECT fails', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.nodeInvitesSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.nodeMembersInsert).not.toHaveBeenCalled()
  })

  it('does not delete invites when none found', async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: 'new-user', email: 'new@example.com' } },
      error: null,
    })
    mocks.nodeInvitesSelect.mockResolvedValue({ data: [], error: null })

    const { confirmLogin } = await import('@/app/auth/confirm/actions')
    const fd = new FormData()
    fd.set('token_hash', 'abc123')
    await expect(confirmLogin(fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.nodeMembersInsert).not.toHaveBeenCalled()
    expect(mocks.nodeInvitesDelete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm the new tests fail**

```bash
npm test -- "confirm/actions"
```

Expected: existing tests PASS, new org-node tests FAIL.

- [ ] **Step 3: Update `confirmLogin` in `app/auth/confirm/actions.ts`**

After the closing `if (invites !== null) { await admin.from('pending_invitations').delete()... }` block and before `redirect('/dashboard')`, add:

```ts
    // Process pending org node invitations
    const { data: nodeInvites, error: nodeInvitesError } = await admin
      .from('pending_org_node_invitations')
      .select('id, org_id, node_id')
      .eq('invited_email', user.email)

    if (nodeInvitesError) {
      console.error('Failed to fetch pending org node invitations:', nodeInvitesError)
    } else if (nodeInvites && nodeInvites.length > 0) {
      for (const invite of nodeInvites as { id: string; org_id: string; node_id: string }[]) {
        const { error: orgErr } = await admin
          .from('org_members')
          .upsert(
            { org_id: invite.org_id, user_id: user.id, role: 'member' },
            { onConflict: 'org_id,user_id', ignoreDuplicates: true }
          )
        if (orgErr) {
          console.error('Failed to add org member on OTP confirm:', orgErr)
          continue
        }

        const { error: nodeErr } = await admin
          .from('org_node_members')
          .insert({ node_id: invite.node_id, user_id: user.id })
        if (nodeErr && nodeErr.code !== '23505') {
          console.error('Failed to add org node member on OTP confirm:', nodeErr)
        }
      }

      await admin
        .from('pending_org_node_invitations')
        .delete()
        .eq('invited_email', user.email)
    }
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- "confirm/actions"
```

Expected: PASS (all tests including new ones)

```bash
npm test
```

Expected: all green

- [ ] **Step 5: Commit**

```bash
git add app/auth/confirm/actions.ts __tests__/app/auth/confirm/actions.test.ts
git commit -m "feat: process pending_org_node_invitations on OTP confirm"
```

---

### Task 7: `AddNodeForm` component

**Files:**
- Create: `components/org/AddNodeForm.tsx`
- Create: `__tests__/components/org/AddNodeForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/org/AddNodeForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddNodeForm } from '@/components/org/AddNodeForm'

describe('AddNodeForm', () => {
  it('renders the input and Add button', () => {
    render(
      <AddNodeForm
        orgId="org-1"
        parentId="node-1"
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText(/child group name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('renders the cancel button and calls onCancel when clicked', () => {
    const onCancel = vi.fn()
    render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('includes a hidden orgId input', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const hidden = container.querySelector('input[name="orgId"]') as HTMLInputElement
    expect(hidden?.value).toBe('org-1')
  })

  it('includes a hidden parentId input when parentId is set', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId="node-parent"
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const hidden = container.querySelector('input[name="parentId"]') as HTMLInputElement
    expect(hidden?.value).toBe('node-parent')
  })

  it('omits the parentId hidden input when parentId is null', () => {
    const { container } = render(
      <AddNodeForm
        orgId="org-1"
        parentId={null}
        formAction={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container.querySelector('input[name="parentId"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- AddNodeForm
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `AddNodeForm`**

```tsx
// components/org/AddNodeForm.tsx
'use client'
import { useRef } from 'react'
import { useFormStatus } from 'react-dom'

interface AddNodeFormProps {
  orgId: string
  parentId: string | null
  formAction: (formData: FormData) => Promise<void>
  onCancel: () => void
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: '5px 10px',
        background: 'rgba(99,102,241,0.2)',
        color: '#a78bfa',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {pending ? '…' : 'Add'}
    </button>
  )
}

export function AddNodeForm({ orgId, parentId, formAction, onCancel }: AddNodeFormProps) {
  const ref = useRef<HTMLFormElement>(null)

  async function action(formData: FormData) {
    await formAction(formData)
    ref.current?.reset()
  }

  return (
    <div
      style={{
        background: 'rgba(99,102,241,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: '2px solid rgba(99,102,241,0.3)',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '8px 14px',
      }}
    >
      <form ref={ref} action={action} style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
        <input type="hidden" name="orgId" value={orgId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <input
          name="name"
          placeholder="Child group name…"
          autoFocus
          required
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #374151',
            borderRadius: 4,
            padding: '5px 8px',
            color: '#f1f5f9',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <SubmitButton />
      </form>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: '#4b5563',
          fontSize: 11,
          cursor: 'pointer',
          padding: '5px 6px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- AddNodeForm
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/org/AddNodeForm.tsx __tests__/components/org/AddNodeForm.test.tsx
git commit -m "feat: AddNodeForm component with useFormStatus"
```

---

### Task 8: `MemberStack` component

**Files:**
- Create: `components/org/MemberStack.tsx`
- Create: `__tests__/components/org/MemberStack.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/org/MemberStack.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberStack } from '@/components/org/MemberStack'
import type { OrgNode } from '@/lib/db/org-nodes'

vi.mock('@/app/(app)/organisation/actions', () => ({
  addMemberToNodeAction: vi.fn().mockResolvedValue({}),
  removeMemberFromNodeAction: vi.fn(),
  cancelPendingOrgNodeInvitationAction: vi.fn(),
}))

const makeMember = (id: string, name: string): OrgNode['members'][0] => ({
  user_id: id,
  display_name: name,
  email: `${id}@x.com`,
})

describe('MemberStack', () => {
  it('shows "0 people" when there are no members or pending invites', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('0 people')).toBeInTheDocument()
  })

  it('renders avatar circles for members', () => {
    const members = [makeMember('u1', 'Alice'), makeMember('u2', 'Bob'), makeMember('u3', 'Carol')]
    render(
      <MemberStack
        members={members}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    // First 3 members shown as initials
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('shows +N overflow when more than 3 members', () => {
    const members = [
      makeMember('u1', 'Alice'),
      makeMember('u2', 'Bob'),
      makeMember('u3', 'Carol'),
      makeMember('u4', 'Dave'),
    ]
    render(
      <MemberStack
        members={members}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('calls onToggle when admin clicks the avatar stack', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByTitle(/manage members/i))
    expect(onToggle).toHaveBeenCalled()
  })

  it('does not make the avatar stack clickable for non-admins', () => {
    const onToggle = vi.fn()
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={false}
        isOpen={false}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByText('AL'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows member panel with chips when isOpen is true (admin)', () => {
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={true}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/add member by email/i)).toBeInTheDocument()
  })

  it('shows pending invite chips labelled "awaiting registration"', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'pending@x.com' }]}
        nodeId="n1"
        orgId="org-1"
        isAdmin={true}
        isOpen={true}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('pending@x.com')).toBeInTheDocument()
    expect(screen.getByText(/awaiting registration/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- MemberStack
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `MemberStack`**

```tsx
// components/org/MemberStack.tsx
'use client'
import { useState, useTransition } from 'react'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#7c3aed',
  '#b45309', '#be185d', '#0e7490', '#15803d',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? '?'
  return src.slice(0, 2).toUpperCase()
}

const AVATAR_SIZE = 22
const AVATAR_BORDER = 2
const MAX_VISIBLE = 3

interface MemberStackProps {
  members: OrgNode['members']
  pendingInvites: OrgNode['pendingInvites']
  nodeId: string
  orgId: string
  isAdmin: boolean
  isOpen: boolean
  onToggle: () => void
}

export function MemberStack({
  members,
  pendingInvites,
  nodeId,
  orgId,
  isAdmin,
  isOpen,
  onToggle,
}: MemberStackProps) {
  const [memberError, setMemberError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  if (members.length === 0 && pendingInvites.length === 0) {
    return (
      <span style={{ color: '#4b5563', fontSize: 11 }}>0 people</span>
    )
  }

  return (
    <>
      {/* Avatar stack */}
      <div
        onClick={isAdmin ? onToggle : undefined}
        title={isAdmin ? 'Manage members' : undefined}
        style={{
          display: 'flex',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        {visible.map((m, i) => (
          <div
            key={m.user_id}
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              background: avatarColor(m.user_id),
              border: `${AVATAR_BORDER}px solid #111827`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: '#fff',
              marginLeft: i > 0 ? -6 : 0,
              flexShrink: 0,
            }}
          >
            {initials(m.display_name, m.email)}
          </div>
        ))}
        {overflow > 0 && (
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              background: '#374151',
              border: `${AVATAR_BORDER}px solid #111827`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: '#9ca3af',
              marginLeft: -6,
              flexShrink: 0,
            }}
          >
            +{overflow}
          </div>
        )}
        {pendingInvites.length > 0 && members.length === 0 && (
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              border: `${AVATAR_BORDER}px solid rgba(99,102,241,0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            {pendingInvites.length}
          </div>
        )}
      </div>

      {/* Member panel — admin only, when open */}
      {isAdmin && isOpen && (
        <div
          style={{
            gridColumn: '1 / -1',
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: 38,
            paddingRight: 14,
            background: 'rgba(99,102,241,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderLeft: '2px solid rgba(99,102,241,0.25)',
          }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b7280', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {/* Confirmed member chips */}
            {members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 11, color: '#cbd5e1',
                }}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: avatarColor(m.user_id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#fff', flexShrink: 0,
                  }}
                >
                  {initials(m.display_name, m.email)}
                </div>
                {m.display_name ?? m.email}
                <form action={removeMemberFromNodeAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="nodeId" value={nodeId} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  <input type="hidden" name="orgId" value={orgId} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
              </div>
            ))}

            {/* Pending invite chips */}
            {pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 11, color: '#a78bfa',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 9, color: '#6366f1', marginLeft: 2 }}>awaiting registration</span>
                <form action={cancelPendingOrgNodeInvitationAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="invitationId" value={invite.id} />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}>
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div style={{ display: 'flex', gap: 6 }}>
            <form
              style={{ display: 'flex', gap: 6, flex: 1 }}
              action={async (fd) => {
                fd.set('orgId', orgId)
                fd.set('nodeId', nodeId)
                setMemberError(null)
                startTransition(async () => {
                  const result = await addMemberToNodeAction(fd)
                  if (result.error) setMemberError(result.error)
                })
              }}
            >
              <input
                name="email"
                type="email"
                placeholder="Add member by email…"
                disabled={isPending}
                style={{
                  flex: 1, background: '#0d1117', border: '1px solid #1f2937',
                  color: '#f1f5f9', padding: '5px 8px', borderRadius: 4, fontSize: 11,
                  outline: 'none', maxWidth: 280,
                }}
              />
              <button
                type="submit"
                disabled={isPending}
                style={{
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a78bfa', padding: '5px 10px', borderRadius: 4, fontSize: 11,
                  cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? '…' : 'Add'}
              </button>
            </form>
          </div>
          {memberError && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#ef4444' }}>{memberError}</p>
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- MemberStack
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add components/org/MemberStack.tsx __tests__/components/org/MemberStack.test.tsx
git commit -m "feat: MemberStack component with avatar stack and inline member panel"
```

---

### Task 9: `NodeRow` component

**Files:**
- Create: `components/org/NodeRow.tsx`
- Create: `__tests__/components/org/NodeRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/components/org/NodeRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NodeRow } from '@/components/org/NodeRow'
import type { OrgNodeWithChildren } from '@/components/org/NodeRow'

const baseNode: OrgNodeWithChildren = {
  id: 'n1',
  org_id: 'org-1',
  parent_id: null,
  name: 'Engineering',
  node_type: null,
  created_at: '2024-01-01',
  members: [],
  pendingInvites: [],
  children: [],
}

const defaultProps = {
  node: baseNode,
  depth: 0,
  orgId: 'org-1',
  isAdmin: true,
  isCollapsed: false,
  onToggleCollapse: vi.fn(),
  openMemberPanelId: null,
  setOpenMemberPanelId: vi.fn(),
  openChildFormId: null,
  setOpenChildFormId: vi.fn(),
  addNodeFormAction: vi.fn().mockReturnValue(vi.fn()),
  renderNode: vi.fn().mockReturnValue(null),
}

describe('NodeRow', () => {
  it('renders the node name', () => {
    render(<NodeRow {...defaultProps} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  it('shows the + child button for admins', () => {
    render(<NodeRow {...defaultProps} />)
    expect(screen.getByRole('button', { name: /\+ child/i })).toBeInTheDocument()
  })

  it('hides the + child button for non-admins', () => {
    render(<NodeRow {...defaultProps} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /\+ child/i })).toBeNull()
  })

  it('calls setOpenChildFormId with node id when + child is clicked', () => {
    const setOpenChildFormId = vi.fn()
    render(<NodeRow {...defaultProps} setOpenChildFormId={setOpenChildFormId} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ child/i }))
    expect(setOpenChildFormId).toHaveBeenCalledWith('n1')
  })

  it('calls setOpenChildFormId with null when + child is clicked while form is open (toggle off)', () => {
    const setOpenChildFormId = vi.fn()
    render(<NodeRow {...defaultProps} openChildFormId="n1" setOpenChildFormId={setOpenChildFormId} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ child/i }))
    expect(setOpenChildFormId).toHaveBeenCalledWith(null)
  })

  it('shows the AddNodeForm when openChildFormId matches node id', () => {
    render(<NodeRow {...defaultProps} openChildFormId="n1" />)
    expect(screen.getByPlaceholderText(/child group name/i)).toBeInTheDocument()
  })

  it('shows collapse toggle when node has children', () => {
    const nodeWithChildren: OrgNodeWithChildren = {
      ...baseNode,
      children: [{ ...baseNode, id: 'n2', name: 'Frontend', children: [] }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithChildren} />)
    expect(screen.getByRole('button', { name: '▾' })).toBeInTheDocument()
  })

  it('calls onToggleCollapse when collapse button is clicked', () => {
    const onToggleCollapse = vi.fn()
    const nodeWithChildren: OrgNodeWithChildren = {
      ...baseNode,
      children: [{ ...baseNode, id: 'n2', name: 'Frontend', children: [] }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithChildren} onToggleCollapse={onToggleCollapse} />)
    fireEvent.click(screen.getByRole('button', { name: '▾' }))
    expect(onToggleCollapse).toHaveBeenCalled()
  })

  it('renders children via renderNode when not collapsed', () => {
    const renderNode = vi.fn().mockReturnValue(<div>child-content</div>)
    const nodeWithChildren: OrgNodeWithChildren = {
      ...baseNode,
      children: [{ ...baseNode, id: 'n2', name: 'Frontend', children: [] }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithChildren} renderNode={renderNode} />)
    expect(screen.getByText('child-content')).toBeInTheDocument()
    expect(renderNode).toHaveBeenCalledWith(nodeWithChildren.children[0], 1)
  })

  it('does not render children when collapsed', () => {
    const renderNode = vi.fn().mockReturnValue(<div>child-content</div>)
    const nodeWithChildren: OrgNodeWithChildren = {
      ...baseNode,
      children: [{ ...baseNode, id: 'n2', name: 'Frontend', children: [] }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithChildren} renderNode={renderNode} isCollapsed={true} />)
    expect(screen.queryByText('child-content')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- NodeRow
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `NodeRow`**

```tsx
// components/org/NodeRow.tsx
'use client'
import type { OrgNode } from '@/lib/db/org-nodes'
import { MemberStack } from './MemberStack'
import { AddNodeForm } from './AddNodeForm'

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

interface NodeRowProps {
  node: OrgNodeWithChildren
  depth: number
  orgId: string
  isAdmin: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  openMemberPanelId: string | null
  setOpenMemberPanelId: (id: string | null) => void
  openChildFormId: string | null
  setOpenChildFormId: (id: string | null) => void
  addNodeFormAction: (parentId: string) => (formData: FormData) => Promise<void>
  renderNode: (node: OrgNodeWithChildren, depth: number) => React.ReactNode
}

export function NodeRow({
  node,
  depth,
  orgId,
  isAdmin,
  isCollapsed,
  onToggleCollapse,
  openMemberPanelId,
  setOpenMemberPanelId,
  openChildFormId,
  setOpenChildFormId,
  addNodeFormAction,
  renderNode,
}: NodeRowProps) {
  const isChildFormOpen = openChildFormId === node.id
  const isMemberPanelOpen = openMemberPanelId === node.id
  const isProvisional = node.id.startsWith('provisional-')

  const paddingLeft = 14 + depth * 18

  return (
    <div>
      {/* Node row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `8px 14px 8px ${paddingLeft}px`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          opacity: isProvisional ? 0.55 : 1,
        }}
      >
        {/* Collapse toggle */}
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? '▸' : '▾'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7280', padding: 0, fontSize: 12, flexShrink: 0,
            }}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}

        {/* Name */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: isProvisional ? '#a78bfa' : '#f1f5f9',
            fontWeight: depth === 0 ? 600 : 400,
            fontStyle: isProvisional ? 'italic' : 'normal',
          }}
        >
          {node.name}
          {node.node_type && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#4b5563' }}>{node.node_type}</span>
          )}
        </span>

        {/* Saving indicator for provisional nodes */}
        {isProvisional && (
          <span style={{ fontSize: 10, color: '#f59e0b' }}>saving…</span>
        )}

        {/* Member stack */}
        {!isProvisional && (
          <MemberStack
            members={node.members}
            pendingInvites={node.pendingInvites}
            nodeId={node.id}
            orgId={orgId}
            isAdmin={isAdmin}
            isOpen={isMemberPanelOpen}
            onToggle={() =>
              setOpenMemberPanelId(isMemberPanelOpen ? null : node.id)
            }
          />
        )}

        {/* + child button (admin only, disabled for provisional nodes) */}
        {isAdmin && (
          <button
            type="button"
            disabled={isProvisional}
            onClick={() => setOpenChildFormId(isChildFormOpen ? null : node.id)}
            style={{
              fontSize: 10,
              color: isChildFormOpen ? '#a78bfa' : '#6366f1',
              cursor: isProvisional ? 'default' : 'pointer',
              border: `1px solid ${isChildFormOpen ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)'}`,
              padding: '2px 8px',
              borderRadius: 4,
              background: isChildFormOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)',
              opacity: isProvisional ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            + child{isChildFormOpen ? ' ▴' : ''}
          </button>
        )}
      </div>

      {/* Inline member panel (rendered inside the row's parent, full-width below) */}
      {isMemberPanelOpen && isAdmin && (
        <div
          style={{
            paddingLeft: paddingLeft + 22,
            paddingRight: 14,
            paddingTop: 6,
            paddingBottom: 10,
            background: 'rgba(99,102,241,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <MemberStack
            members={node.members}
            pendingInvites={node.pendingInvites}
            nodeId={node.id}
            orgId={orgId}
            isAdmin={true}
            isOpen={true}
            onToggle={() => setOpenMemberPanelId(null)}
          />
        </div>
      )}

      {/* Inline add-child form */}
      {isChildFormOpen && !isProvisional && (
        <div style={{ paddingLeft: paddingLeft + 18 }}>
          <AddNodeForm
            orgId={orgId}
            parentId={node.id}
            formAction={addNodeFormAction(node.id)}
            onCancel={() => setOpenChildFormId(null)}
          />
        </div>
      )}

      {/* Children */}
      {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
    </div>
  )
}
```

> **Note on MemberStack rendering:** The `MemberStack` component contains both the avatar stack display and the panel. In `NodeRow`, we render `MemberStack` twice when open — once inline in the row (avatar stack only) and once below with `isOpen=true`. A simpler approach is to only render `MemberStack` once and have it handle both views; the current implementation passes `isOpen` to control which view is shown. Review and simplify if needed during implementation.

**Simpler approach for NodeRow:** Render `MemberStack` once, passing `isOpen={isMemberPanelOpen}`. The component renders the avatar stack always, and the panel when `isOpen` is true. Remove the duplicated `MemberStack` in the "inline member panel" block above, since `MemberStack` already handles both states:

```tsx
// In the row span section, replace the two MemberStack renders with one:
{!isProvisional && (
  <MemberStack
    members={node.members}
    pendingInvites={node.pendingInvites}
    nodeId={node.id}
    orgId={orgId}
    isAdmin={isAdmin}
    isOpen={isMemberPanelOpen}
    onToggle={() => setOpenMemberPanelId(isMemberPanelOpen ? null : node.id)}
  />
)}
// Remove the separate "Inline member panel" block entirely
```

And update `MemberStack` to render the panel as a positioned element below (using a wrapper `div` that breaks out of flex layout), or accept that the panel will appear inside the flex row. For a clean layout, the member panel should be a full-width block below the row — consider wrapping the row + panel in an outer div.

The implementation details here are flexible. The tests above cover the behaviour, not the exact layout. Adjust the component structure to make the tests pass and the UI match the mockup.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- NodeRow
```

Expected: PASS (9 tests) — if layout adjustments are needed, update the component until all pass.

- [ ] **Step 5: Commit**

```bash
git add components/org/NodeRow.tsx __tests__/components/org/NodeRow.test.tsx
git commit -m "feat: NodeRow component with add-child toggle and MemberStack"
```

---

### Task 10: Refactor `OrgHierarchy`

**Files:**
- Modify: `components/org/OrgHierarchy.tsx`
- Create: `__tests__/components/org/OrgHierarchy.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/org/OrgHierarchy.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OrgHierarchy } from '@/components/org/OrgHierarchy'
import type { OrgNode } from '@/lib/db/org-nodes'

vi.mock('@/app/(app)/organisation/actions', () => ({
  createNodeAction: vi.fn(),
}))

const makeNode = (id: string, name: string, parentId: string | null = null): OrgNode => ({
  id,
  org_id: 'org-1',
  parent_id: parentId,
  name,
  node_type: null,
  created_at: '2024-01-01',
  members: [],
  pendingInvites: [],
})

describe('OrgHierarchy', () => {
  it('shows "No structure defined yet" when nodes is empty', () => {
    render(<OrgHierarchy nodes={[]} orgId="org-1" orgRole="org_admin" />)
    expect(screen.getByText(/no structure defined yet/i)).toBeInTheDocument()
  })

  it('renders top-level node names', () => {
    render(
      <OrgHierarchy
        nodes={[makeNode('n1', 'Engineering'), makeNode('n2', 'GTM')]}
        orgId="org-1"
        orgRole="org_admin"
      />
    )
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('GTM')).toBeInTheDocument()
  })

  it('renders the top-level add-group form for admins', () => {
    render(<OrgHierarchy nodes={[]} orgId="org-1" orgRole="org_admin" />)
    expect(screen.getByPlaceholderText(/new top-level group/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add group/i })).toBeInTheDocument()
  })

  it('hides the top-level add-group form for non-admins', () => {
    render(<OrgHierarchy nodes={[]} orgId="org-1" orgRole="member" />)
    expect(screen.queryByPlaceholderText(/new top-level group/i)).toBeNull()
  })

  it('renders child nodes indented under parents', () => {
    const nodes = [
      makeNode('n1', 'Engineering'),
      makeNode('n2', 'Frontend', 'n1'),
    ]
    render(<OrgHierarchy nodes={nodes} orgId="org-1" orgRole="org_admin" />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail (or identify which pass and which fail)**

```bash
npm test -- OrgHierarchy
```

- [ ] **Step 3: Rewrite `OrgHierarchy`**

Replace the entire content of `components/org/OrgHierarchy.tsx`:

```tsx
// components/org/OrgHierarchy.tsx
'use client'
import { useState, useOptimistic, useTransition } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import { createNodeAction } from '@/app/(app)/organisation/actions'
import { NodeRow, type OrgNodeWithChildren } from './NodeRow'
import { AddNodeForm } from './AddNodeForm'

type OptimisticNode = OrgNode & { _provisional?: true }

function buildTree(nodes: OptimisticNode[], parentId: string | null = null): OrgNodeWithChildren[] {
  return nodes
    .filter(n => n.parent_id === parentId)
    .map(n => ({ ...n, children: buildTree(nodes, n.id) }))
}

interface Props {
  nodes: OrgNode[]
  orgId: string
  orgRole: 'org_admin' | 'member' | null
}

export function OrgHierarchy({ nodes, orgId, orgRole }: Props) {
  const [optimisticNodes, addOptimisticNode] = useOptimistic<OptimisticNode[], OptimisticNode>(
    nodes,
    (state, newNode) => [...state, newNode]
  )
  const [, startTransition] = useTransition()

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [openChildFormId, setOpenChildFormId] = useState<string | null>(null)
  const [openMemberPanelId, setOpenMemberPanelId] = useState<string | null>(null)

  const isAdmin = orgRole === 'org_admin'
  const tree = buildTree(optimisticNodes)

  function makeAddNodeFormAction(parentId: string | null) {
    return async (formData: FormData) => {
      const name = (formData.get('name') as string | null)?.trim()
      if (!name) return
      startTransition(async () => {
        addOptimisticNode({
          id: `provisional-${Date.now()}`,
          name,
          parent_id: parentId,
          org_id: orgId,
          node_type: null,
          created_at: new Date().toISOString(),
          members: [],
          pendingInvites: [],
          _provisional: true,
        })
        await createNodeAction(formData)
      })
    }
  }

  function renderNode(node: OrgNodeWithChildren, depth: number) {
    return (
      <NodeRow
        key={node.id}
        node={node}
        depth={depth}
        orgId={orgId}
        isAdmin={isAdmin}
        isCollapsed={collapsedIds.has(node.id)}
        onToggleCollapse={() => {
          setCollapsedIds(prev => {
            const next = new Set(prev)
            next.has(node.id) ? next.delete(node.id) : next.add(node.id)
            return next
          })
        }}
        openMemberPanelId={openMemberPanelId}
        setOpenMemberPanelId={id => {
          setOpenMemberPanelId(id)
          if (id !== null) setOpenChildFormId(null)
        }}
        openChildFormId={openChildFormId}
        setOpenChildFormId={id => {
          setOpenChildFormId(id)
          if (id !== null) setOpenMemberPanelId(null)
        }}
        addNodeFormAction={makeAddNodeFormAction}
        renderNode={renderNode}
      />
    )
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {tree.length === 0 && !isAdmin ? (
        <p style={{ padding: '16px 14px', fontSize: 13, color: '#4b5563' }}>
          No structure defined yet.
        </p>
      ) : (
        tree.map(node => renderNode(node, 0))
      )}

      {isAdmin && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <form
            action={makeAddNodeFormAction(null)}
            style={{ display: 'flex', gap: 6 }}
          >
            <input type="hidden" name="orgId" value={orgId} />
            <input
              name="name"
              placeholder="New top-level group"
              style={{
                flex: 1, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 5,
                padding: '6px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 12px', background: 'rgba(99,102,241,0.15)',
                color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 5, fontSize: 12, cursor: 'pointer',
              }}
            >
              + Add group
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- OrgHierarchy
npm test
```

Expected: OrgHierarchy tests PASS, full suite green.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | head -50
```

Expected: clean build (no TypeScript errors).

- [ ] **Step 6: Commit**

```bash
git add components/org/OrgHierarchy.tsx __tests__/components/org/OrgHierarchy.test.tsx
git commit -m "feat: refactor OrgHierarchy — optimistic nodes, child forms, MemberStack"
```

---

### Task 11: End-to-end smoke test and final check

- [ ] **Step 1: Run the full test suite one final time**

```bash
npm test
```

Expected: all green, no regressions.

- [ ] **Step 2: Manual smoke test (requires authenticated session)**

Start the dev server:

```bash
npm run dev
```

Navigate to `/people` as an org admin. Verify:
1. Each node row shows an avatar stack (or "0 people")
2. `+ child` button appears on every node row; clicking opens the inline form; clicking again (or clicking `✕`) closes it
3. Only one child form is open at a time
4. Typing a name and clicking Add causes the provisional node to appear immediately (dimmed, italic, "saving…"), then resolves when the server responds
5. Clicking the avatar stack opens the member panel with confirmed member chips and pending invite chips
6. Adding a registered email adds them directly (chip appears on refresh)
7. Adding an unregistered email shows a pending chip ("awaiting registration")
8. Clicking `✕` on a pending chip removes it
9. The top-level "New top-level group" form still works

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p  # stage only intentional changes
git commit -m "fix: <describe any smoke-test fixes>"
```

---

## Out of Scope

- Autocomplete for adding members by name
- Moving a person between nodes (reassignment UI)
- Org-level (non-node) membership tracking
- Deleting or renaming nodes (existing functionality, unchanged)
