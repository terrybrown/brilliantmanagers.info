# Dashboard Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 5 targeted UI improvements to the dashboard: radar label line-break, focus ring fix, hover colour on radar labels, history chart moved to centre column, and "Start new round" promoted to a styled button inside the Next Reflection widget.

**Architecture:** Four files touched — `globals.css` (CSS-only fix), `ScorecardRadarChart.tsx` (label, cursor, hover), `DashboardResults.tsx` (layout + prop wiring), `ScheduleWidget.tsx` (new prop and link). No data model, API, or routing changes.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS v4, Recharts, Vitest + @testing-library/react

---

### Task 1: Fix recharts focus ring

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the missing CSS rule**

Open `app/globals.css`. The existing block at the bottom reads:

```css
svg.recharts-surface {
  overflow: visible;
}
svg.recharts-surface:focus {
  outline: none;
}
/* The recharts-wrapper div also needs to allow overflow so the labels aren't re-clipped */
.recharts-wrapper {
  overflow: visible !important;
}
```

Add one rule so the block becomes:

```css
svg.recharts-surface {
  overflow: visible;
}
svg.recharts-surface:focus {
  outline: none;
}
/* The recharts-wrapper div also needs to allow overflow so the labels aren't re-clipped */
.recharts-wrapper {
  overflow: visible !important;
}
.recharts-wrapper:focus {
  outline: none;
}
```

- [ ] **Step 2: Run tests (no change expected)**

```bash
npx vitest run
```

Expected: 168 PASS, 0 FAIL

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "fix: remove recharts wrapper focus ring"
```

---

### Task 2: Radar label line break + scoped cursor + amber hover colour

**Files:**
- Modify: `components/app/ScorecardRadarChart.tsx`
- Create: `__tests__/components/app/ScorecardRadarChart.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/app/ScorecardRadarChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ScorecardPillarTick } from '@/components/app/ScorecardRadarChart'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ScorecardPillarTick', () => {
  it('renders a single text element for single-word labels', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick x={50} y={50} payload={{ value: 'Self' }} textAnchor="middle" />
      </svg>
    )
    expect(container.querySelectorAll('tspan')).toHaveLength(0)
    expect(container.querySelector('text')).toHaveTextContent('Self')
  })

  it('renders two tspan lines for "Domain Expertise"', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick x={50} y={50} payload={{ value: 'Domain Expertise' }} textAnchor="end" />
      </svg>
    )
    const tspans = container.querySelectorAll('tspan')
    expect(tspans).toHaveLength(2)
    expect(tspans[0]).toHaveTextContent('Domain')
    expect(tspans[1]).toHaveTextContent('Expertise')
  })

  it('shows pointer cursor when onPillarClick is provided', () => {
    const { container } = render(
      <svg>
        <ScorecardPillarTick
          x={50}
          y={50}
          payload={{ value: 'Self' }}
          textAnchor="middle"
          onPillarClick={vi.fn()}
        />
      </svg>
    )
    const g = container.querySelector('g')!
    expect(g.getAttribute('style')).toContain('pointer')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/components/app/ScorecardRadarChart.test.tsx
```

Expected: FAIL — `ScorecardPillarTick` is not exported yet.

- [ ] **Step 3: Replace ScorecardRadarChart.tsx**

Replace the full contents of `components/app/ScorecardRadarChart.tsx` with:

```tsx
'use client'
import { useState, useCallback } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PILLAR_LABELS, type Pillar } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface Props {
  pillarScores: PillarScore[]
  showManager: boolean
  onPillarClick?: (pillar: Pillar) => void
}

const PILLAR_LABEL_TO_KEY: Record<string, Pillar | undefined> = Object.fromEntries(
  Object.entries(PILLAR_LABELS).map(([k, v]) => [v, k as Pillar])
)

export interface ScorecardPillarTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  textAnchor?: 'middle' | 'start' | 'end' | 'inherit'
  onPillarClick?: (pillar: Pillar) => void
}

