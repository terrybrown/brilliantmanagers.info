# Organisation Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** `2026-05-17-admin-roles-and-audit.md` must be fully implemented first. This plan depends on `lib/auth/roles.ts`, `lib/audit.ts`, `lib/supabase/admin.ts`, and the database tables created there.

**Goal:** Replace the `/organisation` placeholder with a full OrgAdmin management UI — create orgs, build named hierarchy trees, place users at nodes, and auto-wire manager/direct-report connections.

**Architecture:** Org data lives in four tables (`organisations`, `org_members`, `org_nodes`, `org_node_members`) created in Plan 1's migration. All mutations go through server actions using `createClient()` for regular users or `createAdminClient()` for SuperAdmin reads. Auto-connection logic walks the tree upward after each node placement and inserts `connections` rows using upsert to skip duplicates.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase (Postgres + RLS), Vitest + Testing Library, TypeScript.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `lib/db/organisations.ts` | Org CRUD (create, update, get with members) |
| `lib/db/org-members.ts` | Org membership (add, promote, demote, list) |
| `lib/db/org-nodes.ts` | Node tree (create, rename, delete, get subtree) |
| `lib/db/org-node-members.ts` | Place/remove users at nodes + auto-connection |
| `app/(app)/organisation/actions.ts` | All org server actions |
| `__tests__/lib/db/organisations.test.ts` | Tests for org CRUD |
| `__tests__/lib/db/org-members.test.ts` | Tests for membership helpers |
| `__tests__/lib/db/org-nodes.test.ts` | Tests for node helpers |
| `__tests__/lib/db/org-node-members.test.ts` | Tests for placement + auto-connection |

### Modified files
| Path | Change |
|------|--------|
| `app/(app)/organisation/page.tsx` | Replace placeholder with full org UI |
| `app/(app)/admin/organisations/page.tsx` | Link through to org detail (minor) |

---

## Task 1: `lib/db/organisations.ts`

**Files:**
- Create: `__tests__/lib/db/organisations.test.ts`
- Create: `lib/db/organisations.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/organisations.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createOrg, getOrgsForUser, updateOrgName } from '@/lib/db/organisations'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

describe('createOrg', () => {
  it('inserts an organisation row and returns the new id', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'org-1', name: 'Acme' }, error: null }),
      }),
    })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    const result = await createOrg('user-1', 'Acme')
    expect(result.id).toBe('org-1')
    expect(insert).toHaveBeenCalledWith({ name: 'Acme', created_by: 'user-1' })
  })

  it('throws when insert errors', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      }),
    })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    await expect(createOrg('user-1', 'Acme')).rejects.toThrow()
  })
})

describe('getOrgsForUser', () => {
  it('returns orgs the user is a member of', async () => {
    const orgData = [
      { id: 'org-1', name: 'Acme', created_by: 'user-1', created_at: '2024-01-01', org_members: [{ role: 'org_admin' }] },
    ]
    const eq = vi.fn().mockResolvedValue({ data: orgData })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateClient.mockResolvedValue({ from })

    const result = await getOrgsForUser('user-1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Acme')
    expect(result[0].userRole).toBe('org_admin')
  })
})

describe('updateOrgName', () => {
  it('updates the org name', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    mockCreateClient.mockResolvedValue({ from })

    await updateOrgName('org-1', 'New Name')
    expect(update).toHaveBeenCalledWith({ name: 'New Name' })
    expect(eq).toHaveBeenCalledWith('id', 'org-1')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/db/organisations.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/organisations'`

- [ ] **Step 3: Implement**

