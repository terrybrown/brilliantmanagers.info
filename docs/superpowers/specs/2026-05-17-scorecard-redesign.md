# Scorecard Redesign

**Date:** 2026-05-17
**Branch:** to be created from master

## Goal

Replace the current two-page scorecard flow (pillar list → pillar detail) with a single three-column page: pillar nav with progress on the left, skill scoring in the middle, and rich guide content on the right. Clicking any skill (header or rating button) loads that skill's guide content in the right panel.

---

## Layout

Three columns, always visible on desktop (≥768px):

| Column | Width | Content |
|---|---|---|
| Left | 180px fixed | Pillar nav with progress bars |
| Middle | flex-1 | Skill cards for active pillar |
| Right | 320px fixed | Guide content for active skill |

**Mobile (<768px):**
- Left nav collapses to a horizontally-scrollable tab row above the content area
- Right panel is hidden; a "Read guide →" link on the active skill card opens a bottom sheet with the guide content

---

## Interactions

### Pillar nav (left)
- `Self` is selected by default on page load
- Clicking a pillar switches the middle column to that pillar's skills
- Switching pillar restores the last active skill for that pillar (if any), or shows the right panel empty state if none
- Each pillar button shows: label, thin progress bar (scored/total), "X/Y scored" count
- Complete pillar: green checkmark replaces the count

### Skill cards (middle)
- Each skill card: clickable label header + row of 5 rating buttons
- Clicking the **header** → sets that skill as active (loads guide, no score change)
- Clicking a **rating button** → saves the score AND sets that skill as active (loads guide)
- Active skill: amber border on the card
- Scored skill: selected rating stays highlighted; clicking another rating updates the score
- Scores auto-save on click via server action (same as current behaviour)

### Guide panel (right)
- **Empty state:** "Select a skill to read the guide" with a muted prompt
- **Loaded state:** skill title (amber), then five sections in order:
  1. Definition
  2. Why It Matters
  3. This Is Strong When
  4. Warning Signs
  5. Pathways to Improvement
- Each section: small-caps label + body text
- Panel scrolls independently from the middle column
- No close button — clicking another skill replaces the content

---

## Guide Content Parsing

### `lib/guide-content.ts`

New file. Exports `getSkillGuideContent(skillKey: string)`.

**Algorithm:**
1. Map `skillKey` → pillar → MDX file path (e.g. `self-empathy-compassion` → `content/guide/self.mdx`)
2. Read the MDX file from disk
3. Scan for the `<details>` block whose `<summary>` text fuzzy-matches the skill label (normalise `&` → `and`, lowercase, trim)
4. Extract the content between `<details>` and `</details>`
5. Parse the five sections by `####` headings
6. Return a typed object: `{ definition, whyItMatters, strongWhen, warningSigns, pathways }`

**Caching:** Wrap in Next.js `unstable_cache` with a static key derived from `skillKey`. Content is static — parsed once per build/restart.

**Failure mode:** If no matching `<details>` block is found, return `null`. The right panel shows a fallback: the short `description` from `lib/skills.ts` instead.

### Server action

New server action `getGuideContent(skillKey: string)` in `app/(app)/scorecard/actions.ts` (alongside the existing score-save action). The `GuidePanel` client component calls this when the active skill changes.

---

## Routing Changes

| Before | After |
|---|---|
| `/scorecard` — pillar list | `/scorecard` — full 3-column layout |
| `/scorecard/[pillar]` — pillar detail | Deleted; redirects to `/scorecard` |

The `app/(app)/scorecard/[pillar]/` directory is removed. A Next.js redirect in `next.config.ts` handles any bookmarked `/scorecard/[pillar]` URLs:

```ts
{ source: '/scorecard/:pillar', destination: '/scorecard', permanent: false }
```

---

## Component Breakdown

| File | Type | Replaces |
|---|---|---|
| `app/(app)/scorecard/page.tsx` | Server component | Existing scorecard list page |
| `app/(app)/scorecard/actions.ts` | Server actions | Existing `[pillar]/actions.ts` (move + add guide action) |
| `components/app/scorecard/ScorecardShell.tsx` | Client | New — holds `activePillar` + `activeSkill` state |
| `components/app/scorecard/PillarNav.tsx` | Client | New — left column |
| `components/app/scorecard/SkillList.tsx` | Client | Replaces `ScoringView` |
| `components/app/scorecard/GuidePanel.tsx` | Client | New — right column |
| `lib/guide-content.ts` | Server utility | New |

`components/app/ScoringView.tsx` is retired once `SkillList` is complete.

---

## Data Flow

```
page.tsx (server)
  └─ fetches round + all scores (existing pattern)
  └─ renders ScorecardShell with: roundId, allScores, initialPillar="self"

ScorecardShell (client)
  ├─ state: activePillar, activeSkill
  ├─ PillarNav — receives pillarScores, onPillarChange
  ├─ SkillList — receives skills, pillarScores, roundId, activeSkill, onSkillActivate, onScore
  └─ GuidePanel — receives activeSkill; calls getGuideContent(activeSkill) server action
```

---

## Out of Scope

- Mobile bottom sheet for guide content (ship desktop first; mobile is a follow-up)
- Any changes to the Results page or radar chart
- Any changes to the guide MDX content itself
- Pillar-level summary text in the guide panel
- "Next pillar" navigation between pillars
