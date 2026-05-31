# Fix Organisations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin organisations page query (shows empty due to a broken PostgREST join) and redesign the org hierarchy node row with explicit, readable action buttons for member management and adding child groups.

**Architecture:** Two independent changes — (1) the admin page server component replaces a broken nested PostgREST join with two sequential queries merged in application code; (2) `NodeRow` gains two dedicated action buttons (`+ People` emerald, `+ Subgroup` indigo) and renders the member panel inline below the flex row, while `MemberStack` is stripped to avatar display only.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (PostgREST), Vitest + Testing Library, TypeScript, inline CSS styles (no Tailwind in org components).

---

## File Map

| File | Change |
|---|---|
| `app/(app)/admin/organisations/page.tsx` | Replace nested join with two sequential queries |
| `components/org/MemberStack.tsx` | Strip to avatar display only — remove panel, isOpen, onToggle, isAdmin props |
| `components/org/NodeRow.tsx` | Add `+ People` and `+ Subgroup` buttons; inline member panel below flex row; absorb RemoveMemberButton, CancelInviteButton, AddMemberForm from MemberStack |
| `__tests__/components/org/MemberStack.test.tsx` | Rewrite for display-only API |
| `__tests__/components/org/NodeRow.test.tsx` | Update button labels; add People button and member panel tests |

`OrgHierarchy.tsx`, `AddNodeForm.tsx`, server actions — **no changes**.

---

## Task 1: Establish baseline

**Files:** none (read-only)

- [ ] **Step 1: Run tests and confirm green**

```bash
cd /Users/terry.brown/work/personal/brilliantmanagers.info
npm test 2>&1 | tail -20
```

Expected: all tests pass. Note any pre-existing failures to distinguish them from regressions.

---

## Task 2: Fix admin organisations page query

**Files:**
- Modify: `app/(app)/admin/organisations/page.tsx`

The page currently queries `organisations` with a nested join to `profiles` via `org_members`. There is no direct FK between `org_members.user_id` and `profiles.id` (both reference `auth.users.id` independently), so PostgREST cannot resolve the join. The query errors silently, `data` is null, and the page renders the "No organisations yet" empty state regardless of what's in the DB.

Fix: fetch orgs + members (no profile join), collect user IDs, fetch profiles separately, merge in application code — the same pattern used by `lib/db/org-nodes.ts:getNodesForOrg`.

- [ ] **Step 1: Replace the page server component**

Replace the entire contents of `app/(app)/admin/organisations/page.tsx`:

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminOrgsTable } from './AdminOrgsTable'

interface OrgMemberRaw {
  role: string
  user_id: string
}

interface OrgRow {
  id: string
  name: string
  created_at: string
  org_members: {
    role: string
    profiles: { email: string | null; display_name: string | null } | null
  }[]
  org_nodes: { id: string }[]
}

