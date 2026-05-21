# Reflections Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Reflections section to the app (left-nav item, `/reflections` list page, `/reflections/[id]` detail page) for round management and history, and replace the `ScheduleWidget` on the dashboard with an `ActiveRoundCard`.

**Architecture:** Three new routes (`/reflections`, `/reflections/[id]`), four new components (`CreateRoundModal`, `ActiveRoundCard`, `ReflectionsTrendChart`, `RoundsHistoryTable`), one new utility module (`lib/reflections.ts`), one new server action (`app/(app)/reflections/actions.ts`), two new DB functions, and a DB migration. The dashboard loses `ScheduleWidget` + `scheduled_rounds` fetching in favour of `ActiveRoundCard`. All data is fetched server-side and passed to client components as props.

**Tech Stack:** Next.js 15 App Router (server components + server actions), Supabase/Postgres, Tailwind CSS v4 (dark-only), Recharts (LineChart — follow `PillarHistoryChart` pattern), Vitest + Testing Library, `vi.hoisted` for singleton mocks, `lib/skills.ts` for pillar/skill data.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260521000001_reflections_round_metadata.sql` | Create | Add title/notes/remind_at to assessment_rounds |
| `lib/db/rounds.ts` | Modify | Extend Round type; add createRound, getRoundById |
| `lib/db/manager-scores.ts` | Modify | Add getManagerScoresForAllRounds |
| `lib/reflections.ts` | Create | Pure utilities: nextRoundTitle, computeTrendData, computeStats, roundLabel |
| `app/(app)/reflections/actions.ts` | Create | createRoundAction server action |
| `components/reflections/CreateRoundModal.tsx` | Create | Modal form: title, start date, remind_at, notes |
| `components/reflections/ActiveRoundCard.tsx` | Create | Client component; owns CreateRoundModal state |
| `components/reflections/ReflectionsTrendChart.tsx` | Create | Recharts line chart with pillar tabs + manager overlay |
| `components/reflections/RoundsHistoryTable.tsx` | Create | History table with View links |
| `app/(app)/reflections/page.tsx` | Create | /reflections server page |
| `app/(app)/reflections/[id]/page.tsx` | Create | /reflections/[id] server page |
| `components/dashboard/DashboardResults.tsx` | Modify | Replace ScheduleWidget with ActiveRoundCard; update props |
| `app/(app)/dashboard/page.tsx` | Modify | Remove getScheduledRound; compute scoredPillarCount/nextRoundTitle |
| `app/(app)/dashboard/actions.ts` | Delete | ScheduleWidget server actions — no longer needed |
| `components/app/Sidebar.tsx` | Modify | Add Reflections nav item |
| `components/app/ScheduleWidget.tsx` | Delete | Replaced by ActiveRoundCard |
| `__tests__/lib/db/rounds.test.ts` | Create | Tests for createRound and getRoundById |
| `__tests__/lib/db/manager-scores.test.ts` | Create | Tests for getManagerScoresForAllRounds |
| `__tests__/lib/reflections.test.ts` | Create | Tests for nextRoundTitle, computeTrendData, computeStats |
| `__tests__/components/reflections/CreateRoundModal.test.tsx` | Create | Modal renders, pre-fills title, calls action |
| `__tests__/components/reflections/ActiveRoundCard.test.tsx` | Create | Active state vs empty state |
| `__tests__/components/reflections/ReflectionsTrendChart.test.tsx` | Create | Empty data, one round, manager overlay |
| `__tests__/components/reflections/RoundsHistoryTable.test.tsx` | Create | Rows, View links |
| `__tests__/app/dashboard/page.test.tsx` | Modify | Remove scheduled-rounds mock; add reflections mocks |
| `__tests__/components/app/ScheduleWidget.test.tsx` | Delete | Component deleted |

---

## Task 1: Baseline

**Files:** (no changes)

- [ ] **Run the test suite and confirm it is green**

```bash
npm test -- --run
```

Expected: all tests pass. Note the count. If any test is already failing, stop and fix it before proceeding.

- [ ] **Verify you are on the correct branch**

```bash
git branch --show-current
```

Expected: `feat/reflections-page`

---

## Task 2: DB Migration

**Files:**
- Create: `supabase/migrations/20260521000001_reflections_round_metadata.sql`

- [ ] **Write the migration**

```sql
-- supabase/migrations/20260521000001_reflections_round_metadata.sql
ALTER TABLE assessment_rounds
  ADD COLUMN title     TEXT,
  ADD COLUMN notes     TEXT,
  ADD COLUMN remind_at DATE;

UPDATE assessment_rounds
SET title = CONCAT(
  'Q', EXTRACT(QUARTER FROM created_at)::int,
  ' ', EXTRACT(YEAR FROM created_at)::int
)
WHERE title IS NULL;
```

- [ ] **Run the migration against your local Supabase project** (or note it for remote application — skip if running against remote only)

- [ ] **Commit**

```bash
git add supabase/migrations/20260521000001_reflections_round_metadata.sql
git commit -m "chore: add title/notes/remind_at columns to assessment_rounds"
```

---

## Task 3: Round type + createRound + getRoundById

**Files:**
- Modify: `lib/db/rounds.ts`
- Create: `__tests__/lib/db/rounds.test.ts`

- [ ] **Write the failing tests**

```ts
// __tests__/lib/db/rounds.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle })
const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

const mockMaybeSingle = vi.fn()
const mockEqUserId = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUserId })
const mockSelectStar = vi.fn().mockReturnValue({ eq: mockEqId })

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('createRound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockSingle })
  })

  it('inserts a new round and returns it', async () => {
    const round = {
      id: 'r-1',
      user_id: 'u-1',
      status: 'in_progress',
      created_at: '2026-05-21T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: 'Focus on coaching',
      remind_at: '2026-08-01',
    }
    mockSingle.mockResolvedValue({ data: round, error: null })

    const { createRound } = await import('@/lib/db/rounds')
    const result = await createRound('u-1', 'Q2 2026', 'Focus on coaching', '2026-08-01')

    expect(mockFrom).toHaveBeenCalledWith('assessment_rounds')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u-1',
      status: 'in_progress',
      title: 'Q2 2026',
      notes: 'Focus on coaching',
      remind_at: '2026-08-01',
    })
    expect(result).toEqual(round)
  })

  it('accepts null for optional fields', async () => {
    const round = {
      id: 'r-2',
      user_id: 'u-1',
      status: 'in_progress',
      created_at: '2026-05-21T00:00:00Z',
      completed_at: null,
      title: 'Q2 2026',
      notes: null,
      remind_at: null,
    }
    mockSingle.mockResolvedValue({ data: round, error: null })

    const { createRound } = await import('@/lib/db/rounds')
    const result = await createRound('u-1', 'Q2 2026', null, null)
    expect(result.notes).toBeNull()
    expect(result.remind_at).toBeNull()
  })

  it('throws when insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { createRound } = await import('@/lib/db/rounds')
    await expect(createRound('u-1', 'Q2 2026', null, null)).rejects.toEqual({ message: 'DB error' })
  })
})

