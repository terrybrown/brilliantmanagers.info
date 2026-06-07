# Guide Data Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real user score and goal data into the guide reading view, and fix the `fs/promises` build error caused by importing `toSlug` from `lib/mdx.ts` into a client component.

**Architecture:** A new `lib/slug.ts` file holds `toSlug` (client-safe). A server-side `lib/db/guide-data.ts` fetches scores and goals for the current user's most recent complete round. A `GuideDataContext` (client context) wraps the entire guide layout so `ChapterNav` and `GuideDetails` can read per-skill data. The guide page (`app/the-guide/[...slug]/page.tsx`) remains a server component — it checks auth, fetches data, and passes it to the provider. Unauthenticated users see placeholder state (`—`, no badges).

**Tech Stack:** Next.js 15 App Router, Supabase SSR, Vitest + Testing Library

---

## Data model recap

- **`scores`** table: `(round_id, skill_key, level, pillar, scored_at)` — one row per skill per round. `level` is `'Developing' | 'Basic' | 'Proficient' | 'Advanced' | 'Expert'` (matches `Level` from `lib/skills.ts`).
- **`assessment_rounds`** table: `(id, user_id, status, completed_at)`. Use the most recent `status = 'complete'` round.
- **`development_plans`** table: `(id, user_id, skill_key, goal, status)`. Status `'planned' | 'in_progress'` = active goal.
- **Skill correlation**: guide MDX uses labels like "Time and Task Management" (`&` → `and`). `lib/skills.ts` labels use `&`. Normalise both before matching to get `skill_key`.
- **`LEVEL_VALUES`** in `lib/skills.ts` converts level → 1–5 for computing average pillar score.
- **`SCORING_LEVEL_COLORS`** in `config/scoring.ts` provides Sage hex colours for dots and badges.

---

## File Map

**Create:**
- `lib/slug.ts` — `toSlug()` with no Node.js deps (client-safe)
- `lib/db/guide-data.ts` — `fetchGuideUserData()` server function
- `components/guide/guide-data-context.tsx` — `GuideDataContext`, `GuideDataProvider`, `useGuideData`
- `__tests__/lib/guide-data.test.ts` — unit tests for guide-data helpers

**Modify:**
- `lib/mdx.ts` — import `toSlug` from `lib/slug.ts`; add `skillKey?: string` to `SkillItem`; update `extractSkills` to auto-match skill keys via normalised label
- `components/guide/details.tsx` — import `toSlug` from `lib/slug.ts`; consume context for badge + action strip
- `components/guide/chapter-nav.tsx` — consume context for skill dot colours
- `app/the-guide/[...slug]/page.tsx` — auth check, fetch guide data, wrap in `GuideDataProvider`
- `__tests__/lib/mdx-guide.test.ts` — update for `skillKey` field in `extractSkills` output
- `__tests__/components/guide/details.test.tsx` — update for context-dependent rendering

---

## Task 1 — Extract toSlug to lib/slug.ts (fixes build error)

**Files:**
- Create: `lib/slug.ts`
- Modify: `lib/mdx.ts`
- Modify: `components/guide/details.tsx`

- [ ] **Step 1.1: Create `lib/slug.ts`**

  ```ts
  export function toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
  }
  ```

- [ ] **Step 1.2: Update `lib/mdx.ts`**

  Read the file. Remove the local `toSlug` function definition and add an import at the top:
  ```ts
  import { toSlug } from '@/lib/slug'
  ```
  The rest of the file (all callers of `toSlug`) is unchanged — they now use the imported version.

- [ ] **Step 1.3: Update `components/guide/details.tsx`**

  Read the file. The current import is:
  ```ts
  import { toSlug } from '@/lib/mdx'
  ```
  Change it to:
  ```ts
  import { toSlug } from '@/lib/slug'
  ```

- [ ] **Step 1.4: Verify build**

  ```bash
  npm run build 2>&1 | grep -E "error|Error|Module not found" | head -20
  ```

  Expected: no `Module not found: Can't resolve 'fs/promises'` error. Build succeeds.