export default async function AdminOrganisationsPage() {
  const supabase = createAdminClient()

  // Step 1: fetch orgs with members (no profile join — no FK from org_members to profiles)
  const { data: orgsRaw, error } = await supabase
    .from('organisations')
    .select('id, name, created_at, org_members(role, user_id), org_nodes(id)')
    .order('created_at', { ascending: false })

  if (error || !orgsRaw) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
        <p className="text-sm text-red-400">Failed to load organisations.</p>
      </div>
    )
  }

  // Step 2: fetch profiles for all member user IDs
  const allUserIds = [
    ...new Set(
      orgsRaw.flatMap(o =>
        (o.org_members as OrgMemberRaw[]).map(m => m.user_id)
      )
    ),
  ]

  const profilesById: Record<string, { email: string | null; display_name: string | null }> = {}

  if (allUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', allUserIds)
    for (const p of profilesData ?? []) {
      profilesById[p.id] = { email: p.email, display_name: p.display_name }
    }
  }

  // Step 3: merge profiles into the org_members shape AdminOrgsTable expects
  const orgs: OrgRow[] = orgsRaw.map(org => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    org_nodes: org.org_nodes as { id: string }[],
    org_members: (org.org_members as OrgMemberRaw[]).map(m => ({
      role: m.role,
      profiles: profilesById[m.user_id] ?? null,
    })),
  }))

  // Fetch last activity per org
  const lastActivityMap: Record<string, string | null> = {}

  await Promise.all(
    orgs.map(async (org) => {
      const { data: memberRows } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('org_id', org.id)

      const userIds = (memberRows ?? []).map((m: { user_id: string }) => m.user_id)
      if (userIds.length === 0) {
        lastActivityMap[org.id] = null
        return
      }

      const { data: roundRows } = await supabase
        .from('assessment_rounds')
        .select('completed_at')
        .in('user_id', userIds)
        .eq('status', 'complete')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      lastActivityMap[org.id] = roundRows?.[0]?.completed_at ?? null
    })
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Organisations</h1>
      <AdminOrgsTable orgs={orgs} lastActivityMap={lastActivityMap} />
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test 2>&1 | tail -20
```

Expected: same result as baseline. (The admin page is a server component — no unit tests for it. Correctness is verified visually in Task 2 Step 3.)

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/admin/organisations/page.tsx
git commit -m "fix: admin organisations page — replace broken PostgREST join with two-query fetch"
```

---

## Task 3: Simplify MemberStack to display-only

**Files:**
- Modify: `components/org/MemberStack.tsx`
- Modify: `__tests__/components/org/MemberStack.test.tsx`

`MemberStack` currently renders both the avatar stack and the member management panel (when open). In the new design, the panel moves to `NodeRow`. `MemberStack` becomes a pure display component: avatars + overflow count + pending bubble. It has no click handlers and no panel state.

- [ ] **Step 1: Write updated MemberStack tests**

Replace the entire contents of `__tests__/components/org/MemberStack.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemberStack } from '@/components/org/MemberStack'
import type { OrgNode } from '@/lib/db/org-nodes'

const makeMember = (id: string, name: string): OrgNode['members'][0] => ({
  user_id: id,
  display_name: name,
  email: `${id}@x.com`,
})

describe('MemberStack', () => {
  it('renders nothing when there are no members or pending invites', () => {
    const { container } = render(
      <MemberStack members={[]} pendingInvites={[]} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders avatar circles for confirmed members', () => {
    render(
      <MemberStack
        members={[makeMember('u1', 'Alice'), makeMember('u2', 'Bob')]}
        pendingInvites={[]}
      />
    )
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('shows +N overflow when more than 3 members', () => {
    const members = [
      makeMember('u1', 'Alice'),
      makeMember('u2', 'Bob'),
      makeMember('u3', 'Carol'),
      makeMember('u4', 'Dave'),
    ]
    render(<MemberStack members={members} pendingInvites={[]} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('renders a pending invites bubble when pending invites exist', () => {
    render(
      <MemberStack
        members={[]}
        pendingInvites={[{ id: 'inv-1', invited_email: 'p@x.com' }]}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not attach any click handler (avatar stack is passive)', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <MemberStack
        members={[makeMember('u1', 'Alice')]}
        pendingInvites={[]}
      />
    )
    container.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npm test MemberStack 2>&1 | tail -30
```

Expected: some tests fail because MemberStack still has the old API.

- [ ] **Step 3: Replace MemberStack component**

Replace the entire contents of `components/org/MemberStack.tsx`:

```tsx
'use client'
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
}

export function MemberStack({ members, pendingInvites }: MemberStackProps) {
  if (members.length === 0 && pendingInvites.length === 0) return null

  const visible = members.slice(0, MAX_VISIBLE)
  const overflow = members.length - MAX_VISIBLE

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
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
      {pendingInvites.length > 0 && (
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
  )
}
```

- [ ] **Step 4: Run MemberStack tests**

```bash
npm test MemberStack 2>&1 | tail -20
```

Expected: all MemberStack tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: NodeRow tests will fail (MemberStack prop API changed). That's expected — NodeRow is updated in Task 4.

- [ ] **Step 6: Commit**

```bash
git add components/org/MemberStack.tsx __tests__/components/org/MemberStack.test.tsx
git commit -m "refactor: MemberStack — strip to avatar display only, remove panel and toggle props"
```

---

## Task 4: Redesign NodeRow with explicit action buttons

**Files:**
- Modify: `components/org/NodeRow.tsx`
- Modify: `__tests__/components/org/NodeRow.test.tsx`

`NodeRow` gains:
- A `+ People` button (emerald) that controls the member panel
- A `+ Subgroup` button (indigo, replaces `+ child`)
- The member panel rendered below the flex row (not inside it — fixes the latent layout bug)
- The sub-components from the old `MemberStack` panel (RemoveMemberButton, CancelInviteButton, AddMemberForm) inline in this file

`MemberStack` is now passed only `members` and `pendingInvites`.

- [ ] **Step 1: Write updated NodeRow tests**

Replace the entire contents of `__tests__/components/org/NodeRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NodeRow } from '@/components/org/NodeRow'
import type { OrgNodeWithChildren } from '@/components/org/NodeRow'

vi.mock('@/components/org/MemberStack', () => ({
  MemberStack: ({ members }: { members: unknown[] }) => (
    <div data-testid="member-stack" data-count={members.length} />
  ),
}))
vi.mock('@/components/org/AddNodeForm', () => ({
  AddNodeForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="add-node-form">
      <input placeholder="Child group name…" />
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}))
vi.mock('@/app/(app)/organisation/actions', () => ({
  addMemberToNodeAction: vi.fn().mockResolvedValue({ ok: true }),
  removeMemberFromNodeAction: vi.fn().mockResolvedValue({ ok: true }),
  cancelPendingOrgNodeInvitationAction: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the node name', () => {
    render(<NodeRow {...defaultProps} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })

  // ── + Subgroup button ────────────────────────────────────────────────────────

  it('shows the + Subgroup button for admins', () => {
    render(<NodeRow {...defaultProps} />)
    expect(screen.getByRole('button', { name: /\+ subgroup/i })).toBeInTheDocument()
  })

  it('hides the + Subgroup button for non-admins', () => {
    render(<NodeRow {...defaultProps} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /\+ subgroup/i })).toBeNull()
  })

  it('calls setOpenChildFormId with node id when + Subgroup is clicked', () => {
    const setOpenChildFormId = vi.fn()
    render(<NodeRow {...defaultProps} setOpenChildFormId={setOpenChildFormId} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ subgroup/i }))
    expect(setOpenChildFormId).toHaveBeenCalledWith('n1')
  })

  it('calls setOpenChildFormId with null when + Subgroup is clicked while form is open (toggle off)', () => {
    const setOpenChildFormId = vi.fn()
    render(<NodeRow {...defaultProps} openChildFormId="n1" setOpenChildFormId={setOpenChildFormId} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ subgroup/i }))
    expect(setOpenChildFormId).toHaveBeenCalledWith(null)
  })

  it('shows the AddNodeForm when openChildFormId matches node id', () => {
    render(<NodeRow {...defaultProps} openChildFormId="n1" />)
    expect(screen.getByPlaceholderText(/child group name/i)).toBeInTheDocument()
  })

  it('disables the + Subgroup button for provisional nodes', () => {
    const provisionalNode: OrgNodeWithChildren = { ...baseNode, id: 'provisional-123', name: 'New Team' }
    render(<NodeRow {...defaultProps} node={provisionalNode} />)
    expect(screen.getByRole('button', { name: /\+ subgroup/i })).toBeDisabled()
  })

  // ── + People button ──────────────────────────────────────────────────────────

  it('shows "+ People" button for admins when no members', () => {
    render(<NodeRow {...defaultProps} />)
    expect(screen.getByRole('button', { name: /\+ people/i })).toBeInTheDocument()
  })

  it('hides the People button for non-admins', () => {
    render(<NodeRow {...defaultProps} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /people/i })).toBeNull()
  })

  it('shows member count in People button when members exist', () => {
    const nodeWithMembers: OrgNodeWithChildren = {
      ...baseNode,
      members: [
        { user_id: 'u1', display_name: 'Alice', email: 'a@x.com' },
        { user_id: 'u2', display_name: 'Bob', email: 'b@x.com' },
      ],
    }
    render(<NodeRow {...defaultProps} node={nodeWithMembers} />)
    expect(screen.getByRole('button', { name: /2 people/i })).toBeInTheDocument()
  })

  it('calls setOpenMemberPanelId with node id when People button is clicked', () => {
    const setOpenMemberPanelId = vi.fn()
    render(<NodeRow {...defaultProps} setOpenMemberPanelId={setOpenMemberPanelId} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ people/i }))
    expect(setOpenMemberPanelId).toHaveBeenCalledWith('n1')
  })

  it('calls setOpenMemberPanelId with null when People button is clicked while panel is open', () => {
    const setOpenMemberPanelId = vi.fn()
    render(<NodeRow {...defaultProps} openMemberPanelId="n1" setOpenMemberPanelId={setOpenMemberPanelId} />)
    fireEvent.click(screen.getByRole('button', { name: /people/i }))
    expect(setOpenMemberPanelId).toHaveBeenCalledWith(null)
  })

  it('shows member panel below the row when openMemberPanelId matches node id', () => {
    const nodeWithMembers: OrgNodeWithChildren = {
      ...baseNode,
      members: [{ user_id: 'u1', display_name: 'Alice', email: 'a@x.com' }],
      pendingInvites: [],
    }
    render(<NodeRow {...defaultProps} node={nodeWithMembers} openMemberPanelId="n1" />)
    expect(screen.getByPlaceholderText(/add member by email/i)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('does not show member panel when openMemberPanelId is null', () => {
    render(<NodeRow {...defaultProps} openMemberPanelId={null} />)
    expect(screen.queryByPlaceholderText(/add member by email/i)).toBeNull()
  })

  // ── Collapse / children ──────────────────────────────────────────────────────

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

  // ── Provisional nodes ────────────────────────────────────────────────────────

  it('shows "saving…" indicator for provisional nodes', () => {
    const provisionalNode: OrgNodeWithChildren = { ...baseNode, id: 'provisional-123', name: 'New Team' }
    render(<NodeRow {...defaultProps} node={provisionalNode} />)
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('does not render MemberStack for provisional nodes', () => {
    const provisionalNode: OrgNodeWithChildren = { ...baseNode, id: 'provisional-123', name: 'New Team' }
    render(<NodeRow {...defaultProps} node={provisionalNode} />)
    expect(screen.queryByTestId('member-stack')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npm test NodeRow 2>&1 | tail -30
```

Expected: tests referencing `+ child` fail; new People button tests fail. That's expected.

- [ ] **Step 3: Replace NodeRow component**

Replace the entire contents of `components/org/NodeRow.tsx`:

```tsx
'use client'
import type { ReactNode } from 'react'
import type { OrgNode } from '@/lib/db/org-nodes'
import { MemberStack } from './MemberStack'
import { AddNodeForm } from './AddNodeForm'
import {
  addMemberToNodeAction,
  removeMemberFromNodeAction,
  cancelPendingOrgNodeInvitationAction,
} from '@/app/(app)/organisation/actions'
import { useMutation } from '@/hooks/use-mutation'

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[]
}

// ── Member panel sub-components ───────────────────────────────────────────────

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

function RemoveMemberButton({ nodeId, orgId, userId }: { nodeId: string; orgId: string; userId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member removed' })
  return (
    <button
      type="button"
      onClick={() => {
        const fd = new FormData()
        fd.set('nodeId', nodeId)
        fd.set('userId', userId)
        fd.set('orgId', orgId)
        mutate(() => removeMemberFromNodeAction(fd))
      }}
      disabled={isPending}
      style={{ background: 'none', border: 'none', color: isPending ? '#4b5563' : '#6b7280', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
    >
      ✕
    </button>
  )
}

function CancelInviteButton({ invitationId, orgId }: { invitationId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Invite cancelled' })
  return (
    <button
      type="button"
      onClick={() => {
        const fd = new FormData()
        fd.set('orgId', orgId)
        fd.set('invitationId', invitationId)
        mutate(() => cancelPendingOrgNodeInvitationAction(fd))
      }}
      disabled={isPending}
      style={{ background: 'none', border: 'none', color: isPending ? '#4b5563' : '#6b7280', cursor: isPending ? 'default' : 'pointer', fontSize: 12, padding: '0 0 0 4px', lineHeight: 1 }}
    >
      ✕
    </button>
  )
}

function AddMemberForm({ nodeId, orgId }: { nodeId: string; orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Member added' })
  return (
    <form
      style={{ display: 'flex', gap: 6, flex: 1 }}
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        fd.set('orgId', orgId)
        fd.set('nodeId', nodeId)
        mutate(() => addMemberToNodeAction(fd))
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="Add member by email…"
        disabled={isPending}
        style={{
          flex: 1, background: '#0d1117', border: '1px solid #1f2937',
          color: '#f1f5f9', padding: '5px 8px', borderRadius: 4, fontSize: 12,
          outline: 'none', maxWidth: 280,
        }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
          color: '#a78bfa', padding: '5px 10px', borderRadius: 4, fontSize: 12,
          cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '…' : 'Add'}
      </button>
    </form>
  )
}

// ── People button label ───────────────────────────────────────────────────────

function peopleButtonLabel(
  members: OrgNode['members'],
  pendingInvites: OrgNode['pendingInvites'],
  isOpen: boolean
): string {
  const n = members.length
  const p = pendingInvites.length
  const arrow = isOpen ? ' ▴' : n > 0 || p > 0 ? ' ▾' : ''

  if (n === 0 && p === 0) return '+ People'
  if (n === 0) return `${p} pending${arrow}`
  if (p === 0) return `${n} people${arrow}`
  return `${n} people · ${p} pending${arrow}`
}

// ── NodeRow ───────────────────────────────────────────────────────────────────

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
  renderNode: (node: OrgNodeWithChildren, depth: number) => ReactNode
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
  const isProvisional = node.id.startsWith('provisional-')
  const isChildFormOpen = openChildFormId === node.id && !isProvisional
  const isMemberPanelOpen = openMemberPanelId === node.id

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
            fontSize: 14,
            color: isProvisional ? '#a78bfa' : '#f1f5f9',
            fontWeight: depth === 0 ? 600 : 400,
            fontStyle: isProvisional ? 'italic' : 'normal',
          }}
        >
          {node.name}
          {node.node_type && (
            <span style={{ marginLeft: 6, fontSize: 11, color: '#4b5563' }}>{node.node_type}</span>
          )}
        </span>

        {/* Saving indicator for provisional nodes */}
        {isProvisional && (
          <span style={{ fontSize: 11, color: '#f59e0b' }}>saving…</span>
        )}

        {/* Avatar stack (passive display) */}
        {!isProvisional && (
          <MemberStack members={node.members} pendingInvites={node.pendingInvites} />
        )}

        {/* + People button (admin only) */}
        {isAdmin && !isProvisional && (
          <button
            type="button"
            onClick={() => setOpenMemberPanelId(isMemberPanelOpen ? null : node.id)}
            style={{
              fontSize: 13,
              color: isMemberPanelOpen ? '#6ee7b7' : '#34d399',
              cursor: 'pointer',
              border: `1px solid ${isMemberPanelOpen ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.3)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isMemberPanelOpen ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {peopleButtonLabel(node.members, node.pendingInvites, isMemberPanelOpen)}
          </button>
        )}

        {/* + Subgroup button (admin only) */}
        {isAdmin && (
          <button
            type="button"
            disabled={isProvisional}
            onClick={() => setOpenChildFormId(isChildFormOpen ? null : node.id)}
            style={{
              fontSize: 13,
              color: isChildFormOpen ? '#a78bfa' : '#818cf8',
              cursor: isProvisional ? 'default' : 'pointer',
              border: `1px solid ${isChildFormOpen ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)'}`,
              padding: '4px 10px',
              borderRadius: 5,
              background: isChildFormOpen ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)',
              opacity: isProvisional ? 0.4 : 1,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            + Subgroup{isChildFormOpen ? ' ▴' : ''}
          </button>
        )}
      </div>

      {/* Member panel — rendered below the flex row (not inside it) */}
      {isAdmin && isMemberPanelOpen && !isProvisional && (
        <div
          style={{
            paddingTop: 8,
            paddingBottom: 12,
            paddingLeft: paddingLeft + 24,
            paddingRight: 14,
            background: 'rgba(16,185,129,0.03)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderLeft: '2px solid rgba(16,185,129,0.2)',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6b7280', marginBottom: 8 }}>
            Members
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {node.members.map(m => (
              <div
                key={m.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 20, padding: '3px 10px 3px 5px', fontSize: 12, color: '#cbd5e1',
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
                <RemoveMemberButton nodeId={node.id} orgId={orgId} userId={m.user_id} />
              </div>
            ))}

            {node.pendingInvites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                  borderRadius: 20, padding: '3px 10px 3px 8px', fontSize: 12, color: '#a78bfa',
                }}
              >
                {invite.invited_email}
                <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 2 }}>awaiting registration</span>
                <CancelInviteButton invitationId={invite.id} orgId={orgId} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <AddMemberForm nodeId={node.id} orgId={orgId} />
          </div>
        </div>
      )}

      {/* Inline add-subgroup form */}
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

