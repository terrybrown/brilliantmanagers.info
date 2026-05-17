import { describe, it, expect } from 'vitest'
import { getCheckinChip } from '../checkin'
import type { DevelopmentPlan } from '@/lib/db/development-plans'

function makePlan(overrides: Partial<DevelopmentPlan> = {}): DevelopmentPlan {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    skill_key: 'self-resilience',
    pillar: 'self',
    goal: 'Improve resilience',
    target_date: null,
    status: 'planned',
    checkin_frequency_weeks: null,
    last_checkin_at: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getCheckinChip', () => {
  it('returns null when no checkin_frequency_weeks is set', () => {
    expect(getCheckinChip(makePlan())).toBeNull()
  })

  it('returns amber "overdue" chip when past due', () => {
    const lastCheckin = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const chip = getCheckinChip(makePlan({ checkin_frequency_weeks: 2, last_checkin_at: lastCheckin }))
    expect(chip?.color).toBe('amber')
    expect(chip?.label).toBe('Check-in overdue')
  })

  it('returns green chip with days remaining when not yet due', () => {
    const lastCheckin = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const chip = getCheckinChip(makePlan({ checkin_frequency_weeks: 4, last_checkin_at: lastCheckin }))
    expect(chip?.color).toBe('green')
    expect(chip?.label).toMatch(/Check-in due in \d+ days?/)
  })

  it('uses created_at as baseline when last_checkin_at is null', () => {
    const recentPlan = makePlan({
      checkin_frequency_weeks: 4,
      last_checkin_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const chip = getCheckinChip(recentPlan)
    expect(chip?.color).toBe('green')
  })
})
