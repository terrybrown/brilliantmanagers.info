# Enhanced Radar Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance `ScorecardRadarChart` to show both series simultaneously with independent legend toggles, always-on score labels at each vertex, a per-skill hover tooltip, and clickable dots on both series.

**Architecture:** Enrich `RadarPillarScore` with per-skill data in `lib/reflections.ts`; extract `PillarTooltip` as a testable sub-component; rewrite `ScorecardRadarChart` to own its own series visibility state; migrate three call sites; delete the now-redundant `RadarWithToggle`.

**Tech Stack:** recharts v3.8.1, React 19, TypeScript, Vitest + Testing Library

---

## File map

| Action | File |
|---|---|
| Modify | `lib/reflections.ts` |
| Modify | `components/app/ScorecardRadarChart.tsx` |
| Modify | `app/(app)/reflections/[id]/page.tsx` |
| Modify | `app/(app)/dashboard/page.tsx` |
| Modify | `components/dashboard/DashboardResults.tsx` |
| Modify | `components/app/ResultsView.tsx` |
| Modify | `__tests__/lib/reflections.test.ts` |
| Modify | `__tests__/components/app/ScorecardRadarChart.test.tsx` |
| Delete | `components/app/RadarWithToggle.tsx` |

---

## Task 1: Enrich RadarPillarScore with per-skill data

**Files:**
- Modify: `lib/reflections.ts`
- Modify: `__tests__/lib/reflections.test.ts`

- [ ] **Step 1.1: Verify the test suite is green before touching anything**

```bash
npm test
```

Expected: all tests pass. Do not proceed if any test is failing.

- [ ] **Step 1.2: Write failing tests for the new skill breakdown fields**

Open `__tests__/lib/reflections.test.ts`. Add this block **inside** the existing `describe('computePillarScores', ...)` block, after the last existing `it(...)`:

```typescript
  it('populates selfSkills with scored skills and their labels', () => {
    const scores = [
      makeScore('r-1', 'self', 'self-resilience', 'Proficient'),
      makeScore('r-1', 'self', 'self-growth-mindset', 'Advanced'),
    ]
    const result = computePillarScores(scores, [])
    const selfPillar = result.find(r => r.pillar === 'self')!
    expect(selfPillar.selfSkills).toHaveLength(2)
    expect(selfPillar.selfSkills.find(s => s.skillKey === 'self-resilience')).toMatchObject({
      skillKey: 'self-resilience',
      label: 'Resilience',
      level: 'Proficient',
    })
    expect(selfPillar.selfSkills.find(s => s.skillKey === 'self-growth-mindset')).toMatchObject({
      skillKey: 'self-growth-mindset',
      label: 'Growth Mindset',
      level: 'Advanced',
    })
  })

  it('returns empty selfSkills array for unscored pillars', () => {
    const result = computePillarScores([], [])
    expect(result.every(r => r.selfSkills.length === 0)).toBe(true)
  })

  it('populates managerSkills when manager scores exist for a pillar', () => {
    const mgrScores = [makeMgrScore('r-1', 'self-self-awareness', 'Expert')]
    const result = computePillarScores([], mgrScores)
    const selfPillar = result.find(r => r.pillar === 'self')!
    expect(selfPillar.managerSkills).toBeDefined()
    expect(selfPillar.managerSkills!.find(s => s.skillKey === 'self-self-awareness')).toMatchObject({
      skillKey: 'self-self-awareness',
      label: 'Self Awareness',
      level: 'Expert',
    })
  })

  it('leaves managerSkills undefined when no manager scores exist for a pillar', () => {
    const result = computePillarScores([], [])
    expect(result.every(r => r.managerSkills === undefined)).toBe(true)
  })
```

- [ ] **Step 1.3: Run the new tests to confirm they fail**

```bash
npm test -- reflections.test
```

Expected: FAIL — `selfSkills is not a property` (or similar).

- [ ] **Step 1.4: Add `SkillScore` type and update `RadarPillarScore`**

In `lib/reflections.ts`, add this new interface immediately **before** `RadarPillarScore`:

```typescript
export interface SkillScore {
  skillKey: string
  label: string
  level: Level
}
```

Replace the existing `RadarPillarScore` interface:

```typescript
export interface RadarPillarScore {
  pillar: Pillar
  selfScore: number
  selfScored: boolean
  selfSkills: SkillScore[]
  managerScore?: number
  managerSkills?: SkillScore[]
}
```

