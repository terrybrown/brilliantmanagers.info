# Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface manager scores throughout the self-assessment dashboard (left column, pillar accordion, interactive history chart) and add a manager-accessible read-only DR view page.

**Architecture:** Extend existing `PillarData`/`SkillData` types with optional manager fields, plumb manager data from the dashboard server component into all client components, replace the static `PillarHistoryChart` with an interactive version, and add a new `/dr/[userId]` route that renders `DashboardResults` in read-only mode with the DR's data.

**Tech Stack:** Next.js 15 App Router, Supabase, Recharts, Tailwind CSS v4, Vitest + Testing Library

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `middleware.ts` | Modify | Add `/dr` to `APP_ROUTES` |
| `components/app/PillarAccordion.tsx` | Modify | Extend interfaces; Mgr pill; all-skills section; You/Mgr badges |
| `components/dashboard/DashboardResults.tsx` | Modify | Remove sparkline; manager score box; `isReadOnly` prop |
| `app/(app)/dashboard/page.tsx` | Modify | Compute manager data; build manager history; update props |
| `components/app/PillarHistoryChart.tsx` | Modify | Extend `HistoryPoint`; interactive toggles; manager lines |
| `components/dashboard/ManagerStrip.tsx` | Modify | Complete cards link to `/dr/[userId]` |
| `app/(app)/dr/[userId]/page.tsx` | **Create** | DR view for managers |
| `__tests__/components/app/PillarAccordion.test.tsx` | **Create** | New component tests |
| `__tests__/components/dashboard/DashboardResults.test.tsx` | **Create** | New component tests |
| `__tests__/components/app/PillarHistoryChart.test.tsx` | **Create** | New component tests |
| `__tests__/components/dashboard/ManagerStrip.test.tsx` | Modify | Update complete-card test |
| `__tests__/app/dashboard/page.test.tsx` | Modify | Cover `overallManagerAvg` prop |
| `__tests__/app/(app)/dr/page.test.tsx` | **Create** | DR view page tests |

---

## Task 1: Add `/dr` to middleware APP_ROUTES

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add the route**

In `middleware.ts`, add `'/dr'` to the `APP_ROUTES` array:

```ts
const APP_ROUTES = [
  '/dashboard',
  '/scorecard',
  '/results',
  '/manager',
  '/people',
  '/growth',
  '/reflections',
  '/profile',
  '/notifications',
  '/dr',
]
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all existing tests pass (no change in behaviour).

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /dr route in middleware"
```

---

## Task 2: Extend PillarData and SkillData interfaces

**Files:**
- Modify: `components/app/PillarAccordion.tsx` (interfaces only, no rendering change yet)

- [ ] **Step 1: Add optional fields to the interfaces**

In `components/app/PillarAccordion.tsx`, update `SkillData` and `PillarData`:

```ts
export interface SkillData {
  key: string
  name: string
  description: string
  level: Level
  score: number
  chipType: 'opportunity' | 'goal' | null
  goalText?: string
  managerLevel?: Level        // ← add
  managerScore?: number       // ← add
}

export interface PillarData {
  pillar: string
  label: string
  score: number
  isLowest: boolean
  skills: SkillData[]
  prevScore?: number
  managerScore?: number       // ← add
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all existing tests pass (interface additions are backward-compatible).

- [ ] **Step 3: Commit**

```bash
git add components/app/PillarAccordion.tsx
git commit -m "feat: add managerScore/managerLevel fields to PillarData and SkillData"
```

---

## Task 3: DashboardResults — remove sparkline, add manager score box, add isReadOnly

**Files:**
- Modify: `components/dashboard/DashboardResults.tsx`
- Create: `__tests__/components/dashboard/DashboardResults.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/dashboard/DashboardResults.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardResults } from '@/components/dashboard/DashboardResults'

vi.mock('@/components/app/ScorecardRadarChart', () => ({
  ScorecardRadarChart: () => <div data-testid="radar-chart" />,
}))
vi.mock('@/components/app/PillarAccordion', () => ({
  PillarAccordion: () => <div data-testid="pillar-accordion" />,
}))
vi.mock('@/components/app/PillarHistoryChart', () => ({
  PillarHistoryChart: () => <div data-testid="history-chart" />,
}))
vi.mock('@/components/reflections/ActiveRoundCard', () => ({
  ActiveRoundCard: () => <div data-testid="active-round-card" />,
}))
vi.mock('@/components/app/GrowthSummaryCard', () => ({
  GrowthSummaryCard: () => <div data-testid="growth-summary" />,
}))
vi.mock('@/components/app/CheckInNudgeCard', () => ({
  CheckInNudgeCard: () => <div data-testid="checkin-nudge" />,
}))
vi.mock('@/components/people/InviteManagerModal', () => ({
  InviteManagerModal: () => <div data-testid="invite-manager" />,
}))
vi.mock('@/components/app/ScoreSparkline', () => ({
  ScoreSparkline: () => <div data-testid="score-sparkline" />,
}))

const BASE: Parameters<typeof DashboardResults>[0] = {
  pillarScoresForRadar: [],
  hasManagerScores: false,
  pillarsForAccordion: [],
  historyData: [],
  overallAvg: 3.5,
  roundDate: 'May 2026',
  inProgressRound: null,
  scoredPillarCount: 0,
  nextRoundTitle: 'Q3 2026',
  plans: [],
  overdueCount: 0,
}