describe('getRoundById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelectStar })
    mockSelectStar.mockReturnValue({ eq: mockEqId })
    mockEqId.mockReturnValue({ eq: mockEqUserId })
    mockEqUserId.mockReturnValue({ maybeSingle: mockMaybeSingle })
  })

  it('returns the round when user_id matches', async () => {
    const round = {
      id: 'r-1',
      user_id: 'u-1',
      status: 'complete',
      created_at: '2026-01-01T00:00:00Z',
      completed_at: '2026-03-31T00:00:00Z',
      title: 'Q1 2026',
      notes: null,
      remind_at: null,
    }
    mockMaybeSingle.mockResolvedValue({ data: round })
    const { getRoundById } = await import('@/lib/db/rounds')
    const result = await getRoundById('r-1', 'u-1')
    expect(result).toEqual(round)
    expect(mockEqId).toHaveBeenCalledWith('id', 'r-1')
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'u-1')
  })

  it('returns null when no matching round exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    const { getRoundById } = await import('@/lib/db/rounds')
    const result = await getRoundById('r-99', 'u-1')
    expect(result).toBeNull()
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/lib/db/rounds.test.ts
```

Expected: FAIL (createRound and getRoundById not defined)

- [ ] **Implement the changes in `lib/db/rounds.ts`**

Add `title`, `notes`, and `remind_at` to the `Round` interface, and add the two new functions at the bottom of the file:

```ts
// Updated Round interface (replace the existing one at the top of the file)
export interface Round {
  id: string
  user_id: string
  status: 'in_progress' | 'complete'
  created_at: string
  completed_at: string | null
  title: string | null
  notes: string | null
  remind_at: string | null
}
```

```ts
// Add at the bottom of lib/db/rounds.ts

export async function createRound(
  userId: string,
  title: string,
  notes: string | null,
  remindAt: string | null
): Promise<Round> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assessment_rounds')
    .insert({ user_id: userId, status: 'in_progress', title, notes, remind_at: remindAt })
    .select()
    .single()
  if (error) throw error
  return data as Round
}

export async function getRoundById(roundId: string, userId: string): Promise<Round | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assessment_rounds')
    .select('*')
    .eq('id', roundId)
    .eq('user_id', userId)
    .maybeSingle()
  return data as Round | null
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/lib/db/rounds.test.ts
```

Expected: all tests pass.

- [ ] **Run the full test suite to confirm no regressions**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add lib/db/rounds.ts __tests__/lib/db/rounds.test.ts
git commit -m "feat: extend Round type and add createRound/getRoundById"
```

---

## Task 4: getManagerScoresForAllRounds

**Files:**
- Modify: `lib/db/manager-scores.ts`
- Create: `__tests__/lib/db/manager-scores.test.ts`

- [ ] **Write the failing test**

```ts
// __tests__/lib/db/manager-scores.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIn = vi.fn()
const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}))

describe('getManagerScoresForAllRounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ in: mockIn })
  })

  it('returns scores grouped by round_id', async () => {
    const rows = [
      { id: 'ms-1', round_id: 'r-1', manager_id: 'm-1', skill_key: 'self-resilience', level: 'Proficient', scored_at: '2026-01-01' },
      { id: 'ms-2', round_id: 'r-1', manager_id: 'm-1', skill_key: 'team-accountability', level: 'Advanced', scored_at: '2026-01-01' },
      { id: 'ms-3', round_id: 'r-2', manager_id: 'm-1', skill_key: 'self-resilience', level: 'Expert', scored_at: '2026-04-01' },
    ]
    mockIn.mockResolvedValue({ data: rows, error: null })

    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds(['r-1', 'r-2'])

    expect(mockFrom).toHaveBeenCalledWith('manager_scores')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockIn).toHaveBeenCalledWith('round_id', ['r-1', 'r-2'])
    expect(result['r-1']).toHaveLength(2)
    expect(result['r-2']).toHaveLength(1)
    expect(result['r-2'][0].level).toBe('Expert')
  })

  it('returns empty record when given empty round list', async () => {
    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds([])
    expect(result).toEqual({})
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty record on error', async () => {
    mockIn.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { getManagerScoresForAllRounds } = await import('@/lib/db/manager-scores')
    const result = await getManagerScoresForAllRounds(['r-1'])
    expect(result).toEqual({})
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/lib/db/manager-scores.test.ts
```

Expected: FAIL (getManagerScoresForAllRounds not defined)

- [ ] **Add the function to `lib/db/manager-scores.ts`**

Add at the bottom of the file:

```ts
export async function getManagerScoresForAllRounds(
  roundIds: string[]
): Promise<Record<string, ManagerScore[]>> {
  if (roundIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('manager_scores')
    .select('*')
    .in('round_id', roundIds)
  if (error) return {}
  const result: Record<string, ManagerScore[]> = {}
  for (const score of (data ?? []) as ManagerScore[]) {
    const bucket = result[score.round_id] ?? []
    bucket.push(score)
    result[score.round_id] = bucket
  }
  return result
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/lib/db/manager-scores.test.ts
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add lib/db/manager-scores.ts __tests__/lib/db/manager-scores.test.ts
git commit -m "feat: add getManagerScoresForAllRounds"
```

---

## Task 5: lib/reflections.ts utilities

**Files:**
- Create: `lib/reflections.ts`
- Create: `__tests__/lib/reflections.test.ts`

- [ ] **Write the failing tests**

```ts
// __tests__/lib/reflections.test.ts
import { describe, it, expect } from 'vitest'
import {
  nextRoundTitle,
  roundLabel,
  computeTrendData,
  computeStats,
} from '@/lib/reflections'
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

function makeScore(roundId: string, pillar: string, skillKey: string, level: 'Developing' | 'Basic' | 'Proficient' | 'Advanced' | 'Expert'): Score {
  return { id: `s-${Math.random()}`, round_id: roundId, pillar, skill_key: skillKey, level, scored_at: '2026-03-01' }
}

function makeMgrScore(roundId: string, skillKey: string, level: 'Developing' | 'Basic' | 'Proficient' | 'Advanced' | 'Expert'): ManagerScore {
  return { id: `ms-${Math.random()}`, round_id: roundId, manager_id: 'm-1', skill_key: skillKey, level, scored_at: '2026-03-01' }
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
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/lib/reflections.test.ts
```

Expected: FAIL (module not found)

- [ ] **Create `lib/reflections.ts`**

