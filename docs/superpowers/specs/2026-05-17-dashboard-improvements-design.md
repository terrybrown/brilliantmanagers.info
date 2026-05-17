# Dashboard Improvements — Design Spec

**Date:** 2026-05-17  
**Branch:** feat/dashboard-improvements (to be created)  
**Status:** Approved, ready for implementation

## Overview

Three related improvements to the dashboard:

1. Larger radar chart, clickable pillar labels, no focus ring
2. Per-pillar delta badges in the accordion (trend B)
3. Overall score sparkline in the left sidebar (trend A)
4. Full pillar history chart below the main grid (trend C)

All data is fetched server-side; no client-side API calls are introduced.

---

## 1. Data Layer

### New function: `getAllCompleteRoundsWithScores(userId)`

**Location:** `lib/db/rounds.ts`

Fetches all complete rounds for the user ordered by `completed_at` ascending, then fetches scores for all of them in a single batch query (filtering by `round_id IN (...)` — not N+1).

**Return type:**
```ts
{ round: Round; scores: Score[] }[]
```

### Derived data computed in `page.tsx`

From the returned array, the server page computes:

| Name | Type | Used by |
|---|---|---|
| `sparklineData` | `{ date: string; score: number }[]` | `ScoreSparkline` |
| `prevPillarScores` | `Record<Pillar, number> \| null` | `PillarAccordion` delta badges |
| `historyData` | `{ date: string; overall: number; [pillar: Pillar]: number }[]` | `PillarHistoryChart` |

`sparklineData` and `historyData` include all complete rounds (≥ 1 entry each).  
`prevPillarScores` is the second-to-last round's per-pillar averages, or `null` if fewer than 2 rounds exist.

The existing `getPreviousCompleteRound` call and the `trend` delta chip are removed and replaced by the sparkline.

---

## 2. Radar Chart

### Files changed
- `components/app/RadarWithToggle.tsx`
- `components/app/ScorecardRadarChart.tsx`

### Changes

**Size:** Remove `style={{ height: 200 }}` from the wrapper div in `RadarWithToggle`. The `ResponsiveContainer` already declares `height={280}`; removing the clipping wrapper lets it render at full height.

**Focus ring:** Add `style={{ outline: 'none' }}` to the `<RadarChart>` element. Recharts passes this through to the SVG, eliminating the blue browser focus indicator on click.

**Clickable labels:** Replace the static `tick` object on `PolarAngleAxis` with a custom tick component:

```tsx
function PillarTick({ x, y, payload, onPillarClick }) {
  const pillarKey = PILLAR_LABEL_TO_KEY[payload.value] // inverted PILLAR_LABELS map
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onPillarClick?.(pillarKey)}>
      <text x={x} y={y} fill="#94a3b8" fontSize={11} textAnchor="middle" dominantBaseline="central">
        {payload.value}
      </text>
    </g>
  )
}
```

`PILLAR_LABEL_TO_KEY` is a module-level constant derived by inverting `PILLAR_LABELS`. The `PillarTick` component itself must also be defined at module level (not inside the render function) so Recharts does not get a new function reference on every render, which would break its internal diffing.

**New prop:**
```ts
// ScorecardRadarChart
onPillarClick?: (pillar: Pillar) => void

// RadarWithToggle  
onPillarClick?: (pillar: Pillar) => void
```

`RadarWithToggle` threads `onPillarClick` through to `ScorecardRadarChart`.

---

## 3. Shared State — `DashboardResults`

### New file: `components/dashboard/DashboardResults.tsx`

A `'use client'` component that owns the `openPillar` interaction state and renders the 3-column grid.

**Props received from `page.tsx`:**
```ts
interface DashboardResultsProps {
  pillarScoresForRadar: PillarScore[]
  hasManagerScores: boolean
  pillarsForAccordion: PillarData[]   // PillarData now includes prevScore?: number
  sparklineData: { date: string; score: number }[]
  historyData: HistoryPoint[]
  overallAvg: number
  roundDate: string
  // right-column props passed through
  scheduled: ScheduledRound | null
  plans: DevelopmentPlan[]
  overdueCount: number
  showStartNewRound: boolean
}
```