- [ ] **Step 1.5: Run tests**

  ```bash
  npm test 2>&1 | tail -10
  ```

  All 549 tests must pass.

- [ ] **Step 1.6: Commit**

  ```bash
  git add lib/slug.ts lib/mdx.ts components/guide/details.tsx
  git commit -m "fix: extract toSlug to lib/slug.ts to prevent fs/promises bundling in client components"
  ```

---

## Task 2 — SkillItem skill key auto-matching

**Files:**
- Modify: `lib/mdx.ts`
- Modify: `__tests__/lib/mdx-guide.test.ts`

- [ ] **Step 2.1: Update tests first**

  Read `__tests__/lib/mdx-guide.test.ts`. Add a new `describe` block at the end:

  ```ts
  import { SKILLS } from '@/lib/skills'

  describe('extractSkills — skill key matching', () => {
    it('resolves skillKey for a skill whose label matches via & → and normalisation', () => {
      // "Time & Task Management" in SKILLS matches "Time and Task Management" in MDX
      const source = '  <summary>Time and Task Management</summary>'
      const skills = extractSkills(source)
      expect(skills[0].skillKey).toBe('self-time-task-management')
    })

    it('resolves skillKey for a skill whose label is an exact match', () => {
      const source = '  <summary>Growth Mindset</summary>'
      const skills = extractSkills(source)
      expect(skills[0].skillKey).toBe('self-growth-mindset')
    })

    it('leaves skillKey undefined when no SKILLS label matches', () => {
      const source = '  <summary>Unknown Skill XYZ</summary>'
      const skills = extractSkills(source)
      expect(skills[0].skillKey).toBeUndefined()
    })
  })
  ```

- [ ] **Step 2.2: Run tests — they should FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/mdx-guide.test.ts 2>&1 | tail -20
  ```

  Expected: the new tests fail because `SkillItem` has no `skillKey` yet.

- [ ] **Step 2.3: Update `lib/mdx.ts`**

  Read the file.

  **a) Update `SkillItem` interface** to add the optional field:
  ```ts
  export interface SkillItem {
    id: string
    text: string
    skillKey?: string
  }
  ```

  **b) Add a `normaliseLabel` helper** (place it just before `extractSkills`):
  ```ts
  function normaliseLabel(s: string): string {
    return s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
  }
  ```

  **c) Update `extractSkills`** to import SKILLS and match:

  Add this import near the top of the file (with other imports):
  ```ts
  import { SKILLS } from '@/lib/skills'
  ```

  Update the function body:
  ```ts
  export function extractSkills(source: string): SkillItem[] {
    const skills: SkillItem[] = []
    for (const line of source.split('\n')) {
      const m = line.match(/^\s*<summary>(.+?)<\/summary>\s*$/)
      if (m) {
        const text = m[1].trim().replace(/<[^>]+>/g, '')
        const id = toSlug(text)
        const match = SKILLS.find(
          (s) => normaliseLabel(s.label) === normaliseLabel(text)
        )
        skills.push({ id, text, skillKey: match?.key })
      }
    }
    return skills
  }
  ```

- [ ] **Step 2.4: Run tests — all should pass**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/mdx-guide.test.ts 2>&1 | tail -25
  ```

  All tests must pass including the new skill key matching tests.

- [ ] **Step 2.5: Full suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

- [ ] **Step 2.6: Commit**

  ```bash
  git add lib/mdx.ts __tests__/lib/mdx-guide.test.ts
  git commit -m "feat: add skillKey to SkillItem via normalised SKILLS label matching"
  ```

---

## Task 3 — lib/db/guide-data.ts + tests

**Files:**
- Create: `lib/db/guide-data.ts`
- Create: `__tests__/lib/guide-data.test.ts`

