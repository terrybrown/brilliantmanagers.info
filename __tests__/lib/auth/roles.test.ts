import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { isSuperAdmin, getOrgRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

function makeChain(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data })
  const eq = vi.fn()
  eq.mockReturnValue({ eq, maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  mockCreateClient.mockResolvedValue({ from })
  return { from }
}

describe('isSuperAdmin', () => {
  it('returns true when a super_admin row exists', async () => {
    makeChain({ role: 'super_admin' })
    expect(await isSuperAdmin('user-1')).toBe(true)
  })

  it('returns false when no row exists', async () => {
    makeChain(null)
    expect(await isSuperAdmin('user-2')).toBe(false)
  })
})

describe('getOrgRole', () => {
  it('returns org_admin when member has that role', async () => {
    makeChain({ role: 'org_admin' })
    expect(await getOrgRole('user-1', 'org-1')).toBe('org_admin')
  })

  it('returns member when member has that role', async () => {
    makeChain({ role: 'member' })
    expect(await getOrgRole('user-1', 'org-1')).toBe('member')
  })

  it('returns null when user is not a member', async () => {
    makeChain(null)
    expect(await getOrgRole('user-1', 'org-1')).toBeNull()
  })
})