```ts
// lib/db/organisations.ts
import { createClient } from '@/lib/supabase/server'

export interface Org {
  id: string
  name: string
  created_by: string
  created_at: string
  userRole: 'org_admin' | 'member'
}

export async function createOrg(userId: string, name: string): Promise<{ id: string; name: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organisations')
    .insert({ name, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; name: string }
}

export async function getOrgsForUser(userId: string): Promise<Org[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('role, organisations(id, name, created_by, created_at)')
    .eq('user_id', userId)
  return ((data ?? []) as { role: string; organisations: { id: string; name: string; created_by: string; created_at: string } }[]).map(row => ({
    ...row.organisations,
    userRole: row.role as 'org_admin' | 'member',
  }))
}

export async function updateOrgName(orgId: string, name: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organisations')
    .update({ name })
    .eq('id', orgId)
  if (error) throw error
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/db/organisations.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/organisations.ts __tests__/lib/db/organisations.test.ts
git commit -m "feat: add organisations DB helpers"
```

---

## Task 2: `lib/db/org-members.ts`

**Files:**
- Create: `__tests__/lib/db/org-members.test.ts`
- Create: `lib/db/org-members.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/org-members.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { addOrgMember, setOrgRole, getOrgMembers } from '@/lib/db/org-members'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

describe('addOrgMember', () => {
  it('upserts a member row with given role', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) })

    await addOrgMember('org-1', 'user-1', 'member')
    expect(upsert).toHaveBeenCalledWith(
      { org_id: 'org-1', user_id: 'user-1', role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
  })
})

describe('setOrgRole', () => {
  it('updates the role for an existing member', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await setOrgRole('org-1', 'user-1', 'org_admin')
    expect(update).toHaveBeenCalledWith({ role: 'org_admin' })
    expect(eq1).toHaveBeenCalledWith('org_id', 'org-1')
    expect(eq2).toHaveBeenCalledWith('user_id', 'user-1')
  })
})

describe('getOrgMembers', () => {
  it('returns members with profile data', async () => {
    const members = [
      { user_id: 'u1', role: 'org_admin', profiles: { email: 'a@x.com', display_name: 'Alice' } },
      { user_id: 'u2', role: 'member', profiles: { email: 'b@x.com', display_name: 'Bob' } },
    ]
    const eq = vi.fn().mockResolvedValue({ data: members })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getOrgMembers('org-1')
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('org_admin')
    expect(result[0].email).toBe('a@x.com')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/db/org-members.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/org-members'`

- [ ] **Step 3: Implement**

```ts
// lib/db/org-members.ts
import { createClient } from '@/lib/supabase/server'

export interface OrgMember {
  user_id: string
  role: 'org_admin' | 'member'
  email: string | null
  display_name: string | null
}

export async function addOrgMember(
  orgId: string,
  userId: string,
  role: 'org_admin' | 'member'
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_members')
    .upsert(
      { org_id: orgId, user_id: userId, role },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

export async function setOrgRole(
  orgId: string,
  userId: string,
  role: 'org_admin' | 'member'
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('user_id, role, profiles(email, display_name)')
    .eq('org_id', orgId)
  return ((data ?? []) as { user_id: string; role: string; profiles: { email: string | null; display_name: string | null } }[]).map(row => ({
    user_id: row.user_id,
    role: row.role as 'org_admin' | 'member',
    email: row.profiles?.email ?? null,
    display_name: row.profiles?.display_name ?? null,
  }))
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/db/org-members.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/org-members.ts __tests__/lib/db/org-members.test.ts
git commit -m "feat: add org-members DB helpers"
```

---

## Task 3: `lib/db/org-nodes.ts`