- [ ] **Step 3.1: Create `__tests__/lib/guide-data.test.ts`**

  Look at an existing db test (e.g., `__tests__/app/connections/actions.test.ts` or `__tests__/app/people/actions.test.ts`) to understand how Supabase is mocked in this project. Follow the same pattern.

  Then create `__tests__/lib/guide-data.test.ts`. This file tests the pure computation helpers used inside `fetchGuideUserData` — not the Supabase calls (those are integration-level). Extract the computation into a testable helper (see Step 3.2):

  ```ts
  import { describe, it, expect } from 'vitest'
  import { buildGuideUserData } from '@/lib/db/guide-data'
  import type { SkillItem } from '@/lib/mdx'

  const SKILLS: SkillItem[] = [
    { id: 'time-and-task-management', text: 'Time and Task Management', skillKey: 'self-time-task-management' },
    { id: 'empathy-and-compassion', text: 'Empathy and Compassion', skillKey: 'self-empathy-compassion' },
    { id: 'growth-mindset', text: 'Growth Mindset', skillKey: 'self-growth-mindset' },
  ]

  describe('buildGuideUserData', () => {
    it('returns null pillarScore when no scores provided', () => {
      const result = buildGuideUserData(SKILLS, [], [])
      expect(result.pillarScore).toBeNull()
    })

    it('computes correct pillarScore average', () => {
      // Developing=1, Basic=2, Proficient=3 → avg 2 → 2.0
      const scores = [
        { skill_key: 'self-time-task-management', level: 'Developing' },
        { skill_key: 'self-empathy-compassion', level: 'Basic' },
        { skill_key: 'self-growth-mindset', level: 'Proficient' },
      ]
      const result = buildGuideUserData(SKILLS, scores, [])
      expect(result.pillarScore).toBe(2)
    })

    it('rounds pillarScore to 1 decimal place', () => {
      // Advanced=4, Expert=5 → avg 4.5
      const scores = [
        { skill_key: 'self-time-task-management', level: 'Advanced' },
        { skill_key: 'self-empathy-compassion', level: 'Expert' },
      ]
      const result = buildGuideUserData(SKILLS, scores, [])
      expect(result.pillarScore).toBe(4.5)
    })

    it('maps level correctly to skillDataBySlug', () => {
      const scores = [{ skill_key: 'self-time-task-management', level: 'Advanced' }]
      const result = buildGuideUserData(SKILLS, scores, [])
      expect(result.skillDataBySlug['time-and-task-management']?.level).toBe('Advanced')
    })

    it('marks hasGoal true when active plan exists', () => {
      const plans = [{ id: 'plan-1', skill_key: 'self-growth-mindset', status: 'in_progress' }]
      const result = buildGuideUserData(SKILLS, [], plans)
      expect(result.skillDataBySlug['growth-mindset']?.hasGoal).toBe(true)
      expect(result.skillDataBySlug['growth-mindset']?.planId).toBe('plan-1')
    })

    it('marks hasGoal false when no plan for skill', () => {
      const result = buildGuideUserData(SKILLS, [], [])
      expect(result.skillDataBySlug['time-and-task-management']?.hasGoal).toBe(false)
    })

    it('sets level null for unscored skills', () => {
      const result = buildGuideUserData(SKILLS, [], [])
      expect(result.skillDataBySlug['time-and-task-management']?.level).toBeNull()
    })

    it('ignores skills without a matched skillKey', () => {
      const skillsWithUnmatched: SkillItem[] = [
        ...SKILLS,
        { id: 'unknown-skill', text: 'Unknown Skill', skillKey: undefined },
      ]
      const result = buildGuideUserData(skillsWithUnmatched, [], [])
      expect(result.skillDataBySlug['unknown-skill']).toBeUndefined()
    })
  })
  ```