- [ ] **Step 1.5: Update `computePillarScores` to populate the new fields**

Replace the entire `computePillarScores` function body in `lib/reflections.ts`:

```typescript
export function computePillarScores(
  scores: Score[],
  managerScores: ManagerScore[]
): RadarPillarScore[] {
  return PILLARS.map(pillar => {
    const pillarSkills = getSkillsByPillar(pillar as Pillar)

    const selfAvg = pillarAvgFromScores(scores, pillar)

    const selfSkills: SkillScore[] = pillarSkills.flatMap(skill => {
      const match = scores.find(s => s.skill_key === skill.key)
      return match ? [{ skillKey: skill.key, label: skill.label, level: match.level }] : []
    })

    const relevantMgrScores = managerScores.filter(ms =>
      pillarSkills.some(s => s.key === ms.skill_key)
    )
    const managerAvg =
      relevantMgrScores.length > 0
        ? relevantMgrScores.reduce(
            (sum, ms) => sum + LEVEL_VALUES[ms.level as Level],
            0
          ) / relevantMgrScores.length
        : undefined

    const managerSkills: SkillScore[] | undefined =
      relevantMgrScores.length > 0
        ? pillarSkills.flatMap(skill => {
            const match = relevantMgrScores.find(ms => ms.skill_key === skill.key)
            return match
              ? [{ skillKey: skill.key, label: skill.label, level: match.level }]
              : []
          })
        : undefined

    return {
      pillar: pillar as Pillar,
      selfScore: selfAvg,
      selfScored: selfAvg > 0,
      selfSkills,
      managerScore: managerAvg,
      managerSkills,
    }
  })
}
```

- [ ] **Step 1.6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including the four new skill breakdown tests. If existing tests fail, the new `RadarPillarScore` shape broke a consumer — check `ScorecardRadarChart.tsx` and its tests for type errors.

- [ ] **Step 1.7: Commit**

```bash
git add lib/reflections.ts __tests__/lib/reflections.test.ts
git commit -m "feat: enrich RadarPillarScore with per-skill breakdown for tooltip"
```

---

## Task 2: Implement `PillarTooltip` sub-component

**Files:**
- Modify: `components/app/ScorecardRadarChart.tsx`
- Modify: `__tests__/components/app/ScorecardRadarChart.test.tsx`

`PillarTooltip` is a pure React component — no recharts dependency — so it can be fully unit-tested in isolation. Implement and test it before wiring it into the chart.

- [ ] **Step 2.1: Write failing tests for `PillarTooltip`**

Open `__tests__/components/app/ScorecardRadarChart.test.tsx`. Add these imports at the top (alongside the existing ones):

```typescript
import { ScorecardPillarTick, PillarTooltip } from '@/components/app/ScorecardRadarChart'
import type { RadarPillarScore } from '@/lib/reflections'
```

Add a new `describe` block **after** the existing `ScorecardPillarTick` describe:

```typescript
describe('PillarTooltip', () => {
  const baseScore: RadarPillarScore = {
    pillar: 'strategy',
    selfScore: 4,
    selfScored: true,
    selfSkills: [
      { skillKey: 'strategy-vision-creation', label: 'Strategy & Vision Creation', level: 'Advanced' },
      { skillKey: 'strategy-goal-setting', label: 'Goal Setting', level: 'Expert' },
    ],
    managerScore: 3,
    managerSkills: [
      { skillKey: 'strategy-vision-creation', label: 'Strategy & Vision Creation', level: 'Proficient' },
    ],
  }

  it('shows the pillar name', () => {
    const { getByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('Strategy')).toBeTruthy()
  })

  it('shows self score and skill breakdown', () => {
    const { getByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('4 / 5')).toBeTruthy()
    expect(getByText('Strategy & Vision Creation')).toBeTruthy()
    expect(getByText('Goal Setting')).toBeTruthy()
  })

  it('shows manager score and skills when manager series is visible', () => {
    const { getByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('3 / 5')).toBeTruthy()
    expect(getByText('Proficient')).toBeTruthy()
  })

  it('omits manager section when Manager series is hidden', () => {
    const { queryByText, getAllByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set(['Manager'] as const)} />
    )
    // '3 / 5' belongs only to manager — should be gone
    expect(queryByText('3 / 5')).toBeNull()
    // '4 / 5' belongs to self — still shown
    expect(getAllByText('4 / 5')).toHaveLength(1)
  })

  it('omits self section when Self series is hidden', () => {
    const { queryByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set(['Self'] as const)} />
    )
    expect(queryByText('4 / 5')).toBeNull()
  })

  it('shows "Not scored" for an unscored self pillar', () => {
    const unscored: RadarPillarScore = {
      ...baseScore,
      selfScore: 0,
      selfScored: false,
      selfSkills: [],
    }
    const { getByText } = render(
      <PillarTooltip pillarScore={unscored} hidden={new Set()} />
    )
    expect(getByText('Not scored')).toBeTruthy()
  })

  it('shows level name next to aggregate score', () => {
    const { getByText } = render(
      <PillarTooltip pillarScore={baseScore} hidden={new Set()} />
    )
    expect(getByText('Advanced')).toBeTruthy()
  })
})
```