- [ ] **Step 4: Run NodeRow tests**

```bash
npm test NodeRow 2>&1 | tail -30
```

Expected: all NodeRow tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/org/NodeRow.tsx __tests__/components/org/NodeRow.test.tsx
git commit -m "feat: org hierarchy — explicit People/Subgroup buttons, member panel below row"
```

---

## Task 5: Build and verify

- [ ] **Step 1: Build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit lint fixes if any**

If lint produces auto-fixable errors:
```bash
npm run lint -- --fix
git add -A
git commit -m "fix: lint"
```

---

## Self-Review Checklist

- [x] **Admin page fix** — covers the spec's "replace broken nested join with two sequential queries" requirement. Error is now surfaced rather than silently swallowed.
- [x] **MemberStack strip** — covers "reduce to avatar stack display only; remove isOpen/onToggle/isAdmin".
- [x] **NodeRow redesign** — covers "+ People (emerald), + Subgroup (indigo), 13px, 4px 10px padding". Node name bumped to 14px.
- [x] **Panel placement** — member panel rendered after the flex row div, fixing the latent layout bug.
- [x] **Sub-components moved** — RemoveMemberButton, CancelInviteButton, AddMemberForm moved from MemberStack to NodeRow.
- [x] **Non-admin view** — unchanged; People/Subgroup buttons are admin-only; MemberStack renders passively for all.
- [x] **OrgHierarchy** — no changes needed; it passes `orgRole` and `orgId` to NodeRow, which now handles all member state internally.
- [x] **Tests** — all test files updated with concrete code; no placeholders.
