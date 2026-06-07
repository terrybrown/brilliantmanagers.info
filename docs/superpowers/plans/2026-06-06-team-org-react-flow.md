# Team & Org — React Flow Org Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the table-row org hierarchy with an interactive React Flow canvas showing departments as visual nodes. Clicking a node opens a side panel with members and inline manager/DR linking actions. Org admins can directly create active connections without the invitation consent flow.

**Architecture:** `buildOrgLayout()` converts `OrgNode[]` → dagre-positioned React Flow nodes/edges. `OrgFlowChart` renders the canvas and manages selected node state. `OrgNodePanel` shows the side panel with member list, inline actions, and add/subgroup forms. `createDirectConnection` server action inserts an active connection bypassing invitation flow (org admin only). `OrgSection` is updated to mount `OrgFlowChart` instead of `OrgHierarchy`.

**Tech Stack:** `@xyflow/react` v12, `@dagrejs/dagre`, existing Supabase admin client, existing `useMutation` hook, existing `createNodeAction` / `addMemberToNodeAction` / `removeMemberFromNodeAction` server actions.

---

## File map

| File | Action |
|---|---|
| `package.json` | Add `@xyflow/react`, `@dagrejs/dagre` |
| `lib/org/layout.ts` | Create — pure dagre layout function |
| `components/org/DeptNode.tsx` | Create — custom React Flow node |
| `app/(app)/people/actions.ts` | Create — `createDirectConnection` server action |
| `components/org/OrgNodePanel.tsx` | Create — side panel |
| `components/org/OrgFlowChart.tsx` | Create — replaces OrgHierarchy |
| `app/(app)/people/OrgSection.tsx` | Modify — swap OrgHierarchy → OrgFlowChart, add connection props |
| `app/(app)/people/page.tsx` | Modify — pass `userManagerId` + `userDirectReportIds` to OrgSection |
| `__tests__/lib/org/layout.test.ts` | Create — dagre layout unit tests |
| `__tests__/app/people/actions.test.ts` | Create — createDirectConnection unit tests |
| `components/org/OrgHierarchy.tsx` | Delete |
| `components/org/NodeRow.tsx` | Delete |
| `components/org/AddNodeForm.tsx` | Delete |
| `components/org/MemberStack.tsx` | Delete |
| `__tests__/components/org/NodeRow.test.tsx` | Delete (if exists) |

---

### Task 1: Install packages

- [ ] **Install dependencies**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm install @xyflow/react @dagrejs/dagre
npm install --save-dev @types/dagre
```

- [ ] **Verify package.json has both entries**

```bash
grep -E "@xyflow|dagre" package.json
```

Expected output includes `"@xyflow/react"` and `"@dagrejs/dagre"`.

- [ ] **Run test suite — confirm nothing broke**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @xyflow/react and @dagrejs/dagre"
```

---

### Task 2: Create dagre layout utility

**Files:**
- Create: `lib/org/layout.ts`
- Create: `__tests__/lib/org/layout.test.ts`

- [ ] **Write failing tests first**

```typescript
// __tests__/lib/org/layout.test.ts
import { describe, it, expect } from 'vitest'
import { buildOrgLayout } from '@/lib/org/layout'
import type { OrgNode } from '@/lib/db/org-nodes'

function makeNode(id: string, parent_id: string | null = null): OrgNode {
  return {
    id, org_id: 'org-1', parent_id, name: id,
    node_type: null, created_at: '', members: [], pendingInvites: [],
  }
}

describe('buildOrgLayout', () => {
  it('returns empty arrays for empty input', () => {
    const { rfNodes, rfEdges } = buildOrgLayout([])
    expect(rfNodes).toHaveLength(0)
    expect(rfEdges).toHaveLength(0)
  })

  it('produces one rfNode per OrgNode', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'a')]
    const { rfNodes } = buildOrgLayout(nodes)
    expect(rfNodes).toHaveLength(3)
    expect(rfNodes.map(n => n.id)).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('produces one rfEdge per parent-child relationship', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'a')]
    const { rfEdges } = buildOrgLayout(nodes)
    expect(rfEdges).toHaveLength(2)
    expect(rfEdges.every(e => e.source === 'a')).toBe(true)
  })

  it('assigns type deptNode to every node', () => {
    const { rfNodes } = buildOrgLayout([makeNode('a')])
    expect(rfNodes[0].type).toBe('deptNode')
  })

  it('includes node name and memberCount in data', () => {
    const node = { ...makeNode('a'), name: 'Engineering', members: [{} as never, {} as never] }
    const { rfNodes } = buildOrgLayout([node])
    expect(rfNodes[0].data.label).toBe('Engineering')
    expect(rfNodes[0].data.memberCount).toBe(2)
  })

  it('assigns numeric positions from dagre', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a')]
    const { rfNodes } = buildOrgLayout(nodes)
    for (const n of rfNodes) {
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
    }
  })

  it('produces stable output — same input same positions', () => {
    const nodes = [makeNode('a'), makeNode('b', 'a'), makeNode('c', 'b')]
    const first = buildOrgLayout(nodes)
    const second = buildOrgLayout(nodes)
    expect(first.rfNodes.map(n => n.position)).toEqual(second.rfNodes.map(n => n.position))
  })
})
```

