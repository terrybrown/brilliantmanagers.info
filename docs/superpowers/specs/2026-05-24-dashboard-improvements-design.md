# Dashboard Improvements — Design Spec

**Date:** 2026-05-24  
**Status:** Approved

## Overview

Improve the self-assessment dashboard to surface manager scores alongside self scores throughout — in the left-column summary, in the pillar accordion (collapsed and expanded), and in an interactive history chart. Extend the manager strip so fully-scored direct reports link to a read-only view of their dashboard as the DR sees it.

---

## 1. Left Column

### 1a. Remove ScoreSparkline

Remove the `<ScoreSparkline>` component from the left column entirely. It is redundant with the full `PillarHistoryChart` already shown in the centre column, and adds no distinct value.

**File:** `components/dashboard/DashboardResults.tsx`

### 1b. Manager Overall Score Box

When `hasManagerScores` is true, render a second score box below the existing "Overall score" box. Use the same card design (`rounded-xl px-4 py-3 text-center`) but purple-tinted:

- Background: `bg-slate-800` (same as self)
- Score value: `text-purple-400` (to match the manager colour palette used elsewhere)
- Label: "Manager score"
- Date: same `roundDate` as the self score box

**Data needed:** `overallManagerAvg` — compute in `DashboardPage` from `managerScores` using the same `LEVEL_VALUES` average as `overallAvg`, then pass as a prop to `DashboardResults`.

---

## 2. Pillar Accordion — Collapsed Row

When manager scores are available, each pillar row gains a "Mgr X.X" pill badge immediately after the self score number.

**Treatment (Option C):**
- Pill: `font-size: 10px`, `font-weight: 700`, colour `#a78bfa` (purple-400), background `rgba(167,139,250,0.15)`, `border-radius: 99px`, padding `2px 7px`
- Text: `Mgr {managerPillarAvg.toFixed(1)}`
- Only rendered when a manager score exists for that pillar

**Data needed:** `PillarData` interface gains an optional `managerScore?: number` field. Populated in `DashboardPage` from `pillarScoresForRadar` (which already computes `managerScore` per pillar in `computePillarScores`).

**File:** `components/app/PillarAccordion.tsx`, `app/(app)/dashboard/page.tsx`

---

## 3. Pillar Accordion — Expanded Detail

### 3a. Show all skills

Currently only skills with `chipType !== null` (goals or opportunities) appear in the expanded section. Change to show **all skills** in the pillar, in three ordered sections:

1. **Active Goals** — skills with `chipType === 'goal'` (unchanged from today)
2. **Opportunities** — skills with `chipType === 'opportunity'` (unchanged from today)
3. **All skills** — every remaining skill (those with `chipType === null`), under a muted section header

The "All skills" section header uses: icon `📋`, label text `All skills`, colour `#64748b`.

### 3b. Self + Manager score per skill (Option B)

Every skill row — in all three sections — shows stacked score badges on the right:

```
You    [Expert]     ← amber, using LEVEL_COLORS[level]
Mgr    [Advanced]   ← purple (#a78bfa), using LEVEL_COLORS[managerLevel]
```

- Both rows: `font-size: 10px`, label "You" / "Mgr" in `#94a3b8`
- Level chip: `font-size: 10px`, `padding: 1px 5px`, `border-radius: 4px`, `background: rgba(0,0,0,0.35)`, colour from `LEVEL_COLORS[level]`
- The "Mgr" row is only rendered when a manager score exists for that skill
- "All skills" rows show the skill description (same `skill.description` field already on `SkillData`) but no action links ("Make goal →" / "In Growth →")
- Goals and opportunities retain their existing action links

**Data needed:** `SkillData` interface gains `managerLevel?: Level` and `managerScore?: number`. Populated in `DashboardPage` when building `pillarsForAccordion` by looking up each skill's key in the `managerScores` array.

**File:** `components/app/PillarAccordion.tsx`, `app/(app)/dashboard/page.tsx`

---

## 4. Interactive Score History Chart

Replace the static `PillarHistoryChart` with an interactive version.

### 4a. Controls layout (Option A)

Above the chart, a single flex row:

