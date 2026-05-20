// __tests__/app/(app)/organisation/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  profileSelect: vi.fn(),
  orgSelect: vi.fn(),
  nodeSelect: vi.fn(),
  actorProfileSelect: vi.fn(),
  createPendingInvite: vi.fn(),
  sendEmail: vi.fn(),
  addUserToNode: vi.fn(),
  revalidatePath: vi.fn(),
  logAudit: vi.fn(),
  deletePendingById: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/auth/roles', () => ({ getOrgRole: mocks.getOrgRole }))
vi.mock('@/lib/db/pending-org-node-invitations', () => ({
  createPendingOrgNodeInvitation: mocks.createPendingInvite,
  deletePendingOrgNodeInvitationById: mocks.deletePendingById,
}))
vi.mock('@/lib/email/mailgun', () => ({ sendEmail: mocks.sendEmail }))
vi.mock('@/lib/db/org-node-members', () => ({ addUserToNode: mocks.addUserToNode }))
vi.mock('@/lib/audit', () => ({ logAudit: mocks.logAudit }))

// The supabase client mock needs to handle multiple table lookups
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@x.com' } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mocks.profileSelect,
              single: mocks.actorProfileSelect,
            }),
          }),
        }
      }
      if (table === 'organisations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mocks.orgSelect }),
          }),
        }
      }
      if (table === 'org_nodes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mocks.nodeSelect }),
          }),
        }
      }
      if (table === 'org_members') {
        return { select: vi.fn() }
      }
      return {}
    }),
  }),
}))

describe('addMemberToNodeAction — invite path', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getOrgRole.mockResolvedValue('org_admin')
    mocks.profileSelect.mockResolvedValue({ data: null, error: null }) // no account
    mocks.orgSelect.mockResolvedValue({ data: { name: 'Acme Corp' }, error: null })
    mocks.nodeSelect.mockResolvedValue({ data: { name: 'Engineering' }, error: null })
    mocks.actorProfileSelect.mockResolvedValue({ data: { display_name: 'Admin User', email: 'admin@x.com' }, error: null })
    mocks.createPendingInvite.mockResolvedValue(undefined)
    mocks.sendEmail.mockResolvedValue(undefined)
    mocks.revalidatePath.mockReturnValue(undefined)
    mocks.logAudit.mockResolvedValue(undefined)
  })

  it('creates a pending invite and returns {} when email has no account', async () => {
    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'new@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.createPendingInvite).toHaveBeenCalledWith({
      inviterId: 'admin-1',
      invitedEmail: 'new@example.com',
      orgId: 'org-1',
      nodeId: 'node-1',
    })
    expect(mocks.sendEmail).toHaveBeenCalled()
  })

  it('returns {} even when email send fails (non-blocking)', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('Mailgun down'))

    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'new@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.createPendingInvite).toHaveBeenCalled()
  })

  it('adds user directly when profile exists', async () => {
    mocks.profileSelect.mockResolvedValue({ data: { id: 'existing-user' }, error: null })
    mocks.addUserToNode.mockResolvedValue(undefined)

    const { addMemberToNodeAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('nodeId', 'node-1')
    fd.set('email', 'existing@example.com')

    const result = await addMemberToNodeAction(fd)

    expect(result).toEqual({})
    expect(mocks.addUserToNode).toHaveBeenCalledWith({
      nodeId: 'node-1',
      userId: 'existing-user',
      actorId: 'admin-1',
    })
    expect(mocks.createPendingInvite).not.toHaveBeenCalled()
  })
})

describe('cancelPendingOrgNodeInvitationAction', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getOrgRole.mockResolvedValue('org_admin')
    mocks.deletePendingById.mockResolvedValue(undefined)
    mocks.revalidatePath.mockReturnValue(undefined)
    mocks.logAudit.mockResolvedValue(undefined)
  })

  it('deletes the pending invite and revalidates', async () => {
    const { cancelPendingOrgNodeInvitationAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    fd.set('invitationId', 'inv-1')

    await cancelPendingOrgNodeInvitationAction(fd)

    expect(mocks.deletePendingById).toHaveBeenCalledWith('inv-1', 'org-1')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/people')
  })

  it('returns without deleting when invitationId is missing', async () => {
    const { cancelPendingOrgNodeInvitationAction } = await import('@/app/(app)/organisation/actions')
    const fd = new FormData()
    fd.set('orgId', 'org-1')
    // no invitationId

    await cancelPendingOrgNodeInvitationAction(fd)

    expect(mocks.deletePendingById).not.toHaveBeenCalled()
  })
})
