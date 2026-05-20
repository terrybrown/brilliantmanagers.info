import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NodeRow } from '@/components/org/NodeRow'
import type { OrgNodeWithChildren } from '@/components/org/NodeRow'

vi.mock('@/components/org/MemberStack', () => ({
  MemberStack: () => <div data-testid="member-stack" />,
}))
vi.mock('@/components/org/AddNodeForm', () => ({
  AddNodeForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="add-node-form">
      <input placeholder="Child group name…" />
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
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