```ts
import {
  PILLARS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { Score } from '@/lib/db/scores'
import type { ManagerScore } from '@/lib/db/manager-scores'

export interface TrendPoint {
  label: string
  overall: number
  self: number
  team: number
  strategy: number
  communications: number
  'domain-expertise': number
  mgr_overall?: number
  mgr_self?: number
  mgr_team?: number
  mgr_strategy?: number
  mgr_communications?: number
  'mgr_domain-expertise'?: number
}

export interface ReflectionStats {
  totalRounds: number
  improvement: number
  bestPillar: Pillar
  managerAvg: number | null
}

export function nextRoundTitle(date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

export function roundLabel(round: Round): string {
  if (round.title) return round.title
  const date = new Date(round.created_at)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

function pillarAvgFromScores(
  scores: Score[],
  pillar: string
): number {
  const ps = scores.filter(s => s.pillar === pillar)
  if (ps.length === 0) return 0
  return ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
}

function pillarAvgFromManagerScores(
  mgrScores: ManagerScore[],
  pillar: Pillar
): number | undefined {
  const skills = getSkillsByPillar(pillar)
  const relevant = mgrScores.filter(ms => skills.some(s => s.key === ms.skill_key))
  if (relevant.length === 0) return undefined
  return relevant.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / relevant.length
}

export function computeTrendData(
  roundsWithScores: { round: Round; scores: Score[] }[],
  managerScoresByRound: Record<string, ManagerScore[]>
): TrendPoint[] {
  return roundsWithScores.map(({ round, scores }) => {
    const mgrScores = managerScoresByRound[round.id] ?? []
    const hasMgr = mgrScores.length > 0

    const pillarSelf: Record<string, number> = {}
    const pillarMgr: Record<string, number | undefined> = {}

    for (const pillar of PILLARS) {
      pillarSelf[pillar] = pillarAvgFromScores(scores, pillar)
      if (hasMgr) pillarMgr[pillar] = pillarAvgFromManagerScores(mgrScores, pillar)
    }

    const overallSelf =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
        : 0

    const overallMgr = hasMgr
      ? mgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrScores.length
      : undefined

    const point: TrendPoint = {
      label: roundLabel(round),
      overall: Number(overallSelf.toFixed(2)),
      self: Number((pillarSelf['self'] ?? 0).toFixed(2)),
      team: Number((pillarSelf['team'] ?? 0).toFixed(2)),
      strategy: Number((pillarSelf['strategy'] ?? 0).toFixed(2)),
      communications: Number((pillarSelf['communications'] ?? 0).toFixed(2)),
      'domain-expertise': Number((pillarSelf['domain-expertise'] ?? 0).toFixed(2)),
    }

    if (overallMgr !== undefined) {
      point.mgr_overall = Number(overallMgr.toFixed(2))
      for (const pillar of PILLARS) {
        const avg = pillarMgr[pillar]
        if (avg !== undefined) {
          const key = `mgr_${pillar}` as keyof TrendPoint
          ;(point as Record<string, number>)[key] = Number(avg.toFixed(2))
        }
      }
    }

    return point
  })
}

export function computeStats(
  roundsWithScores: { round: Round; scores: Score[] }[],
  managerScoresByRound: Record<string, ManagerScore[]>
): ReflectionStats {
  if (roundsWithScores.length === 0) {
    return { totalRounds: 0, improvement: 0, bestPillar: 'self', managerAvg: null }
  }

  const overallByRound = roundsWithScores.map(({ scores }) =>
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0
  )

  const earliest = overallByRound[0]
  const latest = overallByRound[overallByRound.length - 1]
  const improvement = Number((latest - earliest).toFixed(2))

  const pillarTotals: Record<string, number> = {}
  const pillarCounts: Record<string, number> = {}
  for (const { scores } of roundsWithScores) {
    for (const pillar of PILLARS) {
      const ps = scores.filter(s => s.pillar === pillar)
      if (ps.length > 0) {
        const avg = ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
        pillarTotals[pillar] = (pillarTotals[pillar] ?? 0) + avg
        pillarCounts[pillar] = (pillarCounts[pillar] ?? 0) + 1
      }
    }
  }

  let bestPillar: Pillar = 'self'
  let bestAvg = -1
  for (const pillar of PILLARS) {
    const count = pillarCounts[pillar] ?? 0
    if (count > 0) {
      const avg = pillarTotals[pillar] / count
      if (avg > bestAvg) {
        bestAvg = avg
        bestPillar = pillar as Pillar
      }
    }
  }

  const allMgrScores = Object.values(managerScoresByRound).flat()
  const managerAvg =
    allMgrScores.length > 0
      ? Number(
          (
            allMgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
            allMgrScores.length
          ).toFixed(2)
        )
      : null

  return { totalRounds: roundsWithScores.length, improvement, bestPillar, managerAvg }
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/lib/reflections.test.ts
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add lib/reflections.ts __tests__/lib/reflections.test.ts
git commit -m "feat: add lib/reflections.ts utilities (nextRoundTitle, computeTrendData, computeStats)"
```

---

## Task 6: createRoundAction server action

**Files:**
- Create: `app/(app)/reflections/actions.ts`

No test for server actions (they redirect; testing is covered by the component that calls them).

- [ ] **Create the directory and server action**

```ts
// app/(app)/reflections/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRound } from '@/lib/db/rounds'

export async function createRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string) || 'Reflection'
  const notes = (formData.get('notes') as string) || null
  const remindAt = (formData.get('remind_at') as string) || null

  await createRound(user.id, title, notes, remindAt)
  redirect('/scorecard')
}
```

- [ ] **Run the full suite (no new tests, just confirm nothing broke)**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add app/\(app\)/reflections/actions.ts
git commit -m "feat: add createRoundAction server action"
```

---

## Task 7: CreateRoundModal

**Files:**
- Create: `components/reflections/CreateRoundModal.tsx`
- Create: `__tests__/components/reflections/CreateRoundModal.test.tsx`

- [ ] **Write the failing tests**

```tsx
// __tests__/components/reflections/CreateRoundModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateRoundModal } from '@/components/reflections/CreateRoundModal'

const mockCreateRoundAction = vi.fn()

vi.mock('@/app/(app)/reflections/actions', () => ({
  createRoundAction: (...args: unknown[]) => mockCreateRoundAction(...args),
}))

