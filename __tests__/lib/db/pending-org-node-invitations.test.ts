import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const mock = createClient as ReturnType<typeof vi.fn>
const adminMock = createAdminClient as ReturnType<typeof vi.fn>

describe('createPendingOrgNodeInvitation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

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
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

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
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

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
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('deletes by id and org_id using admin client', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    const { deletePendingOrgNodeInvitationById } = await import('@/lib/db/pending-org-node-invitations')
    await deletePendingOrgNodeInvitationById('inv-1', 'org-1')

    expect(eq1).toHaveBeenCalledWith('id', 'inv-1')
    expect(eq2).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('throws on error', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    adminMock.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: del }) })

    const { deletePendingOrgNodeInvitationById } = await import('@/lib/db/pending-org-node-invitations')
    await expect(deletePendingOrgNodeInvitationById('inv-1', 'org-1')).rejects.toThrow()
  })
})

describe('propagateOrgNodeInvitesOnAccept', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function buildAdmin(tableHandlers: Record<string, unknown>) {
    return {
      from: (table: string) => tableHandlers[table] ?? {},
    }
  }

  it('does nothing when initiator has no org node memberships', async () => {
    const upsert = vi.fn()
    adminMock.mockReturnValue(buildAdmin({
      profiles: {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'new-user-id' } }) }) }),
      },
      org_node_members: {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      },
      pending_org_node_invitations: { upsert },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })

  it('creates one pending invite when initiator has one direct node', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })

    // Track calls to org_node_members: first call returns initiator's nodes, subsequent calls check membership
    let orgNodeMembersCallCount = 0
    adminMock.mockReturnValue(buildAdmin({
      profiles: {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'new-user-id' } }) }) }),
      },
      org_node_members: {
        select: (fields: string) => {
          orgNodeMembersCallCount++
          if (orgNodeMembersCallCount === 1) {
            // Get initiator's memberships
            return {
              eq: () => Promise.resolve({
                data: [{ node_id: 'node-1', org_nodes: { org_id: 'org-1' } }],
                error: null,
              }),
            }
          }
          // Check if new member already in node
          return {
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          }
        },
      },
      pending_org_node_invitations: { upsert },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).toHaveBeenCalledOnce()
    expect(upsert).toHaveBeenCalledWith(
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
    const upsert = vi.fn().mockResolvedValue({ error: null })

    let orgNodeMembersCallCount = 0
    adminMock.mockReturnValue(buildAdmin({
      profiles: {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'new-user-id' } }) }) }),
      },
      org_node_members: {
        select: () => {
          orgNodeMembersCallCount++
          if (orgNodeMembersCallCount === 1) {
            return {
              eq: () => Promise.resolve({
                data: [
                  { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
                  { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
                ],
                error: null,
              }),
            }
          }
          return {
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          }
        },
      },
      pending_org_node_invitations: { upsert },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).toHaveBeenCalledTimes(2)
  })

  it('skips a node where new member is already a member', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })

    let orgNodeMembersCallCount = 0
    adminMock.mockReturnValue(buildAdmin({
      profiles: {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'new-user-id' } }) }) }),
      },
      org_node_members: {
        select: () => {
          orgNodeMembersCallCount++
          if (orgNodeMembersCallCount === 1) {
            return {
              eq: () => Promise.resolve({
                data: [
                  { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
                  { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
                ],
                error: null,
              }),
            }
          }
          // node-1: already member, node-2: not member
          const isFirstCheck = orgNodeMembersCallCount === 2
          return {
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: isFirstCheck ? { user_id: 'new-user-id' } : null,
                }),
              }),
            }),
          }
        },
      },
      pending_org_node_invitations: { upsert },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).toHaveBeenCalledOnce()
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ node_id: 'node-2' }),
      expect.any(Object)
    )
  })

  it('skips nodes with null org_id', async () => {
    const upsert = vi.fn()

    let orgNodeMembersCallCount = 0
    adminMock.mockReturnValue(buildAdmin({
      profiles: {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'new-user-id' } }) }) }),
      },
      org_node_members: {
        select: () => {
          orgNodeMembersCallCount++
          if (orgNodeMembersCallCount === 1) {
            return {
              eq: () => Promise.resolve({
                data: [{ node_id: 'node-1', org_nodes: null }],
                error: null,
              }),
            }
          }
          return {
            eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          }
        },
      },
      pending_org_node_invitations: { upsert },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })
})