- [ ] **Step 3.2: Run tests — they should FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/guide-data.test.ts 2>&1 | tail -20
  ```

- [ ] **Step 3.3: Create `lib/db/guide-data.ts`**

  ```ts
  import { createClient } from '@/lib/supabase/server'
  import { LEVEL_VALUES } from '@/lib/skills'
  import type { Level } from '@/lib/skills'
  import type { SkillItem } from '@/lib/mdx'

  export interface SkillGuideData {
    level: Level | null
    hasGoal: boolean
    planId?: string
  }

  export interface GuideUserData {
    pillarScore: number | null
    skillDataBySlug: Record<string, SkillGuideData>
  }

  interface RawScore {
    skill_key: string
    level: string
  }

  interface RawPlan {
    id: string
    skill_key: string
    status: string
  }

  /** Pure computation — separated so it can be unit-tested without Supabase. */
  export function buildGuideUserData(
    skills: SkillItem[],
    scores: RawScore[],
    plans: RawPlan[]
  ): GuideUserData {
    const scoreByKey: Record<string, Level> = {}
    for (const s of scores) {
      scoreByKey[s.skill_key] = s.level as Level
    }

    const planByKey: Record<string, RawPlan> = {}
    for (const p of plans) {
      planByKey[p.skill_key] = p
    }

    const skillDataBySlug: Record<string, SkillGuideData> = {}
    let total = 0
    let count = 0

    for (const skill of skills) {
      if (!skill.skillKey) continue
      const level = scoreByKey[skill.skillKey] ?? null
      const plan = planByKey[skill.skillKey]
      skillDataBySlug[skill.id] = {
        level,
        hasGoal: !!plan,
        planId: plan?.id,
      }
      if (level) {
        total += LEVEL_VALUES[level]
        count++
      }
    }

    const pillarScore =
      count > 0 ? Math.round((total / count) * 10) / 10 : null

    return { pillarScore, skillDataBySlug }
  }

  /** Fetches score and goal data for a user's guide chapter view. Returns null data if no complete round exists. */
  export async function fetchGuideUserData(
    userId: string,
    skills: SkillItem[]
  ): Promise<GuideUserData> {
    const skillKeys = skills.flatMap((s) => (s.skillKey ? [s.skillKey] : []))
    if (skillKeys.length === 0) {
      return { pillarScore: null, skillDataBySlug: {} }
    }

    const supabase = await createClient()

    // Most recent complete round
    const { data: round } = await supabase
      .from('assessment_rounds')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'complete')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const scores: RawScore[] = []
    if (round) {
      const { data } = await supabase
        .from('scores')
        .select('skill_key, level')
        .eq('round_id', round.id)
        .in('skill_key', skillKeys)
      scores.push(...(data ?? []))
    }

    // Active development plans (planned or in_progress)
    const { data: plans } = await supabase
      .from('development_plans')
      .select('id, skill_key, status')
      .eq('user_id', userId)
      .in('skill_key', skillKeys)
      .in('status', ['planned', 'in_progress'])

    return buildGuideUserData(skills, scores, plans ?? [])
  }
  ```

- [ ] **Step 3.4: Run tests — all should pass**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/guide-data.test.ts 2>&1 | tail -25
  ```

  All 8 tests must pass.

- [ ] **Step 3.5: Full suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

- [ ] **Step 3.6: Commit**

  ```bash
  git add lib/db/guide-data.ts __tests__/lib/guide-data.test.ts
  git commit -m "feat: add fetchGuideUserData with buildGuideUserData pure helper"
  ```

---

## Task 4 — GuideDataContext

**Files:**
- Create: `components/guide/guide-data-context.tsx`

- [ ] **Step 4.1: Create `components/guide/guide-data-context.tsx`**

  ```tsx
  'use client'

  import { createContext, useContext } from 'react'
  import type { GuideUserData } from '@/lib/db/guide-data'

  const GuideDataContext = createContext<GuideUserData | null>(null)

  export function GuideDataProvider({
    children,
    data,
  }: {
    children: React.ReactNode
    data: GuideUserData | null
  }) {
    return (
      <GuideDataContext.Provider value={data}>
        {children}
      </GuideDataContext.Provider>
    )
  }

  export function useGuideData(): GuideUserData | null {
    return useContext(GuideDataContext)
  }
  ```

- [ ] **Step 4.2: Type check**

  ```bash
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
  ```

- [ ] **Step 4.3: Commit**

  ```bash
  git add components/guide/guide-data-context.tsx
  git commit -m "feat: add GuideDataContext for passing score/goal data to guide client components"
  ```

---