describe('CreateRoundModal', () => {
  beforeEach(() => {
    mockCreateRoundAction.mockReset()
  })

  it('does not render when open is false', () => {
    render(
      <CreateRoundModal
        open={false}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the modal with a dialog role when open', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('pre-fills the title input with defaultTitle', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q3 2026"
      />
    )
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toHaveValue('Q3 2026')
  })

  it('renders optional fields: remind_at and notes', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByLabelText(/remind me by/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/intention/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <CreateRoundModal
        open={true}
        onClose={onClose}
        defaultTitle="Q2 2026"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders a submit button with text "Start reflection"', () => {
    render(
      <CreateRoundModal
        open={true}
        onClose={() => {}}
        defaultTitle="Q2 2026"
      />
    )
    expect(screen.getByRole('button', { name: /start reflection/i })).toBeInTheDocument()
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/components/reflections/CreateRoundModal.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Create `components/reflections/CreateRoundModal.tsx`**

```tsx
'use client'
import { createRoundAction } from '@/app/(app)/reflections/actions'

interface CreateRoundModalProps {
  open: boolean
  onClose: () => void
  defaultTitle: string
}

export function CreateRoundModal({ open, onClose, defaultTitle }: CreateRoundModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start new reflection round"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 440,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
          Start a new reflection round
        </h2>

        <form action={createRoundAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-title"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Title
            </label>
            <input
              id="round-title"
              name="title"
              type="text"
              required
              defaultValue={defaultTitle}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-remind"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Remind me by
              <span style={{ fontWeight: 400, color: '#475569', marginLeft: 6 }}>(optional)</span>
            </label>
            <input
              id="round-remind"
              name="remind_at"
              type="date"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: '#475569' }}>
              Recurring reminders can be set in Profile → Notifications
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="round-notes"
              style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}
            >
              Intention
              <span style={{ fontWeight: 400, color: '#475569', marginLeft: 6 }}>(optional)</span>
            </label>
            <textarea
              id="round-notes"
              name="notes"
              rows={3}
              placeholder="What do you want to focus on this round?"
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#fff',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '10px 0',
                borderRadius: 8,
                background: '#f59e0b',
                color: '#1a2a3a',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Start reflection
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/components/reflections/CreateRoundModal.test.tsx
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add components/reflections/CreateRoundModal.tsx __tests__/components/reflections/CreateRoundModal.test.tsx
git commit -m "feat: add CreateRoundModal component"
```

---

## Task 8: ActiveRoundCard

**Files:**
- Create: `components/reflections/ActiveRoundCard.tsx`
- Create: `__tests__/components/reflections/ActiveRoundCard.test.tsx`

- [ ] **Write the failing tests**

```tsx
// __tests__/components/reflections/ActiveRoundCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import type { Round } from '@/lib/db/rounds'

vi.mock('@/components/reflections/CreateRoundModal', () => ({
  CreateRoundModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-round-modal" /> : null,
}))

const baseRound: Round = {
  id: 'r-1',
  user_id: 'u-1',
  status: 'in_progress',
  created_at: '2026-05-01T00:00:00Z',
  completed_at: null,
  title: 'Q2 2026',
  notes: null,
  remind_at: null,
}

describe('ActiveRoundCard — active state', () => {
  it('shows the round title', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={2}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
  })

  it('shows scored pillar count', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={3}
        nextRoundTitle="Q3 2026"
      />
    )
    expect(screen.getByText(/3 of 5/)).toBeInTheDocument()
  })

  it('links to /scorecard with "Continue"', () => {
    render(
      <ActiveRoundCard
        inProgressRound={baseRound}
        scoredPillarCount={2}
        nextRoundTitle="Q3 2026"
      />
    )
    const link = screen.getByRole('link', { name: /continue/i })
    expect(link).toHaveAttribute('href', '/scorecard')
  })
})

describe('ActiveRoundCard — empty state', () => {
  it('shows "Ready to reflect?" when no in-progress round', () => {
    render(
      <ActiveRoundCard
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle="Q2 2026"
      />
    )
    expect(screen.getByText(/ready to reflect/i)).toBeInTheDocument()
  })

  it('opens CreateRoundModal when the start button is clicked', () => {
    render(
      <ActiveRoundCard
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle="Q2 2026"
      />
    )
    expect(screen.queryByTestId('create-round-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByTestId('create-round-modal')).toBeInTheDocument()
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/components/reflections/ActiveRoundCard.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Create `components/reflections/ActiveRoundCard.tsx`**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CreateRoundModal } from './CreateRoundModal'
import type { Round } from '@/lib/db/rounds'

interface ActiveRoundCardProps {
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
}

export function ActiveRoundCard({
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
}: ActiveRoundCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const title = inProgressRound?.title ?? nextRoundTitle

  if (!inProgressRound) {
    return (
      <>
        <div
          className="rounded-xl px-5 py-4"
          style={{
            border: '2px dashed #334155',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <p className="mb-1 text-sm font-semibold text-white">Ready to reflect?</p>
          <p className="mb-3 text-xs text-slate-400">
            Start a new round to track your progress this quarter.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            aria-label={`Start ${nextRoundTitle}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f59e0b',
              color: '#1a2a3a',
              fontWeight: 700,
              fontSize: 12,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Start {nextRoundTitle} →
          </button>
        </div>
        <CreateRoundModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultTitle={nextRoundTitle}
        />
      </>
    )
  }

  const pct = (scoredPillarCount / 5) * 100

  return (
    <>
      <div
        className="rounded-xl px-5 py-4"
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-amber-400">{title}</p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.15)',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            In progress
          </span>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          {scoredPillarCount} of 5 pillars scored
        </p>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 2,
              background: '#f59e0b',
            }}
          />
        </div>
        <Link
          href="/scorecard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: '#f59e0b',
            textDecoration: 'none',
          }}
        >
          Continue →
        </Link>
      </div>
      <CreateRoundModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTitle={nextRoundTitle}
      />
    </>
  )
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/components/reflections/ActiveRoundCard.test.tsx
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add components/reflections/ActiveRoundCard.tsx __tests__/components/reflections/ActiveRoundCard.test.tsx
git commit -m "feat: add ActiveRoundCard component"
```

---

## Task 9: ReflectionsTrendChart

**Files:**
- Create: `components/reflections/ReflectionsTrendChart.tsx`
- Create: `__tests__/components/reflections/ReflectionsTrendChart.test.tsx`

- [ ] **Write the failing tests**

```tsx
// __tests__/components/reflections/ReflectionsTrendChart.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReflectionsTrendChart } from '@/components/reflections/ReflectionsTrendChart'
import type { TrendPoint } from '@/lib/reflections'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const mockPoints: TrendPoint[] = [
  {
    label: 'Q1 2026',
    overall: 2.8,
    self: 3.0,
    team: 2.5,
    strategy: 3.0,
    communications: 2.8,
    'domain-expertise': 2.7,
  },
  {
    label: 'Q2 2026',
    overall: 3.4,
    self: 3.5,
    team: 3.2,
    strategy: 3.5,
    communications: 3.4,
    'domain-expertise': 3.4,
    mgr_overall: 3.8,
    mgr_self: 4.0,
    mgr_team: 3.5,
    mgr_strategy: 3.8,
    mgr_communications: 3.8,
    'mgr_domain-expertise': 3.7,
  },
]

