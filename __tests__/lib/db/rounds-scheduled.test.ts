import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/skills', () => ({
  PILLARS: ['self', 'team', 'strategy', 'communications', 'domain-expertise'],
}))

import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound } from '@/lib/db/rounds'

const mockCreateClient = vi.mocked(createClient)

beforeEach(() => vi.clearAllMocks())

describe('getOrCreateActiveRound — scheduled round transition', () => {
  it('transitions a scheduled round to in_progress when no in_progress round exists', async () => {
    const scheduledRow = {
      id: 'round-sched', user_id: 'u1', status: 'scheduled',
      created_at: '2026-05-22T00:00:00Z', completed_at: null, title: null, notes: null, remind_at: null,
    }
    const transitionedRow = { ...scheduledRow, status: 'in_progress' }

    // Build mock chain: first maybeSingle (in_progress) → null, second maybeSingle (scheduled) → scheduledRow, then update → single → transitionedRow
    let callCount = 0
    const mockMaybeSingle = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(callCount === 1
        ? { data: null, error: null }
        : { data: scheduledRow, error: null })
    })
    const mockSingle = vi.fn().mockResolvedValue({ data: transitionedRow, error: null })

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    })

    mockCreateClient.mockResolvedValue({ from: mockFrom } as never)

    const result = await getOrCreateActiveRound('u1')
    expect(result.status).toBe('in_progress')
    expect(result.id).toBe('round-sched')
  })
})