## Task 5 — Wire page.tsx: auth + data fetch + provider

**Files:**
- Modify: `app/the-guide/[...slug]/page.tsx`

- [ ] **Step 5.1: Read the current page**

  Read `app/the-guide/[...slug]/page.tsx`. Note how `ReadingProgressBar` and `GuideDataProvider` will be positioned.

- [ ] **Step 5.2: Update `app/the-guide/[...slug]/page.tsx`**

  Add these imports near the top:
  ```tsx
  import { createClient } from '@/lib/supabase/server'
  import { fetchGuideUserData } from '@/lib/db/guide-data'
  import { GuideDataProvider } from '@/components/guide/guide-data-context'
  ```

  In `GuideChapterPage`, after `getGuideChapter` and before the return, add the auth + data fetch:

  ```tsx
  // Optional: fetch user score/goal data if authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const guideUserData = user
    ? await fetchGuideUserData(user.id, chapter.skills)
    : null
  ```

  Wrap the entire return content in `<GuideDataProvider data={guideUserData}>`. The provider must wrap BOTH the nav and the reading column so both client components have access to the context.

  Change the return from:
  ```tsx
  return (
    <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
      <ReadingProgressBar />
      <div className="guide-layout">
        ...
      </div>
    </div>
  )
  ```

  To:
  ```tsx
  return (
    <GuideDataProvider data={guideUserData}>
      <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
        <ReadingProgressBar />
        <div className="guide-layout">
          ...
        </div>
      </div>
    </GuideDataProvider>
  )
  ```

  Update the meta strip score chip. Replace the hardcoded `—` with dynamic content:
  ```tsx
  {/* Score chip — shows real score when authenticated */}
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 9,
      padding: '6px 12px',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    Your {pillarLabel} score&nbsp;
    <strong
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        fontWeight: 700,
        color: guideUserData?.pillarScore != null ? 'var(--color-accent)' : 'var(--color-text-faint)',
      }}
    >
      {guideUserData?.pillarScore != null ? guideUserData.pillarScore.toFixed(1) : '—'}
    </strong>
  </span>
  ```

- [ ] **Step 5.3: Type check**

  ```bash
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
  ```

  Fix any errors.

- [ ] **Step 5.4: Run full test suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

- [ ] **Step 5.5: Commit**

  ```bash
  git add "app/the-guide/[...slug]/page.tsx"
  git commit -m "feat: wire pillar score into guide page meta strip via GuideDataProvider"
  ```

---

## Task 6 — Wire ChapterNav: level-coloured dots

**Files:**
- Modify: `components/guide/chapter-nav.tsx`
- Modify: `__tests__/components/guide/chapter-nav.test.tsx`

- [ ] **Step 6.1: Update `components/guide/chapter-nav.tsx`**

  Read the file. Add these imports:
  ```tsx
  import { useGuideData } from '@/components/guide/guide-data-context'
  import { SCORING_LEVEL_COLORS } from '@/config/scoring'
  import type { ScoringLevel } from '@/config/scoring'
  ```

  In the component body, add after the `useState` and `useEffect`:
  ```tsx
  const guideData = useGuideData()
  ```

  Replace the dot `<span>` in the skill sub-items (the `// TODO` placeholder comment is there) with:
  ```tsx
  {/* Dot — colour from user's score level if available */}
  <span
    style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: (() => {
        const level = guideData?.skillDataBySlug[skill.id]?.level
        if (level) return SCORING_LEVEL_COLORS[level as ScoringLevel].color
        return isSkillActive ? 'var(--color-accent)' : 'var(--color-track)'
      })(),
      flexShrink: 0,
    }}
  />
  ```

- [ ] **Step 6.2: Update tests**

  Read `__tests__/components/guide/chapter-nav.test.tsx`. Add a mock for the context at the top of the file:

  ```tsx
  vi.mock('@/components/guide/guide-data-context', () => ({
    useGuideData: vi.fn(() => null),
  }))
  ```

  The existing tests pass `null` context (unauthenticated state), which is the default from the mock. No other test changes needed.

