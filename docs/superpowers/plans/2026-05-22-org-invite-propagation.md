# Org/Team Invite Propagation on Connection Accept — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a connection is accepted, automatically create a pending org node invitation for the acceptor on every org node the initiator directly belongs to.

**Architecture:** Two-step change — (1) add `propagateOrgNodeInvitesOnAccept` to the pending-org-node-invitations DB module, (2) call it from `acceptConnectionAction`. The function uses the admin client throughout because the RLS INSERT policy on `pending_org_node_invitations` requires `inviter_id = auth.uid()`, but here the inviter is the org member, not the authenticated acceptor.

**Tech Stack:** Next.js 15 App Router, Supabase (admin client for RLS bypass), Vitest

---

## File Map

| File | Change |
|---|---|
| `lib/db/pending-org-node-invitations.ts` | Add `propagateOrgNodeInvitesOnAccept` |
| `__tests__/lib/db/pending-org-node-invitations.test.ts` | Add `describe('propagateOrgNodeInvitesOnAccept', ...)` block |
| `app/(app)/connections/actions.ts` | Import and call `propagateOrgNodeInvitesOnAccept` in `acceptConnectionAction` |

---

## Task 1: `propagateOrgNodeInvitesOnAccept` function (TDD)

**Files:**
- Modify: `lib/db/pending-org-node-invitations.ts`
- Modify: `__tests__/lib/db/pending-org-node-invitations.test.ts`

### Background for implementer

The `pending_org_node_invitations` table has columns: `id, inviter_id, invited_email, org_id, node_id, created_at`. It has a `UNIQUE (invited_email, node_id)` constraint.

The `org_node_members` table has columns `node_id, user_id`. It tracks who is already a member of each org node. The `org_nodes` table has an `org_id` field.

`createAdminClient()` in this codebase is **synchronous** (no `await`). See `lib/supabase/admin.ts`. All other functions in `lib/db/pending-org-node-invitations.ts` use it — follow that pattern.

The existing test file at `__tests__/lib/db/pending-org-node-invitations.test.ts` uses:
```ts
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/lib/supabase/admin'
const adminMock = createAdminClient as ReturnType<typeof vi.fn>
```

For the new tests, use `vi.hoisted` + table-name dispatch instead (shown in step 1) because the function makes multiple `from()` calls to different tables.

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the end of `__tests__/lib/db/pending-org-node-invitations.test.ts`:

```ts
describe('propagateOrgNodeInvitesOnAccept', () => {
  // Use vi.hoisted so mockFrom is available inside vi.mock
  const mockFrom = vi.hoisted(() => vi.fn())

  // Override the module-level adminMock with a per-describe one
  beforeEach(() => {
    vi.clearAllMocks()
    adminMock.mockReturnValue({ from: mockFrom })
  })

  function makeProfilesChain(userId: string | null) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: userId ? { id: userId } : null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    return { select, eq, maybeSingle }
  }

  function makeNodeMembershipsChain(rows: Array<{ node_id: string; org_nodes: { org_id: string } | null }>) {
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    return { select, eq }
  }

  function makeExistingMemberChain(exists: boolean) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: exists ? { user_id: 'existing' } : null })
    const eq2 = vi.fn().mockReturnValue({ maybeSingle })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const select = vi.fn().mockReturnValue({ eq: eq1 })
    return { select, eq1, eq2, maybeSingle }
  }

  function makeUpsertChain(error: unknown = null) {
    const upsert = vi.fn().mockResolvedValue({ error })
    return { upsert }
  }

  it('does nothing when initiator has no org node memberships', async () => {
    const profiles = makeProfilesChain('new-user-id')
    const nodeMemberships = makeNodeMembershipsChain([])
    const upsert = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'org_node_members') return nodeMemberships
      return { upsert }
    })

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })

  it('creates one pending invite when initiator has one direct node', async () => {
    const profiles = makeProfilesChain('new-user-id')
    const nodeMemberships = makeNodeMembershipsChain([
      { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
    ])
    const existingMember = makeExistingMemberChain(false)
    const upsertChain = makeUpsertChain()

    let nodeMembershipsCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'org_node_members') {
        nodeMembershipsCallCount++
        // First call: get initiator's nodes. Second call: check membership.
        return nodeMembershipsCallCount === 1 ? nodeMemberships : existingMember
      }
      return upsertChain
    })

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsertChain.upsert).toHaveBeenCalledOnce()
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      {
        inviter_id: 'org-member-id',
        invited_email: 'new@example.com',
        org_id: 'org-1',
        node_id: 'node-1',
      },
      { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
    )
  })

  it('creates one invite per node when initiator has multiple nodes', async () => {
    const profiles = makeProfilesChain('new-user-id')
    const nodeMemberships = makeNodeMembershipsChain([
      { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
      { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
    ])
    const existingMember = makeExistingMemberChain(false)
    const upsertChain = makeUpsertChain()

    let nodeMembershipsCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'org_node_members') {
        nodeMembershipsCallCount++
        return nodeMembershipsCallCount === 1 ? nodeMemberships : existingMember
      }
      return upsertChain
    })

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsertChain.upsert).toHaveBeenCalledTimes(2)
  })

  it('skips a node where new member is already a member', async () => {
    const profiles = makeProfilesChain('new-user-id')
    const nodeMemberships = makeNodeMembershipsChain([
      { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
      { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
    ])

    // node-1: already a member. node-2: not a member.
    const alreadyMember = makeExistingMemberChain(true)
    const notMember = makeExistingMemberChain(false)
    const upsertChain = makeUpsertChain()

    let nodeMembershipsCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'org_node_members') {
        nodeMembershipsCallCount++
        if (nodeMembershipsCallCount === 1) return nodeMemberships
        // 2nd call = check node-1 (already member), 3rd call = check node-2 (not member)
        return nodeMembershipsCallCount === 2 ? alreadyMember : notMember
      }
      return upsertChain
    })

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsertChain.upsert).toHaveBeenCalledOnce()
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ node_id: 'node-2' }),
      expect.any(Object)
    )
  })

  it('skips nodes with null org_id', async () => {
    const profiles = makeProfilesChain('new-user-id')
    const nodeMemberships = makeNodeMembershipsChain([
      { node_id: 'node-1', org_nodes: null },
    ])
    const upsert = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'org_node_members') return nodeMemberships
      return { upsert }
    })

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm test -- --reporter=verbose __tests__/lib/db/pending-org-node-invitations.test.ts 2>&1 | tail -30
```

