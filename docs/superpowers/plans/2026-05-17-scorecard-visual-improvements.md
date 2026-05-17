# Scorecard Visual Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seven targeted improvements to the scorecard: rename "Needs Improvement" → "Developing" everywhere (including DB), add pillar icons and higher-contrast counts to the left nav, switch to an inline skill card layout with full level names and auto-advance, pre-fetch guide content server-side for instant display, auto-load the first skill on page load, and reorder the guide index page to match the scorecard.

**Architecture:** The level rename touches two independent constant files (`lib/skills.ts`, `config/scoring.ts`) plus a Supabase data migration; all downstream consumers update automatically via TypeScript. The guide content performance fix moves data fetching from a client-side server action call (one round-trip per click) to a server-side `Promise.all` at page render time, threading the result as a plain prop through `ScorecardShell` → `GuidePanel`. All other changes are isolated UI edits in individual components.

**Tech Stack:** Next.js 15 App Router, TypeScript, Vitest (unit tests only — no component test runner), Supabase (SQL migrations), inline styles + Tailwind, `lucide-react` icons.

---

## File Map

| File | Task | Change |
|---|---|---|
| `lib/skills.ts` | 1 | Rename key in LEVELS, LEVEL_VALUES, LEVEL_COLORS |
| `config/scoring.ts` | 1 | Rename key in SCORING_LEVELS, SCORING_LEVEL_DESCRIPTIONS, SCORING_LEVEL_COLORS |
| `components/tool/scorecard-preview.tsx` | 1 | Update hardcoded dummy data value |
| `supabase/migrations/007_rename_developing_level.sql` | 1 | Data migration |
| `__tests__/config/scoring.test.ts` | 1 | Update expected level name |
| `__tests__/components/guide/scoring-badge.test.tsx` | 1 | Update level name in fixtures/assertions |
| `components/app/scorecard/PillarNav.tsx` | 2 | Count contrast + GuideIcon |
| `components/app/scorecard/SkillList.tsx` | 3 | Inline layout + full labels + auto-advance |
| `app/(app)/scorecard/page.tsx` | 4 | Pre-fetch allGuideContent |
| `components/app/scorecard/ScorecardShell.tsx` | 4 | Accept allGuideContent prop; init first skill |
| `components/app/scorecard/GuidePanel.tsx` | 4 | Synchronous lookup from prop; remove server action |
| `app/(app)/scorecard/actions.ts` | 4 | Delete getGuideContent action |
| `lib/guide.ts` | 5 | Reorder GUIDE_SECTIONS |

---

## Task 1: Rename "Needs Improvement" → "Developing"

**Files:**
- Modify: `lib/skills.ts`
- Modify: `config/scoring.ts`
- Modify: `components/tool/scorecard-preview.tsx`
- Create: `supabase/migrations/007_rename_developing_level.sql`
- Modify: `__tests__/config/scoring.test.ts`
- Modify: `__tests__/components/guide/scoring-badge.test.tsx`

- [ ] **Step 1: Update the scoring config test to expect "Developing"**

Open `__tests__/config/scoring.test.ts`. The test on line 6 hardcodes the expected array. Change it:

```ts
import { SCORING_LEVELS, SCORING_LEVEL_DESCRIPTIONS, SCORING_LEVEL_COLORS } from '@/config/scoring'
import type { ScoringLevel } from '@/config/scoring'

describe('scoring config', () => {
  it('has exactly five levels in the correct order', () => {
    expect(SCORING_LEVELS).toEqual(['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'])
  })

  it('has a description for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_DESCRIPTIONS[level]).toBeTruthy()
      expect(SCORING_LEVEL_DESCRIPTIONS[level].length).toBeGreaterThan(20)
    })
  })

  it('has colour classes for every level', () => {
    SCORING_LEVELS.forEach((level) => {
      expect(SCORING_LEVEL_COLORS[level].bg).toBeTruthy()
      expect(SCORING_LEVEL_COLORS[level].text).toBeTruthy()
    })
  })

  it('ScoringLevel type covers all levels', () => {
    const level: ScoringLevel = 'Proficient'
    expect(SCORING_LEVELS).toContain(level)
  })
})
```

- [ ] **Step 2: Update the scoring-badge test to expect "Developing"**