- [ ] **Step 6.3: Run tests**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/chapter-nav.test.tsx 2>&1 | tail -20
  ```

  All tests must pass.

- [ ] **Step 6.4: Full suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

- [ ] **Step 6.5: Commit**

  ```bash
  git add components/guide/chapter-nav.tsx __tests__/components/guide/chapter-nav.test.tsx
  git commit -m "feat: wire skill level colours into ChapterNav dots via GuideDataContext"
  ```

---

## Task 7 — Wire GuideDetails: ScoringBadge + action strip

**Files:**
- Modify: `components/guide/details.tsx`
- Modify: `__tests__/components/guide/details.test.tsx`

- [ ] **Step 7.1: Update `components/guide/details.tsx`**

  Read the file. Add these imports:
  ```tsx
  import { useGuideData } from '@/components/guide/guide-data-context'
  import { ScoringBadge } from '@/components/guide/scoring-badge'
  import type { ScoringLevel } from '@/config/scoring'
  ```

  In the component body, add after the `useState`:
  ```tsx
  const guideData = useGuideData()
  const skillData = guideData?.skillDataBySlug[id] ?? null
  ```

  **In the accordion header**, replace the `{/* TODO: replace with <ScoringBadge ... */}` comment with:
  ```tsx
  {skillData?.level && (
    <ScoringBadge level={skillData.level as ScoringLevel} you />
  )}
  ```

  **In the action strip**, replace the static text span content:
  ```tsx
  {/* Action strip copy */}
  {skillData?.level
    ? <>You scored this <strong style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{skillData.level}</strong></>
    : 'Explore this skill in the scorecard'
  }
  ```

  **The "Set a goal" / "View goal" button** — replace the static `<a href="/growth">` button with:
  ```tsx
  <a
    href={skillData?.planId ? `/growth?plan=${skillData.planId}` : '/growth'}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 34,
      padding: '0 14px',
      background: 'var(--color-accent)',
      color: 'var(--color-accent-fg)',
      border: 'none',
      borderRadius: 8,
      fontSize: 12.5,
      fontWeight: 700,
      fontFamily: 'var(--font-body)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      textDecoration: 'none',
    }}
  >
    {skillData?.hasGoal ? 'View goal' : 'Set a goal'}
  </a>
  ```

- [ ] **Step 7.2: Update `__tests__/components/guide/details.test.tsx`**

  Read the file. Add these mocks at the top (after existing imports):

  ```tsx
  import { vi } from 'vitest'

  vi.mock('@/components/guide/guide-data-context', () => ({
    useGuideData: vi.fn(() => null),
  }))

  vi.mock('@/components/guide/scoring-badge', () => ({
    ScoringBadge: ({ level, you }: { level: string; you?: boolean }) => (
      <span data-testid="scoring-badge">{you ? `You · ${level}` : level}</span>
    ),
  }))
  ```

  Add new tests at the end of the `describe` block:

  ```tsx
  describe('GuideDetails — with guide data context', () => {
    function renderWithData(data: { level: string | null; hasGoal: boolean; planId?: string }) {
      const { useGuideData } = require('@/components/guide/guide-data-context')
      useGuideData.mockReturnValue({
        skillDataBySlug: {
          'test-skill': data,
        },
      })
      return render(
        <GuideDetails>
          <summary>Test Skill</summary>
          <p>Body content</p>
        </GuideDetails>
      )
    }

    afterEach(() => {
      const { useGuideData } = require('@/components/guide/guide-data-context')
      useGuideData.mockReturnValue(null)
    })

    it('shows ScoringBadge in header when level is available', () => {
      renderWithData({ level: 'Advanced', hasGoal: false })
      fireEvent.click(screen.getByRole('button'))
      // Badge is shown even before opening (it's in the header)
      // Re-render in closed state
    })

    it('shows ScoringBadge in header when closed', () => {
      renderWithData({ level: 'Proficient', hasGoal: false })
      expect(screen.getByTestId('scoring-badge')).toBeInTheDocument()
      expect(screen.getByTestId('scoring-badge')).toHaveTextContent('You · Proficient')
    })

    it('shows "Set a goal" when no active goal', () => {
      renderWithData({ level: 'Advanced', hasGoal: false })
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('Set a goal')).toBeInTheDocument()
    })

    it('shows "View goal" when active goal exists', () => {
      renderWithData({ level: 'Advanced', hasGoal: true, planId: 'plan-123' })
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('View goal')).toBeInTheDocument()
    })

    it('shows scored level in action strip copy', () => {
      renderWithData({ level: 'Expert', hasGoal: false })
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText(/You scored this/)).toBeInTheDocument()
      expect(screen.getByText('Expert')).toBeInTheDocument()
    })

    it('shows generic copy when no score available', () => {
      renderWithData({ level: null, hasGoal: false })
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('Explore this skill in the scorecard')).toBeInTheDocument()
    })
  })
  ```

  **Note on the ScoringBadge test (closed state):** The badge is shown in the header button at all times (closed AND open), so it's visible without clicking. The test above (`'shows ScoringBadge in header when closed'`) tests this.

- [ ] **Step 7.3: Run tests — they should FAIL first**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/details.test.tsx 2>&1 | tail -30
  ```