```
[Overall] [Self] [Team] [Strategy] [Comms] [Expertise]  |  ● Show Manager Score
```

- Each pillar item is a pill toggle button in its own colour (matching existing `PILLAR_LINES` colours)
- `Overall` uses amber (`#f59e0b`)
- A vertical divider (`1px` `#334155`, `18px` tall) separates pillar pills from the manager toggle
- "Show Manager Score" is a pill button: purple (`#a78bfa`), with a filled dot prefix

**Default state on mount:** only `Overall` is active; "Show Manager Score" is **on**.

### 4b. Toggle behaviour

- Clicking a pillar pill toggles that pillar's self line on/off
- When "Show Manager Score" is on and a pillar is active, its manager line (dashed, purple-tinted, `strokeWidth: 1`, `strokeDasharray: "4 2"`) is also shown
- When "Show Manager Score" is off, all manager lines are hidden regardless of active pillars
- The `Overall` toggle controls the overall self line; when "Show Manager Score" is on and `Overall` is active, an overall manager line is also shown (dashed purple)

### 4c. Manager history data

The `HistoryPoint` type gains optional manager fields:

```ts
mgr_overall?: number
mgr_self?: number
mgr_team?: number
mgr_strategy?: number
mgr_communications?: number
'mgr_domain-expertise'?: number
```

(This mirrors the existing `TrendPoint` interface in `lib/reflections.ts` which already defines these fields — reuse that shape.)

In `DashboardPage`, build `managerHistoryData` using `getManagerScoresForAllRounds(allRoundIds)` (function already exists in `lib/db/manager-scores.ts`). Merge into the existing `historyData` array by round.

**File:** `components/app/PillarHistoryChart.tsx`, `app/(app)/dashboard/page.tsx`

---

## 5. Manager Strip → DR View

### 5a. Fully-scored DR cards become links

In `ManagerStrip`, `DrCard` for `managerScoringStatus === 'complete'` is currently a non-interactive `<div>`. Change to a `<Link>` pointing to the new DR view route:

```
/dr/[userId]?roundId=[roundId]
```

### 5b. New route: `/dr/[userId]`

Create `app/(app)/dr/[userId]/page.tsx`.

**Auth & access:** Verify the logged-in user is a manager of `userId` (same connection check as `/manager/[userId]`). If not, 404.

**Data fetching:** Same as `DashboardPage` but for the DR's data:
- `getAllCompleteRoundsWithScores(userId)` — DR's self scores across all rounds
- `getManagerScoresForDirectReport(latestRound.id)` — the logged-in manager's scores for that DR (already gated on round being complete)
- `getManagerScoresForAllRounds(allRoundIds)` — for history chart manager lines
- DR's profile for display name / avatar

**Rendering:** Render `DashboardResults` (with all the improvements from sections 1–4) with the DR's data. Pass `isReadOnly={true}` to suppress the action cards (ActiveRoundCard, GrowthSummaryCard, CheckInNudgeCard, InviteManagerModal).

Add a back link at the top: `← Dashboard` linking to `/dashboard`.

**Note:** `getManagerScoresForDirectReport` is already RLS-safe — it only returns scores once the round is complete, and only to the authenticated user's own scores for that round.

---

## 6. Files Changed

| File | Change |
|---|---|
| `app/(app)/dashboard/page.tsx` | Compute `overallManagerAvg`; add `managerScore` to `PillarData` skills; build manager history data |
| `components/dashboard/DashboardResults.tsx` | Remove `ScoreSparkline`; add manager score box; update props |
| `components/app/PillarAccordion.tsx` | Mgr pill in collapsed header; all-skills expanded section; You/Mgr score badges |
| `components/app/PillarHistoryChart.tsx` | Add interactive toggle controls; manager lines; accept manager history data |
| `components/dashboard/ManagerStrip.tsx` | Fully-scored DR cards become `<Link>` to `/dr/[userId]` |
| `app/(app)/dr/[userId]/page.tsx` | New page — DR view for managers |

---

## 7. Out of Scope

- No changes to the scoring flow at `/manager/[userId]`
- No changes to the radar chart
- No new database migrations required (all data already exists)
- No changes to the right-column action cards on the self dashboard
