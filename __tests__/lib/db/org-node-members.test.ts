import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { addUserToNode, removeUserFromNode } from '@/lib/db/org-node-members'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

function makeFrom(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((table: string) => responses[table] ?? { insert: vi.fn().mockResolvedValue({ error: null }) })
}

describe('addUserToNode', () => {
  it('inserts an org_node_members row and ensures org membership', async () => {
    const orgNodeMembersInsert = vi.fn().mockResolvedValue({ error: null })
    const orgMembersUpsert = vi.fn().mockResolvedValue({ error: null })

    const nodeSingle = vi.fn().mockResolvedValue({ data: { org_id: 'org-1', parent_id: null }, error: null })
    const nodeEq = vi.fn().mockReturnValue({ single: nodeSingle })
    const nodeSelect = vi.fn().mockReturnValue({ eq: nodeEq })

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

  it('throws when node is not found', async () => {
    const nodeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const nodeEq = vi.fn().mockReturnValue({ single: nodeSingle })
    const nodeSelect = vi.fn().mockReturnValue({ eq: nodeEq })

    const from = makeFrom({ org_nodes: { select: nodeSelect } })
    mock.mockResolvedValue({ from })

    await expect(addUserToNode({ nodeId: 'n1', userId: 'user-2', actorId: 'user-1' })).rejects.toThrow('Node not found')
  })

  it('creates connections when an ancestor node has members', async () => {
    const connectionsUpsert = vi.fn().mockResolvedValue({ error: null })

    const nodeSingle = vi.fn().mockResolvedValue({ data: { org_id: 'org-1', parent_id: 'parent-node' }, error: null })
    const nodeEq = vi.fn().mockReturnValue({ single: nodeSingle })
    const nodeSelect = vi.fn().mockReturnValue({ eq: nodeEq })

    const parentMemberEq = vi.fn().mockResolvedValue({ data: [{ user_id: 'manager-1' }], error: null })
    const parentMemberSelect = vi.fn().mockReturnValue({ eq: parentMemberEq })

    const parentNodeSingle = vi.fn().mockResolvedValue({ data: { parent_id: null }, error: null })
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

  it('throws when delete errors', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    await expect(removeUserFromNode('n1', 'user-2')).rejects.toThrow()
  })
})
