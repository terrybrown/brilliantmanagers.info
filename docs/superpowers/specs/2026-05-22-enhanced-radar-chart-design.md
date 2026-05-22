# Enhanced Radar Chart Design

**Date:** 2026-05-22  
**Status:** Approved  
**Scope:** `ScorecardRadarChart`, `lib/reflections.ts`, three call sites, test suite

## Goal

Enhance the existing recharts radar chart to support:

1. Both series (self + manager) visible simultaneously, each independently togglable via legend
2. Score number pinned at every vertex — always visible, colour-coded per series
3. Hover tooltip showing pillar aggregate + per-skill breakdown for both series
4. Pillar click event fires on the label text **and** on the score dot

All changes stay within the existing recharts library — no new dependencies.

---

## 1. Data model — `lib/reflections.ts`

### New types

```ts
export interface SkillScore {
  skillKey: string  // e.g. 'strategy-vision-creation'
  label: string     // e.g. 'Strategy & Vision Creation'
  level: Level      // e.g. 'Advanced'
}
```

### Updated `RadarPillarScore`

```ts
export interface RadarPillarScore {
  pillar: Pillar
  selfScore: number
  selfScored: boolean
  selfSkills: SkillScore[]       // per-skill breakdown for self
  managerScore?: number
  managerSkills?: SkillScore[]   // per-skill breakdown for manager; undefined when no manager data
}
```

### Updated `computePillarScores`

Signature unchanged. After computing averages, also populate `selfSkills` and `managerSkills` by joining each `Score` / `ManagerScore` record with the corresponding `Skill.label` via `SKILLS`.

```ts
// pseudocode — implementation derives from existing pillarAvg logic
const pillarSkills = getSkillsByPillar(pillar)

selfSkills = pillarSkills
  .flatMap(skill => {
    const match = scores.find(s => s.skill_key === skill.key)
    return match ? [{ skillKey: skill.key, label: skill.label, level: match.level }] : []
  })

managerSkills = pillarSkills
  .flatMap(skill => {
    const match = mgrScores.find(ms => ms.skill_key === skill.key)
    return match ? [{ skillKey: skill.key, label: skill.label, level: match.level }] : []
  })
// managerSkills is undefined (not []) when no manager scores exist for the pillar
```

---

## 2. `ScorecardRadarChart.tsx`

### Props

```ts
interface Props {
  pillarScores: RadarPillarScore[]  // imported from lib/reflections
  onPillarClick?: (pillar: Pillar) => void
  // showManager removed — chart owns series visibility internally
}
```

### Internal state

```ts
const [hidden, setHidden] = useState<Set<'Self' | 'Manager'>>(new Set())
```

### Series visibility

Always render both `<Radar>` components when manager data is present (i.e. any `managerScore !== undefined`). Control visibility by setting `stroke`, `fill`, and `fillOpacity` to transparent for hidden series, rather than conditional rendering — this avoids layout reflow on toggle.

When a series is hidden its score labels are also suppressed (the label render function returns `null`).

### Legend toggle

Use recharts `<Legend onClick>` to toggle entries in `hidden`. The legend item for the hidden series should be visually dimmed. Both series appear in the legend whenever manager data is present; only the self legend is shown if there are no manager scores.

### Score labels at vertices

Use the `label` prop on each `<Radar>`:

- Self labels: amber (`#f59e0b`), 10 px monospace, rendered 10 px above/outside the dot
- Manager labels: purple (`#a78bfa`), 9 px monospace, rendered slightly inward so they don't overlap self labels
- When `selfScored` is false for a pillar, render `—` instead of a number
- Return `null` from the render function when that series is hidden

Recharts passes `{ x, y, value, index }` to the label function; `index` maps back to `pillarScores[index]` to retrieve `selfScored`.

### Clickable score dots

Use the `dot` prop on **both** `<Radar>` components to render a custom SVG `<circle>` with:
- A larger invisible hit-area circle (r=10, fill transparent)
- The visible dot on top (r=4 for self, r=3.5 for manager)
- `cursor: pointer` and `onClick={() => onPillarClick?.(pillarScores[index].pillar)}`

Both self and manager dots represent the same pillar, so both fire the same event.

### Hover tooltip

```tsx
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const ps = pillarScores.find(p => PILLAR_LABELS[p.pillar] === label)
    return ps ? <PillarTooltip pillarScore={ps} hidden={hidden} /> : null
  }}
/>
```

### `PillarTooltip` sub-component (new, in same file)

Props: `{ pillarScore: RadarPillarScore, hidden: Set<'Self' | 'Manager'> }`

Renders:
- Pillar name as heading
- For each visible series (self / manager):
  - Series colour indicator, aggregate score as `N / 5`, level name (e.g. `Advanced`)
  - List of skills with their individual level names
  - Skills from `managerSkills` that don't appear in `selfSkills` (or vice versa) are omitted rather than shown as blank — only scored skills appear
- If a series is hidden (in `hidden` set), its section is omitted from the tooltip

Dark styled card, matching existing dark theme (`#1e293b` background, `#334155` border).

---

## 3. Call site migrations

Three files need updating. In each, the import of the local `PillarScore` interface is removed in favour of `RadarPillarScore` from `lib/reflections`, and `showManager` is dropped.

| File | Current | After |
|---|---|---|
| `app/(app)/reflections/[id]/page.tsx` | `<ScorecardRadarChart showManager={…} />` | `<ScorecardRadarChart pillarScores={…} />` |
| `components/app/ResultsView.tsx` | `<ScorecardRadarChart showManager={…} />` | `<ScorecardRadarChart pillarScores={…} />` |
| `components/dashboard/DashboardResults.tsx` | `<RadarWithToggle hasManagerScores={…} />` | `<ScorecardRadarChart pillarScores={…} />` |

Each of these already calls `computePillarScores` (or receives its output from a parent) — the enriched type is a backwards-compatible superset, so call sites only need to update the prop and remove the local type alias.

---

## 4. Delete `RadarWithToggle.tsx`

`components/app/RadarWithToggle.tsx` is fully superseded. Delete the file and remove all imports of it. No other file imports it after the migration above.

---

## 5. Test plan

### Existing tests

`__tests__/components/app/ScorecardRadarChart.test.tsx` currently covers `ScorecardPillarTick`. These tests continue to pass unchanged.

### New tests required

| Behaviour | Test approach |
|---|---|
| Score label shows rounded number when pillar is scored | Render chart with `selfScored: true`, assert text content |
| Score label shows `—` when pillar is not scored | Render chart with `selfScored: false`, assert `—` |
| Manager score labels absent when no manager data | Render with `managerScore: undefined` on all pillars, assert no purple labels |
| Legend toggle hides self series | Click Self legend item, assert amber polygon opacity is 0 (or equivalent invisible state) |
| Legend toggle hides manager series | Click Manager legend item, assert purple polygon invisible |
| Toggled series score labels suppressed | After toggle, assert score label text not present for hidden series |
| Dot click fires `onPillarClick` | Click self dot for Strategy pillar, assert callback called with `'strategy'` |
| Tooltip shows skill breakdown | Simulate hover on Strategy vertex, assert skill names and levels present in tooltip |
| Tooltip omits hidden series | Toggle Manager off, hover, assert manager section absent from tooltip |

---

## What does not change

- `ScorecardPillarTick` — pillar label click behaviour unchanged
- `PolarGrid`, chart dimensions, colour tokens — unchanged
- `SkillBarChart`, `PillarHistoryChart`, `ReflectionsTrendChart` — unaffected
- Supabase data layer — no schema changes