**Files:**
- Create: `__tests__/lib/db/org-nodes.test.ts`
- Create: `lib/db/org-nodes.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/org-nodes.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createNode, renameNode, deleteNode, getNodesForOrg } from '@/lib/db/org-nodes'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

describe('createNode', () => {
  it('inserts a node and returns it', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'n1', name: 'Engineering', org_id: 'org-1', parent_id: null, node_type: 'Division' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) })

    const result = await createNode({ orgId: 'org-1', parentId: null, name: 'Engineering', nodeType: 'Division' })
    expect(result.id).toBe('n1')
    expect(insert).toHaveBeenCalledWith({ org_id: 'org-1', parent_id: null, name: 'Engineering', node_type: 'Division' })
  })
})

describe('renameNode', () => {
  it('updates name and node_type', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await renameNode('n1', 'Backend', 'Team')
    expect(update).toHaveBeenCalledWith({ name: 'Backend', node_type: 'Team' })
    expect(eq).toHaveBeenCalledWith('id', 'n1')
  })
})

describe('deleteNode', () => {
  it('deletes by id (cascade handles children)', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    await deleteNode('n1')
    expect(eq).toHaveBeenCalledWith('id', 'n1')
  })
})

describe('getNodesForOrg', () => {
  it('returns all nodes for an org ordered by created_at', async () => {
    const nodes = [
      { id: 'n1', org_id: 'org-1', parent_id: null, name: 'Eng', node_type: 'Division', created_at: '2024-01-01', org_node_members: [] },
      { id: 'n2', org_id: 'org-1', parent_id: 'n1', name: 'Backend', node_type: 'Team', created_at: '2024-01-02', org_node_members: [{ user_id: 'u1', profiles: { email: 'a@x.com', display_name: 'Alice' } }] },
    ]
    const order = vi.fn().mockResolvedValue({ data: nodes })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getNodesForOrg('org-1')
    expect(result).toHaveLength(2)
    expect(result[1].members).toHaveLength(1)
    expect(result[1].members[0].email).toBe('a@x.com')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/db/org-nodes.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/org-nodes'`

- [ ] **Step 3: Implement**

```ts
// lib/db/org-nodes.ts
import { createClient } from '@/lib/supabase/server'

export interface OrgNode {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  members: { user_id: string; email: string | null; display_name: string | null }[]
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
    .select()
    .single()
  if (error) throw error
  return { ...(data as Omit<OrgNode, 'members'>), members: [] }
}

export async function renameNode(nodeId: string, name: string, nodeType: string | null): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_nodes')
    .update({ name, node_type: nodeType })
    .eq('id', nodeId)
  if (error) throw error
}

export async function deleteNode(nodeId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('org_nodes').delete().eq('id', nodeId)
  if (error) throw error
}

export async function getNodesForOrg(orgId: string): Promise<OrgNode[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_nodes')
    .select('id, org_id, parent_id, name, node_type, created_at, org_node_members(user_id, profiles(email, display_name))')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  return ((data ?? []) as {
    id: string; org_id: string; parent_id: string | null; name: string; node_type: string | null; created_at: string;
    org_node_members: { user_id: string; profiles: { email: string | null; display_name: string | null } }[]
  }[]).map(node => ({
    id: node.id,
    org_id: node.org_id,
    parent_id: node.parent_id,
    name: node.name,
    node_type: node.node_type,
    created_at: node.created_at,
    members: node.org_node_members.map(m => ({
      user_id: m.user_id,
      email: m.profiles?.email ?? null,
      display_name: m.profiles?.display_name ?? null,
    })),
  }))
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/db/org-nodes.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/org-nodes.ts __tests__/lib/db/org-nodes.test.ts
git commit -m "feat: add org-nodes DB helpers"
```

---

## Task 4: `lib/db/org-node-members.ts` with auto-connection logic

