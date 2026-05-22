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

  function buildAdmin({
    newMemberProfileId,
    initiatorNodeMemberships,
    existingMemberNodeIds = [],
    upsertError = null,
    nodeMembershipsError = null,
  }: {
    newMemberProfileId: string | null
    initiatorNodeMemberships: Array<{ node_id: string; org_nodes: { org_id: string } | null }>
    existingMemberNodeIds?: string[]
    upsertError?: unknown
    nodeMembershipsError?: unknown
  }) {
    return {
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: newMemberProfileId ? { id: newMemberProfileId } : null,
                }),
              }),
            }),
          }
        }
        if (table === 'org_node_members') {
          return {
            select: () => ({
              // Dispatch on the field name of the first .eq() call:
              // - eq('user_id', ...) → "get initiator's memberships" (returns array)
              // - eq('node_id', ...) → "check if new member is in node" (chains a second .eq)
              eq: (field: string, value: string) => {
                if (field === 'user_id') {
                  return Promise.resolve({
                    data: nodeMembershipsError ? null : initiatorNodeMemberships,
                    error: nodeMembershipsError ?? null,
                  })
                }
                // field === 'node_id' — check existing membership
                const nodeId = value
                const isAlreadyMember = existingMemberNodeIds.includes(nodeId)
                return {
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({
                      data: isAlreadyMember ? { user_id: 'new-user-id' } : null,
                    }),
                  }),
                }
              },
            }),
          }
        }
        if (table === 'pending_org_node_invitations') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: upsertError ?? null }),
          }
        }
        throw new Error(`Unexpected table in test: ${table}`)
      },
    }
  }

  it('does nothing when initiator has no org node memberships', async () => {
    const upsert = vi.fn()
    const admin = buildAdmin({ newMemberProfileId: 'new-user-id', initiatorNodeMemberships: [] })
    // Override pending_org_node_invitations to capture upsert calls
    const origFrom = admin.from.bind(admin)
    admin.from = (table: string) => {
      if (table === 'pending_org_node_invitations') return { upsert }
      return origFrom(table)
    }
    adminMock.mockReturnValue(admin)

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })

  it('creates one pending invite when initiator has one direct node', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const admin = buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [{ node_id: 'node-1', org_nodes: { org_id: 'org-1' } }],
    })
    const origFrom = admin.from.bind(admin)
    admin.from = (table: string) => {
      if (table === 'pending_org_node_invitations') return { upsert }
      return origFrom(table)
    }
    adminMock.mockReturnValue(admin)

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
    const admin = buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [
        { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
        { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
      ],
    })
    const origFrom = admin.from.bind(admin)
    admin.from = (table: string) => {
      if (table === 'pending_org_node_invitations') return { upsert }
      return origFrom(table)
    }
    adminMock.mockReturnValue(admin)

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).toHaveBeenCalledTimes(2)
  })

  it('skips a node where new member is already a member', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const admin = buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [
        { node_id: 'node-1', org_nodes: { org_id: 'org-1' } },
        { node_id: 'node-2', org_nodes: { org_id: 'org-1' } },
      ],
      existingMemberNodeIds: ['node-1'],
    })
    const origFrom = admin.from.bind(admin)
    admin.from = (table: string) => {
      if (table === 'pending_org_node_invitations') return { upsert }
      return origFrom(table)
    }
    adminMock.mockReturnValue(admin)

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
    const admin = buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [{ node_id: 'node-1', org_nodes: null }],
    })
    const origFrom = admin.from.bind(admin)
    admin.from = (table: string) => {
      if (table === 'pending_org_node_invitations') return { upsert }
      return origFrom(table)
    }
    adminMock.mockReturnValue(admin)

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')

    expect(upsert).not.toHaveBeenCalled()
  })

  it('throws when org_node_members fetch errors', async () => {
    adminMock.mockReturnValue(buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [],
      nodeMembershipsError: { message: 'db error' },
    }))

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await expect(propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')).rejects.toThrow()
  })

  it('throws when upsert errors', async () => {
    const admin = buildAdmin({
      newMemberProfileId: 'new-user-id',
      initiatorNodeMemberships: [{ node_id: 'node-1', org_nodes: { org_id: 'org-1' } }],
      upsertError: { message: 'upsert error' },
    })
    adminMock.mockReturnValue(admin)

    const { propagateOrgNodeInvitesOnAccept } = await import('@/lib/db/pending-org-node-invitations')
    await expect(propagateOrgNodeInvitesOnAccept('org-member-id', 'new@example.com')).rejects.toThrow()
  })
})