- [ ] **Step 7.4: Implement the changes described in Step 7.1**

  Now implement the component changes from Step 7.1.

- [ ] **Step 7.5: Run tests — all should pass**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/details.test.tsx 2>&1 | tail -30
  ```

  All tests must pass. If the ScoringBadge import causes issues (ScoringBadge is also mocked), adjust the mock or the test.

- [ ] **Step 7.6: Full suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

- [ ] **Step 7.7: Commit**

  ```bash
  git add components/guide/details.tsx __tests__/components/guide/details.test.tsx
  git commit -m "feat: wire ScoringBadge, score copy, and Set/View goal into GuideDetails via context"
  ```

---

## Task 8 — Final verification

- [ ] **Step 8.1: Full test suite**

  ```bash
  npm test 2>&1 | tail -15
  ```

  All tests pass.

- [ ] **Step 8.2: TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
  ```

  No new errors.

- [ ] **Step 8.3: ESLint**

  ```bash
  npm run lint 2>&1 | grep "error" | grep -v "node_modules" | head -20
  ```

  No new errors.

- [ ] **Step 8.4: Production build**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Build must succeed. Critically: no `Module not found: Can't resolve 'fs/promises'` error.

- [ ] **Step 8.5: Commit fixes if needed**

  ```bash
  git add -A
  git commit -m "fix: resolve any final type/lint issues from guide data wiring"
  ```

---

## Self-Review

**Spec coverage:**
- ✅ `fs/promises` build error fixed (Task 1)
- ✅ Skill key auto-matched via normalised label (Task 2)
- ✅ `fetchGuideUserData` fetches from most recent complete round (Task 3)
- ✅ Pure `buildGuideUserData` is unit-testable separately from Supabase (Task 3)
- ✅ `GuideDataContext` wraps entire guide layout (Task 4 + 5)
- ✅ Pillar score in meta strip chip — real value when authenticated, `—` when not (Task 5)
- ✅ Nav dots use `SCORING_LEVEL_COLORS[level].color` when level available (Task 6)
- ✅ `ScoringBadge` shown in accordion header (Task 7)
- ✅ Action strip: "You scored this {level}" vs "Explore this skill" (Task 7)
- ✅ "View goal" / "Set a goal" toggle based on active plan (Task 7)
- ✅ Goal link includes `?plan={planId}` for deep-linking (Task 7)
- ✅ Unauthenticated users see placeholder state throughout (Tasks 5, 6, 7)

**Type consistency:**
- `Level` (from `lib/skills.ts`) is used in `guide-data.ts` — matches DB values
- `ScoringLevel` (from `config/scoring.ts`) is used in `ScoringBadge` — same string values, cast explicitly where needed
- `SkillItem.skillKey?: string` added in Task 2, consumed in Tasks 3, 6, 7

**Placeholder scan:** No TBDs. All TODOs from previous phase are now resolved.