**Files:**
- Create: `__tests__/lib/db/org-node-members.test.ts`
- Create: `lib/db/org-node-members.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/db/org-node-members.test.ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { addUserToNode, removeUserFromNode } from '@/lib/db/org-node-members'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

function makeFrom(responses: Record<string, unknown>) {
  // Returns a `from` mock that dispatches different behaviours by table name
  return vi.fn().mockImplementation((table: string) => responses[table] ?? { insert: vi.fn().mockResolvedValue({ error: null }) })
}

describe('addUserToNode', () => {
  it('inserts an org_node_members row', async () => {
    const orgNodeMembersInsert = vi.fn().mockResolvedValue({ error: null })
    const orgMembersUpsert = vi.fn().mockResolvedValue({ error: null })

    // org_nodes select to get org_id and parent_id
    const nodeSingle = vi.fn().mockResolvedValue({ data: { org_id: 'org-1', parent_id: null } })
    const nodeEq = vi.fn().mockReturnValue({ single: nodeSingle })
    const nodeSelect = vi.fn().mockReturnValue({ eq: nodeEq })

    // org_node_members select to check ancestor (no ancestor found — parent_id is null)
    // connections upsert (no-op since no ancestor)

    const from = makeFrom({
      org_nodes: { select: nodeSelect },
      org_members: { upsert: orgMembersUpsert },
      org_node_members: { insert: orgNodeMembersInsert },
    })
    mock.mockResolvedValue({ from })

    await addUserToNode({ nodeId: 'n1', userId: 'user-2', actorId: 'user-1' })

    expect(orgNodeMembersInsert).toHaveBeenCalledWith({ node_id: 'n1', user_id: 'user-2' })
    expect(orgMembersUpsert).toHaveBeenCalledWith(
      { org_id: 'org-1', user_id: 'user-2', role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
  })

  it('creates connections when an ancestor node has members', async () => {
    const connectionsUpsert = vi.fn().mockResolvedValue({ error: null })

    // org_nodes.select for the target node
    const nodeSingle = vi.fn().mockResolvedValue({ data: { org_id: 'org-1', parent_id: 'parent-node' } })
    const nodeEq = vi.fn().mockReturnValue({ single: nodeSingle })
    const nodeSelect = vi.fn().mockReturnValue({ eq: nodeEq })

    // org_node_members.select for parent node members
    const parentMemberEq = vi.fn().mockResolvedValue({ data: [{ user_id: 'manager-1' }] })
    const parentMemberSelect = vi.fn().mockReturnValue({ eq: parentMemberEq })

    // org_nodes.select for parent node (to get its parent_id for recursion stop)
    const parentNodeSingle = vi.fn().mockResolvedValue({ data: { parent_id: null } })
    const parentNodeEq = vi.fn().mockReturnValue({ single: parentNodeSingle })

    let orgNodeCallCount = 0
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'org_nodes') {
        orgNodeCallCount++
        if (orgNodeCallCount === 1) return { select: nodeSelect }
        return { select: vi.fn().mockReturnValue({ eq: parentNodeEq }) }
      }
      if (table === 'org_members') return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      if (table === 'org_node_members') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: parentMemberSelect,
        }
      }
      if (table === 'connections') return { upsert: connectionsUpsert }
      return {}
    })
    mock.mockResolvedValue({ from })

    await addUserToNode({ nodeId: 'n1', userId: 'user-2', actorId: 'user-1' })

    expect(connectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ manager_id: 'manager-1', direct_report_id: 'user-2', status: 'active' }),
      expect.objectContaining({ ignoreDuplicates: true })
    )
  })
})

describe('removeUserFromNode', () => {
  it('deletes the org_node_members row', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    await removeUserFromNode('n1', 'user-2')
    expect(eq1).toHaveBeenCalledWith('node_id', 'n1')
    expect(eq2).toHaveBeenCalledWith('user_id', 'user-2')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run __tests__/lib/db/org-node-members.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/org-node-members'`

- [ ] **Step 3: Implement**