describe('ReflectionsTrendChart', () => {
  it('renders nothing when data is empty', () => {
    const { container } = render(<ReflectionsTrendChart data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the chart container when data has one or more points', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('shows the Overall tab selected by default', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    const overallTab = screen.getByRole('button', { name: /overall/i })
    expect(overallTab).toBeInTheDocument()
  })

  it('renders tab buttons for each pillar', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByRole('button', { name: /self/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /team/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /strategy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /comms/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expertise/i })).toBeInTheDocument()
  })

  it('renders the overall self line', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('line-overall')).toBeInTheDocument()
  })

  it('renders the manager overall line when mgr data is present', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    expect(screen.getByTestId('line-mgr_overall')).toBeInTheDocument()
  })

  it('switches to self lines when Self tab is clicked', () => {
    render(<ReflectionsTrendChart data={mockPoints} />)
    fireEvent.click(screen.getByRole('button', { name: /self/i }))
    expect(screen.getByTestId('line-self')).toBeInTheDocument()
    expect(screen.queryByTestId('line-overall')).not.toBeInTheDocument()
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/components/reflections/ReflectionsTrendChart.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Create `components/reflections/ReflectionsTrendChart.tsx`**

```tsx
'use client'
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendPoint } from '@/lib/reflections'

type Tab = 'overall' | 'self' | 'team' | 'strategy' | 'communications' | 'domain-expertise'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'self', label: 'Self' },
  { id: 'team', label: 'Team' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'communications', label: 'Comms' },
  { id: 'domain-expertise', label: 'Expertise' },
]

interface ReflectionsTrendChartProps {
  data: TrendPoint[]
}

export function ReflectionsTrendChart({ data }: ReflectionsTrendChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overall')

  if (data.length === 0) return null

  const hasMgr = data.some(p => p.mgr_overall !== undefined)
  const mgrKey = activeTab === 'domain-expertise' ? 'mgr_domain-expertise' : `mgr_${activeTab}`

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4">
      <p
        className="mb-3 text-xs text-slate-500"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Score history
      </p>

      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.06)',
              color: activeTab === tab.id ? '#1a2a3a' : '#94a3b8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#475569', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
          <Line
            type="monotone"
            dataKey={activeTab}
            name="You"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: '#f59e0b', r: 3 }}
          />
          {hasMgr && (
            <Line
              type="monotone"
              dataKey={mgrKey}
              name="Manager"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ fill: '#a78bfa', r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/components/reflections/ReflectionsTrendChart.test.tsx
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add components/reflections/ReflectionsTrendChart.tsx __tests__/components/reflections/ReflectionsTrendChart.test.tsx
git commit -m "feat: add ReflectionsTrendChart component"
```

---

## Task 10: RoundsHistoryTable

**Files:**
- Create: `components/reflections/RoundsHistoryTable.tsx`
- Create: `__tests__/components/reflections/RoundsHistoryTable.test.tsx`

- [ ] **Write the failing tests**

```tsx
// __tests__/components/reflections/RoundsHistoryTable.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'

const rows: RoundRow[] = [
  {
    id: 'r-2',
    title: 'Q2 2026',
    dateRange: 'Apr 2026 – Jun 2026',
    overallScore: 3.4,
    managerOverall: 3.8,
    pillarScores: { self: 3.5, team: 3.2, strategy: 3.5, communications: 3.4, 'domain-expertise': 3.4 },
    trend: 0.6,
  },
  {
    id: 'r-1',
    title: 'Q1 2026',
    dateRange: 'Jan 2026 – Mar 2026',
    overallScore: 2.8,
    managerOverall: null,
    pillarScores: { self: 3.0, team: 2.5, strategy: 3.0, communications: 2.8, 'domain-expertise': 2.7 },
    trend: null,
  },
]

describe('RoundsHistoryTable', () => {
  it('renders a row for each round', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
  })

  it('renders "View" links pointing to /reflections/[id]', () => {
    render(<RoundsHistoryTable rows={rows} />)
    const links = screen.getAllByRole('link', { name: /view/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/reflections/r-2')
    expect(links[1]).toHaveAttribute('href', '/reflections/r-1')
  })

  it('shows manager overall score when present', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('3.8')).toBeInTheDocument()
  })

  it('shows "—" for missing manager score', () => {
    render(<RoundsHistoryTable rows={rows} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows positive trend in green', () => {
    render(<RoundsHistoryTable rows={rows} />)
    expect(screen.getByText('+0.6')).toBeInTheDocument()
  })
})
```

- [ ] **Run the tests to verify they fail**

```bash
npm test -- --run __tests__/components/reflections/RoundsHistoryTable.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Create `components/reflections/RoundsHistoryTable.tsx`**

```tsx
import Link from 'next/link'
import type { Pillar } from '@/lib/skills'

export interface RoundRow {
  id: string
  title: string
  dateRange: string
  overallScore: number
  managerOverall: number | null
  pillarScores: Record<Pillar, number>
  trend: number | null
}

interface RoundsHistoryTableProps {
  rows: RoundRow[]
}

const PILLAR_COLS: { key: Pillar; label: string }[] = [
  { key: 'self', label: 'Self' },
  { key: 'team', label: 'Team' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'communications', label: 'Comms' },
  { key: 'domain-expertise', label: 'Domain' },
]

export function RoundsHistoryTable({ rows }: RoundsHistoryTableProps) {
  return (
    <div className="rounded-xl bg-slate-800 overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Round', 'Your score', 'Mgr score', ...PILLAR_COLS.map(c => c.label), 'Trend', ''].map(
              header => (
                <th
                  key={header}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    color: '#64748b',
                    fontWeight: 600,
                    borderBottom: '1px solid #1e293b',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                <p style={{ fontWeight: 600, color: '#fff' }}>{row.title}</p>
                <p style={{ color: '#475569', fontSize: 11 }}>{row.dateRange}</p>
              </td>
              <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>
                {row.overallScore.toFixed(1)}
              </td>
              <td style={{ padding: '10px 14px', color: '#a78bfa', fontWeight: 600 }}>
                {row.managerOverall !== null ? row.managerOverall.toFixed(1) : '—'}
              </td>
              {PILLAR_COLS.map(col => (
                <td key={col.key} style={{ padding: '10px 14px', color: '#94a3b8' }}>
                  {row.pillarScores[col.key].toFixed(1)}
                </td>
              ))}
              <td style={{ padding: '10px 14px' }}>
                {row.trend !== null ? (
                  <span
                    style={{
                      fontWeight: 700,
                      color: row.trend >= 0 ? '#4ade80' : '#f87171',
                    }}
                  >
                    {row.trend >= 0 ? '+' : ''}
                    {row.trend.toFixed(1)}
                  </span>
                ) : (
                  <span style={{ color: '#475569' }}>—</span>
                )}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <Link
                  href={`/reflections/${row.id}`}
                  style={{
                    color: '#64748b',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: 11,
                  }}
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Run the tests to verify they pass**

```bash
npm test -- --run __tests__/components/reflections/RoundsHistoryTable.test.tsx
```

Expected: all tests pass.

- [ ] **Run the full suite**

```bash
npm test -- --run
```

- [ ] **Commit**

```bash
git add components/reflections/RoundsHistoryTable.tsx __tests__/components/reflections/RoundsHistoryTable.test.tsx
git commit -m "feat: add RoundsHistoryTable component"
```

---

## Task 11: /reflections page

**Files:**
- Create: `app/(app)/reflections/page.tsx`

- [ ] **Create the page**

```tsx
// app/(app)/reflections/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { nextRoundTitle, roundLabel, computeTrendData, computeStats } from '@/lib/reflections'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import { ReflectionsTrendChart } from '@/components/reflections/ReflectionsTrendChart'
import { RoundsHistoryTable } from '@/components/reflections/RoundsHistoryTable'
import type { RoundRow } from '@/components/reflections/RoundsHistoryTable'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES, type Pillar, type Level } from '@/lib/skills'

export default async function ReflectionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [completeRoundsWithScores, inProgressRound] = await Promise.all([
    getAllCompleteRoundsWithScores(user.id),
    getInProgressRound(user.id),
  ])

  const inProgressScores = inProgressRound ? await getScoresForRound(inProgressRound.id) : []
  const scoredPillarCount = new Set(inProgressScores.map(s => s.pillar)).size

  const roundIds = completeRoundsWithScores.map(({ round }) => round.id)
  const managerScoresByRound = await getManagerScoresForAllRounds(roundIds)

  const trendData = computeTrendData(completeRoundsWithScores, managerScoresByRound)
  const stats = computeStats(completeRoundsWithScores, managerScoresByRound)
  const currentNextRoundTitle = nextRoundTitle()

  const rows: RoundRow[] = completeRoundsWithScores
    .slice()
    .reverse()
    .map(({ round, scores }, index, arr) => {
      const prevScores = index < arr.length - 1 ? arr[index + 1].scores : null

      const overallScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
          : 0

      const prevOverall = prevScores
        ? prevScores.length > 0
          ? prevScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / prevScores.length
          : 0
        : null

      const mgrScores = managerScoresByRound[round.id] ?? []
      const managerOverall =
        mgrScores.length > 0
          ? mgrScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrScores.length
          : null

      const pillarScores = Object.fromEntries(
        PILLARS.map(pillar => {
          const ps = scores.filter(s => s.pillar === pillar)
          const avg =
            ps.length > 0
              ? ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
              : 0
          return [pillar, Number(avg.toFixed(1))]
        })
      ) as Record<Pillar, number>

      const start = new Date(round.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
      const end = round.completed_at
        ? new Date(round.completed_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        : null

      return {
        id: round.id,
        title: roundLabel(round),
        dateRange: end ? `${start} – ${end}` : start,
        overallScore: Number(overallScore.toFixed(1)),
        managerOverall: managerOverall !== null ? Number(managerOverall.toFixed(1)) : null,
        pillarScores,
        trend: prevOverall !== null ? Number((overallScore - prevOverall).toFixed(1)) : null,
      }
    })

  const hasRounds = completeRoundsWithScores.length > 0

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
          }}
        >
          Reflections
        </h1>
      </div>

      {/* Active round card */}
      <ActiveRoundCard
        inProgressRound={inProgressRound}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={currentNextRoundTitle}
      />

      {/* Stats bar */}
      {hasRounds && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {[
            { label: 'Rounds completed', value: String(stats.totalRounds) },
            {
              label: 'Overall improvement',
              value: `${stats.improvement >= 0 ? '+' : ''}${stats.improvement.toFixed(1)}`,
              color: stats.improvement >= 0 ? '#4ade80' : '#f87171',
            },
            { label: 'Best pillar', value: PILLAR_LABELS[stats.bestPillar] },
            {
              label: 'Manager avg',
              value: stats.managerAvg !== null ? stats.managerAvg.toFixed(1) : '—',
              color: '#a78bfa',
            },
          ].map(card => (
            <div
              key={card.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: card.color ?? '#f59e0b',
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value}
              </p>
              <p style={{ fontSize: 11, color: '#475569' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      {hasRounds && <ReflectionsTrendChart data={trendData} />}

      {/* History table */}
      {hasRounds && <RoundsHistoryTable rows={rows} />}
    </div>
  )
}
```

- [ ] **Run the full suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/reflections/page.tsx
git commit -m "feat: add /reflections page"
```

---

## Task 12: /reflections/[id] page

**Files:**
- Create: `app/(app)/reflections/[id]/page.tsx`

- [ ] **Create the page**

```tsx
// app/(app)/reflections/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRoundById } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { roundLabel } from '@/lib/reflections'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES, LEVEL_COLORS, type Pillar, type Level } from '@/lib/skills'

export default async function ReflectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getRoundById(id, user.id)
  if (!round) notFound()

  const [scores, managerScores] = await Promise.all([
    getScoresForRound(round.id),
    getManagerScoresForDirectReport(round.id),
  ])

  const hasManagerScores = managerScores.length > 0

  const pillarScoresForRadar = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const selfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      selfScores.length > 0
        ? selfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / selfScores.length
        : 0

    const mgrPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      mgrPillarScores.length > 0
        ? mgrPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
          mgrPillarScores.length
        : undefined

    return { pillar: pillar as Pillar, selfScore: selfAvg, managerScore: managerAvg }
  })

  const title = roundLabel(round)
  const startDate = new Date(round.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    day: 'numeric',
  })
  const endDate = round.completed_at
    ? new Date(round.completed_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        day: 'numeric',
      })
    : null

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb */}
      <Link
        href="/reflections"
        style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        ← Reflections
      </Link>

      {/* Round header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
          }}
        >
          {title}
        </h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderRadius: 6,
            padding: '3px 8px',
            background:
              round.status === 'complete'
                ? 'rgba(74,222,128,0.1)'
                : 'rgba(245,158,11,0.1)',
            color: round.status === 'complete' ? '#4ade80' : '#f59e0b',
          }}
        >
          {round.status === 'complete' ? 'Completed' : 'In progress'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#475569', marginTop: -16 }}>
        {startDate}
        {endDate && ` – ${endDate}`}
      </p>

      {round.notes && (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Intention
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{round.notes}</p>
        </div>
      )}

      {/* Two-column: radar + pillar table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div>
          <ScorecardRadarChart
            pillarScores={pillarScoresForRadar}
            showManager={hasManagerScores}
          />
        </div>

        <div className="rounded-xl bg-slate-800 overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Pillar', 'Your score', 'Manager score', 'Gap'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      color: '#64748b',
                      fontWeight: 600,
                      borderBottom: '1px solid #1e293b',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pillarScoresForRadar.map(row => {
                const gap =
                  row.managerScore !== undefined
                    ? Number((row.managerScore - row.selfScore).toFixed(1))
                    : null
                return (
                  <tr
                    key={row.pillar}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>
                      {PILLAR_LABELS[row.pillar]}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>
                      {row.selfScore.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#a78bfa' }}>
                      {row.managerScore !== undefined ? row.managerScore.toFixed(1) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {gap !== null ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: gap >= 0 ? '#4ade80' : '#f87171',
                          }}
                        >
                          {gap >= 0 ? '+' : ''}
                          {gap}
                        </span>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Run the full suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Commit**

```bash
git add app/\(app\)/reflections/
git commit -m "feat: add /reflections/[id] detail page"
```

---

## Task 13: Dashboard changes

**Files:**
- Modify: `components/dashboard/DashboardResults.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Delete: `app/(app)/dashboard/actions.ts`
- Modify: `__tests__/app/dashboard/page.test.tsx`

- [ ] **Update `components/dashboard/DashboardResults.tsx`**

Replace the entire file content:

```tsx
// components/dashboard/DashboardResults.tsx
'use client'
import { useState, useCallback } from 'react'
import { RadarWithToggle } from '@/components/app/RadarWithToggle'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
import { ScoreSparkline } from '@/components/app/ScoreSparkline'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { Pillar } from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface DashboardResultsProps {
  pillarScoresForRadar: PillarScore[]
  hasManagerScores: boolean
  pillarsForAccordion: PillarData[]
  sparklineData: { date: string; score: number }[]
  historyData: HistoryPoint[]
  overallAvg: number
  roundDate: string
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
  plans: DevelopmentPlan[]
  overdueCount: number
}

export function DashboardResults({
  pillarScoresForRadar,
  hasManagerScores,
  pillarsForAccordion,
  sparklineData,
  historyData,
  overallAvg,
  roundDate,
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
  plans,
  overdueCount,
}: DashboardResultsProps) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)

  const handlePillarClick = useCallback((pillar: Pillar) => {
    setOpenPillar(pillar)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Three-column grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr_260px]">

        {/* Left: Radar + score + sparkline */}
        <aside className="flex flex-col gap-4">
          <RadarWithToggle
            pillarScores={pillarScoresForRadar}
            hasManagerScores={hasManagerScores}
            onPillarClick={handlePillarClick}
          />

          {/* Overall score chip */}
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          <ScoreSparkline data={sparklineData} />
        </aside>

        {/* Centre: Pillar accordion + history chart */}
        <main className="min-w-0 flex flex-col gap-4">
          <PillarAccordion
            pillars={pillarsForAccordion}
            openPillar={openPillar}
            onOpenChange={setOpenPillar}
          />
          <PillarHistoryChart data={historyData} />
        </main>

        {/* Right: Action cards */}
        <aside className="flex flex-col gap-4">
          <ActiveRoundCard
            inProgressRound={inProgressRound}
            scoredPillarCount={scoredPillarCount}
            nextRoundTitle={nextRoundTitle}
          />
          <GrowthSummaryCard plans={plans} />
          <CheckInNudgeCard overdueCount={overdueCount} />

          {!hasManagerScores && (
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: '#1e3a5f', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <p className="mb-1 text-sm font-semibold text-white">Invite your manager</p>
              <p className="mb-3 text-xs text-slate-400">
                They score you independently, then you compare.
              </p>
              <InviteManagerModal />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Update `app/(app)/dashboard/page.tsx`**

Remove `getScheduledRound` import and usage, add `nextRoundTitle` from `lib/reflections`, compute `scoredPillarCount` and pass new props to `DashboardResults`. Replace the `[managerScores, plans, scheduled, inProgress]` parallel fetch with `[managerScores, plans, inProgress]`. Remove `showStartNewRound` constant.

The key diff is:

1. Remove these imports:
   - `import { getScheduledRound } from '@/lib/db/scheduled-rounds'`
   - `import type { ScheduledRound } from '@/lib/db/scheduled-rounds'` (if present)

2. Add this import:
   ```ts
   import { nextRoundTitle as computeNextRoundTitle } from '@/lib/reflections'
   ```

3. Change the parallel fetch from:
   ```ts
   const [managerScores, plans, scheduled, inProgress] = await Promise.all([
     getManagerScoresForDirectReport(round.id),
     getPlansForUser(user.id),
     getScheduledRound(user.id),
     getInProgressRound(user.id),
   ])
   ```
   to:
   ```ts
   const [managerScores, plans, inProgress] = await Promise.all([
     getManagerScoresForDirectReport(round.id),
     getPlansForUser(user.id),
     getInProgressRound(user.id),
   ])
   ```

4. Remove `const showStartNewRound = true`

5. Add after `const inProgressScores = ...`:
   ```ts
   const scoredPillarCount = new Set(inProgressScores.map(s => s.pillar)).size
   const currentNextRoundTitle = computeNextRoundTitle()
   ```

6. Update the `DashboardResults` call:
   - Remove: `scheduled={scheduled}`, `showStartNewRound={showStartNewRound}`, `hasInProgressRound={hasInProgressRound}`
   - Add: `inProgressRound={inProgress}`, `scoredPillarCount={scoredPillarCount}`, `nextRoundTitle={currentNextRoundTitle}`

The full updated file (complete replacement to avoid ambiguity):

```tsx
// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lightbulb, Search, TrendingUp, MessageSquare, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardTour } from '@/components/dashboard/DashboardTour'
import { getAllCompleteRoundsWithScores, getInProgressRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { getManagerScoresForDirectReport } from '@/lib/db/manager-scores'
import { getPlansForUser } from '@/lib/db/development-plans'
import {
  PILLARS,
  PILLAR_LABELS,
  getSkillsByPillar,
  LEVEL_VALUES,
  type Pillar,
  type Level,
} from '@/lib/skills'
import { nextRoundTitle as computeNextRoundTitle } from '@/lib/reflections'
import { DashboardResults } from '@/components/dashboard/DashboardResults'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

const BENEFIT_STRIPS: Array<{ Icon: LucideIcon; title: string; desc: string }> = [
  {
    Icon: Lightbulb,
    title: 'See exactly where you stand',
    desc: 'A radar across all five pillars shows your strengths and gaps at a glance.',
  },
  {
    Icon: Search,
    title: 'Know where to focus first',
    desc: "Your lowest pillar is flagged automatically so you're never guessing what to work on.",
  },
  {
    Icon: TrendingUp,
    title: 'Track growth round to round',
    desc: 'Rescore yourself every few months and watch your progress trend over time.',
  },
  {
    Icon: MessageSquare,
    title: 'A ready-made discussion starter with your manager',
    desc: 'Share your scorecard snapshot — a structured starting point for a real conversation.',
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allRoundsWithScores = await getAllCompleteRoundsWithScores(user.id)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (allRoundsWithScores.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* CTA area */}
        <div style={{ padding: '40px 36px 0' }}>
          <DashboardTour />

          <div style={{ marginBottom: 36 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 12,
              }}
            >
              Your manager scorecard
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: '#fff',
                marginBottom: 12,
                fontFamily: 'var(--font-display)',
              }}
            >
              You&apos;re one short reflection away from{' '}
              <em style={{ color: '#f59e0b', fontStyle: 'normal' }}>real clarity.</em>
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 480,
                marginBottom: 24,
              }}
            >
              Most managers guess at where they&apos;re strong and where they&apos;re not. Ten
              minutes of honest self-assessment across five pillars gives you a structured picture
              — and something concrete to bring to your next 1:1.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link
                id="dashboard-cta-btn"
                href="/scorecard"
                className="hover:opacity-90 active:opacity-80"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f59e0b',
                  color: '#1a2a3a',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '12px 22px',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                Start your scorecard →
              </Link>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                ~10 minutes · no right answers
              </span>
            </div>
          </div>
        </div>

        {/* Benefit strips */}
        <div style={{ padding: '0 36px 40px' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              marginBottom: 14,
            }}
          >
            What you&apos;ll unlock
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {BENEFIT_STRIPS.map(strip => (
              <div
                key={strip.title}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strip.Icon size={16} color="#f59e0b" strokeWidth={1.5} />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    marginBottom: 5,
                    lineHeight: 1.3,
                  }}
                >
                  {strip.title}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
                  {strip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Latest round ─────────────────────────────────────────────────────────────
  const { round, scores } = allRoundsWithScores[allRoundsWithScores.length - 1]

  // ── Parallel data fetch ───────────────────────────────────────────────────────
  const [managerScores, plans, inProgress] = await Promise.all([
    getManagerScoresForDirectReport(round.id),
    getPlansForUser(user.id),
    getInProgressRound(user.id),
  ])

  const hasManagerScores = managerScores.length > 0

  const overdueCheckins = plans.filter(p => {
    if (p.status === 'completed' || !p.checkin_frequency_weeks) return false
    const base = p.last_checkin_at ? new Date(p.last_checkin_at) : new Date(p.created_at)
    const nextDue = new Date(base.getTime() + p.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
    return nextDue < new Date()
  })

  // ── Overall score ─────────────────────────────────────────────────────────────
  const overallAvg =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
      : 0

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  // ── Pillar data for radar ─────────────────────────────────────────────────────
  const activePlanKeys = new Set(
    plans.filter(p => p.status === 'planned' || p.status === 'in_progress').map(p => p.skill_key)
  )
  const planGoalByKey = Object.fromEntries(
    plans.filter(p => p.status !== 'completed').map(p => [p.skill_key, p.goal])
  )

  const pillarScoresForRadar = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg =
      pillarSelfScores.length > 0
        ? pillarSelfScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) /
          pillarSelfScores.length
        : 0

    const managerPillarScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      managerPillarScores.length > 0
        ? managerPillarScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) /
          managerPillarScores.length
        : undefined

    return { pillar: pillar as Pillar, selfScore: selfAvg, managerScore: managerAvg }
  })

  const pillarScoreMap = Object.fromEntries(
    pillarScoresForRadar.map(p => [p.pillar, p.selfScore])
  )
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  // ── Previous round pillar scores (for delta badges) ───────────────────────────
  const prevRoundData =
    allRoundsWithScores.length >= 2
      ? allRoundsWithScores[allRoundsWithScores.length - 2]
      : null

  const prevPillarScoreMap: Record<string, number> | null = prevRoundData
    ? Object.fromEntries(
        PILLARS.map(pillar => {
          const ps = prevRoundData.scores.filter(s => s.pillar === pillar)
          const avg =
            ps.length > 0
              ? ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
              : 0
          return [pillar, avg]
        })
      )
    : null

  // ── Pillar accordion data ─────────────────────────────────────────────────────
  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      prevScore: prevPillarScoreMap?.[pillar],
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const score = LEVEL_VALUES[level]
        const hasActiveGoal = activePlanKeys.has(skill.key)
        let chipType: 'opportunity' | 'goal' | null = null
        if (hasActiveGoal) chipType = 'goal'
        else if (score <= 2) chipType = 'opportunity'
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score,
          chipType,
          goalText: hasActiveGoal ? planGoalByKey[skill.key] : undefined,
        }
      }),
    }
  })

  // ── Sparkline data ────────────────────────────────────────────────────────────
  const sparklineData = allRoundsWithScores.map(({ round: r, scores: s }) => {
    const avg =
      s.length > 0
        ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
        : 0
    return {
      date: new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      score: Number(avg.toFixed(2)),
    }
  })

  // ── History chart data ────────────────────────────────────────────────────────
  const historyData: HistoryPoint[] = allRoundsWithScores.map(({ round: r, scores: s }) => {
    const date = new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
    const overall =
      s.length > 0
        ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
        : 0
    const pillarEntries = PILLARS.map(pillar => {
      const ps = s.filter(sc => sc.pillar === pillar)
      const avg =
        ps.length > 0
          ? ps.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / ps.length
          : 0
      return [pillar, Number(avg.toFixed(2))]
    })
    return {
      date,
      overall: Number(overall.toFixed(2)),
      ...Object.fromEntries(pillarEntries),
    } as HistoryPoint
  })

  const inProgressScores = inProgress ? await getScoresForRound(inProgress.id) : []
  const scoredPillarCount = new Set(inProgressScores.map(s => s.pillar)).size
  const currentNextRoundTitle = computeNextRoundTitle()

  return (
    <div className="p-6">
      <DashboardResults
        pillarScoresForRadar={pillarScoresForRadar}
        hasManagerScores={hasManagerScores}
        pillarsForAccordion={pillarsForAccordion}
        sparklineData={sparklineData}
        historyData={historyData}
        overallAvg={overallAvg}
        roundDate={roundDate}
        inProgressRound={inProgress}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={currentNextRoundTitle}
        plans={plans}
        overdueCount={overdueCheckins.length}
      />
    </div>
  )
}
```

- [ ] **Update `__tests__/app/dashboard/page.test.tsx`**

Replace the existing file content:

```tsx
// __tests__/app/dashboard/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  }),
}))

vi.mock('@/lib/db/rounds', () => ({
  getAllCompleteRoundsWithScores: vi.fn().mockResolvedValue([]),
  getInProgressRound: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForDirectReport: vi.fn().mockResolvedValue([]),
  getManagerScoresForAllRounds: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/db/development-plans', () => ({
  getPlansForUser: vi.fn().mockResolvedValue([]),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

vi.mock('driver.js', () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}))
vi.mock('driver.js/dist/driver.css', () => ({}))

describe('DashboardPage — empty state', () => {
  it('renders the headline', async () => {
    render(await DashboardPage())
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })

  it('empty-state h1 uses the display font CSS variable', async () => {
    render(await DashboardPage())
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.style.fontFamily).toBe('var(--font-display)')
  })
})
```

- [ ] **Delete `app/(app)/dashboard/actions.ts`**

```bash
rm app/\(app\)/dashboard/actions.ts
```

- [ ] **Run the full suite**

```bash
npm test -- --run
```

Expected: all tests pass. The `ScheduleWidget.test.tsx` tests will fail (that file still references `dashboard/actions` which is now gone) — this is expected and will be resolved in Task 14.

- [ ] **Commit (with all dashboard changes)**

```bash
git add components/dashboard/DashboardResults.tsx app/\(app\)/dashboard/page.tsx __tests__/app/dashboard/page.test.tsx
git rm app/\(app\)/dashboard/actions.ts
git commit -m "feat: replace ScheduleWidget with ActiveRoundCard on dashboard"
```

---

## Task 14: Sidebar + cleanup

**Files:**
- Modify: `components/app/Sidebar.tsx`
- Delete: `components/app/ScheduleWidget.tsx`
- Delete: `__tests__/components/app/ScheduleWidget.test.tsx`

- [ ] **Update `components/app/Sidebar.tsx`**

Add `History` to the lucide-react import and insert the Reflections item between Growth and Team & Org:

```tsx
// components/app/Sidebar.tsx
'use client'
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Network,
  Users,
  ScrollText,
  Building2,
} from 'lucide-react'
import { NavItem } from './NavItem'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { href: '/growth', icon: TrendingUp, label: 'Growth', id: 'nav-growth' },
  { href: '/reflections', icon: History, label: 'Reflections', id: 'nav-reflections' },
  { href: '/people', icon: Network, label: 'Team & Org', id: 'nav-people' },
] as const
```

(Keep the rest of the file unchanged from line 17 onwards.)

- [ ] **Delete `components/app/ScheduleWidget.tsx` and its test**

```bash
git rm components/app/ScheduleWidget.tsx
git rm __tests__/components/app/ScheduleWidget.test.tsx
```

- [ ] **Run the full suite**

```bash
npm test -- --run
```

Expected: all tests pass with no references to ScheduleWidget remaining.

- [ ] **Confirm no remaining references to deleted files**

```bash
grep -r "ScheduleWidget\|setScheduledRoundAction\|cancelScheduledRoundAction\|getScheduledRound\|scheduled-rounds" --include="*.ts" --include="*.tsx" . | grep -v "node_modules" | grep -v ".next" | grep -v "supabase/migrations"
```

Expected: no output (or only migration files). If any output appears, fix the references before committing.

- [ ] **Commit**

```bash
git add components/app/Sidebar.tsx
git commit -m "feat: add Reflections to sidebar; delete ScheduleWidget and its actions"
```

---

## Final verification

- [ ] **Run the full test suite one last time**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Check git status for unintended files**

```bash
git status
```

Expected: working tree clean (or only untracked files you intentionally left out).

- [ ] **Review the diff since master**

```bash
git diff master..HEAD --stat
```

Review the file list. Confirm: no generated artifacts, no `.env` files, no `dist/`, no `coverage/`.
