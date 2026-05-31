import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NodeRow, peopleButtonLabel } from '@/components/org/NodeRow'
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

  // ── People button label — pending / combined branches ────────────────────────

  it('shows pending count in People button when only pending invites exist', () => {
    const nodeWithPending: OrgNodeWithChildren = {
      ...baseNode,
      members: [],
      pendingInvites: [{ id: 'inv-1', invited_email: 'p@x.com' }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithPending} />)
    expect(screen.getByRole('button', { name: /1 pending/i })).toBeInTheDocument()
  })

  it('shows member and pending count combined in People button', () => {
    const nodeWithBoth: OrgNodeWithChildren = {
      ...baseNode,
      members: [{ user_id: 'u1', display_name: 'Alice', email: 'a@x.com' }],
      pendingInvites: [{ id: 'inv-1', invited_email: 'p@x.com' }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithBoth} />)
    expect(screen.getByRole('button', { name: /1 person · 1 pending/i })).toBeInTheDocument()
  })

  // ── Member panel — pending invite chips ──────────────────────────────────────

  it('shows pending invite chips in member panel', () => {
    const nodeWithPending: OrgNodeWithChildren = {
      ...baseNode,
      members: [],
      pendingInvites: [{ id: 'inv-1', invited_email: 'pending@x.com' }],
    }
    render(<NodeRow {...defaultProps} node={nodeWithPending} openMemberPanelId="n1" />)
    expect(screen.getByText('pending@x.com')).toBeInTheDocument()
    expect(screen.getByText(/awaiting registration/i)).toBeInTheDocument()
  })

  // ── AddMemberForm submit ──────────────────────────────────────────────────────

  it('submits AddMemberForm and calls addMemberToNodeAction', async () => {
    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    render(<NodeRow {...defaultProps} openMemberPanelId="n1" />)
    const input = screen.getByPlaceholderText(/add member by email/i)
    fireEvent.change(input, { target: { value: 'new@x.com' } })
    fireEvent.submit(input.closest('form')!)
    await vi.waitFor(() => expect(addMemberToNodeAction).toHaveBeenCalled())
  })
})

describe('peopleButtonLabel', () => {
  it('returns "+ People" when no members and no pending', () => {
    expect(peopleButtonLabel([], [], false)).toBe('+ People')
  })

  it('returns "1 person ▾" for a single member (singular)', () => {
    const members = [{ user_id: 'u1', display_name: 'A', email: 'a@x.com' }]
    expect(peopleButtonLabel(members, [], false)).toBe('1 person ▾')
  })

  it('returns "N people ▴" when panel is open and multiple members', () => {
    const members = [
      { user_id: 'u1', display_name: 'A', email: 'a@x.com' },
      { user_id: 'u2', display_name: 'B', email: 'b@x.com' },
    ]
    expect(peopleButtonLabel(members, [], true)).toBe('2 people ▴')
  })

  it('returns "1 pending invite ▾" when only one pending invite exists (singular)', () => {
    const pending = [{ id: 'i1', invited_email: 'p@x.com' }]
    expect(peopleButtonLabel([], pending, false)).toBe('1 pending invite ▾')
  })

  it('returns "N pending invites ▾" when multiple pending invites exist (plural)', () => {
    const pending = [{ id: 'i1', invited_email: 'p@x.com' }, { id: 'i2', invited_email: 'q@x.com' }]
    expect(peopleButtonLabel([], pending, false)).toBe('2 pending invites ▾')
  })

  it('returns combined label when both members and pending exist', () => {
    const members = [{ user_id: 'u1', display_name: 'A', email: 'a@x.com' }]
    const pending = [{ id: 'i1', invited_email: 'p@x.com' }]
    expect(peopleButtonLabel(members, pending, false)).toBe('1 person · 1 pending ▾')
  })
})