**State:**
```ts
const [openPillar, setOpenPillar] = useState<string | null>(null)
```

**Wiring:**
- `onPillarClick={setOpenPillar}` → `RadarWithToggle`
- `openPillar` + `onOpenChange={setOpenPillar}` → `PillarAccordion`

`page.tsx` does all data fetching as today, constructs these props, and renders `<DashboardResults ... />` in place of the current 3-column grid JSX.

---

## 4. `PillarAccordion` — Delta Badges

### File changed: `components/app/PillarAccordion.tsx`

**`PillarData` interface addition:**
```ts
prevScore?: number   // previous round's pillar average; absent if < 2 rounds
```

**Props become controlled:**
```ts
interface PillarAccordionProps {
  pillars: PillarData[]
  openPillar: string | null          // controlled from DashboardResults
  onOpenChange: (pillar: string | null) => void
}
```

Internal `useState` is removed. The accordion header's `onClick` calls `onOpenChange(isOpen ? null : pillar.pillar)`.

**Delta badge rendering** (in the header row, after the score number):

```tsx
{pillar.prevScore !== undefined && pillar.score !== pillar.prevScore && (
  <span style={{
    background: delta > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
    color: delta > 0 ? '#4ade80' : '#f87171',
    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
  }}>
    {delta > 0 ? '+' : ''}{delta.toFixed(1)}{delta > 0 ? '↑' : '↓'}
  </span>
)}
```

Where `delta = pillar.score - pillar.prevScore`.

---

## 5. New Components

### `ScoreSparkline` — `components/app/ScoreSparkline.tsx`

`'use client'` component. Renders a small SVG sparkline (no library — raw `<polyline>` + dots).

- **Props:** `data: { date: string; score: number }[]`
- **Renders:** nothing if `data.length < 2`
- **Visual:** scores mapped to Y (range 1–5 → height 0–36px), evenly spaced on X. Amber polyline, amber dots at each data point, faint date labels (first and last) below
- **Container:** same `rounded-xl bg-slate-800` card style as the score chip, sits below it in the left aside

Replaces the existing trend delta chip.

---

### `PillarHistoryChart` — `components/app/PillarHistoryChart.tsx`

`'use client'` component using Recharts `LineChart`.

- **Props:** `data: HistoryPoint[]` where `HistoryPoint = { date: string; overall: number; [pillar: string]: number }`
- **Renders:** nothing if `data.length < 2`
- **Placement:** below the 3-column grid in `DashboardResults`, full width
- **Lines:**
  - Overall — amber (`#f59e0b`), `strokeWidth={2.5}`, solid
  - Per pillar — distinct muted colours, `strokeWidth={1}`, dashed (`strokeDasharray="4 2"`)
  - Pillar colours: self `#3b82f6`, team `#a855f7`, strategy `#22c55e`, communications `#f97316`, expertise `#06b6d4`
- **Extras:** `<Tooltip>` showing all values for a given date, `<Legend>` below chart, `<CartesianGrid>` in `#1e293b`

---

## Layout after changes

```
Left aside (220px)
├── RadarWithToggle          ← taller (280px), labels clickable, no focus ring
├── Score chip               ← unchanged
└── ScoreSparkline           ← replaces trend delta chip; hidden if < 2 rounds

Centre main
└── PillarAccordion          ← controlled, delta badges per pillar

Right aside (260px)
└── unchanged

Below grid (full width, only if ≥ 2 rounds)
└── PillarHistoryChart
```

---

## What is not changing

- Right-column action cards (`ScheduleWidget`, `GrowthSummaryCard`, `CheckInNudgeCard`, invite card)
- Empty state (no rounds at all)
- Manager vs Self toggle on the radar
- Scorecard flow, DB schema, RLS policies