Replace the full contents of `__tests__/components/guide/scoring-badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ScoringBadge } from '@/components/guide/scoring-badge'

describe('ScoringBadge', () => {
  it('renders the level name', () => {
    render(<ScoringBadge level="Proficient" />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders Developing level without crashing', () => {
    render(<ScoringBadge level="Developing" />)
    expect(screen.getByText('Developing')).toBeInTheDocument()
  })

  it('renders all five levels without crashing', () => {
    const levels = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
    levels.forEach((level) => {
      const { unmount } = render(<ScoringBadge level={level} />)
      expect(screen.getByText(level)).toBeInTheDocument()
      unmount()
    })
  })
})
```

- [ ] **Step 3: Run tests — expect failures for the renamed level**

```bash
npx vitest run __tests__/config/scoring.test.ts __tests__/components/guide/scoring-badge.test.tsx --reporter=verbose
```

Expected: failures referencing "Needs Improvement" vs "Developing".

- [ ] **Step 4: Update `lib/skills.ts`**

Change lines 19–36:

```ts
export const LEVELS = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_VALUES: Record<Level, number> = {
  Developing: 1,
  Basic: 2,
  Proficient: 3,
  Advanced: 4,
  Expert: 5,
}

export const LEVEL_COLORS: Record<Level, string> = {
  Developing: '#f87171',
  Basic: '#fb923c',
  Proficient: '#fbbf24',
  Advanced: '#4ade80',
  Expert: '#a78bfa',
}
```

- [ ] **Step 5: Update `config/scoring.ts`**

Replace the full file:

```ts
export const SCORING_LEVELS = [
  'Developing',
  'Basic',
  'Proficient',
  'Advanced',
  'Expert',
] as const

export type ScoringLevel = (typeof SCORING_LEVELS)[number]

export const SCORING_LEVEL_DESCRIPTIONS: Record<ScoringLevel, string> = {
  Developing:
    "You're not yet demonstrating this consistently. The skill is underdeveloped or rarely applied. Look for learning opportunities.",
  Basic:
    "You show some understanding and practice, but it's inconsistent or has limited impact. You've started — it's not yet a strength.",
  Proficient:
    'You meet expectations and demonstrate this reliably. Others can count on you here. A solid place for most skills.',
  Advanced:
    'You go beyond expectations with strong impact. Others often rely on your strength in this area; you informally coach others.',
  Expert:
    'You set the standard. You influence others through mastery and actively develop this skill in those around you. Should be rare.',
}

export const SCORING_LEVEL_COLORS: Record<
  ScoringLevel,
  { bg: string; text: string }
> = {
  Developing: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
  },
  Basic: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
  },
  Proficient: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Advanced: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  Expert: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
  },
}
```

- [ ] **Step 6: Update the hardcoded dummy value in `components/tool/scorecard-preview.tsx`**

Line 12: change `level: 'Needs Improvement'` to `level: 'Developing'`:

```ts
const SAMPLE_ROWS: SampleRow[] = [
  { label: 'Self-awareness', level: 'Proficient' },
  { label: 'Emotional regulation under pressure', level: 'Basic' },
  { label: 'Coaching instinct', level: 'Developing' },
  { label: 'Receiving feedback openly', level: 'Advanced' },
  { label: 'Delegation and trust', level: null },
]
```

- [ ] **Step 7: Run tests — expect all to pass**

```bash
npx vitest run __tests__/config/scoring.test.ts __tests__/components/guide/scoring-badge.test.tsx --reporter=verbose
```

Expected: PASS (5 tests).

- [ ] **Step 8: Run the full test suite to catch any regressions**

```bash
npx vitest run
```

Expected: all tests pass. If any test references `'Needs Improvement'` as a string literal (not via the constant), it will fail — fix it by updating to `'Developing'`.

- [ ] **Step 9: Write the Supabase migration**

Create `supabase/migrations/007_rename_developing_level.sql`:

```sql
-- Rename level 'Needs Improvement' to 'Developing' in the scores table.
-- The application code no longer uses the old string; this migration keeps
-- stored data consistent with the updated Level type.
UPDATE scores
SET level = 'Developing'
WHERE level = 'Needs Improvement';
```

- [ ] **Step 10: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: same pre-existing count (31 errors in test files only). Zero new errors.

- [ ] **Step 11: Commit**

