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
})

describe('setOrgRole', () => {
  it('updates the role for an existing member', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const update = vi.fn().mockReturnValue({ eq: eq1 })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ update }) })

    await setOrgRole('org-1', 'user-1', 'org_admin')
    expect(update).toHaveBeenCalledWith({ role: 'org_admin' })
    expect(eq1).toHaveBeenCalledWith('org_id', 'org-1')
    expect(eq2).toHaveBeenCalledWith('user_id', 'user-1')
  })
})

describe('getOrgMembers', () => {
  it('returns members with profile data', async () => {
    const members = [
      { user_id: 'u1', role: 'org_admin', profiles: { email: 'a@x.com', display_name: 'Alice' } },
      { user_id: 'u2', role: 'member', profiles: { email: 'b@x.com', display_name: 'Bob' } },
    ]
    const eq = vi.fn().mockResolvedValue({ data: members, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    mock.mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) })

    const result = await getOrgMembers('org-1')
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('org_admin')
    expect(result[0].email).toBe('a@x.com')
  })
})
