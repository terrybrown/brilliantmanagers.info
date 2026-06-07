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

describe('createDirectConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockOrgMembersSelect.mockResolvedValue({ data: { role: 'org_admin' }, error: null })
    mockConnectionsSelect.mockResolvedValue({ data: null, error: null })
    mockConnectionsUpsert.mockResolvedValue({ error: null })
  })

  it('returns error if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not authenticated/i)
  })

  it('returns error if caller is not org admin', async () => {
    mockOrgMembersSelect.mockResolvedValue({ data: { role: 'member' }, error: null })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/org admin/i)
  })

  it('returns error if connection already exists', async () => {
    mockConnectionsSelect.mockResolvedValue({ data: { id: 'existing-conn' }, error: null })
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already connected/i)
  })

  it('inserts active connection with correct manager/DR ids for direct_report role', async () => {
    await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: 'user-1',
        direct_report_id: 'target-1',
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('inserts active connection with correct manager/DR ids for manager role', async () => {
    await createDirectConnection('target-1', 'manager', 'org-1')
    expect(mockConnectionsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        manager_id: 'target-1',
        direct_report_id: 'user-1',
        status: 'active',
      }),
      expect.any(Object)
    )
  })

  it('returns ok:true on success', async () => {
    const result = await createDirectConnection('target-1', 'direct_report', 'org-1')
    expect(result.ok).toBe(true)
  })
})