describe('DashboardResults', () => {
  it('renders overall self score', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.getByText('3.5')).toBeInTheDocument()
    expect(screen.getByText('Overall score')).toBeInTheDocument()
  })

  it('shows manager score box when overallManagerAvg is provided', () => {
    render(<DashboardResults {...BASE} overallManagerAvg={3.2} />)
    expect(screen.getByText('3.2')).toBeInTheDocument()
    expect(screen.getByText('Manager score')).toBeInTheDocument()
  })

  it('hides manager score box when overallManagerAvg is undefined', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.queryByText('Manager score')).toBeNull()
  })

  it('does not render ScoreSparkline', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.queryByTestId('score-sparkline')).toBeNull()
  })

  it('hides action cards when isReadOnly is true', () => {
    render(<DashboardResults {...BASE} isReadOnly />)
    expect(screen.queryByTestId('active-round-card')).toBeNull()
    expect(screen.queryByTestId('growth-summary')).toBeNull()
    expect(screen.queryByTestId('checkin-nudge')).toBeNull()
  })

  it('shows action cards when isReadOnly is not set', () => {
    render(<DashboardResults {...BASE} />)
    expect(screen.getByTestId('active-round-card')).toBeInTheDocument()
    expect(screen.getByTestId('growth-summary')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|✓|✗|×)" | head -20
```

Expected: DashboardResults tests fail (component doesn't accept new props yet).

- [ ] **Step 3: Implement changes in DashboardResults**

Replace `components/dashboard/DashboardResults.tsx` with:

```tsx
'use client'
import { useState, useCallback } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { RadarPillarScore } from '@/lib/reflections'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import { ActiveRoundCard } from '@/components/reflections/ActiveRoundCard'
import { GrowthSummaryCard } from '@/components/app/GrowthSummaryCard'
import { CheckInNudgeCard } from '@/components/app/CheckInNudgeCard'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { Pillar } from '@/lib/skills'
import type { Round } from '@/lib/db/rounds'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

interface DashboardResultsProps {
  pillarScoresForRadar: RadarPillarScore[]
  hasManagerScores: boolean
  pillarsForAccordion: PillarData[]
  historyData: HistoryPoint[]
  overallAvg: number
  overallManagerAvg?: number
  roundDate: string
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
  plans: DevelopmentPlan[]
  overdueCount: number
  isReadOnly?: boolean
}

export function DashboardResults({
  pillarScoresForRadar,
  hasManagerScores,
  pillarsForAccordion,
  historyData,
  overallAvg,
  overallManagerAvg,
  roundDate,
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
  plans,
  overdueCount,
  isReadOnly = false,
}: DashboardResultsProps) {
  const [openPillar, setOpenPillar] = useState<string | null>(null)

  const handlePillarClick = useCallback((pillar: Pillar) => {
    setOpenPillar(pillar)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr_260px] lg:grid-cols-[320px_1fr_260px]">

        {/* Left: Radar + scores */}
        <aside className="flex flex-col gap-4">
          <ScorecardRadarChart
            pillarScores={pillarScoresForRadar}
            onPillarClick={handlePillarClick}
          />

          <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
            <p className="text-3xl font-bold text-amber-400">{overallAvg.toFixed(1)}</p>
            <p className="text-xs text-slate-400">Overall score</p>
            <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
          </div>

          {overallManagerAvg !== undefined && (
            <div className="rounded-xl bg-slate-800 px-4 py-3 text-center">
              <p className="text-3xl font-bold text-purple-400">{overallManagerAvg.toFixed(1)}</p>
              <p className="text-xs text-slate-400">Manager score</p>
              <p className="mt-0.5 text-xs text-slate-500">{roundDate}</p>
            </div>
          )}
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

        {/* Right: Action cards (hidden in read-only mode) */}
        {!isReadOnly && (
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
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all DashboardResults tests pass; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/DashboardResults.tsx __tests__/components/dashboard/DashboardResults.test.tsx
git commit -m "feat: DashboardResults — remove sparkline, manager score box, isReadOnly prop"
```

---

## Task 4: PillarAccordion — Mgr pill in collapsed header

**Files:**
- Modify: `components/app/PillarAccordion.tsx`
- Create: `__tests__/components/app/PillarAccordion.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/app/PillarAccordion.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PillarAccordion } from '@/components/app/PillarAccordion'
import type { PillarData } from '@/components/app/PillarAccordion'

const BASE_SKILL = {
  key: 'self-resilience',
  name: 'Resilience',
  description: 'How you handle pressure.',
  level: 'Proficient' as const,
  score: 3,
  chipType: null as null,
}

const BASE_PILLAR: PillarData = {
  pillar: 'self',
  label: 'Self',
  score: 3.2,
  isLowest: false,
  skills: [BASE_SKILL],
}

describe('PillarAccordion — collapsed header', () => {
  it('renders pillar name and score', () => {
    render(<PillarAccordion pillars={[BASE_PILLAR]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Self')).toBeInTheDocument()
    expect(screen.getByText('3.2')).toBeInTheDocument()
  })

  it('shows "Mgr X.X" pill when managerScore is provided', () => {
    const pillar = { ...BASE_PILLAR, managerScore: 2.8 }
    render(<PillarAccordion pillars={[pillar]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.getByText('Mgr 2.8')).toBeInTheDocument()
  })

  it('does not show Mgr pill when managerScore is undefined', () => {
    render(<PillarAccordion pillars={[BASE_PILLAR]} openPillar={null} onOpenChange={() => {}} />)
    expect(screen.queryByText(/^Mgr \d/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "Mgr" | head -10
```

Expected: the "Mgr X.X" pill tests fail.

- [ ] **Step 3: Add Mgr pill to the collapsed header**

In `components/app/PillarAccordion.tsx`, in the `<button>` header row, add the pill after the score span:

```tsx
{/* existing score span */}
<span className="w-8 text-right text-xs font-semibold text-amber-400">
  {pillar.score.toFixed(1)}
</span>

{/* NEW: manager pill */}
{pillar.managerScore !== undefined && (
  <span
    className="flex-shrink-0"
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: '#a78bfa',
      background: 'rgba(167,139,250,0.15)',
      padding: '2px 7px',
      borderRadius: 99,
    }}
  >
    Mgr {pillar.managerScore.toFixed(1)}
  </span>
)}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all PillarAccordion tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/app/PillarAccordion.tsx __tests__/components/app/PillarAccordion.test.tsx
git commit -m "feat: PillarAccordion — manager score pill in collapsed header"
```

---

## Task 5: PillarAccordion — all-skills section + You/Mgr badges in expanded detail

**Files:**
- Modify: `components/app/PillarAccordion.tsx`
- Modify: `__tests__/components/app/PillarAccordion.test.tsx`

- [ ] **Step 1: Add expanded-detail tests**

Append to `__tests__/components/app/PillarAccordion.test.tsx`:

```tsx
describe('PillarAccordion — expanded detail', () => {
  it('shows "All skills" section heading for chipType null skills', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('All skills')).toBeInTheDocument()
    expect(screen.getByText('Resilience')).toBeInTheDocument()
    expect(screen.getByText('How you handle pressure.')).toBeInTheDocument()
  })

  it('shows You score badge for every skill in the all-skills section', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getAllByText('You').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('shows Mgr score badge when managerLevel is provided', () => {
    const skill = { ...BASE_SKILL, managerLevel: 'Advanced' as const }
    const pillar = { ...BASE_PILLAR, skills: [skill] }
    render(
      <PillarAccordion pillars={[pillar]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('Mgr')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('omits Mgr badge when managerLevel is undefined', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    // "Mgr" as exact text only appears in skill rows; pillar header pill says "Mgr X.X"
    expect(screen.queryByText('Mgr')).toBeNull()
  })

  it('does not show action links for chipType null skills', () => {
    render(
      <PillarAccordion pillars={[BASE_PILLAR]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.queryByRole('link', { name: /make goal/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /in growth/i })).toBeNull()
  })

  it('shows Active Goals section for goal-type skills with action link', () => {
    const goalSkill = { ...BASE_SKILL, key: 'self-resilience-goal', chipType: 'goal' as const, goalText: 'Daily reflection' }
    const pillar = { ...BASE_PILLAR, skills: [goalSkill] }
    render(
      <PillarAccordion pillars={[pillar]} openPillar="self" onOpenChange={() => {}} />
    )
    expect(screen.getByText('Active Goals')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /in growth/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(All skills|You score|Mgr score)" | head -10
```

- [ ] **Step 3: Implement skill score badge component**

Define a shared badge component at the top of `PillarAccordion.tsx` (above the exported functions):

```tsx
function SkillScoreBadges({ level, managerLevel }: { level: Level; managerLevel?: Level }) {
  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
      <span className="flex items-center gap-1" style={{ fontSize: 10, color: '#94a3b8' }}>
        <span>You</span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.35)',
            color: LEVEL_COLORS[level],
          }}
        >
          {level}
        </span>
      </span>
      {managerLevel && (
        <span className="flex items-center gap-1" style={{ fontSize: 10, color: '#94a3b8' }}>
          <span>Mgr</span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 5px',
              borderRadius: 4,
              background: 'rgba(0,0,0,0.35)',
              color: LEVEL_COLORS[managerLevel],
            }}
          >
            {managerLevel}
          </span>
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Replace the expanded detail section**

In `PillarAccordion.tsx`, replace the entire `{isOpen && (...)}` block with:

```tsx
{isOpen && (
  <div className="mt-4 space-y-4">
    {goals.length > 0 && (
      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <Target size={13} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-semibold text-amber-400">Active Goals</span>
        </div>
        <div className="flex flex-col gap-2">
          {goals.map(skill => (
            <div key={skill.key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{skill.name}</p>
                {skill.goalText && (
                  <p className="mt-0.5 truncate text-xs text-slate-400">{skill.goalText}</p>
                )}
              </div>
              <SkillScoreBadges level={skill.level} managerLevel={skill.managerLevel} />
              <Link
                href="/growth"
                className="flex-shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                In Growth →
              </Link>
            </div>
          ))}
        </div>
      </section>
    )}

    {opportunities.length > 0 && (
      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <Lightbulb size={13} strokeWidth={1.75} style={{ color: '#a5b4fc' }} />
          <span className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>
            Opportunities
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {opportunities.map(skill => (
            <div key={skill.key} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{skill.name}</p>
                <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                  {skill.description}
                </p>
              </div>
              <SkillScoreBadges level={skill.level} managerLevel={skill.managerLevel} />
              <Link
                href={`/growth?skill=${skill.key}`}
                className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
              >
                Make goal →
              </Link>
            </div>
          ))}
        </div>
      </section>
    )}

    {(() => {
      const remaining = pillar.skills.filter(s => s.chipType === null)
      if (remaining.length === 0) return null
      return (
        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <span style={{ fontSize: 13 }}>📋</span>
            <span className="text-xs font-semibold" style={{ color: '#64748b' }}>
              All skills
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {remaining.map(skill => (
              <div key={skill.key} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{skill.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                    {skill.description}
                  </p>
                </div>
                <SkillScoreBadges level={skill.level} managerLevel={skill.managerLevel} />
              </div>
            ))}
          </div>
        </section>
      )
    })()}
  </div>
)}
```

- [ ] **Step 5: Remove the `SkillChip` import** (it's no longer used — the chip row stays, but the expanded section no longer uses it)

Check if `SkillChip` is still used anywhere in the file. The always-on chips row (`chipped.length > 0 && <div>...`) still uses `<SkillChip>`, so keep the import.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: all PillarAccordion tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/app/PillarAccordion.tsx __tests__/components/app/PillarAccordion.test.tsx
git commit -m "feat: PillarAccordion — all-skills section and You/Mgr score badges in expanded detail"
```

---

## Task 6: PillarHistoryChart — extend HistoryPoint, interactive toggles, manager lines

**Files:**
- Modify: `components/app/PillarHistoryChart.tsx`
- Create: `__tests__/components/app/PillarHistoryChart.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/app/PillarHistoryChart.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PillarHistoryChart } from '@/components/app/PillarHistoryChart'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

class MockResizeObserver {
  observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

const TWO_POINTS: HistoryPoint[] = [
  {
    date: 'Jan 2026', overall: 3.0,
    self: 3.0, team: 3.0, strategy: 3.0, communications: 3.0, 'domain-expertise': 3.0,
  },
  {
    date: 'May 2026', overall: 3.5,
    self: 3.5, team: 3.5, strategy: 3.5, communications: 3.5, 'domain-expertise': 3.5,
    mgr_overall: 3.2, mgr_self: 3.0,
  },
]

describe('PillarHistoryChart', () => {
  it('renders null with fewer than 2 data points', () => {
    const { container } = render(<PillarHistoryChart data={[TWO_POINTS[0]]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing', () => {
    const { container } = render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders all six toggle buttons', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: 'Overall' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Self' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strategy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comms' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expertise' })).toBeInTheDocument()
  })

  it('renders Show Manager Score toggle', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: /show manager score/i })).toBeInTheDocument()
  })

  it('Overall is active by default, other pillars inactive', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Self' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('Show Manager Score is active by default', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    expect(screen.getByRole('button', { name: /show manager score/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking an inactive pillar activates it', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const self = screen.getByRole('button', { name: 'Self' })
    expect(self).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(self)
    expect(self).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking an active pillar deactivates it', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const overall = screen.getByRole('button', { name: 'Overall' })
    expect(overall).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(overall)
    expect(overall).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Show Manager Score toggles it off', () => {
    render(<PillarHistoryChart data={TWO_POINTS} />)
    const mgr = screen.getByRole('button', { name: /show manager score/i })
    fireEvent.click(mgr)
    expect(mgr).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(toggle|aria-pressed|Show Manager)" | head -10
```

- [ ] **Step 3: Rewrite PillarHistoryChart**

Replace `components/app/PillarHistoryChart.tsx` entirely:

```tsx
'use client'
import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { Pillar } from '@/lib/skills'

export interface HistoryPoint {
  date: string
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

const TOGGLES = [
  { key: 'overall',          label: 'Overall',   color: '#f59e0b' },
  { key: 'self',             label: 'Self',       color: '#3b82f6' },
  { key: 'team',             label: 'Team',       color: '#a855f7' },
  { key: 'strategy',         label: 'Strategy',   color: '#22c55e' },
  { key: 'communications',   label: 'Comms',      color: '#f97316' },
  { key: 'domain-expertise', label: 'Expertise',  color: '#06b6d4' },
] as const

const MANAGER_LINES: { key: keyof HistoryPoint; color: string; pillarKey: string }[] = [
  { key: 'mgr_self',               color: '#3b82f6', pillarKey: 'self' },
  { key: 'mgr_team',               color: '#a855f7', pillarKey: 'team' },
  { key: 'mgr_strategy',           color: '#22c55e', pillarKey: 'strategy' },
  { key: 'mgr_communications',     color: '#f97316', pillarKey: 'communications' },
  { key: 'mgr_domain-expertise',   color: '#06b6d4', pillarKey: 'domain-expertise' },
]

interface Props { data: HistoryPoint[] }

export function PillarHistoryChart({ data }: Props) {
  const [activePillars, setActivePillars] = useState<Set<string>>(() => new Set(['overall']))
  const [showManager, setShowManager] = useState(true)

  if (data.length < 2) return null

  const toggle = (key: string) =>
    setActivePillars(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="rounded-xl bg-slate-800 px-4 py-4">
      <p className="mb-3 text-xs text-slate-500" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Score history — all rounds
      </p>

      {/* Toggle controls */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {TOGGLES.map(({ key, label, color }) => {
          const on = activePillars.has(key)
          return (
            <button
              key={key}
              aria-pressed={on}
              onClick={() => toggle(key)}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 99,
                border: `1px solid ${color}`, color,
                background: on ? `${color}26` : 'transparent',
                opacity: on ? 1 : 0.4,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}

        <div style={{ width: 1, height: 18, background: '#334155', flexShrink: 0 }} />

        <button
          aria-pressed={showManager}
          onClick={() => setShowManager(v => !v)}
          style={{
            fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 99,
            border: '1px solid #a78bfa', color: '#a78bfa',
            background: showManager ? 'rgba(167,139,250,0.15)' : 'transparent',
            opacity: showManager ? 1 : 0.4,
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
          Show Manager Score
        </button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} />
          <YAxis domain={[1, 5]} tick={{ fill: '#475569', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />

          {activePillars.has('overall') && (
            <Line type="monotone" dataKey="overall" name="Overall"
              stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
          )}
          {activePillars.has('overall') && showManager && (
            <Line type="monotone" dataKey="mgr_overall" name="Overall (Mgr)"
              stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          )}

          {TOGGLES.slice(1).map(({ key, label, color }) =>
            activePillars.has(key) ? (
              <Line key={key} type="monotone" dataKey={key} name={label}
                stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} />
            ) : null
          )}

          {showManager && MANAGER_LINES.map(({ key, color, pillarKey }) =>
            activePillars.has(pillarKey) ? (
              <Line key={String(key)} type="monotone" dataKey={key as string} name={`${pillarKey} (Mgr)`}
                stroke={color} strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.6} />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all PillarHistoryChart tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/app/PillarHistoryChart.tsx __tests__/components/app/PillarHistoryChart.test.tsx
git commit -m "feat: PillarHistoryChart — interactive toggle controls and manager score lines"
```

---

## Task 7: Dashboard page — populate manager data and history

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `__tests__/app/dashboard/page.test.tsx`

- [ ] **Step 1: Add test for overallManagerAvg prop**

In `__tests__/app/dashboard/page.test.tsx`, update the `DashboardResults` mock to expose `overallManagerAvg`, then add a test. Replace the existing mock:

```ts
vi.mock('@/components/dashboard/DashboardResults', () => ({
  DashboardResults: (props: {
    scoredPillarCount: number
    inProgressRound: unknown
    nextRoundTitle: string
    overallManagerAvg?: number
  }) => (
    <div
      data-testid="dashboard-results"
      data-scored={props.scoredPillarCount}
      data-has-round={String(props.inProgressRound !== null)}
      data-title={props.nextRoundTitle}
      data-mgr-avg={props.overallManagerAvg ?? ''}
    />
  ),
}))
```

Then add this test to the `'with completed rounds'` describe block:

```ts
it('passes overallManagerAvg when manager scores exist', async () => {
  vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
    {
      round: {
        id: 'round-1', user_id: 'user-123', status: 'complete' as const,
        created_at: '2026-01-01T00:00:00Z', completed_at: '2026-03-01T00:00:00Z',
        title: 'Q1 2026', notes: null, remind_at: null,
      },
      scores: [
        { id: 's1', round_id: 'round-1', user_id: 'user-123', skill_key: 'self-resilience', pillar: 'self', level: 'Proficient' },
      ],
    },
  ])
  const { getManagerScoresForDirectReport } = await import('@/lib/db/manager-scores')
  vi.mocked(getManagerScoresForDirectReport).mockResolvedValueOnce([
    { id: 'ms1', round_id: 'round-1', manager_id: 'mgr-1', skill_key: 'self-resilience', level: 'Advanced', scored_at: '2026-03-01' },
  ])

  render(await DashboardPage())
  // Advanced = LEVEL_VALUES.Advanced = 4, so overallManagerAvg = 4.0
  expect(screen.getByTestId('dashboard-results')).toHaveAttribute('data-mgr-avg', '4')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --reporter=verbose 2>&1 | grep "overallManagerAvg" | head -5
```

- [ ] **Step 3: Update dashboard/page.tsx**

In `app/(app)/dashboard/page.tsx`:

**a) Add `getManagerScoresForAllRounds` to the import:**
```ts
import { getManagerScoresForDirectReport, getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
```

**b) Before the parallel fetch, compute `allRoundIds`, then add `getManagerScoresForAllRounds` to the `Promise.all`:**
```ts
const allRoundIds = allRoundsWithScores.map(({ round: r }) => r.id)
const [managerScores, plans, inProgress, managerHistoryByRound] = await Promise.all([
  getManagerScoresForDirectReport(round.id),
  getPlansForUser(user.id),
  getInProgressRound(user.id),
  getManagerScoresForAllRounds(allRoundIds),
])
```

**c) Compute `overallManagerAvg` after the parallel fetch:**
```ts
const overallManagerAvg =
  managerScores.length > 0
    ? managerScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / managerScores.length
    : undefined
```

**d) Add `managerScore` to each pillar in `pillarsForAccordion`:**

Replace the existing `pillarsForAccordion` block. The pillar object gets one new field, and each skill gets two new fields:

```ts
const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
  const pillarSkills = getSkillsByPillar(pillar as Pillar)
  const pillarSelfScores = scores.filter(s => s.pillar === pillar)
  const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0
  const managerPillarScore = pillarScoresForRadar.find(p => p.pillar === pillar)?.managerScore

  return {
    pillar,
    label: PILLAR_LABELS[pillar as Pillar],
    score: selfAvg,
    isLowest: pillar === lowestPillar,
    prevScore: prevPillarScoreMap?.[pillar],
    managerScore: managerPillarScore,
    skills: pillarSkills.map(skill => {
      const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
      const level = (selfScore?.level ?? 'Basic') as Level
      const score = LEVEL_VALUES[level]
      const hasActiveGoal = activePlanKeys.has(skill.key)
      let chipType: 'opportunity' | 'goal' | null = null
      if (hasActiveGoal) chipType = 'goal'
      else if (score <= 2) chipType = 'opportunity'
      const mgrScore = managerScores.find(ms => ms.skill_key === skill.key)
      return {
        key: skill.key,
        name: skill.label,
        description: skill.description,
        level,
        score,
        chipType,
        goalText: hasActiveGoal ? planGoalByKey[skill.key] : undefined,
        managerLevel: mgrScore?.level as Level | undefined,
        managerScore: mgrScore ? LEVEL_VALUES[mgrScore.level as Level] : undefined,
      }
    }),
  }
})
```

**e) Replace the existing `historyData` block** with a version that merges manager history:

```ts
const historyData: HistoryPoint[] = allRoundsWithScores.map(({ round: r, scores: s }) => {
  const date = new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })
  const overall = s.length > 0
    ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
    : 0
  const pillarEntries = PILLARS.map(pillar => {
    const ps = s.filter(sc => sc.pillar === pillar)
    const avg = ps.length > 0
      ? ps.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / ps.length
      : 0
    return [pillar, Number(avg.toFixed(2))]
  })
  const mgrRoundScores = managerHistoryByRound[r.id] ?? []
  const mgrOverall = mgrRoundScores.length > 0
    ? mgrRoundScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrRoundScores.length
    : undefined
  const mgrPillarEntries = PILLARS.map(pillar => {
    const skillKeys = getSkillsByPillar(pillar as Pillar).map(sk => sk.key)
    const ps = mgrRoundScores.filter(ms => skillKeys.includes(ms.skill_key))
    const avg = ps.length > 0
      ? ps.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / ps.length
      : undefined
    return [`mgr_${pillar}`, avg !== undefined ? Number(avg.toFixed(2)) : undefined]
  })
  return {
    date,
    overall: Number(overall.toFixed(2)),
    ...Object.fromEntries(pillarEntries),
    ...(mgrOverall !== undefined ? { mgr_overall: Number(mgrOverall.toFixed(2)) } : {}),
    ...Object.fromEntries(mgrPillarEntries.filter(([, v]) => v !== undefined)),
  } as HistoryPoint
})
```

**f) Remove the `sparklineData` computation** (no longer used):

Delete this block from `page.tsx`:
```ts
// ── Sparkline data (overall score per round) ──────────────────────────────────
const sparklineData = allRoundsWithScores.map(({ round: r, scores: s }) => { ... })
```

**g) Update the `<DashboardResults>` call** — remove `sparklineData`, add `overallManagerAvg`:

```tsx
<DashboardResults
  pillarScoresForRadar={pillarScoresForRadar}
  hasManagerScores={hasManagerScores}
  pillarsForAccordion={pillarsForAccordion}
  historyData={historyData}
  overallAvg={overallAvg}
  overallManagerAvg={overallManagerAvg}
  roundDate={roundDate}
  inProgressRound={inProgress}
  scoredPillarCount={scoredPillarCount}
  nextRoundTitle={currentNextRoundTitle}
  plans={plans}
  overdueCount={overdueCheckins.length}
/>
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass including the new `overallManagerAvg` test.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx __tests__/app/dashboard/page.test.tsx
git commit -m "feat: dashboard page — manager history data, overallManagerAvg, manager skill levels"
```

---

## Task 8: ManagerStrip — fully-scored cards link to /dr/[userId]

**Files:**
- Modify: `components/dashboard/ManagerStrip.tsx`
- Modify: `__tests__/components/dashboard/ManagerStrip.test.tsx`

- [ ] **Step 1: Update the existing test**

In `__tests__/components/dashboard/ManagerStrip.test.tsx`, replace the `'shows fully scored card (no link) when complete'` test:

```ts
it('shows fully scored card with link to /dr/[userId] when complete', () => {
  render(<ManagerStrip summaries={[{ ...BASE, managerScoringStatus: 'complete', pillarsScored: 5 }]} />)
  expect(screen.getByText(/fully scored/i)).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /fully scored/i })
  expect(link).toHaveAttribute('href', '/dr/dr-1?roundId=round-1')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --reporter=verbose 2>&1 | grep "fully scored" | head -5
```

- [ ] **Step 3: Update DrCard in ManagerStrip**

In `components/dashboard/ManagerStrip.tsx`, replace the `DrCard` function with:

```tsx
function DrCard({ s }: { s: EnrichedDRSummary }) {
  const { border, bar, text } = STATE_COLORS[s.managerScoringStatus]
  const pct = s.managerScoringStatus === 'complete' ? 100 : (s.pillarsScored / 5) * 100

  const href =
    s.managerScoringStatus === 'complete'
      ? `/dr/${s.userId}?roundId=${s.roundId}`
      : `/manager/${s.userId}?roundId=${s.roundId}`

  const statusText =
    s.managerScoringStatus === 'complete'
      ? '✓ Fully scored'
      : s.managerScoringStatus === 'in_progress'
      ? `${s.pillarsScored} of 5 pillars`
      : 'Not scored'

  const actionText = s.managerScoringStatus === 'in_progress' ? 'Continue →' : 'Start →'

  const inner = (
    <div className={`rounded-lg border bg-slate-900/60 p-3 flex flex-col gap-2 ${border}`}>
      <p className="text-sm font-medium text-white truncate">{s.name}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs ${text}`}>
        {statusText}
        {s.managerScoringStatus !== 'complete' && (
          <span className="ml-1.5 opacity-70">{actionText}</span>
        )}
      </p>
    </div>
  )

  return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>
}
```

Note: removed the `opacity-60` from complete cards (they're now interactive) and removed the `if (complete) return <div>` branch.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all ManagerStrip tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ManagerStrip.tsx __tests__/components/dashboard/ManagerStrip.test.tsx
git commit -m "feat: ManagerStrip — fully-scored DR cards link to /dr/[userId] view"
```

---

## Task 9: New /dr/[userId] page

**Files:**
- Create: `app/(app)/dr/[userId]/page.tsx`
- Create: `__tests__/app/(app)/dr/page.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/app/(app)/dr/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DrViewPage from '@/app/(app)/dr/[userId]/page'
import { getAllCompleteRoundsWithScores } from '@/lib/db/rounds'

const queryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'conn-1' }, error: null }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mgr-1' } }, error: null }),
    },
    from: vi.fn().mockReturnValue(queryBuilder),
  }),
}))

vi.mock('@/lib/db/rounds', () => ({
  getAllCompleteRoundsWithScores: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/db/manager-scores', () => ({
  getManagerScoresForRound: vi.fn().mockResolvedValue([]),
  getManagerScoresForAllRounds: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/db/profiles', () => ({
  getProfile: vi.fn().mockResolvedValue({ id: 'dr-1', display_name: 'Alice Smith', email: 'alice@co.com', avatar_path: null }),
}))

vi.mock('@/components/dashboard/DashboardResults', () => ({
  DashboardResults: (props: { isReadOnly?: boolean }) => (
    <div data-testid="dashboard-results" data-readonly={String(props.isReadOnly ?? false)} />
  ),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

const PAGE_PARAMS = {
  params: Promise.resolve({ userId: 'dr-1' }),
  searchParams: Promise.resolve({}),
}

describe('DrViewPage', () => {
  it('shows empty state with back link when no completed rounds', async () => {
    render(await DrViewPage(PAGE_PARAMS))
    expect(screen.getByText(/hasn't completed a round/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /← Dashboard/i })).toHaveAttribute('href', '/dashboard')
  })

  it('renders DashboardResults with isReadOnly when rounds exist', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1', user_id: 'dr-1', status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z', completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026', notes: null, remind_at: null,
        },
        scores: [
          { id: 's1', round_id: 'round-1', user_id: 'dr-1', skill_key: 'self-resilience', pillar: 'self', level: 'Proficient' },
        ],
      },
    ])
    render(await DrViewPage(PAGE_PARAMS))
    const results = screen.getByTestId('dashboard-results')
    expect(results).toBeInTheDocument()
    expect(results).toHaveAttribute('data-readonly', 'true')
  })

  it('shows DR name in the heading', async () => {
    vi.mocked(getAllCompleteRoundsWithScores).mockResolvedValueOnce([
      {
        round: {
          id: 'round-1', user_id: 'dr-1', status: 'complete' as const,
          created_at: '2026-01-01T00:00:00Z', completed_at: '2026-03-01T00:00:00Z',
          title: 'Q1 2026', notes: null, remind_at: null,
        },
        scores: [],
      },
    ])
    render(await DrViewPage(PAGE_PARAMS))
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose 2>&1 | grep "DrViewPage" | head -10
```

- [ ] **Step 3: Create the DR view page**

Create `app/(app)/dr/[userId]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllCompleteRoundsWithScores } from '@/lib/db/rounds'
import { getManagerScoresForRound, getManagerScoresForAllRounds } from '@/lib/db/manager-scores'
import { getProfile } from '@/lib/db/profiles'
import { computePillarScores } from '@/lib/reflections'
import {
  PILLARS, PILLAR_LABELS, getSkillsByPillar, LEVEL_VALUES,
  type Pillar, type Level,
} from '@/lib/skills'
import { DashboardResults } from '@/components/dashboard/DashboardResults'
import type { PillarData } from '@/components/app/PillarAccordion'
import type { HistoryPoint } from '@/components/app/PillarHistoryChart'

export default async function DrViewPage({
  params,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ roundId?: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('connections')
    .select('id')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!connection) notFound()

  const profile = await getProfile(userId)
  const drName = profile?.display_name ?? profile?.email ?? 'Direct report'

  const allRoundsWithScores = await getAllCompleteRoundsWithScores(userId)

  if (allRoundsWithScores.length === 0) {
    return (
      <div className="p-6">
        <Link href="/dashboard" className="mb-4 block text-sm text-amber-400 hover:text-amber-300">
          ← Dashboard
        </Link>
        <p className="text-slate-400">{drName} hasn&apos;t completed a round yet.</p>
      </div>
    )
  }

  const { round, scores } = allRoundsWithScores[allRoundsWithScores.length - 1]
  const allRoundIds = allRoundsWithScores.map(r => r.round.id)

  const [managerScores, managerHistoryByRound] = await Promise.all([
    getManagerScoresForRound(round.id, user.id),
    getManagerScoresForAllRounds(allRoundIds),
  ])

  const overallAvg = scores.length > 0
    ? scores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / scores.length
    : 0

  const overallManagerAvg = managerScores.length > 0
    ? managerScores.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / managerScores.length
    : undefined

  const roundDate = new Date(round.completed_at ?? round.created_at).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })

  const pillarScoresForRadar = computePillarScores(scores, managerScores)

  const pillarScoreMap = Object.fromEntries(pillarScoresForRadar.map(p => [p.pillar, p.selfScore]))
  const lowestPillar = PILLARS.reduce((lowest, p) =>
    pillarScoreMap[p] < pillarScoreMap[lowest] ? p : lowest
  )

  const prevRoundData = allRoundsWithScores.length >= 2
    ? allRoundsWithScores[allRoundsWithScores.length - 2]
    : null
  const prevPillarScoreMap = prevRoundData
    ? Object.fromEntries(PILLARS.map(pillar => {
        const ps = prevRoundData.scores.filter(s => s.pillar === pillar)
        const avg = ps.length > 0
          ? ps.reduce((sum, s) => sum + LEVEL_VALUES[s.level as Level], 0) / ps.length
          : 0
        return [pillar, avg]
      }))
    : null

  const pillarsForAccordion: PillarData[] = PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)
    const pillarSelfScores = scores.filter(s => s.pillar === pillar)
    const selfAvg = pillarScoresForRadar.find(p => p.pillar === pillar)?.selfScore ?? 0
    const managerPillarScore = pillarScoresForRadar.find(p => p.pillar === pillar)?.managerScore

    return {
      pillar,
      label: PILLAR_LABELS[pillar as Pillar],
      score: selfAvg,
      isLowest: pillar === lowestPillar,
      prevScore: prevPillarScoreMap?.[pillar],
      managerScore: managerPillarScore,
      skills: pillarSkills.map(skill => {
        const selfScore = pillarSelfScores.find(s => s.skill_key === skill.key)
        const level = (selfScore?.level ?? 'Basic') as Level
        const mgrScore = managerScores.find(ms => ms.skill_key === skill.key)
        return {
          key: skill.key,
          name: skill.label,
          description: skill.description,
          level,
          score: LEVEL_VALUES[level],
          chipType: null as null,
          managerLevel: mgrScore?.level as Level | undefined,
          managerScore: mgrScore ? LEVEL_VALUES[mgrScore.level as Level] : undefined,
        }
      }),
    }
  })

  const historyData: HistoryPoint[] = allRoundsWithScores.map(({ round: r, scores: s }) => {
    const date = new Date(r.completed_at ?? r.created_at).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric',
    })
    const overall = s.length > 0
      ? s.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / s.length
      : 0
    const pillarEntries = PILLARS.map(pillar => {
      const ps = s.filter(sc => sc.pillar === pillar)
      const avg = ps.length > 0
        ? ps.reduce((sum, sc) => sum + LEVEL_VALUES[sc.level as Level], 0) / ps.length
        : 0
      return [pillar, Number(avg.toFixed(2))]
    })
    const mgrRoundScores = (managerHistoryByRound[r.id] ?? []).filter(ms => ms.manager_id === user.id)
    const mgrOverall = mgrRoundScores.length > 0
      ? mgrRoundScores.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / mgrRoundScores.length
      : undefined
    const mgrPillarEntries = PILLARS.map(pillar => {
      const skillKeys = getSkillsByPillar(pillar as Pillar).map(sk => sk.key)
      const ps = mgrRoundScores.filter(ms => skillKeys.includes(ms.skill_key))
      const avg = ps.length > 0
        ? ps.reduce((sum, ms) => sum + LEVEL_VALUES[ms.level as Level], 0) / ps.length
        : undefined
      return [`mgr_${pillar}`, avg !== undefined ? Number(avg.toFixed(2)) : undefined]
    })
    return {
      date,
      overall: Number(overall.toFixed(2)),
      ...Object.fromEntries(pillarEntries),
      ...(mgrOverall !== undefined ? { mgr_overall: Number(mgrOverall.toFixed(2)) } : {}),
      ...Object.fromEntries(mgrPillarEntries.filter(([, v]) => v !== undefined)),
    } as HistoryPoint
  })

  return (
    <div className="p-6">
      <Link href="/dashboard" className="mb-4 block text-sm text-amber-400 hover:text-amber-300">
        ← Dashboard
      </Link>
      <h1 className="mb-4 text-xl font-bold text-white">{drName}</h1>
      <DashboardResults
        pillarScoresForRadar={pillarScoresForRadar}
        hasManagerScores={managerScores.length > 0}
        pillarsForAccordion={pillarsForAccordion}
        historyData={historyData}
        overallAvg={overallAvg}
        overallManagerAvg={overallManagerAvg}
        roundDate={roundDate}
        inProgressRound={null}
        scoredPillarCount={0}
        nextRoundTitle=""
        plans={[]}
        overdueCount={0}
        isReadOnly
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all DrViewPage tests pass; full suite green.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/dr" "__tests__/app/(app)/dr"
git commit -m "feat: add /dr/[userId] read-only DR view for managers"
```

---

## Final check

- [ ] **Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.
