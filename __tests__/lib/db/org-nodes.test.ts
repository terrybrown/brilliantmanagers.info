import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createNode, renameNode, deleteNode, getNodesForOrg } from '@/lib/db/org-nodes'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

describe('createNode', () => {
  it('inserts a node and returns it', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'n1', name: 'Engineering', org_id: 'org-1', parent_id: null, node_type: 'Division', created_at: '2024-01-01' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) })

    const result = await createNode({ orgId: 'org-1', parentId: null, name: 'Engineering', nodeType: 'Division' })
    expect(result.id).toBe('n1')
    expect(insert).toHaveBeenCalledWith({ org_id: 'org-1', parent_id: null, name: 'Engineering', node_type: 'Division' })
  })

  it('throws when insert errors', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) })

    await expect(createNode({ orgId: 'org-1', parentId: null, name: 'Eng' })).rejects.toThrow()
  })

  it('throws when data is null', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ insert }) })

    await expect(createNode({ orgId: 'org-1', parentId: null, name: 'Eng' })).rejects.toThrow()
  })
})

describe('renameNode', () => {
  it('updates name and node_type', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await renameNode('n1', 'org-1', 'Backend', 'Team')
    expect(update).toHaveBeenCalledWith({ name: 'Backend', node_type: 'Team' })
    expect(eq1).toHaveBeenCalledWith('id', 'n1')
    expect(eq2).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('throws when update errors', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await expect(renameNode('n1', 'org-1', 'Backend', 'Team')).rejects.toThrow()
  })
})

describe('deleteNode', () => {
  it('deletes by id scoped to org', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    await deleteNode('n1', 'org-1')
    expect(eq1).toHaveBeenCalledWith('id', 'n1')
    expect(eq2).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('throws when delete errors', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    await expect(deleteNode('n1', 'org-1')).rejects.toThrow()
  })
})

describe('getNodesForOrg', () => {
  it('returns nodes with member data', async () => {
    const nodes = [
      { id: 'n1', org_id: 'org-1', parent_id: null, name: 'Eng', node_type: 'Division', created_at: '2024-01-01',
        org_node_members: [{ user_id: 'u1', profiles: [{ email: 'a@x.com', display_name: 'Alice' }] }] },
    ]
    const order = vi.fn().mockResolvedValue({ data: nodes, error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getNodesForOrg('org-1')
    expect(result).toHaveLength(1)
    expect(result[0].members[0].email).toBe('a@x.com')
  })

  it('handles null profiles in node members', async () => {
    const nodes = [
      { id: 'n1', org_id: 'org-1', parent_id: null, name: 'Eng', node_type: null, created_at: '2024-01-01',
        org_node_members: [{ user_id: 'u1', profiles: [] }] },
    ]
    const order = vi.fn().mockResolvedValue({ data: nodes, error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getNodesForOrg('org-1')
    expect(result[0].members[0].email).toBeNull()
  })

  it('throws when query errors', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    await expect(getNodesForOrg('org-1')).rejects.toThrow()
  })
})