```bash
git add lib/skills.ts config/scoring.ts components/tool/scorecard-preview.tsx \
  supabase/migrations/007_rename_developing_level.sql \
  __tests__/config/scoring.test.ts __tests__/components/guide/scoring-badge.test.tsx
git commit -m "feat: rename 'Needs Improvement' level to 'Developing' across the site"
```

---

## Task 2: PillarNav — progress count contrast + pillar icons

**Files:**
- Modify: `components/app/scorecard/PillarNav.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
'use client'
import { PILLARS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import { GuideIcon } from '@/components/icons/guide-icons'

interface PillarProgress {
  scored: number
  total: number
}

interface PillarNavProps {
  activePillar: Pillar
  pillarProgress: Record<Pillar, PillarProgress>
  onPillarChange: (pillar: Pillar) => void
}

export function PillarNav({ activePillar, pillarProgress, onPillarChange }: PillarNavProps) {
  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        paddingTop: 4,
      }}
    >
      {PILLARS.map(pillar => {
        const { scored, total } = pillarProgress[pillar]
        const isActive = pillar === activePillar
        const isComplete = total > 0 && scored === total

        return (
          <button
            key={pillar}
            onClick={() => onPillarChange(pillar)}
            style={{
              background: isActive ? '#1e293b' : 'transparent',
              border: `1px solid ${isActive ? '#334155' : 'transparent'}`,
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? '#f1f5f9' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <GuideIcon section={pillar} size={14} />
                {PILLAR_LABELS[pillar]}
              </span>
              {isComplete ? (
                <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
              ) : (
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  {scored}/{total}
                </span>
              )}
            </div>
            <div
              style={{
                height: 3,
                background: '#0f172a',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${total > 0 ? (scored / total) * 100 : 0}%`,
                  background: isComplete ? '#4ade80' : '#f59e0b',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

Changes from the original:
- Added `import { GuideIcon }` from guide-icons
- Pillar name `<span>` gains `display: 'flex', alignItems: 'center', gap: 5` and a `<GuideIcon section={pillar} size={14} />` child
- Progress count colour: `#64748b` → `#94a3b8`, added `fontWeight: 600`

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 31 errors (pre-existing test files only). Zero new errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/scorecard/PillarNav.tsx
git commit -m "feat: add pillar icons and improve progress count contrast in scorecard nav"
```

---

## Task 3: SkillList — inline layout, full level names, auto-advance

**Files:**
- Modify: `components/app/scorecard/SkillList.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
'use client'
import { useTransition } from 'react'
import { LEVELS, LEVEL_COLORS, type Skill, type Level } from '@/lib/skills'
import { saveScore } from '@/app/(app)/scorecard/actions'

interface SkillListProps {
  skills: Skill[]
  scores: Record<string, Level>
  roundId: string
  activeSkillKey: string | null
  onSkillActivate: (skillKey: string) => void
  onScore: (skillKey: string, level: Level) => void
}