Expected: failures on `propagateOrgNodeInvitesOnAccept` (not yet exported).

- [ ] **Step 3: Implement `propagateOrgNodeInvitesOnAccept` in `lib/db/pending-org-node-invitations.ts`**

Add to the end of the file:

```ts
export async function propagateOrgNodeInvitesOnAccept(
  orgMemberId: string,
  newMemberEmail: string
): Promise<void> {
  const admin = createAdminClient()

  const { data: newMemberProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', newMemberEmail)
    .maybeSingle()
  const newMemberId = newMemberProfile?.id ?? null

  const { data: nodeMemberships, error: nodesError } = await admin
    .from('org_node_members')
    .select('node_id, org_nodes(org_id)')
    .eq('user_id', orgMemberId)
  if (nodesError) throw nodesError
  if (!nodeMemberships?.length) return

  for (const membership of nodeMemberships) {
    const nodeId = membership.node_id
    const orgId = (membership.org_nodes as { org_id: string } | null)?.org_id
    if (!orgId) continue

    if (newMemberId) {
      const { data: existing } = await admin
        .from('org_node_members')
        .select('user_id')
        .eq('node_id', nodeId)
        .eq('user_id', newMemberId)
        .maybeSingle()
      if (existing) continue
    }

    const { error: upsertError } = await admin
      .from('pending_org_node_invitations')
      .upsert(
        {
          inviter_id: orgMemberId,
          invited_email: newMemberEmail.toLowerCase(),
          org_id: orgId,
          node_id: nodeId,
        },
        { onConflict: 'invited_email,node_id', ignoreDuplicates: true }
      )
    if (upsertError) throw upsertError
  }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm test -- --reporter=verbose __tests__/lib/db/pending-org-node-invitations.test.ts 2>&1 | tail -30
```

Expected: all tests in the file pass, including the new `propagateOrgNodeInvitesOnAccept` block.

- [ ] **Step 5: Run the full test suite**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm test 2>&1 | tail -20
```

Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add lib/db/pending-org-node-invitations.ts __tests__/lib/db/pending-org-node-invitations.test.ts
git commit -m "feat: add propagateOrgNodeInvitesOnAccept to pending-org-node-invitations"
```

---

## Task 2: Wire up in `acceptConnectionAction`

**Files:**
- Modify: `app/(app)/connections/actions.ts`

### Background for implementer

`acceptConnectionAction` in `app/(app)/connections/actions.ts` already:
1. Gets the authenticated user via `supabase.auth.getUser()`
2. Calls `acceptConnection(connectionId)` to flip the status
3. Fetches `conn.initiated_by` to send a notification
4. Calls `logAudit` and `revalidatePath`

`user.email` is directly available on the auth user object — no profile query needed.

The `propagateOrgNodeInvitesOnAccept` call must be wrapped in try/catch so a failure does not roll back or surface an error for the connection acceptance itself.

- [ ] **Step 1: Add the import and the try/catch call**

In `app/(app)/connections/actions.ts`:

1. Add to the existing imports at the top:
```ts
import { propagateOrgNodeInvitesOnAccept } from '@/lib/db/pending-org-node-invitations'
```

2. In `acceptConnectionAction`, after the `await createNotification(...)` / `if (conn && ...)` block and before `await logAudit(...)`, add:

```ts
  if (user.email) {
    try {
      await propagateOrgNodeInvitesOnAccept(conn.initiated_by, user.email)
    } catch (e) {
      console.error('org invite propagation failed:', e)
    }
  }
```

The full updated `acceptConnectionAction` should look like:

```ts
export async function acceptConnectionAction(connectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await acceptConnection(connectionId)

  // Fetch the connection to notify the initiator
  const { data: conn } = await supabase
    .from('connections')
    .select('initiated_by')
    .eq('id', connectionId)
    .single()

  if (conn && conn.initiated_by !== user.id) {
    const acceptorName = await getDisplayName(supabase, user.id, user.email ?? 'A colleague')
    await createNotification(conn.initiated_by, 'connection_accepted', {
      acceptorId: user.id,
      acceptorName,
    })
  }

  if (conn && user.email) {
    try {
      await propagateOrgNodeInvitesOnAccept(conn.initiated_by, user.email)
    } catch (e) {
      console.error('org invite propagation failed:', e)
    }
  }

  await logAudit({
    actorId: user.id,
    action: 'connection.accept',
    entityType: 'connection',
    entityId: connectionId,
  })

  revalidatePath('/people')
}
```

Note: the propagation call is guarded by `conn &&` because `conn` may be null if the connection row was not found, and `user.email` because email may theoretically be absent on the auth user. Both conditions are highly unlikely in practice but make the guard explicit.

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm test 2>&1 | tail -20
```

Expected: all tests pass (no tests cover `acceptConnectionAction` directly, but existing tests must not regress).

- [ ] **Step 3: Run lint**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/connections/actions.ts
git commit -m "feat: propagate org node invites when connection is accepted"
```
