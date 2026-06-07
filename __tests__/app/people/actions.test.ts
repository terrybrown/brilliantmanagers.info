// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockOrgMembersSelect = vi.fn()
const mockConnectionsSelect = vi.fn()
const mockConnectionsUpsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'org_members') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mockOrgMembersSelect }) }) }) }
      }
      return {}
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'connections') {
        return {
          select: () => ({ or: () => ({ maybeSingle: mockConnectionsSelect }) }),
          upsert: mockConnectionsUpsert,
        }
      }
      return {}
    },
  }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { createDirectConnection } = await import('@/app/(app)/people/actions')

// A valid UUID used in tests that need to pass UUID validation
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('createDirectConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // Default: first call = admin check passes, second call = target is a member
    mockOrgMembersSelect
      .mockResolvedValueOnce({ data: { role: 'org_admin' }, error: null })
      .mockResolvedValueOnce({ data: { user_id: VALID_UUID }, error: null })
    mockConnectionsSelect.mockResolvedValue({ data: null, error: null })
    mockConnectionsUpsert.mockResolvedValue({ error: null })
  })

  it('returns error if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not authenticated/i)
  })

  it('returns error if targetUserId is not a valid UUID', async () => {
    const result = await createDirectConnection('not-a-uuid', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/invalid user/i)
  })

  it('returns error if caller is not org admin', async () => {
    mockOrgMembersSelect.mockReset()
    mockOrgMembersSelect.mockResolvedValue({ data: { role: 'member' }, error: null })
    const result = await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/org admin/i)
  })

  it('returns error if targetUserId is not a member of the org', async () => {
    mockOrgMembersSelect.mockReset()
    mockOrgMembersSelect
      .mockResolvedValueOnce({ data: { role: 'org_admin' }, error: null }) // admin check
      .mockResolvedValueOnce({ data: null, error: null })                   // target membership check
    const result = await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not a member/i)
  })

  it('returns error if connection already exists', async () => {
    mockConnectionsSelect.mockResolvedValue({ data: { id: 'existing-conn' }, error: null })
    const result = await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already connected/i)
  })

  it('inserts active connection with correct manager/DR ids for direct_report role', async () => {
    await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: 'user-1',
        direct_report_id: VALID_UUID,
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('inserts active connection with correct manager/DR ids for manager role', async () => {
    await createDirectConnection(VALID_UUID, 'manager', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: VALID_UUID,
        direct_report_id: 'user-1',
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('returns ok:true on success', async () => {
    const result = await createDirectConnection(VALID_UUID, 'direct_report', 'org-1')
    expect(result.ok).toBe(true)
  })
})
