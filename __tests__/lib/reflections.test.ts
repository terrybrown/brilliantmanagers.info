import { describe, it, expect } from 'vitest'
import {
  nextRoundTitle,
  roundLabel,
  computeTrendData,
  computeStats,
  computePillarScores,
} from '@/lib/reflections'
import { PILLARS } from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { Score } from '@/lib/db/scores'
import type { ManagerScore } from '@/lib/db/manager-scores'

// Helpers
function makeRound(id: string, overrides: Partial<Round> = {}): Round {
  return {
    id,
    user_id: 'u-1',
    status: 'complete',
    created_at: '2026-01-15T00:00:00Z',
    completed_at: '2026-03-31T00:00:00Z',
    title: null,
    notes: null,
    remind_at: null,
    ...overrides,
  }
}

let _idCounter = 0
function makeScore(roundId: string, pillar: string, skillKey: string, level: 'Developing' | 'Basic' | 'Proficient' | 'Advanced' | 'Expert'): Score {
  return { id: `s-${++_idCounter}`, round_id: roundId, pillar, skill_key: skillKey, level, scored_at: '2026-03-01' }
}

function makeMgrScore(roundId: string, skillKey: string, level: 'Developing' | 'Basic' | 'Proficient' | 'Advanced' | 'Expert'): ManagerScore {
  return { id: `ms-${++_idCounter}`, round_id: roundId, manager_id: 'm-1', skill_key: skillKey, level, scored_at: '2026-03-01' }
}

describe('nextRoundTitle', () => {
  it('returns Q1 for January', () => {
    expect(nextRoundTitle(new Date('2026-01-15'))).toBe('Q1 2026')
  })
  it('returns Q2 for April', () => {
    expect(nextRoundTitle(new Date('2026-04-01'))).toBe('Q2 2026')
  })
  it('returns Q3 for July', () => {
    expect(nextRoundTitle(new Date('2026-07-31'))).toBe('Q3 2026')
  })
  it('returns Q4 for December', () => {
    expect(nextRoundTitle(new Date('2026-12-01'))).toBe('Q4 2026')
  })
  it('uses current date when no argument given', () => {
    const result = nextRoundTitle()
    expect(result).toMatch(/^Q[1-4] \d{4}$/)
  })
})

describe('roundLabel', () => {
  it('returns title when set', () => {
    const round = makeRound('r-1', { title: 'Q2 2026' })
    expect(roundLabel(round)).toBe('Q2 2026')
  })
  it('derives label from created_at when title is null', () => {
    const round = makeRound('r-1', { title: null, created_at: '2026-04-10T00:00:00Z' })
    expect(roundLabel(round)).toBe('Q2 2026')
  })
})

describe('computeTrendData', () => {
  it('returns empty array for no rounds', () => {
    expect(computeTrendData([], {})).toEqual([])
  })

  it('computes overall self score for a single round', () => {
    const round = makeRound('r-1')
    const scores: Score[] = [
      makeScore('r-1', 'self', 'self-resilience', 'Proficient'),    // 3
      makeScore('r-1', 'team', 'team-accountability', 'Advanced'),   // 4
    ]
    const result = computeTrendData([{ round, scores }], {})
    expect(result).toHaveLength(1)
    expect(result[0].overall).toBeCloseTo(3.5)
    expect(result[0].self).toBeCloseTo(3)
    expect(result[0].team).toBeCloseTo(4)
    expect(result[0].mgr_overall).toBeUndefined()
  })

  it('includes manager overall when manager scores exist', () => {
    const round = makeRound('r-1')
    const scores: Score[] = [makeScore('r-1', 'self', 'self-resilience', 'Proficient')]
    const mgrScores: ManagerScore[] = [makeMgrScore('r-1', 'self-resilience', 'Expert')]
    const result = computeTrendData([{ round, scores }], { 'r-1': mgrScores })
    expect(result[0].mgr_overall).toBeCloseTo(5)
    expect(result[0].mgr_self).toBeCloseTo(5)
  })
})

describe('computeStats', () => {
  it('returns zero/null stats for empty rounds', () => {
    const stats = computeStats([], {})
    expect(stats.totalRounds).toBe(0)
    expect(stats.improvement).toBe(0)
    expect(stats.bestPillar).toBeNull()
    expect(stats.managerAvg).toBeNull()
  })

  it('computes correct stats for two rounds', () => {
    const r1 = makeRound('r-1')
    const r2 = makeRound('r-2')
    const scores1: Score[] = [makeScore('r-1', 'self', 'self-resilience', 'Basic')]      // 2
    const scores2: Score[] = [makeScore('r-2', 'self', 'self-resilience', 'Advanced')]   // 4
    const stats = computeStats(
      [{ round: r1, scores: scores1 }, { round: r2, scores: scores2 }],
      {}
    )
    expect(stats.totalRounds).toBe(2)
    expect(stats.improvement).toBeCloseTo(2)  // 4 - 2
    expect(stats.bestPillar).toBe('self')
    expect(stats.managerAvg).toBeNull()
  })

  it('returns bestPillar: null when rounds exist but all score arrays are empty', () => {
    const emptyRound = {
      round: {
        id: 'r-empty',
        user_id: 'user-1',
        status: 'complete' as const,
        created_at: '2026-01-01T00:00:00Z',
        completed_at: '2026-03-01T00:00:00Z',
        title: 'Q1 2026',
        notes: null,
        remind_at: null,
      },
      scores: [],
    }
    const result = computeStats([emptyRound], {})
    expect(result.bestPillar).toBeNull()
  })

  it('includes managerAvg when manager scores exist', () => {
    const round = makeRound('r-1')
    const scores: Score[] = [makeScore('r-1', 'self', 'self-resilience', 'Proficient')]
    const mgrScores: ManagerScore[] = [
      makeMgrScore('r-1', 'self-resilience', 'Advanced'),  // 4
    ]
    const stats = computeStats([{ round, scores }], { 'r-1': mgrScores })
    expect(stats.managerAvg).toBeCloseTo(4)
  })
})

describe('computePillarScores', () => {
  it('returns 5 entries, one per pillar', () => {
    const result = computePillarScores([], [])
    expect(result).toHaveLength(5)
    expect(result.map(r => r.pillar)).toEqual(PILLARS)
  })

  it('marks pillars with no scores as selfScored: false with selfScore 0', () => {
    const result = computePillarScores([], [])
    expect(result.every(r => !r.selfScored && r.selfScore === 0)).toBe(true)
  })

  it('computes selfScore and sets selfScored: true for a scored pillar', () => {
    const scores = [
      makeScore('r-1', 'self', 'self-resilience', 'Proficient'),  // 3
      makeScore('r-1', 'self', 'self-growth-mindset', 'Advanced'), // 4
    ]
    const result = computePillarScores(scores, [])
    const selfPillar = result.find(r => r.pillar === 'self')!
    expect(selfPillar.selfScored).toBe(true)
    expect(selfPillar.selfScore).toBeCloseTo(3.5)
  })

  it('computes managerScore from manager scores', () => {
    const mgrScores = [makeMgrScore('r-1', 'self-self-awareness', 'Expert')] // 5
    const result = computePillarScores([], mgrScores)
    const selfPillar = result.find(r => r.pillar === 'self')!
    expect(selfPillar.managerScore).toBeCloseTo(5)
  })

  it('leaves managerScore undefined when no manager scores for that pillar', () => {
    const result = computePillarScores([], [])
    expect(result.every(r => r.managerScore === undefined)).toBe(true)
  })
})
