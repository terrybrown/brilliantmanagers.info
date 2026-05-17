import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createOrg, getOrgsForUser, updateOrgName } from '@/lib/db/organisations'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

describe('createOrg', () => {
  it('calls the create_org_with_admin RPC and returns id and name', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'org-1', name: 'Acme' }, error: null })
    mockCreateClient.mockResolvedValue({ rpc })

    const result = await createOrg('Acme')
    expect(result.id).toBe('org-1')
    expect(result.name).toBe('Acme')
    expect(rpc).toHaveBeenCalledWith('create_org_with_admin', { _name: 'Acme' })
  })

  it('throws when RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    mockCreateClient.mockResolvedValue({ rpc })

    await expect(createOrg('Acme')).rejects.toThrow()
  })
})

describe('getOrgsForUser', () => {
  it('returns orgs the user is a member of', async () => {
    const memberData = [
      { role: 'org_admin', organisations: { id: 'org-1', name: 'Acme', created_by: 'user-1', created_at: '2024-01-01' } },
    ]
    const eq = vi.fn().mockResolvedValue({ data: memberData, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateClient.mockResolvedValue({ from })

    const result = await getOrgsForUser('user-1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Acme')
    expect(result[0].userRole).toBe('org_admin')
  })
})

describe('updateOrgName', () => {
  it('updates the org name', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    mockCreateClient.mockResolvedValue({ from })

    await updateOrgName('org-1', 'New Name')
    expect(update).toHaveBeenCalledWith({ name: 'New Name' })
    expect(eq).toHaveBeenCalledWith('id', 'org-1')
  })
})