```ts
// lib/db/org-node-members.ts
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function addUserToNode(params: {
  nodeId: string
  userId: string
  actorId: string
}): Promise<void> {
  const supabase = await createClient()

  // Fetch the node to get org_id and parent_id
  const { data: node } = await supabase
    .from('org_nodes')
    .select('org_id, parent_id')
    .eq('id', params.nodeId)
    .single()

  if (!node) throw new Error('Node not found')

  // Ensure the user is an org member
  await supabase.from('org_members').upsert(
    { org_id: node.org_id, user_id: params.userId, role: 'member' },
    { onConflict: 'org_id,user_id', ignoreDuplicates: true }
  )

  // Place the user at the node
  await supabase.from('org_node_members').insert({ node_id: params.nodeId, user_id: params.userId })

  // Auto-connect: walk up to find nearest ancestor with members
  if (node.parent_id) {
    await connectToAncestor(supabase, node.parent_id, params.userId, params.actorId)
  }
}

async function connectToAncestor(
  supabase: SupabaseClient,
  ancestorNodeId: string,
  newUserId: string,
  actorId: string
): Promise<void> {
  // Check if ancestor node has any members
  const { data: ancestorMembers } = await supabase
    .from('org_node_members')
    .select('user_id')
    .eq('node_id', ancestorNodeId)

  if (ancestorMembers && ancestorMembers.length > 0) {
    // Create a connection for each ancestor member (they become the manager)
    for (const member of ancestorMembers as { user_id: string }[]) {
      await supabase.from('connections').upsert(
        {
          manager_id: member.user_id,
          direct_report_id: newUserId,
          status: 'active',
          initiated_by: actorId,
        },
        { onConflict: 'manager_id,direct_report_id', ignoreDuplicates: true }
      )
    }
    return
  }

  // No members here — walk up further
  const { data: ancestorNode } = await supabase
    .from('org_nodes')
    .select('parent_id')
    .eq('id', ancestorNodeId)
    .single()

  if (ancestorNode?.parent_id) {
    await connectToAncestor(supabase, ancestorNode.parent_id, newUserId, actorId)
  }
}

export async function removeUserFromNode(nodeId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_node_members')
    .delete()
    .eq('node_id', nodeId)
    .eq('user_id', userId)
  if (error) throw error
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run __tests__/lib/db/org-node-members.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db/org-node-members.ts __tests__/lib/db/org-node-members.test.ts
git commit -m "feat: add org-node-members helpers with auto-connection logic"
```

---

## Task 5: Organisation server actions

**Files:**
- Create: `app/(app)/organisation/actions.ts`

- [ ] **Step 1: Create the actions file**

