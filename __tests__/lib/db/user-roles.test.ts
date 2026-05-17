import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { grantSuperAdmin, revokeSuperAdmin, listAllUsersWithRoles } from '@/lib/db/user-roles'
import { createAdminClient } from '@/lib/supabase/admin'

const mockAdminClient = createAdminClient as ReturnType<typeof vi.fn>

describe('grantSuperAdmin', () => {
  it('inserts a super_admin row via admin client', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockAdminClient.mockReturnValue({ from })

    await grantSuperAdmin('user-1', 'granter-1')

    expect(from).toHaveBeenCalledWith('user_roles')
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      role: 'super_admin',
      granted_by: 'granter-1',
    })
  })

  it('throws when insert returns an error', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'duplicate key' } })
    const from = vi.fn().mockReturnValue({ insert })
    mockAdminClient.mockReturnValue({ from })

    await expect(grantSuperAdmin('user-1', 'granter-1')).rejects.toThrow()
  })
})

describe('revokeSuperAdmin', () => {
  it('deletes the super_admin row', async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null })
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 })
    const del = vi.fn().mockReturnValue({ eq: eq1 })
    const from = vi.fn().mockReturnValue({ delete: del })
    mockAdminClient.mockReturnValue({ from })

    await revokeSuperAdmin('user-1')

    expect(del).toHaveBeenCalled()
    expect(eq1).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eq2).toHaveBeenCalledWith('role', 'super_admin')
  })
})

describe('listAllUsersWithRoles', () => {
  it('returns users with is_super_admin flag', async () => {
    const profiles = [
      { id: 'u1', email: 'a@x.com', display_name: 'Alice', created_at: '2024-01-01' },
      { id: 'u2', email: 'b@x.com', display_name: 'Bob', created_at: '2024-01-02' },
    ]
    const superAdmins = [{ user_id: 'u1' }]

    const from = vi.fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: profiles }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: superAdmins }),
        }),
      })
    mockAdminClient.mockReturnValue({ from })

    const result = await listAllUsersWithRoles()

    expect(result).toHaveLength(2)
    expect(result[0].is_super_admin).toBe(true)
    expect(result[1].is_super_admin).toBe(false)
  })
})
