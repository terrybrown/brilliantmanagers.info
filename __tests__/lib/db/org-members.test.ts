import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { addOrgMember, setOrgRole, getOrgMembers } from '@/lib/db/org-members'
import { createClient } from '@/lib/supabase/server'

const mock = createClient as ReturnType<typeof vi.fn>

describe('addOrgMember', () => {
  it('upserts a member row with given role', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) })

    await addOrgMember('org-1', 'user-1', 'member')
    expect(upsert).toHaveBeenCalledWith(
      { org_id: 'org-1', user_id: 'user-1', role: 'member' },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
  })

  it('throws when upsert errors', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ upsert }) })
    await expect(addOrgMember('org-1', 'user-1', 'member')).rejects.toThrow()
  })
})

describe('setOrgRole', () => {
  it('updates the role for an existing member', async () => {
    const single = vi.fn().mockResolvedValue({ data: { user_id: 'user-1' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq2 = vi.fn().mockReturnValue({ select })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await setOrgRole('org-1', 'user-1', 'org_admin')
    expect(update).toHaveBeenCalledWith({ role: 'org_admin' })
    expect(eq1).toHaveBeenCalledWith('org_id', 'org-1')
    expect(eq2).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('throws when no member row exists', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq2 = vi.fn().mockReturnValue({ select })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await expect(setOrgRole('org-1', 'ghost-user', 'org_admin')).rejects.toThrow()
  })
})

describe('getOrgMembers', () => {
  it('returns members with profile data', async () => {
    const members = [
      { user_id: 'u1', role: 'org_admin', profiles: [{ email: 'a@x.com', display_name: 'Alice' }] },
      { user_id: 'u2', role: 'member', profiles: [{ email: 'b@x.com', display_name: 'Bob' }] },
    ]
    const eq = vi.fn().mockResolvedValue({ data: members, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getOrgMembers('org-1')
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('org_admin')
    expect(result[0].email).toBe('a@x.com')
  })

  it('throws when query errors', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })
    await expect(getOrgMembers('org-1')).rejects.toThrow()
  })

  it('handles null profiles gracefully', async () => {
    const members = [
      { user_id: 'u1', role: 'member', profiles: null },
    ]
    const eq = vi.fn().mockResolvedValue({ data: members, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getOrgMembers('org-1')
    expect(result[0].email).toBeNull()
    expect(result[0].display_name).toBeNull()
  })
})
