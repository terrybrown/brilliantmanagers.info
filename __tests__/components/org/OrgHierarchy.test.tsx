import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrgHierarchy } from '@/components/org/OrgHierarchy'
import type { OrgNode } from '@/lib/db/org-nodes'

vi.mock('@/app/(app)/organisation/actions', () => ({
  createNodeAction: vi.fn(),
}))

vi.mock('@/components/org/NodeRow', () => ({
  NodeRow: ({ node, renderNode, depth }: { node: { name: string; children: unknown[] }; renderNode: (n: unknown, d: number) => React.ReactNode; depth: number }) => (
    <div data-testid="node-row">
      {node.name}
      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  ),
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No structure defined yet" when nodes is empty', () => {
    render(<OrgHierarchy nodes={[]} orgId="org-1" orgRole={null} />)
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

  it('calls createNodeAction when the top-level add-group form is submitted', async () => {
    const { createNodeAction } = await import('@/app/(app)/organisation/actions')
    render(<OrgHierarchy nodes={[]} orgId="org-1" orgRole="org_admin" />)
    fireEvent.change(screen.getByPlaceholderText(/new top-level group/i), {
      target: { value: 'Marketing' },
    })
    fireEvent.submit(screen.getByPlaceholderText(/new top-level group/i).closest('form')!)
    await waitFor(() => expect(createNodeAction).toHaveBeenCalledTimes(1))
    const fd = vi.mocked(createNodeAction).mock.calls[0][0] as FormData
    expect(fd.get('name')).toBe('Marketing')
    expect(fd.get('orgId')).toBe('org-1')
  })
})