- [ ] **Step 2.2: Run tests to confirm failure**

```bash
npm test -- ScorecardRadarChart.test
```

Expected: FAIL — `PillarTooltip` is not exported from `ScorecardRadarChart`.

- [ ] **Step 2.3: Add the `PillarTooltip` component and supporting code to `ScorecardRadarChart.tsx`**

At the **top** of `components/app/ScorecardRadarChart.tsx`, add this import alongside the existing ones:

```typescript
import { LEVELS, type Level } from '@/lib/skills'
import type { RadarPillarScore, SkillScore } from '@/lib/reflections'
```

Add these declarations **before** `ScorecardPillarTick` (the existing export):

```typescript
function levelName(score: number): Level {
  const idx = Math.min(4, Math.max(0, Math.round(score) - 1))
  return LEVELS[idx]
}

function SkillRow({ skill }: { skill: SkillScore }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '2px 0',
        color: '#94a3b8',
        borderBottom: '1px solid #0f172a',
        fontSize: 11,
      }}
    >
      <span>{skill.label}</span>
      <span style={{ color: '#e2e8f0' }}>{skill.level}</span>
    </div>
  )
}

export interface PillarTooltipProps {
  pillarScore: RadarPillarScore
  hidden: Set<'Self' | 'Manager'>
}

export function PillarTooltip({ pillarScore, hidden }: PillarTooltipProps) {
  const { pillar, selfScore, selfScored, selfSkills, managerScore, managerSkills } = pillarScore
  const hasManager = managerScore !== undefined && managerSkills !== undefined
  const showSelf = !hidden.has('Self')
  const showManager = hasManager && !hidden.has('Manager')

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        maxWidth: 240,
      }}
    >
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 8, fontSize: 13 }}>
        {PILLAR_LABELS[pillar]}
      </div>

      {showSelf && (
        <div style={{ marginBottom: showManager ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 10, height: 2, background: '#f59e0b', borderRadius: 1 }} />
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Self</span>
            {selfScored ? (
              <>
                <span
                  style={{
                    background: 'rgba(245,158,11,.15)',
                    color: '#fbbf24',
                    padding: '1px 5px',
                    borderRadius: 3,
                    fontSize: 10,
                  }}
                >
                  {Math.round(selfScore)} / 5
                </span>
                <span
                  style={{
                    background: '#0f172a',
                    color: '#64748b',
                    padding: '1px 4px',
                    borderRadius: 3,
                    fontSize: 10,
                  }}
                >
                  {levelName(selfScore)}
                </span>
              </>
            ) : (
              <span style={{ color: '#475569', fontSize: 10 }}>Not scored</span>
            )}
          </div>
          {selfSkills.map(skill => (
            <SkillRow key={skill.skillKey} skill={skill} />
          ))}
        </div>
      )}

      {showManager && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 10,
                height: 2,
                background:
                  'repeating-linear-gradient(90deg, #a78bfa 0, #a78bfa 4px, transparent 4px, transparent 7px)',
              }}
            />
            <span style={{ color: '#c4b5fd', fontWeight: 600 }}>Manager</span>
            <span
              style={{
                background: 'rgba(167,139,250,.15)',
                color: '#c4b5fd',
                padding: '1px 5px',
                borderRadius: 3,
                fontSize: 10,
              }}
            >
              {Math.round(managerScore!)} / 5
            </span>
            <span
              style={{
                background: '#0f172a',
                color: '#64748b',
                padding: '1px 4px',
                borderRadius: 3,
                fontSize: 10,
              }}
            >
              {levelName(managerScore!)}
            </span>
          </div>
          {managerSkills!.map(skill => (
            <SkillRow key={skill.skillKey} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2.4: Run tests**

```bash
npm test -- ScorecardRadarChart.test
```

Expected: all `ScorecardPillarTick` tests still pass + all new `PillarTooltip` tests pass. (The main `ScorecardRadarChart` component is unchanged at this point — it still uses the old `showManager` prop, which is fine for now.)

- [ ] **Step 2.5: Commit**

```bash
git add components/app/ScorecardRadarChart.tsx __tests__/components/app/ScorecardRadarChart.test.tsx
git commit -m "feat: add PillarTooltip sub-component with per-skill breakdown"
```

---

## Task 3: Rewrite `ScorecardRadarChart` with all new behaviour

**Files:**
- Modify: `components/app/ScorecardRadarChart.tsx`
- Modify: `__tests__/components/app/ScorecardRadarChart.test.tsx`

This task replaces the `ScorecardRadarChart` function and its `Props` interface. `PillarTooltip` and `ScorecardPillarTick` (added in earlier tasks) are unchanged.

- [ ] **Step 3.1: Write smoke tests for the updated chart**

Add this block to `__tests__/components/app/ScorecardRadarChart.test.tsx` (after the `PillarTooltip` describe):

```typescript
describe('ScorecardRadarChart', () => {
  function makeScores(opts?: { withManager?: boolean }): RadarPillarScore[] {
    return [
      { pillar: 'self',             selfScore: 4, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'team',             selfScore: 3, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 4 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'strategy',         selfScore: 5, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 4 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'communications',   selfScore: 2, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
      { pillar: 'domain-expertise', selfScore: 4, selfScored: true,  selfSkills: [], managerScore: opts?.withManager ? 3 : undefined, managerSkills: opts?.withManager ? [] : undefined },
    ]
  }

  it('renders without crashing with self scores only', () => {
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores()} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with both self and manager scores', () => {
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores({ withManager: true })} />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('calls onPillarClick prop when provided (function is passed through)', () => {
    const handler = vi.fn()
    const { container } = render(
      <ScorecardRadarChart pillarScores={makeScores()} onPillarClick={handler} />
    )
    // Component mounts without error and handler is accepted as a prop
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 3.2: Run smoke tests — confirm they fail because `showManager` no longer exists as a required prop on the OLD component**

```bash
npm test -- ScorecardRadarChart.test
```

Expected: TypeScript may error on the new test because the old `ScorecardRadarChart` still requires `showManager`. The smoke test that omits it will fail to compile or fail at runtime.

- [ ] **Step 3.3: Replace the `ScorecardRadarChart` function and `Props` interface**

Locate the existing `Props` interface and `ScorecardRadarChart` function in `components/app/ScorecardRadarChart.tsx`. Replace **only those two items** (leave `PillarTooltip`, `ScorecardPillarTick`, and the helpers above them untouched).

Replace the old `interface PillarScore` (local, near the top of the file), the old `interface Props`, and the old `ScorecardRadarChart` function with:

```typescript
// Label offsets per pillar index (Self → Team → Strategy → Communications → Domain Expertise)
// Pillars go clockwise from top. Offsets push the score number away from the dot.
const LABEL_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0,   dy: -14 }, // Self (top)
  { dx: 14,  dy: -4  }, // Team (upper-right)
  { dx: 14,  dy: 8   }, // Strategy (lower-right)
  { dx: -14, dy: 8   }, // Communications (lower-left)
  { dx: -14, dy: -4  }, // Domain Expertise (upper-left)
]

interface Props {
  pillarScores: RadarPillarScore[]
  onPillarClick?: (pillar: Pillar) => void
}

export function ScorecardRadarChart({ pillarScores, onPillarClick }: Props) {
  const [hidden, setHidden] = useState<Set<'Self' | 'Manager'>>(new Set())

  const hasManagerData = pillarScores.some(ps => ps.managerScore !== undefined)

  const tickRenderer = useCallback(
    (props: ScorecardPillarTickProps) => (
      <ScorecardPillarTick {...props} onPillarClick={onPillarClick} />
    ),
    [onPillarClick]
  )

  const data = pillarScores.map(ps => ({
    pillar: PILLAR_LABELS[ps.pillar],
    Self: ps.selfScored ? Number(ps.selfScore.toFixed(2)) : 0,
    Manager:
      ps.managerScore !== undefined ? Number(ps.managerScore.toFixed(2)) : undefined,
  }))

  const handleLegendClick = useCallback((entry: { value: string }) => {
    const key = entry.value as 'Self' | 'Manager'
    setHidden(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const renderSelfLabel = useCallback(
    (props: { x?: number; y?: number; value?: number; index?: number }) => {
      if (hidden.has('Self')) return null
      const { x = 0, y = 0, value, index = 0 } = props
      const ps = pillarScores[index]
      if (!ps) return null
      const { dx, dy } = LABEL_OFFSETS[index] ?? { dx: 0, dy: -14 }
      return (
        <text
          key={`self-label-${index}`}
          x={Number(x) + dx}
          y={Number(y) + dy}
          textAnchor="middle"
          fill="#f59e0b"
          fontSize={10}
          fontWeight={700}
          fontFamily="monospace"
        >
          {ps.selfScored && value !== undefined ? Math.round(value) : '—'}
        </text>
      )
    },
    [hidden, pillarScores]
  )

  const renderManagerLabel = useCallback(
    (props: { x?: number; y?: number; value?: number; index?: number }) => {
      if (hidden.has('Manager')) return null
      const { x = 0, y = 0, value, index = 0 } = props
      const ps = pillarScores[index]
      if (!ps || ps.managerScore === undefined || value === undefined) return null
      const { dx, dy } = LABEL_OFFSETS[index] ?? { dx: 0, dy: -14 }
      return (
        <text
          key={`mgr-label-${index}`}
          x={Number(x) + dx * 0.55}
          y={Number(y) + dy * 0.55}
          textAnchor="middle"
          fill="#a78bfa"
          fontSize={9}
          fontFamily="monospace"
        >
          {Math.round(value)}
        </text>
      )
    },
    [hidden, pillarScores]
  )

  const renderDot = useCallback(
    (color: string, radius: number) =>
      function Dot(props: { cx?: number; cy?: number; index?: number }) {
        const { cx = 0, cy = 0, index = 0 } = props
        const ps = pillarScores[index]
        return (
          <g key={`dot-${color}-${index}`}>
            <circle
              cx={cx}
              cy={cy}
              r={12}
              fill="transparent"
              style={{ cursor: onPillarClick ? 'pointer' : 'default' }}
              onClick={() => ps && onPillarClick?.(ps.pillar)}
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={color}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )
      },
    [pillarScores, onPillarClick]
  )

  return (
    <div style={{ cursor: 'default' }}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="pillar" tick={tickRenderer} />
          <Radar
            name="Self"
            dataKey="Self"
            stroke={hidden.has('Self') ? 'transparent' : '#f59e0b'}
            fill={hidden.has('Self') ? 'transparent' : '#f59e0b'}
            fillOpacity={hidden.has('Self') ? 0 : 0.18}
            strokeWidth={2}
            label={renderSelfLabel as never}
            dot={renderDot('#f59e0b', 4) as never}
          />
          {hasManagerData && (
            <Radar
              name="Manager"
              dataKey="Manager"
              stroke={hidden.has('Manager') ? 'transparent' : '#a78bfa'}
              fill={hidden.has('Manager') ? 'transparent' : '#a78bfa'}
              fillOpacity={hidden.has('Manager') ? 0 : 0.12}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              label={renderManagerLabel as never}
              dot={renderDot('#a78bfa', 3.5) as never}
            />
          )}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const ps = pillarScores.find(p => PILLAR_LABELS[p.pillar] === label)
              if (!ps) return null
              return <PillarTooltip pillarScore={ps} hidden={hidden} />
            }}
          />
          {hasManagerData && (
            <Legend
              wrapperStyle={{ cursor: 'pointer' }}
              onClick={handleLegendClick as never}
              formatter={(value) => (
                <span
                  style={{
                    color: hidden.has(value as 'Self' | 'Manager') ? '#475569' : '#94a3b8',
                    fontSize: 11,
                    textDecoration: hidden.has(value as 'Self' | 'Manager')
                      ? 'line-through'
                      : 'none',
                  }}
                >
                  {value}
                </span>
              )}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Also remove the old local `interface PillarScore` that was defined near the top of the file (lines 13–17 of the original), since `ScorecardRadarChart` now uses `RadarPillarScore` from `lib/reflections`.

- [ ] **Step 3.4: Add `Tooltip` to the recharts import**

The original file did not import `Tooltip`. Update the recharts import line:

```typescript
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
```

- [ ] **Step 3.5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass — existing `ScorecardPillarTick` tests, new `PillarTooltip` tests, and new smoke tests. TypeScript should compile cleanly; fix any type errors before proceeding.

- [ ] **Step 3.6: Commit**

```bash
git add components/app/ScorecardRadarChart.tsx __tests__/components/app/ScorecardRadarChart.test.tsx
git commit -m "feat: rewrite ScorecardRadarChart with legend toggle, score labels, clickable dots, and tooltip"
```

---

## Task 4: Migrate call sites and delete `RadarWithToggle`

**Files:**
- Modify: `app/(app)/reflections/[id]/page.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `components/dashboard/DashboardResults.tsx`
- Modify: `components/app/ResultsView.tsx`
- Delete: `components/app/RadarWithToggle.tsx`

**Context on each call site:**
- `reflections/[id]/page.tsx` already calls `computePillarScores` → just remove `showManager` prop
- `dashboard/page.tsx` manually builds pillar scores without `computePillarScores` — replace with `computePillarScores` so `selfSkills`/`managerSkills` are populated
- `DashboardResults.tsx` uses `RadarWithToggle` — replace with `ScorecardRadarChart`; keep `hasManagerScores` prop (still used for the "Invite your manager" card)
- `ResultsView.tsx` is dead code (never imported) but must compile — update the chart usage and derive the `ResultsPillarList` data from `RadarPillarScore`

- [ ] **Step 4.1: Update `app/(app)/reflections/[id]/page.tsx`**

Find this block (around line 125):

```tsx
<ScorecardRadarChart
  pillarScores={pillarScoresForRadar}
  showManager={hasManagerScores}
/>
```

Remove the `showManager` prop:

```tsx
<ScorecardRadarChart
  pillarScores={pillarScoresForRadar}
/>
```

Also remove the `hasManagerScores` variable (line 33) if it is only used for the chart — check the rest of the file first. If it's used elsewhere in the file, leave it.

```typescript
// Remove this line only if hasManagerScores is not used anywhere else:
const hasManagerScores = pillarScoresForRadar.some(p => p.managerScore !== undefined)
```

- [ ] **Step 4.2: Update `app/(app)/dashboard/page.tsx`**

**Add** `computePillarScores` to the existing `lib/reflections` import (around line 11):

```typescript
import { nextRoundTitle as computeNextRoundTitle, computePillarScores } from '@/lib/reflections'
```

**Replace** the manual `pillarScoresForRadar` computation block (lines 236–255). Find:

```typescript
const pillarScoresForRadar = PILLARS.map(pillar => {
  const pillarSkills = getSkillsByPillar(pillar as Pillar)
  const pillarSelfScores = scores.filter(s => s.pillar === pillar)
  const selfAvg = ...
  const managerPillarScores = ...
  const managerAvg = ...
  return { pillar: pillar as Pillar, selfScore: selfAvg, managerScore: managerAvg }
})
```

Replace with:

```typescript
const pillarScoresForRadar = computePillarScores(scores, managerScores)
```

The downstream code that uses `pillarScoresForRadar` (e.g. computing `pillarScoreMap` and `lowestPillar`) reads `.selfScore` which is still present on `RadarPillarScore` — no changes needed there.

Remove unused imports that were only needed for the manual computation, if any (check whether `getSkillsByPillar` is used anywhere else in the file before removing it).

- [ ] **Step 4.3: Update `components/dashboard/DashboardResults.tsx`**

**Replace** the import of `RadarWithToggle`:

```typescript
// Remove:
import { RadarWithToggle } from '@/components/app/RadarWithToggle'

// Add:
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { RadarPillarScore } from '@/lib/reflections'
```

**Update** the local `PillarScore` interface (lines 17–21). Replace:

```typescript
interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}
```

With (using the imported type instead of a local one):

```typescript
// Delete the local PillarScore interface — use RadarPillarScore from lib/reflections instead
```

**Update** the `DashboardResultsProps` interface. Replace:

```typescript
pillarScoresForRadar: PillarScore[]
```

With:

```typescript
pillarScoresForRadar: RadarPillarScore[]
```

**Replace** the `<RadarWithToggle>` usage (around line 65):

```tsx
// Remove:
<RadarWithToggle
  pillarScores={pillarScoresForRadar}
  hasManagerScores={hasManagerScores}
  onPillarClick={handlePillarClick}
/>

// Add:
<ScorecardRadarChart
  pillarScores={pillarScoresForRadar}
  onPillarClick={handlePillarClick}
/>
```

Keep `hasManagerScores` in props — it is still used for the "Invite your manager" card (line 101).

- [ ] **Step 4.4: Update `components/app/ResultsView.tsx`**

`ResultsView` is not imported anywhere (dead code), but it must compile. It currently uses its own local `PillarScore` type and passes data to both `ScorecardRadarChart` and `ResultsPillarList`.

**Replace** the entire file content:

```typescript
'use client'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { ResultsPillarList } from '@/components/app/ResultsPillarList'
import type { RadarPillarScore } from '@/lib/reflections'

interface Props {
  pillarScores: RadarPillarScore[]
}

export function ResultsView({ pillarScores }: Props) {
  // Map RadarPillarScore to the shape ResultsPillarList expects
  const pillarsForList = pillarScores.map(ps => ({
    pillar: ps.pillar,
    skills: ps.selfSkills.map(sk => ({
      skillKey: sk.skillKey,
      label: sk.label,
      selfLevel: sk.level,
      managerLevel: ps.managerSkills?.find(ms => ms.skillKey === sk.skillKey)?.level,
    })),
  }))

  const hasManagerScores = pillarScores.some(ps => ps.managerScore !== undefined)

  return (
    <>
      <div className="mb-6">
        <ScorecardRadarChart pillarScores={pillarScores} />
      </div>
      <ResultsPillarList pillars={pillarsForList} showManager={hasManagerScores} />
    </>
  )
}
```

Note: `ResultsView` previously had a manual toggle button for "Self / Manager" above the chart. That toggle is removed — the chart legend now handles series visibility internally.

- [ ] **Step 4.5: Delete `RadarWithToggle.tsx`**

```bash
rm components/app/RadarWithToggle.tsx
```

- [ ] **Step 4.6: Run the full test suite and check for TypeScript errors**

```bash
npm run lint && npm test
```

Expected: all tests pass, no lint errors. If `getSkillsByPillar` or `PILLARS` imports in `dashboard/page.tsx` are now unused, remove them (TypeScript / ESLint will flag them).

- [ ] **Step 4.7: Commit**

```bash
git add \
  app/\(app\)/reflections/\[id\]/page.tsx \
  app/\(app\)/dashboard/page.tsx \
  components/dashboard/DashboardResults.tsx \
  components/app/ResultsView.tsx
git rm components/app/RadarWithToggle.tsx
git commit -m "feat: migrate radar chart call sites and remove RadarWithToggle"
```

---

## Self-review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Both series simultaneously with independent legend toggle | Task 3 (`hidden` state + Legend onClick) |
| Score labels always visible at each vertex | Task 3 (`renderSelfLabel`, `renderManagerLabel`) |
| Score label shows `—` for unscored pillar | Task 3 (`ps.selfScored` check in `renderSelfLabel`) |
| Hover tooltip: pillar name + aggregate + level + skills | Task 2 (`PillarTooltip`) + Task 3 (wired via `<Tooltip content>`) |
| Tooltip omits hidden series | Task 2 (`PillarTooltip` reads `hidden` prop) |
| Pillar click on label | Unchanged (existing `ScorecardPillarTick`) |
| Pillar click on self dot | Task 3 (`renderDot` for Self series) |
| Pillar click on manager dot | Task 3 (`renderDot` for Manager series) |
| `RadarPillarScore` enriched with `selfSkills` / `managerSkills` | Task 1 |
| `computePillarScores` returns per-skill data | Task 1 |
| Delete `RadarWithToggle` | Task 4 |
| `reflections/[id]/page.tsx` migrated | Task 4 |
| `dashboard/page.tsx` uses `computePillarScores` | Task 4 |
| `DashboardResults.tsx` migrated | Task 4 |
| `ResultsView.tsx` compiles without `showManager` | Task 4 |

All spec requirements are covered.

**Placeholder scan:** No TBD, TODO, or "similar to above" steps. All code blocks are complete.

**Type consistency:** `SkillScore` defined in Task 1; used in `PillarTooltip` (Task 2) and `ScorecardRadarChart` (Task 3) — consistent. `RadarPillarScore` defined in Task 1; used by the chart (Task 3) and all call sites (Task 4) — consistent. `hidden: Set<'Self' | 'Manager'>` — same type across `PillarTooltip` props and `ScorecardRadarChart` state.
