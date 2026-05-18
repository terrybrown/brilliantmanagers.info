# Dashboard Polish — Design Spec

**Date:** 2026-05-17  
**Status:** Approved for implementation

## Summary

Five targeted improvements to the dashboard UI: a radar label line break, a persistent focus-ring bug fix, hover colour feedback on clickable radar labels, moving the history chart into the centre column, and promoting the "Start new round" link to a styled button inside the Next Reflection widget.

---

## Change 1 — Radar label: "Domain Expertise" line break

**File:** `components/app/ScorecardRadarChart.tsx` (`PillarTick`)

"Domain Expertise" is the only pillar label with a space. On the left axis position it extends far enough to crowd the chart. Fix: detect a space in the label and render two `<tspan>` lines, each shifted ±7px from the vertical centre. All other labels (Self, Team, Strategy, Communications) are single words and remain on one line.

Implementation detail: replace the single `<text>{label}</text>` with a branching render — single `<text>` for no-space labels, two `<tspan dy="-7"…>` / `<tspan dy="14"…>` for two-word labels. The `textAnchor` and hit-area `<rect>` remain unchanged; only the `rect` height expands to 28px for the two-line case to keep the click target generous.

---

## Change 2 — Fix radar focus ring (blue border)

**File:** `app/globals.css`

Commit `8983fd4` added `svg.recharts-surface:focus { outline: none }` but recharts places `tabIndex={0}` on the parent `.recharts-wrapper` div, not the SVG itself. Clicking the chart focuses that div, which produces the browser's blue focus ring.

Fix: add `.recharts-wrapper:focus { outline: none; }` alongside the existing SVG rule.

---

## Change 3 — Hover colour + pointer scoping on radar labels

**File:** `components/app/ScorecardRadarChart.tsx`

Two sub-changes:

1. **Scoped pointer cursor.** The whole chart currently inherits a pointer from recharts click handling. Wrap `ResponsiveContainer` in a `<div style={{ cursor: 'default' }}>` so the grid and polygon area show the default cursor. The individual label `<g>` elements in `PillarTick` already set `cursor: pointer` when `onPillarClick` is provided — this remains unchanged, so only hovering a label gives the hand cursor.

2. **Amber hover colour.** Add `useState(false)` (`hovered`) inside `PillarTick`. Attach `onMouseEnter={() => setHovered(true)}` and `onMouseLeave={() => setHovered(false)}` to the outer `<g>`. Change the SVG text `fill` from the static `#94a3b8` to `hovered ? '#f59e0b' : '#94a3b8'`. `PillarTick` is already a module-level component (not defined inside render), so adding hook state is safe.

---

## Change 4 — Move "Score History — All Rounds" to the centre column

**File:** `components/dashboard/DashboardResults.tsx`

Currently `<PillarHistoryChart />` sits below the 3-column grid as a full-width row. Move it inside the `<main>` (centre column) element, stacked below `<PillarAccordion />`. Add `flex flex-col gap-4` to `<main>` so the two stack with consistent spacing.

Remove the bottom-level `<PillarHistoryChart />` and the outer `flex flex-col gap-6` wrapper's dependency on it as a sibling. The chart only renders when there are ≥2 rounds (its own guard), so nothing shows if there is only one round.

---

## Change 5 — "Start new round" as amber button in Next Reflection widget

**Files:** `components/dashboard/DashboardResults.tsx`, `components/app/ScheduleWidget.tsx`

Currently: a plain slate text link `Start new round →` renders as the last item in the right column, outside the widget cards.

New behaviour:
- Remove the standalone link from `DashboardResults`.
- Add `showStartNewRound?: boolean` prop to `ScheduleWidget`.
- In both widget states (scheduled-date view and the date-picker form view), render the link at the bottom when `showStartNewRound` is true:

```tsx
{showStartNewRound && (
  <Link
    href="/scorecard"
    className="text-xs font-semibold text-amber-400 hover:text-amber-300"
  >
    Start new round →
  </Link>
)}
```

This matches the style of "Explore skills →" (`GrowthSummaryCard`) and "Connect →" (`DashboardResults`). Visibility logic (`showStartNewRound = !inProgress`) is unchanged.

---

## Files changed

| File | Change |
|------|--------|
| `components/app/ScorecardRadarChart.tsx` | Changes 1, 3 |
| `app/globals.css` | Change 2 |
| `components/dashboard/DashboardResults.tsx` | Changes 4, 5 |
| `components/app/ScheduleWidget.tsx` | Change 5 |

No data model, API, or routing changes. No new dependencies.

## Testing

- Radar chart: verify "Domain Expertise" wraps to two lines; other labels single-line; pointer only appears over labels; labels turn amber on hover; clicking a label still opens the accordion for that pillar.
- Focus ring: click anywhere on the radar chart; no blue outline should appear.
- History chart: with ≥2 rounds, chart appears in centre column below accordion, not spanning full width.
- Start new round: appears in the Next Reflection widget (both date-set and form states) styled in amber; does not appear when a round is in progress.