```ts
// app/(app)/organisation/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrgRole } from '@/lib/auth/roles'
import { createOrg, updateOrgName } from '@/lib/db/organisations'
import { addOrgMember, setOrgRole } from '@/lib/db/org-members'
import { createNode, renameNode, deleteNode } from '@/lib/db/org-nodes'
import { addUserToNode, removeUserFromNode } from '@/lib/db/org-node-members'
import { logAudit } from '@/lib/audit'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

async function requireOrgAdmin(orgId: string) {
  const user = await getUser()
  const role = await getOrgRole(user.id, orgId)
  if (role !== 'org_admin') redirect('/organisation')
  return user
}

// ── Org creation ──────────────────────────────────────────────────────────────

export async function createOrgAction(formData: FormData): Promise<void> {
  const user = await getUser()
  const name = (formData.get('name') as string).trim()
  if (!name) return

  const org = await createOrg(user.id, name)

  // Grant creator OrgAdmin
  await addOrgMember(org.id, user.id, 'org_admin')

  await logAudit({ actorId: user.id, action: 'org.create', entityType: 'organisation', entityId: org.id, metadata: { name } })
  revalidatePath('/organisation')
}

// ── Org settings ─────────────────────────────────────────────────────────────

export async function updateOrgNameAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const name = (formData.get('name') as string).trim()
  if (!orgId || !name) return

  const user = await requireOrgAdmin(orgId)
  await updateOrgName(orgId, name)
  await logAudit({ actorId: user.id, action: 'org.update', entityType: 'organisation', entityId: orgId, metadata: { name } })
  revalidatePath('/organisation')
}

// ── Node management ───────────────────────────────────────────────────────────

export async function createNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const parentId = (formData.get('parentId') as string) || null
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string).trim() || null

  if (!orgId || !name) return
  const user = await requireOrgAdmin(orgId)

  const node = await createNode({ orgId, parentId, name, nodeType })
  await logAudit({ actorId: user.id, action: 'org_node.create', entityType: 'org_node', entityId: node.id, metadata: { name, nodeType, parentId } })
  revalidatePath('/organisation')
}

export async function renameNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const name = (formData.get('name') as string).trim()
  const nodeType = (formData.get('nodeType') as string).trim() || null

  if (!orgId || !nodeId || !name) return
  const user = await requireOrgAdmin(orgId)

  await renameNode(nodeId, name, nodeType)
  await logAudit({ actorId: user.id, action: 'org_node.update', entityType: 'org_node', entityId: nodeId, metadata: { name, nodeType } })
  revalidatePath('/organisation')
}

export async function deleteNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  if (!orgId || !nodeId) return

  const user = await requireOrgAdmin(orgId)
  await deleteNode(nodeId)
  await logAudit({ actorId: user.id, action: 'org_node.delete', entityType: 'org_node', entityId: nodeId })
  revalidatePath('/organisation')
}

// ── Member management ─────────────────────────────────────────────────────────

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

  if (!profile) return { error: 'No account found for that email.' }

  await addUserToNode({ nodeId, userId: profile.id, actorId: actor.id })
  await logAudit({ actorId: actor.id, action: 'org_node_member.add', entityType: 'org_node_member', entityId: nodeId, metadata: { email } })
  revalidatePath('/organisation')
  return {}
}

export async function removeMemberFromNodeAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const nodeId = formData.get('nodeId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !nodeId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  await removeUserFromNode(nodeId, userId)
  await logAudit({ actorId: actor.id, action: 'org_node_member.remove', entityType: 'org_node_member', entityId: nodeId, metadata: { userId } })
  revalidatePath('/organisation')
}

export async function promoteMemberAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  await setOrgRole(orgId, userId, 'org_admin')
  await logAudit({ actorId: actor.id, action: 'org_member.promote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  revalidatePath('/organisation')
}

export async function demoteMemberAction(formData: FormData): Promise<void> {
  const orgId = formData.get('orgId') as string
  const userId = formData.get('userId') as string
  if (!orgId || !userId) return

  const actor = await requireOrgAdmin(orgId)
  if (actor.id === userId) return // Cannot demote self
  await setOrgRole(orgId, userId, 'member')
  await logAudit({ actorId: actor.id, action: 'org_member.demote', entityType: 'org_member', entityId: userId, metadata: { orgId } })
  revalidatePath('/organisation')
}
```

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/organisation/actions.ts"
git commit -m "feat: add organisation server actions"
```

---

## Task 6: Organisation page UI

**Files:**
- Modify: `app/(app)/organisation/page.tsx`

This page has three states:
1. **No org** — show "Create Organisation" form
2. **Member** — read-only tree view with position highlighted
3. **OrgAdmin** — full management UI (edit name, manage nodes + members)

If the user belongs to multiple orgs, show an org picker at the top.

- [ ] **Step 1: Replace the placeholder page**

```tsx
// app/(app)/organisation/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrgRole } from '@/lib/auth/roles'
import { getOrgsForUser } from '@/lib/db/organisations'
import { getNodesForOrg } from '@/lib/db/org-nodes'
import { getOrgMembers } from '@/lib/db/org-members'
import {
  createOrgAction,
  updateOrgNameAction,
  createNodeAction,
  renameNodeAction,
  deleteNodeAction,
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  promoteMemberAction,
  demoteMemberAction,
} from './actions'