export function SkillList({
  skills,
  scores,
  roundId,
  activeSkillKey,
  onSkillActivate,
  onScore,
}: SkillListProps) {
  const [, startTransition] = useTransition()

  const handleRate = (skill: Skill, level: Level) => {
    const previousLevel = scores[skill.key]
    onScore(skill.key, level)
    // Auto-advance: activate the next skill in the list after rating
    const currentIndex = skills.findIndex(s => s.key === skill.key)
    const nextSkill = skills[currentIndex + 1]
    onSkillActivate(nextSkill ? nextSkill.key : skill.key)
    startTransition(async () => {
      try {
        await saveScore(roundId, skill.pillar, skill.key, level)
      } catch {
        if (previousLevel !== undefined) onScore(skill.key, previousLevel)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {skills.map(skill => {
        const currentScore = scores[skill.key]
        const isActive = skill.key === activeSkillKey

        return (
          <div
            key={skill.key}
            style={{
              background: '#1e293b',
              borderRadius: 10,
              padding: '10px 12px',
              border: `1px solid ${isActive ? '#f59e0b' : 'transparent'}`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <button
              onClick={() => onSkillActivate(skill.key)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                color: '#f1f5f9',
                fontWeight: 500,
                fontSize: 13,
                lineHeight: 1.4,
                flex: 1,
                minWidth: 0,
              }}
            >
              {skill.label}
            </button>

            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {LEVELS.map(level => {
                const isSelected = currentScore === level
                return (
                  <button
                    key={level}
                    title={level}
                    onClick={() => handleRate(skill, level)}
                    style={{
                      height: 28,
                      padding: '0 8px',
                      whiteSpace: 'nowrap',
                      borderRadius: 4,
                      border: `2px solid ${isSelected ? LEVEL_COLORS[level] : '#334155'}`,
                      background: isSelected ? `${LEVEL_COLORS[level]}22` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? LEVEL_COLORS[level] : '#64748b',
                    }}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

Key changes from original:
- Card: `flexDirection: 'row'`, `alignItems: 'center'`, `padding: '10px 12px'`, `gap: 10`
- Skill name button: `flex: 1, minWidth: 0, fontSize: 13`
- Button group: `flexShrink: 0`, buttons use `padding: '0 8px', whiteSpace: 'nowrap'` (natural width) instead of `flex: 1`
- Button text: `{level}` (full name) instead of `{i + 1}`
- Auto-advance: `onSkillActivate(nextSkill ? nextSkill.key : skill.key)`

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 31 errors (pre-existing only).

- [ ] **Step 3: Commit**

```bash
git add components/app/scorecard/SkillList.tsx
git commit -m "feat: inline skill card layout with full level names and auto-advance"
```

---

## Task 4: Guide content performance — pre-fetch server-side, synchronous GuidePanel

**Files:**
- Modify: `app/(app)/scorecard/page.tsx`
- Modify: `components/app/scorecard/ScorecardShell.tsx`
- Modify: `components/app/scorecard/GuidePanel.tsx`
- Modify: `app/(app)/scorecard/actions.ts`

- [ ] **Step 1: Replace `app/(app)/scorecard/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateActiveRound } from '@/lib/db/rounds'
import { getScoresForRound } from '@/lib/db/scores'
import { SKILLS } from '@/lib/skills'
import type { Level } from '@/lib/skills'
import { getSkillGuideContent } from '@/lib/guide-content'
import type { SkillGuideContent } from '@/lib/guide-content'
import { ScorecardShell } from '@/components/app/scorecard/ScorecardShell'

export default async function ScorecardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const round = await getOrCreateActiveRound(user.id)
  const scores = await getScoresForRound(round.id)

  const allScores: Record<string, Level> = {}
  scores.forEach(s => {
    allScores[s.skill_key] = s.level
  })

  const guideEntries = await Promise.all(
    SKILLS.map(async s => [s.key, await getSkillGuideContent(s.key)] as const)
  )
  const allGuideContent: Record<string, SkillGuideContent | null> = Object.fromEntries(guideEntries)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Your Scorecard</h1>
      <p className="mb-6 text-sm text-slate-400">
        Score yourself on each skill. Scores save automatically.
      </p>
      <ScorecardShell roundId={round.id} allScores={allScores} allGuideContent={allGuideContent} />
    </div>
  )
}
```

- [ ] **Step 2: Replace `components/app/scorecard/ScorecardShell.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { PILLARS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'
import { PillarNav } from './PillarNav'
import { SkillList } from './SkillList'
import { GuidePanel } from './GuidePanel'

interface ScorecardShellProps {
  roundId: string
  allScores: Record<string, Level>
  allGuideContent: Record<string, SkillGuideContent | null>
}

export function ScorecardShell({ roundId, allScores, allGuideContent }: ScorecardShellProps) {
  const firstSelfSkill = getSkillsByPillar('self')[0]

  const [activePillar, setActivePillar] = useState<Pillar>('self')
  const [activeSkillKey, setActiveSkillKey] = useState<string | null>(
    firstSelfSkill?.key ?? null
  )
  const [lastActiveByPillar, setLastActiveByPillar] = useState<Partial<Record<Pillar, string>>>(
    firstSelfSkill ? { self: firstSelfSkill.key } : {}
  )
  const [scores, setScores] = useState<Record<string, Level>>(allScores)

  const handlePillarChange = (pillar: Pillar) => {
    setActivePillar(pillar)
    setActiveSkillKey(lastActiveByPillar[pillar] ?? null)
  }

  const handleSkillActivate = (skillKey: string) => {
    setActiveSkillKey(skillKey)
    setLastActiveByPillar(prev => ({ ...prev, [activePillar]: skillKey }))
  }

  const handleScore = (skillKey: string, level: Level) => {
    setScores(prev => ({ ...prev, [skillKey]: level }))
  }

  const pillarProgress = Object.fromEntries(
    PILLARS.map(pillar => {
      const pillarSkills = getSkillsByPillar(pillar)
      const scored = pillarSkills.filter(s => scores[s.key]).length
      return [pillar, { scored, total: pillarSkills.length }]
    })
  ) as Record<Pillar, { scored: number; total: number }>

  const skills = getSkillsByPillar(activePillar)

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        height: 'calc(100vh - 160px)',
        minHeight: 0,
      }}
    >
      <PillarNav
        activePillar={activePillar}
        pillarProgress={pillarProgress}
        onPillarChange={handlePillarChange}
      />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px',
          minWidth: 0,
        }}
      >
        <SkillList
          skills={skills}
          scores={scores}
          roundId={roundId}
          activeSkillKey={activeSkillKey}
          onSkillActivate={handleSkillActivate}
          onScore={handleScore}
        />
      </div>
      <GuidePanel activeSkillKey={activeSkillKey} allGuideContent={allGuideContent} />
    </div>
  )
}
```

Key changes:
- New prop `allGuideContent: Record<string, SkillGuideContent | null>`
- `activeSkillKey` initialises to `firstSelfSkill?.key ?? null`
- `lastActiveByPillar` initialises to `{ self: firstSelfSkill.key }` if the skill exists
- Passes `allGuideContent` to `GuidePanel`

- [ ] **Step 3: Replace `components/app/scorecard/GuidePanel.tsx`**

```tsx
'use client'
import { SKILLS } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'

interface GuidePanelProps {
  activeSkillKey: string | null
  allGuideContent: Record<string, SkillGuideContent | null>
}

function renderBody(text: string) {
  const lines = text.split('\n')
  const bulletLines = lines.filter(l => l.trimStart().startsWith('* ') || l.trimStart().startsWith('- '))
  if (bulletLines.length > 0) {
    return (
      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bulletLines.map((l, i) => (
          <li key={i} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
            {l.replace(/^[\s*-]+/, '').trim()}
          </li>
        ))}
      </ul>
    )
  }
  return <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{text}</p>
}

const SECTIONS: { label: string; key: keyof SkillGuideContent }[] = [
  { label: 'Definition', key: 'definition' },
  { label: 'Why It Matters', key: 'whyItMatters' },
  { label: 'This Is Strong When', key: 'strongWhen' },
  { label: 'Warning Signs', key: 'warningSigns' },
  { label: 'Pathways to Improvement', key: 'pathways' },
]

export function GuidePanel({ activeSkillKey, allGuideContent }: GuidePanelProps) {
  const activeSkill = SKILLS.find(s => s.key === activeSkillKey)
  const content = activeSkillKey ? (allGuideContent[activeSkillKey] ?? null) : null

  if (!activeSkillKey) {
    return (
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 14,
          textAlign: 'center',
          padding: 24,
          borderLeft: '1px solid #1e293b',
        }}
      >
        Select a skill to read the guide
      </div>
    )
  }

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        overflowY: 'auto',
        paddingLeft: 20,
        borderLeft: '1px solid #1e293b',
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#f59e0b',
          marginBottom: 20,
          marginTop: 4,
        }}
      >
        {activeSkill?.label}
      </h3>

      {content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SECTIONS.map(({ label, key }) => {
            const body = content[key]
            if (!body) return null
            return (
              <div key={key}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    marginBottom: 8,
                    marginTop: 0,
                  }}
                >
                  {label}
                </p>
                {renderBody(body)}
              </div>
            )
          })}
        </div>
      )}

      {!content && activeSkill && (
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          {activeSkill.description}
        </p>
      )}
    </div>
  )
}
```

Key changes from original:
- Removed `useState`, `useEffect`, `useTransition` — no async fetching
- Removed `import { getGuideContent }` server action import
- Added `allGuideContent` prop
- Content is a synchronous lookup: `allGuideContent[activeSkillKey] ?? null`
- Removed loading state (`isPending && !content`) — content is instant

- [ ] **Step 4: Delete the `getGuideContent` action from `app/(app)/scorecard/actions.ts`**

Replace the file with only the `saveScore` action (remove `getGuideContent` and its imports):

```ts
'use server'
import { upsertScore } from '@/lib/db/scores'
import { maybeCompleteRound } from '@/lib/db/rounds'
import type { Level } from '@/lib/skills'

export async function saveScore(
  roundId: string,
  pillar: string,
  skillKey: string,
  level: Level
): Promise<void> {
  await upsertScore(roundId, pillar, skillKey, level)
  await maybeCompleteRound(roundId)
}
```

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 31 errors (pre-existing test files only). Zero new errors.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/scorecard/page.tsx \
  components/app/scorecard/ScorecardShell.tsx \
  components/app/scorecard/GuidePanel.tsx \
  app/\(app\)/scorecard/actions.ts
git commit -m "feat: pre-fetch guide content server-side for instant display; first skill auto-loaded"
```

---

## Task 5: Reorder guide index page — measurement last

**Files:**
- Modify: `lib/guide.ts`

- [ ] **Step 1: Update `GUIDE_SECTIONS` in `lib/guide.ts`**

Change the array so the five scorecard pillars appear first, measurement last:

```ts
// lib/guide.ts
export const GUIDE_SECTIONS = [
  'self',
  'team',
  'strategy',
  'communications',
  'domain-expertise',
  'measurement',
] as const

export type GuideSection = (typeof GUIDE_SECTIONS)[number]

export const GUIDE_SECTION_LABELS: Record<GuideSection, string> = {
  measurement: 'Measurement',
  self: 'Self',
  team: 'Team',
  strategy: 'Strategy',
  communications: 'Communications',
  'domain-expertise': 'Domain Expertise',
}

export function getPrevNextChapters(slug: string[]): {
  prev: { label: string; slug: string[] } | null
  next: { label: string; slug: string[] } | null
} {
  const current = slug[0] as GuideSection
  const idx = GUIDE_SECTIONS.indexOf(current)

  const prev =
    idx > 0
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx - 1]],
          slug: [GUIDE_SECTIONS[idx - 1]],
        }
      : null

  const next =
    idx < GUIDE_SECTIONS.length - 1
      ? {
          label: GUIDE_SECTION_LABELS[GUIDE_SECTIONS[idx + 1]],
          slug: [GUIDE_SECTIONS[idx + 1]],
        }
      : null

  return { prev, next }
}
```

`getPrevNextChapters` uses `GUIDE_SECTIONS.indexOf` so the new order is picked up automatically — no further changes needed.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 31 errors (pre-existing only).

- [ ] **Step 3: Commit**

```bash
git add lib/guide.ts
git commit -m "feat: reorder guide index — scorecard pillars first, measurement last"
```

---

## Task 6: Smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, 0 failures.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -3
```

Expected: `TypeScript: 31 errors in 4 files` (pre-existing test-runner errors only).

- [ ] **Step 3: Start the dev server and verify the scorecard**

```bash
npm run dev
```

Open `http://localhost:3000/scorecard`. Verify:
- [ ] Left nav shows icons next to each pillar name (compass, users, map, chat, lightbulb)
- [ ] Progress counts (e.g. `2/9`) are clearly readable (`#94a3b8`)
- [ ] Skill cards show full level names inline: Developing · Basic · Proficient · Advanced · Expert
- [ ] Guide panel shows first Self skill's content immediately on load (no "Select a skill" empty state)
- [ ] Clicking a rating button scores the skill, guide panel updates instantly (no loading delay), and the next skill becomes active
- [ ] Clicking the last skill in a pillar: scoring it stays on that skill (no out-of-bounds jump)
- [ ] Switching pillars and back: last active skill is remembered

- [ ] **Step 4: Verify the guide index page**

Open `http://localhost:3000/the-guide`. Verify:
- [ ] Cards appear in order: Self · Team · Strategy · Communications · Domain Expertise · Measurement
- [ ] Prev/Next navigation within the guide still works (click into Self, navigate through to Measurement at the end)

- [ ] **Step 5: Apply the Supabase migration (if not using local DB)**

If running against a remote Supabase project:

```bash
supabase db push
```

Or apply manually via the Supabase dashboard SQL editor:

```sql
UPDATE scores SET level = 'Developing' WHERE level = 'Needs Improvement';
```

Verify in the dashboard that no rows with `level = 'Needs Improvement'` remain.