export function ScorecardPillarTick({
  x = 0,
  y = 0,
  payload,
  textAnchor = 'middle',
  onPillarClick,
}: ScorecardPillarTickProps) {
  const [hovered, setHovered] = useState(false)
  const label = payload?.value ?? ''
  const pillarKey = PILLAR_LABEL_TO_KEY[label]
  const xNum = Number(x)
  const yNum = Number(y)
  const words = label.split(' ')
  const isTwoLine = words.length === 2
  const rectX = textAnchor === 'end' ? xNum - 64 : textAnchor === 'start' ? xNum : xNum - 32
  const rectHeight = isTwoLine ? 28 : 20
  const fill = hovered ? '#f59e0b' : '#94a3b8'

  return (
    <g
      style={{ cursor: onPillarClick ? 'pointer' : 'default', pointerEvents: 'all' }}
      onClick={() => pillarKey && onPillarClick?.(pillarKey)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <rect x={rectX} y={yNum - rectHeight / 2} width={64} height={rectHeight} fill="transparent" />
      {isTwoLine ? (
        <text x={x} y={y} fill={fill} fontSize={11} textAnchor={textAnchor}>
          <tspan x={x} dy="-7">{words[0]}</tspan>
          <tspan x={x} dy="14">{words[1]}</tspan>
        </text>
      ) : (
        <text x={x} y={y} fill={fill} fontSize={11} textAnchor={textAnchor} dominantBaseline="central">
          {label}
        </text>
      )}
    </g>
  )
}

export function ScorecardRadarChart({ pillarScores, showManager, onPillarClick }: Props) {
  const tickRenderer = useCallback(
    (props: ScorecardPillarTickProps) => <ScorecardPillarTick {...props} onPillarClick={onPillarClick} />,
    [onPillarClick]
  )

  const data = pillarScores.map(ps => ({
    pillar: PILLAR_LABELS[ps.pillar],
    Self: Number(ps.selfScore.toFixed(2)),
    Manager: ps.managerScore !== undefined ? Number(ps.managerScore.toFixed(2)) : undefined,
  }))

  return (
    <div style={{ cursor: 'default' }}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="pillar"
            tick={tickRenderer}
          />
          <Radar
            name="Self"
            dataKey="Self"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          {showManager && (
            <Radar
              name="Manager"
              dataKey="Manager"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.12}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {showManager && (
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Run the new tests**

```bash
npx vitest run __tests__/components/app/ScorecardRadarChart.test.tsx
```

Expected: 3 PASS, 0 FAIL

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: 171 PASS, 0 FAIL

- [ ] **Step 6: Commit**

```bash
git add components/app/ScorecardRadarChart.tsx __tests__/components/app/ScorecardRadarChart.test.tsx
git commit -m "feat: radar label wrap, scoped cursor, amber hover colour"
```

---

### Task 3: Move "Score History — All Rounds" to centre column

**Files:**
- Modify: `components/dashboard/DashboardResults.tsx`

- [ ] **Step 1: Update DashboardResults.tsx**

In `components/dashboard/DashboardResults.tsx`, make two edits:

**Edit A** — add `flex flex-col gap-4` to `<main>` and append `<PillarHistoryChart>` inside it. Replace:

```tsx
        {/* Centre: Pillar accordion */}
        <main className="min-w-0">
          <PillarAccordion
            pillars={pillarsForAccordion}
            openPillar={openPillar}
            onOpenChange={setOpenPillar}
          />
        </main>
```

with:

```tsx
        {/* Centre: Pillar accordion + history chart */}
        <main className="min-w-0 flex flex-col gap-4">
          <PillarAccordion
            pillars={pillarsForAccordion}
            openPillar={openPillar}
            onOpenChange={setOpenPillar}
          />
          <PillarHistoryChart data={historyData} />
        </main>
```

**Edit B** — remove the standalone `<PillarHistoryChart>` below the grid. Replace:

```tsx
      {/* Full-width history chart — only when ≥ 2 rounds */}
      <PillarHistoryChart data={historyData} />
    </div>
```

with:

```tsx
    </div>
```

- [ ] **Step 2: Run full suite**

```bash
npx vitest run
```

Expected: 171 PASS, 0 FAIL

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardResults.tsx
git commit -m "feat: move score history chart to centre column"
```

---

### Task 4: "Start new round" as amber button inside ScheduleWidget

**Files:**
- Create: `__tests__/components/app/ScheduleWidget.test.tsx`
- Modify: `components/app/ScheduleWidget.tsx`
- Modify: `components/dashboard/DashboardResults.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/app/ScheduleWidget.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScheduleWidget } from '@/components/app/ScheduleWidget'

vi.mock('@/app/(app)/dashboard/actions', () => ({
  setScheduledRoundAction: vi.fn(),
  cancelScheduledRoundAction: vi.fn(),
}))

vi.mock('@/lib/countdown', () => ({
  daysUntil: vi.fn().mockReturnValue(5),
  countdownLabel: vi.fn().mockReturnValue('in 5 days'),
  googleCalendarUrl: vi.fn().mockReturnValue('https://calendar.google.com/fake'),
}))

describe('ScheduleWidget', () => {
  it('shows "Start new round" link when showStartNewRound is true and no scheduled date', () => {
    render(<ScheduleWidget scheduled={null} showStartNewRound={true} />)
    const link = screen.getByRole('link', { name: /start new round/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/scorecard')
  })

  it('does not show "Start new round" link when showStartNewRound is false', () => {
    render(<ScheduleWidget scheduled={null} showStartNewRound={false} />)
    expect(screen.queryByRole('link', { name: /start new round/i })).not.toBeInTheDocument()
  })

  it('shows "Start new round" link when showStartNewRound is true and a date is scheduled', () => {
    const scheduled = {
      id: '1',
      user_id: 'u1',
      scheduled_date: '2026-08-01',
      created_at: '2026-05-01',
    }
    render(<ScheduleWidget scheduled={scheduled} showStartNewRound={true} />)
    const link = screen.getByRole('link', { name: /start new round/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/scorecard')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/components/app/ScheduleWidget.test.tsx
```

Expected: FAIL — `ScheduleWidget` does not accept `showStartNewRound` yet.

- [ ] **Step 3: Replace ScheduleWidget.tsx**

Replace the full contents of `components/app/ScheduleWidget.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Pencil, X, Calendar } from 'lucide-react'
import type { ScheduledRound } from '@/lib/db/scheduled-rounds'
import { setScheduledRoundAction, cancelScheduledRoundAction } from '@/app/(app)/dashboard/actions'
import { daysUntil, countdownLabel, googleCalendarUrl } from '@/lib/countdown'

interface ScheduleWidgetProps {
  scheduled: ScheduledRound | null
  showStartNewRound?: boolean
}

export function ScheduleWidget({ scheduled, showStartNewRound = false }: ScheduleWidgetProps) {
  const [editing, setEditing] = useState(false)

  if (!scheduled || editing) {
    return (
      <div className="rounded-xl bg-slate-800 px-5 py-4">
        <h3 className="mb-1 text-sm font-semibold text-white">Schedule your next reflection</h3>
        <p className="mb-3 text-xs text-slate-400">
          Set a date to remind yourself to complete your next round.
        </p>
        <form
          action={async (fd: FormData) => {
            await setScheduledRoundAction(fd)
            setEditing(false)
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="scheduled_date" className="sr-only">
            Reflection date
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            required
            defaultValue={scheduled?.scheduled_date ?? ''}
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-400"
            >
              Set date
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {showStartNewRound && (
          <Link
            href="/scorecard"
            className="mt-3 block text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Start new round →
          </Link>
        )}
      </div>
    )
  }

  const days = daysUntil(scheduled.scheduled_date)
  const label = countdownLabel(days)
  const gcalUrl = googleCalendarUrl(scheduled.scheduled_date)

  return (
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Next reflection</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(scheduled.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit date"
            className="rounded p-1 text-slate-500 hover:text-slate-300"
          >
            <Pencil size={13} />
          </button>
          <form action={cancelScheduledRoundAction}>
            <button
              type="submit"
              aria-label="Cancel scheduled round"
              className="rounded p-1 text-slate-500 hover:text-red-400"
            >
              <X size={13} />
            </button>
          </form>
        </div>
      </div>

      <div
        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <Calendar size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400">{label}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-white"
        >
          Add to Google Calendar →
        </a>
        <a
          href="/api/export-ical"
          className="text-xs text-slate-400 hover:text-white"
        >
          Download .ics →
        </a>
        {showStartNewRound && (
          <Link
            href="/scorecard"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Start new round →
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update DashboardResults.tsx — wire prop and remove old link**

In `components/dashboard/DashboardResults.tsx`:

**Edit A** — pass `showStartNewRound` to `ScheduleWidget`. Replace:

```tsx
          <ScheduleWidget scheduled={scheduled} />
```

with:

```tsx
          <ScheduleWidget scheduled={scheduled} showStartNewRound={showStartNewRound} />
```

**Edit B** — remove the old standalone link. Delete these lines:

```tsx
          {showStartNewRound && (
            <Link
              href="/scorecard"
              className="text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Start new round →
            </Link>
          )}
```

Also remove the now-unused `Link` import from `next/link` if it is no longer used elsewhere in `DashboardResults.tsx`. (Check: `DashboardResults.tsx` uses `Link` in the "Invite your manager" card's `Connect →` link — keep the import.)

- [ ] **Step 5: Run the new tests**

```bash
npx vitest run __tests__/components/app/ScheduleWidget.test.tsx
```

Expected: 3 PASS, 0 FAIL

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: 174 PASS, 0 FAIL

- [ ] **Step 7: Commit**

```bash
git add components/app/ScheduleWidget.tsx components/dashboard/DashboardResults.tsx __tests__/components/app/ScheduleWidget.test.tsx
git commit -m "feat: start new round button in ScheduleWidget, amber styled"
```

---

## Summary

| Task | Files | Tests |
|------|-------|-------|
| 1 — Focus ring fix | `globals.css` | — |
| 2 — Radar label / cursor / hover | `ScorecardRadarChart.tsx` | +3 |
| 3 — History chart to centre column | `DashboardResults.tsx` | — |
| 4 — Start new round in widget | `ScheduleWidget.tsx`, `DashboardResults.tsx` | +3 |

Baseline: 168 PASS. Final: 174 PASS.