export default async function OrganisationPage({
  searchParams,
}: {
  searchParams: { org?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgs = await getOrgsForUser(user.id)

  if (orgs.length === 0) {
    return <CreateOrgView />
  }

  const selectedOrgId = searchParams.org ?? orgs[0].id
  const currentOrg = orgs.find(o => o.id === selectedOrgId) ?? orgs[0]
  const userRole = await getOrgRole(user.id, currentOrg.id)
  const isOrgAdmin = userRole === 'org_admin'

  const [nodes, members] = await Promise.all([
    getNodesForOrg(currentOrg.id),
    getOrgMembers(currentOrg.id),
  ])

  return (
    <div className="mx-auto max-w-5xl">
      {/* Org picker when user belongs to multiple orgs */}
      {orgs.length > 1 && (
        <div className="mb-6 flex gap-2">
          {orgs.map(org => (
            <a
              key={org.id}
              href={`/organisation?org=${org.id}`}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                org.id === currentOrg.id
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {org.name}
            </a>
          ))}
        </div>
      )}

      {/* Org header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{currentOrg.name}</h1>
        {isOrgAdmin && (
          <form action={updateOrgNameAction} className="flex items-center gap-2">
            <input type="hidden" name="orgId" value={currentOrg.id} />
            <input
              name="name"
              defaultValue={currentOrg.name}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
            <button type="submit" className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:text-white">
              Rename
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Hierarchy tree (col 1-2) */}
        <div className="col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Hierarchy</h2>
            {isOrgAdmin && (
              <AddNodeForm orgId={currentOrg.id} parentId={null} label="Add root node" />
            )}
          </div>
          {nodes.length === 0 ? (
            <p className="text-sm text-slate-500">No nodes yet. Add one to start building the hierarchy.</p>
          ) : (
            <NodeTree
              nodes={nodes}
              rootNodes={nodes.filter(n => n.parent_id === null)}
              isOrgAdmin={isOrgAdmin}
              orgId={currentOrg.id}
              currentUserId={user.id}
            />
          )}
        </div>

        {/* Members panel (col 3) */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Members ({members.length})</h2>
          <div className="flex flex-col gap-2">
            {members.map(m => (
              <div
                key={m.user_id}
                className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-white">{m.display_name ?? m.email ?? '—'}</p>
                  <p className="text-xs text-slate-500">{m.role === 'org_admin' ? 'OrgAdmin' : 'Member'}</p>
                </div>
                {isOrgAdmin && m.user_id !== user.id && (
                  <div className="flex flex-col gap-1">
                    {m.role === 'member' ? (
                      <form action={promoteMemberAction}>
                        <input type="hidden" name="orgId" value={currentOrg.id} />
                        <input type="hidden" name="userId" value={m.user_id} />
                        <button type="submit" className="text-xs text-amber-400 hover:text-amber-300">Promote</button>
                      </form>
                    ) : (
                      <form action={demoteMemberAction}>
                        <input type="hidden" name="orgId" value={currentOrg.id} />
                        <input type="hidden" name="userId" value={m.user_id} />
                        <button type="submit" className="text-xs text-slate-400 hover:text-slate-300">Demote</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CreateOrgView() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-white">Create your organisation</h1>
      <p className="mb-6 text-sm text-slate-400">
        Set up your organisation to manage teams, hierarchy, and connections.
      </p>
      <form action={createOrgAction} className="flex flex-col gap-3">
        <input
          name="name"
          required
          placeholder="Organisation name"
          className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Create organisation
        </button>
      </form>
    </div>
  )
}

interface NodeData {
  id: string
  org_id: string
  parent_id: string | null
  name: string
  node_type: string | null
  created_at: string
  members: { user_id: string; email: string | null; display_name: string | null }[]
}

function NodeTree({
  nodes,
  rootNodes,
  isOrgAdmin,
  orgId,
  currentUserId,
}: {
  nodes: NodeData[]
  rootNodes: NodeData[]
  isOrgAdmin: boolean
  orgId: string
  currentUserId: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {rootNodes.map(node => (
        <NodeCard
          key={node.id}
          node={node}
          allNodes={nodes}
          depth={0}
          isOrgAdmin={isOrgAdmin}
          orgId={orgId}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

function NodeCard({
  node,
  allNodes,
  depth,
  isOrgAdmin,
  orgId,
  currentUserId,
}: {
  node: NodeData
  allNodes: NodeData[]
  depth: number
  isOrgAdmin: boolean
  orgId: string
  currentUserId: string
}) {
  const children = allNodes.filter(n => n.parent_id === node.id)
  const isCurrentUserHere = node.members.some(m => m.user_id === currentUserId)

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className={`rounded-xl px-4 py-3 ${isCurrentUserHere ? 'ring-1 ring-amber-500/40' : ''}`}
        style={{ background: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{node.name}</span>
              {node.node_type && (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  {node.node_type}
                </span>
              )}
            </div>
            {node.members.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {node.members.map(m => (
                  <span key={m.user_id} className="text-xs text-slate-400">
                    {m.display_name ?? m.email ?? m.user_id.slice(0, 8)}
                    {m.user_id === currentUserId && ' (you)'}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isOrgAdmin && (
            <div className="flex shrink-0 flex-col gap-1 text-right">
              <AddNodeForm orgId={orgId} parentId={node.id} label="+ Child" />
              <AddMemberForm orgId={orgId} nodeId={node.id} />
              <form action={deleteNodeAction}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="nodeId" value={node.id} />
                <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                  Remove node
                </button>
              </form>
            </div>
          )}
        </div>

        {isOrgAdmin && node.members.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {node.members.map(m => (
              <form key={m.user_id} action={removeMemberFromNodeAction}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="nodeId" value={node.id} />
                <input type="hidden" name="userId" value={m.user_id} />
                <button type="submit" className="text-xs text-slate-500 hover:text-slate-300">
                  ✕ {m.display_name ?? m.email}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {children.map(child => (
            <NodeCard
              key={child.id}
              node={child}
              allNodes={allNodes}
              depth={depth + 1}
              isOrgAdmin={isOrgAdmin}
              orgId={orgId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddNodeForm({
  orgId,
  parentId,
  label,
}: {
  orgId: string
  parentId: string | null
  label: string
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-amber-400 hover:text-amber-300">{label}</summary>
      <form action={createNodeAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="orgId" value={orgId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <input
          name="name"
          required
          placeholder="Node name (e.g. Engineering)"
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500"
        />
        <input
          name="nodeType"
          placeholder="Type (optional, e.g. Division)"
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500"
        />
        <button type="submit" className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400">
          Add
        </button>
      </form>
    </details>
  )
}

function AddMemberForm({ orgId, nodeId }: { orgId: string; nodeId: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">+ Person</summary>
      <form action={addMemberToNodeAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="nodeId" value={nodeId} />
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500"
        />
        <button type="submit" className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-500">
          Add person
        </button>
      </form>
    </details>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/organisation/page.tsx"
git commit -m "feat: replace organisation placeholder with full OrgAdmin hierarchy UI"
```

---

## Final verification

- [ ] Start the dev server

```bash
npm run develop
```

1. **No org state** — go to `/organisation` as a fresh user → see "Create organisation" form → submit → redirected to org view with yourself as OrgAdmin
2. **Add a root node** — click "+ Add root node" → add "Engineering" (type: Division) → appears in tree
3. **Add a child node** — under Engineering, click "+ Child" → add "Backend" (type: Team)
4. **Add a person to a node** — "+ Person" → enter an email for another registered user → they appear in the node; check `/connections` page to verify the connection was auto-created if the parent node also has a member
5. **Promote a member** — in the Members panel → Promote → role updates to OrgAdmin
6. **Member view** — sign in as the added member → `/organisation` shows tree with their position highlighted, no edit controls
7. **SuperAdmin organisations panel** — sign in as terry@hairylemon.net → `/admin/organisations` → org appears in the list

- [ ] Run the full test suite one final time

```bash
npx vitest run
```

Expected: all tests pass
