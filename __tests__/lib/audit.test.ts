import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { logAudit } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

describe('logAudit', () => {
  it('inserts an audit log entry with all fields', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    await logAudit({
      actorId: 'user-1',
      action: 'goal.create',
      entityType: 'goal',
      entityId: 'goal-abc',
      metadata: { skill_key: 'communication' },
    })

    expect(from).toHaveBeenCalledWith('audit_log')
    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'goal.create',
      entity_type: 'goal',
      entity_id: 'goal-abc',
      metadata: { skill_key: 'communication' },
    })
  })

  it('omits optional fields as null when not provided', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    mockCreateClient.mockResolvedValue({ from })

    await logAudit({ actorId: 'user-1', action: 'profile.update', entityType: 'profile' })

    expect(insert).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'profile.update',
      entity_type: 'profile',
      entity_id: null,
      metadata: null,
    })
  })

  it('does not throw when insert throws', async () => {
    const from = vi.fn().mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('DB error')),
    })
    mockCreateClient.mockResolvedValue({ from })

    await expect(
      logAudit({ actorId: 'user-1', action: 'goal.create', entityType: 'goal' })
    ).resolves.toBeUndefined()
  })
})