- [ ] **Run — expect FAIL**

```bash
npm test -- layout 2>&1 | tail -10
```

- [ ] **Create the layout utility**

```typescript
// lib/org/layout.ts
import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { OrgNode } from '@/lib/db/org-nodes'

const NODE_WIDTH = 160
const NODE_HEIGHT = 48

export type DeptNodeData = {
  label: string
  memberCount: number
}

export function buildOrgLayout(orgNodes: OrgNode[]): {
  rfNodes: Node<DeptNodeData>[]
  rfEdges: Edge[]
} {
  if (orgNodes.length === 0) return { rfNodes: [], rfEdges: [] }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 })

  for (const node of orgNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const validIds = new Set(orgNodes.map(n => n.id))
  for (const node of orgNodes) {
    if (node.parent_id && validIds.has(node.parent_id)) {
      g.setEdge(node.parent_id, node.id)
    }
  }

  dagre.layout(g)

  const rfNodes: Node<DeptNodeData>[] = orgNodes.map(node => {
    const { x, y } = g.node(node.id)
    return {
      id: node.id,
      type: 'deptNode',
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { label: node.name, memberCount: node.members.length },
    }
  })

  const rfEdges: Edge[] = orgNodes
    .filter(n => n.parent_id && validIds.has(n.parent_id))
    .map(n => ({
      id: `e-${n.parent_id}-${n.id}`,
      source: n.parent_id!,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
    }))

  return { rfNodes, rfEdges }
}
```

- [ ] **Run tests — expect all PASS**

```bash
npm test -- layout 2>&1 | tail -10
```

- [ ] **Commit**

```bash
git add lib/org/layout.ts __tests__/lib/org/layout.test.ts
git commit -m "feat: dagre layout utility for org chart — buildOrgLayout()"
```

---

### Task 3: Create DeptNode custom React Flow node

**Files:**
- Create: `components/org/DeptNode.tsx`

No separate test needed — this is a pure presentational component, covered by visual inspection. React Flow's internal machinery handles node rendering.

- [ ] **Create the component**

```typescript
// components/org/DeptNode.tsx
'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { DeptNodeData } from '@/lib/org/layout'

export function DeptNode({ data, selected }: NodeProps<DeptNodeData>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <div
        style={{
          padding: '8px 14px',
          background: selected ? 'var(--color-accent-wash2)' : 'var(--color-surface)',
          border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: selected ? 'var(--color-accent)' : 'var(--color-text-primary)',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 120,
          width: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          boxShadow: '0 1px 3px rgba(40,60,45,0.06)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.label}
        </span>
        {data.memberCount > 0 && (
          <span
            style={{
              background: selected ? 'var(--color-accent)' : 'var(--color-chip-bg)',
              color: selected ? 'var(--color-accent-fg)' : 'var(--color-text-faint)',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {data.memberCount}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </>
  )
}
```

- [ ] **Run full test suite (no regressions)**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add components/org/DeptNode.tsx
git commit -m "feat: DeptNode custom React Flow node — Sage styled, selected state"
```

---

### Task 4: Create createDirectConnection server action

**Files:**
- Create: `app/(app)/people/actions.ts`
- Create: `__tests__/app/people/actions.test.ts`

- [ ] **Write failing tests**

```typescript
// __tests__/app/people/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase clients
const mockGetUser = vi.fn()
const mockOrgMembersSelect = vi.fn()
const mockConnectionsSelect = vi.fn()
const mockConnectionsUpsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'org_members') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mockOrgMembersSelect }) }) }) }
      return {}
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'connections') return {
        select: () => ({ or: () => ({ maybeSingle: mockConnectionsSelect }) }),
        upsert: mockConnectionsUpsert,
      }
      return {}
    },
  }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { createDirectConnection } = await import('@/app/(app)/people/actions')

describe('createDirectConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockOrgMembersSelect.mockResolvedValue({ data: { role: 'org_admin' }, error: null })
    mockConnectionsSelect.mockResolvedValue({ data: null, error: null })
    mockConnectionsUpsert.mockResolvedValue({ error: null })
  })

  it('returns error if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not authenticated/i)
  })

  it('returns error if caller is not org admin', async () => {
    mockOrgMembersSelect.mockResolvedValue({ data: { role: 'member' }, error: null })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/org admin/i)
  })

  it('returns error if connection already exists', async () => {
    mockConnectionsSelect.mockResolvedValue({ data: { id: 'existing-conn' }, error: null })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already connected/i)
  })

  it('inserts active connection with correct manager/DR ids for direct_report role', async () => {
    await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: 'user-1',
        direct_report_id: 'target-1',
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('inserts active connection with correct manager/DR ids for manager role', async () => {
    await createDirectConnection('target-1', 'manager', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: 'target-1',
        direct_report_id: 'user-1',
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('returns ok:true on success', async () => {
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Run — expect FAIL**

```bash
npm test -- "people/actions" 2>&1 | tail -10
```

- [ ] **Create the server action**

```typescript
// app/(app)/people/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err, type ActionResult } from '@/lib/action-result'

/**
 * Creates an active connection directly between the current user and targetUserId.
 * Requires the caller to be an org admin in the specified org.
 * Role describes targetUserId's role relative to current user:
 *   'manager'       → targetUserId is current user's manager
 *   'direct_report' → targetUserId is current user's direct report
 */
export async function createDirectConnection(
  targetUserId: string,
  role: 'manager' | 'direct_report',
  orgId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  // Verify caller is org admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (membership?.role !== 'org_admin') {
    return err('Only org admins can link people directly.')
  }

  const managerId = role === 'manager' ? targetUserId : user.id
  const directReportId = role === 'direct_report' ? targetUserId : user.id

  const adminSupabase = createAdminClient()

  // Check for existing connection in either direction
  const { data: existing } = await adminSupabase
    .from('connections')
    .select('id')
    .or(`and(manager_id.eq.${managerId},direct_report_id.eq.${directReportId}),and(manager_id.eq.${directReportId},direct_report_id.eq.${managerId})`)
    .maybeSingle()

  if (existing) return err('Already connected.')

  const { error } = await adminSupabase
    .from('connections')
    .upsert(
      { manager_id: managerId, direct_report_id: directReportId, status: 'active', initiated_by: user.id },
      { onConflict: 'manager_id,direct_report_id', ignoreDuplicates: true }
    )

  if (error) return err('Failed to create connection. Please try again.')

  revalidatePath('/people')
  return ok()
}
```

- [ ] **Run tests — expect all PASS**

```bash
npm test -- "people/actions" 2>&1 | tail -10
```

- [ ] **Run full suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add app/\(app\)/people/actions.ts __tests__/app/people/actions.test.ts
git commit -m "feat: createDirectConnection server action — org admin direct-link"
```

---

### Task 5: Create OrgNodePanel side panel

**Files:**
- Create: `components/org/OrgNodePanel.tsx`

- [ ] **Create the component**

```typescript
// components/org/OrgNodePanel.tsx
'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@/hooks/use-mutation'
import { createDirectConnection } from '@/app/(app)/people/actions'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
  createNodeAction,
} from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

interface Props {
  node: OrgNode
  orgId: string
  orgRole: 'org_admin' | 'member' | null
  currentUserId: string
  userManagerId: string | null
  userDirectReportIds: string[]
  onClose: () => void
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/[\s@]/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#0E7C6B', '#CC7A1A', '#3B82F6', '#8B5CF6', '#DC2626', '#047857']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: color,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  )
}

export function OrgNodePanel({
  node, orgId, orgRole, currentUserId,
  userManagerId, userDirectReportIds, onClose,
}: Props) {
  const isAdmin = orgRole === 'org_admin'
  const [showSubgroupForm, setShowSubgroupForm] = useState(false)
  const [, startTransition] = useTransition()

  const { mutate: addMember, isPending: addingMember } = useMutation({ onSuccess: 'Member added' })
  const { mutate: removeMember } = useMutation({ onSuccess: 'Member removed' })
  const { mutate: cancelInvite } = useMutation({ onSuccess: 'Invite cancelled' })
  const { mutate: directLink } = useMutation({ onSuccess: 'Connected' })

  function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    fd.set('nodeId', node.id)
    addMember(() => addMemberToNodeAction(fd))
    e.currentTarget.reset()
  }

  function handleCreateSubgroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    fd.set('parentId', node.id)
    startTransition(async () => {
      const result = await createNodeAction(fd)
      if (!result.ok) toast.error(result.error)
      else setShowSubgroupForm(false)
    })
  }

  return (
    <div
      style={{
        width: 320, flexShrink: 0,
        borderLeft: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
            {node.members.length} member{node.members.length !== 1 ? 's' : ''}
            {node.pendingInvites.length > 0 && ` · ${node.pendingInvites.length} pending`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Members */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 8 }}>
            Members
          </div>

          {node.members.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>No members yet.</p>
          )}

          {node.members.map(member => {
            const displayName = member.display_name ?? member.email ?? member.user_id
            const isCurrentUser = member.user_id === currentUserId
            const isMyManager = member.user_id === userManagerId
            const isMyDR = userDirectReportIds.includes(member.user_id)

            return (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F0F3EE' }}>
                <Avatar name={displayName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}{isCurrentUser && ' (you)'}
                  </div>
                  {member.email && member.display_name && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{member.email}</div>
                  )}
                </div>

                {/* Relationship / action */}
                {!isCurrentUser && (
                  isMyManager ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--color-accent-wash2)', color: 'var(--color-accent)', flexShrink: 0 }}>
                      Your manager
                    </span>
                  ) : isMyDR ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(204,122,26,0.1)', color: 'var(--color-manager)', flexShrink: 0 }}>
                      Your DR
                    </span>
                  ) : isAdmin ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => directLink(() => createDirectConnection(member.user_id, 'manager', orgId))}
                        title="Set as your manager"
                        style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--color-accent-border)', background: 'var(--color-accent-wash)', color: 'var(--color-accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        My manager
                      </button>
                      <button
                        onClick={() => directLink(() => createDirectConnection(member.user_id, 'direct_report', orgId))}
                        title="Add as your direct report"
                        style={{ padding: '2px 7px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Add as DR
                      </button>
                    </div>
                  ) : null
                )}

                {/* Remove from dept (admin only) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      const fd = new FormData()
                      fd.set('orgId', orgId)
                      fd.set('nodeId', node.id)
                      fd.set('userId', member.user_id)
                      removeMember(() => removeMemberFromNodeAction(fd))
                    }}
                    title="Remove from this group"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 12, flexShrink: 0, padding: '0 2px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}

          {/* Pending invites */}
          {node.pendingInvites.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 6 }}>
                Pending invites
              </div>
              {node.pendingInvites.map(invite => (
                <div key={invite.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {invite.invited_email}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const fd = new FormData()
                        fd.set('orgId', orgId)
                        fd.set('invitationId', invite.id)
                        cancelInvite(() => cancelPendingOrgNodeInvitationAction(fd))
                      }}
                      style={{ fontSize: 10, color: 'var(--color-negative)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add person */}
        <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 6 }}>
          <input
            name="email"
            type="email"
            required
            placeholder={isAdmin ? 'Add by email…' : 'Email address…'}
            style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', minWidth: 0 }}
          />
          <button
            type="submit"
            disabled={addingMember}
            style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            {addingMember ? '…' : '+'}
          </button>
        </form>

        {/* Add subgroup (admin only) */}
        {isAdmin && (
          showSubgroupForm ? (
            <form onSubmit={handleCreateSubgroup} style={{ display: 'flex', gap: 6 }}>
              <input
                name="name"
                placeholder="Subgroup name…"
                required
                autoFocus
                style={{ flex: 1, border: '1px solid var(--color-accent-border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: 'var(--color-surface)', color: 'var(--color-text-primary)', minWidth: 0 }}
              />
              <button type="submit" style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Create</button>
              <button type="button" onClick={() => setShowSubgroupForm(false)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-faint)', flexShrink: 0 }}>✕</button>
            </form>
          ) : (
            <button
              onClick={() => setShowSubgroupForm(true)}
              style={{ width: '100%', padding: 8, background: 'transparent', border: '1.5px dashed var(--color-border)', borderRadius: 7, fontSize: 12, color: 'var(--color-text-faint)', cursor: 'pointer', textAlign: 'center' }}
            >
              + Add subgroup to {node.name}
            </button>
          )
        )}
      </div>
    </div>
  )
}
```

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add components/org/OrgNodePanel.tsx
git commit -m "feat: OrgNodePanel side panel — members, inline linking, add/subgroup"
```

---

### Task 6: Create OrgFlowChart (replaces OrgHierarchy)

**Files:**
- Create: `components/org/OrgFlowChart.tsx`

React Flow requires `'use client'` and must import its CSS. The canvas needs an explicit pixel height to render.

- [ ] **Create the component**

```typescript
// components/org/OrgFlowChart.tsx
'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import { buildOrgLayout } from '@/lib/org/layout'
import { DeptNode } from './DeptNode'
import { OrgNodePanel } from './OrgNodePanel'
import { createNodeAction } from '@/app/(app)/organisation/actions'
import type { OrgNode } from '@/lib/db/org-nodes'

const nodeTypes = { deptNode: DeptNode }

interface Props {
  nodes: OrgNode[]
  orgId: string
  orgRole: 'org_admin' | 'member' | null
  currentUserId: string
  userManagerId: string | null
  userDirectReportIds: string[]
}

export function OrgFlowChart({
  nodes, orgId, orgRole, currentUserId, userManagerId, userDirectReportIds,
}: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showAddTopLevel, setShowAddTopLevel] = useState(false)
  const [, startTransition] = useTransition()
  const isAdmin = orgRole === 'org_admin'

  const { rfNodes, rfEdges } = useMemo(() => buildOrgLayout(nodes), [nodes])

  const flowNodes = rfNodes.map(n => ({ ...n, selected: n.id === selectedNodeId }))

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null

  function handleAddTopLevel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('orgId', orgId)
    startTransition(async () => {
      const result = await createNodeAction(fd)
      if (!result.ok) toast.error(result.error)
      else { setShowAddTopLevel(false) }
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 360px)',
        minHeight: 400,
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isAdmin && (
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
            {showAddTopLevel ? (
              <form onSubmit={handleAddTopLevel} style={{ display: 'flex', gap: 6 }}>
                <input
                  name="name"
                  placeholder="Group name…"
                  required
                  autoFocus
                  style={{
                    border: '1px solid var(--color-border)', borderRadius: 6,
                    padding: '5px 10px', fontSize: 12,
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  }}
                />
                <button
                  type="submit"
                  style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTopLevel(false)}
                  style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-faint)' }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddTopLevel(true)}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                  color: 'var(--color-text-muted)', boxShadow: '0 1px 3px rgba(40,60,45,0.06)',
                }}
              >
                + Add top-level group
              </button>
            )}
          </div>
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: 'var(--color-bg-base)' }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--color-track)" />
        </ReactFlow>
      </div>

      {/* Side panel */}
      {selectedNode && (
        <OrgNodePanel
          node={selectedNode}
          orgId={orgId}
          orgRole={orgRole}
          currentUserId={currentUserId}
          userManagerId={userManagerId}
          userDirectReportIds={userDirectReportIds}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add components/org/OrgFlowChart.tsx
git commit -m "feat: OrgFlowChart — React Flow canvas with DeptNode + OrgNodePanel"
```

---

### Task 7: Update OrgSection and page.tsx

**Files:**
- Modify: `app/(app)/people/OrgSection.tsx`
- Modify: `app/(app)/people/page.tsx`

OrgSection needs three new props (`currentUserId`, `userManagerId`, `userDirectReportIds`) to pass down to OrgFlowChart. page.tsx computes these from the existing `connections` fetch.

- [ ] **Update OrgSection.tsx**

Replace the import and swap `OrgHierarchy` → `OrgFlowChart`:

```typescript
// app/(app)/people/OrgSection.tsx
'use client'
import { useState } from 'react'
import { OrgFlowChart } from '@/components/org/OrgFlowChart'   // ← changed
import { createOrgAction } from '@/app/(app)/organisation/actions'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import type { Org } from '@/lib/db/organisations'
import type { OrgNode } from '@/lib/db/org-nodes'

interface Props {
  orgs: Org[]
  nodes: OrgNode[]
  orgRole: 'org_admin' | 'member' | null
  currentUserId: string          // ← new
  userManagerId: string | null   // ← new
  userDirectReportIds: string[]  // ← new
}

export function OrgSection({ orgs, nodes, orgRole, currentUserId, userManagerId, userDirectReportIds }: Props) {
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0)
  const { mutate: createOrg, isPending: creatingOrg } = useMutation({ onSuccess: 'Organisation created' })
  const selectedOrg = orgs[selectedOrgIndex] ?? null

  return (
    <section>
      <div
        style={{
          fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>Org structure</span>
        {selectedOrg && (
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 400 }}>
            {selectedOrg.name}
            {orgRole === 'org_admin' && ' · you are an Org Admin'}
          </span>
        )}
      </div>

      {orgs.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', borderRadius: 10, padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            You&apos;re not part of an organisation yet. Create one to map out your team structure.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              createOrg(() => createOrgAction(fd))
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input name="name" placeholder="Organisation name" required style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '8px 12px', color: 'var(--color-text-primary)', fontSize: 14 }} />
            <Button type="submit" loading={creatingOrg}>Create</Button>
          </form>
        </div>
      ) : (
        <>
          {orgs.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {orgs.map((org, i) => (
                <button key={org.id} type="button" onClick={() => setSelectedOrgIndex(i)}
                  style={{ padding: '4px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', background: i === selectedOrgIndex ? 'var(--color-accent-wash2)' : 'transparent', border: i === selectedOrgIndex ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border)', color: i === selectedOrgIndex ? 'var(--color-accent)' : 'var(--color-text-faint)' }}>
                  {org.name}
                </button>
              ))}
            </div>
          )}
          {selectedOrg && (
            <OrgFlowChart
              nodes={nodes}
              orgId={selectedOrg.id}
              orgRole={orgRole}
              currentUserId={currentUserId}
              userManagerId={userManagerId}
              userDirectReportIds={userDirectReportIds}
            />
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Update page.tsx to pass connection-derived props**

In `app/(app)/people/page.tsx`, add two computed values after the connections fetch and pass them to OrgSection:

```typescript
// After the existing lines that compute directReportIds:
const userManagerId =
  (connections.asDirectReport as EnrichedConnection[])
    .find(c => c.status === 'active')?.manager_id ?? null

const userDirectReportIds = (connections.asManager as EnrichedConnection[])
  .filter(c => c.status === 'active')
  .map(c => c.direct_report_id)
```

Update the `<OrgSection>` call:

```typescript
<OrgSection
  orgs={orgs}
  nodes={nodes}
  orgRole={orgRole}
  currentUserId={user.id}
  userManagerId={userManagerId}
  userDirectReportIds={userDirectReportIds}
/>
```

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -6
```

- [ ] **Commit**

```bash
git add app/\(app\)/people/OrgSection.tsx app/\(app\)/people/page.tsx
git commit -m "feat: wire OrgFlowChart into OrgSection and people page"
```

---

### Task 8: Delete old org components

**Files to delete:**
- `components/org/OrgHierarchy.tsx`
- `components/org/NodeRow.tsx`
- `components/org/AddNodeForm.tsx`
- `components/org/MemberStack.tsx`

Also check for and delete any org-component tests that reference these deleted files.

- [ ] **Check for test files**

```bash
find /Users/terry.brown/work/personal/brilliantmanagers.info/__tests__/components/org -type f 2>/dev/null
```

- [ ] **Delete files**

```bash
rm components/org/OrgHierarchy.tsx
rm components/org/NodeRow.tsx
rm components/org/AddNodeForm.tsx
rm components/org/MemberStack.tsx
# Delete any org component tests found above, e.g.:
# rm __tests__/components/org/NodeRow.test.tsx
```

- [ ] **Run full test suite — confirm all pass**

```bash
npm test 2>&1 | tail -6
```

If there are import errors from deleted files, fix any remaining references by searching:

```bash
grep -rn "OrgHierarchy\|NodeRow\|AddNodeForm\|MemberStack" --include="*.tsx" --include="*.ts" . | grep -v node_modules | grep -v ".next"
```

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: delete OrgHierarchy, NodeRow, AddNodeForm, MemberStack — replaced by OrgFlowChart"
```

---

### Final: full test run + push

- [ ] **Full test suite green**

```bash
npm test 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Push and open PR**

```bash
git push -u origin design/team-org-redesign
gh pr create \
  --title "feat: React Flow org chart + side panel + admin direct-link" \
  --body "Replaces OrgHierarchy table with a React Flow canvas (dagre top-down layout). Clicking a node opens OrgNodePanel with members, inline manager/DR linking (direct for org admins, invite for non-admin), add-member form, and add-subgroup form. New createDirectConnection server action lets org admins create active connections without invitation consent." \
  --base master --assignee "@me"
```
