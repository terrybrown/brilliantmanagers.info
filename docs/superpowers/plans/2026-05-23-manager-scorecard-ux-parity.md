# Manager Scorecard UX Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-step manager scoring UI (pillar list → per-pillar page) with the same 3-column layout used by self-scoring: left pillar nav, centre skill list with inline level buttons, right guide panel — plus a "DR: [level]" badge in each skill row showing the direct report's self-assessment score.

**Architecture:** Two new components under `components/app/manager/` (`ManagerScorecardShell`, `ManagerSkillList`) mirror their self-scoring counterparts (`ScorecardShell`, `SkillList`) exactly in structure and visual style. `PillarNav` and `GuidePanel` are reused unchanged. The manager page becomes a thin server component that fetches all data upfront and hands it to the shell. The `ManagerScoringView` and `SkillCard` components are deleted.

**Tech Stack:** Next.js 15 App Router (server + client components), React, TypeScript, Tailwind CSS v4, Vitest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `components/app/manager/ManagerSkillList.tsx` | Compact skill rows with inline level buttons + DR score badge |
| Create | `components/app/manager/ManagerScorecardShell.tsx` | 3-column shell: PillarNav + ManagerSkillList + GuidePanel |
| Modify | `app/(app)/manager/[userId]/page.tsx` | Fetch all data, render shell; remove pillar URL param |
| Delete | `components/app/ManagerScoringView.tsx` | Replaced by ManagerScorecardShell |
| Delete | `components/app/SkillCard.tsx` | Only used by ManagerScoringView |

**Read-only reference (do not modify):**
- `components/app/scorecard/SkillList.tsx` — visual template for ManagerSkillList
- `components/app/scorecard/ScorecardShell.tsx` — structural template for ManagerScorecardShell
- `components/app/scorecard/PillarNav.tsx` — reused unchanged
- `components/app/scorecard/GuidePanel.tsx` — reused unchanged
- `app/(app)/scorecard/page.tsx` — template for guide content loading pattern
- `app/(app)/manager/[userId]/actions.ts` — `saveManagerScore(roundId, pillar, skillKey, level)` server action

---

### Task 1: Create feature branch and confirm baseline

**Files:** none

- [ ] **Step 1: Switch to master and pull**

```bash
git checkout master && git pull origin master
```

Expected: on `master`, up to date.

- [ ] **Step 2: Create feature branch**

```bash
git checkout -b feat/manager-scorecard-ux-parity
```

- [ ] **Step 3: Run the test suite**

```bash
npm test
```

Expected: all 480 tests pass. If any fail, stop and report — do not proceed.

---

### Task 2: Create `ManagerSkillList`

**Files:**
- Create: `components/app/manager/ManagerSkillList.tsx`

This component mirrors `components/app/scorecard/SkillList.tsx` exactly in visual style. Key differences: calls `saveManagerScore` instead of `saveScore`, no analytics tracking, adds a "DR: [level]" badge between skill name and level buttons.

- [ ] **Step 1: Create the file**

Create `components/app/manager/ManagerSkillList.tsx`:

```tsx
'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { LEVELS, LEVEL_COLORS, type Skill, type Level } from '@/lib/skills'
import { saveManagerScore } from '@/app/(app)/manager/[userId]/actions'

interface ManagerSkillListProps {
  skills: Skill[]
  scores: Record<string, Level>
  roundId: string
  pillar: string
  activeSkillKey: string | null
  onSkillActivate: (skillKey: string) => void
  onScore: (skillKey: string, level: Level | undefined) => void
  drScores: Record<string, Level> | null
}

export function ManagerSkillList({
  skills,
  scores,
  roundId,
  pillar,
  activeSkillKey,
  onSkillActivate,
  onScore,
  drScores,
}: ManagerSkillListProps) {
  const [, startTransition] = useTransition()

  const handleRate = (skill: Skill, level: Level) => {
    if (scores[skill.key] === level) return
    const previousLevel = scores[skill.key]
    onScore(skill.key, level)
    // Auto-advance to next skill after rating
    const currentIndex = skills.findIndex(s => s.key === skill.key)
    const nextSkill = skills[currentIndex + 1]
    onSkillActivate(nextSkill ? nextSkill.key : skill.key)
    startTransition(async () => {
      try {
        const result = await saveManagerScore(roundId, pillar, skill.key, level)
        if (!result.ok) {
          toast.error(result.error)
          onScore(skill.key, previousLevel)
        }
      } catch {
        onScore(skill.key, previousLevel)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {skills.map(skill => {
        const currentScore = scores[skill.key]
        const isActive = skill.key === activeSkillKey
        const drScore = drScores?.[skill.key]

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

            {drScore && (
              <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                DR:{' '}
                <span style={{ color: LEVEL_COLORS[drScore] }}>{drScore}</span>
              </span>
            )}

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

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: 480 tests pass (no new tests needed for this component — no component test infrastructure exists in this codebase).

- [ ] **Step 3: Commit**

```bash
git add components/app/manager/ManagerSkillList.tsx
git commit -m "feat: add ManagerSkillList component with DR score badge"
```

---

### Task 3: Create `ManagerScorecardShell`

**Files:**
- Create: `components/app/manager/ManagerScorecardShell.tsx`

This component mirrors `components/app/scorecard/ScorecardShell.tsx` exactly in structure, state management, and layout. Key differences: uses `ManagerSkillList`, passes `drScores` down, last pillar button says "Done →" and links to `/dashboard`.

- [ ] **Step 1: Create the file**

Create `components/app/manager/ManagerScorecardShell.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'
import { PillarNav } from '@/components/app/scorecard/PillarNav'
import { GuidePanel } from '@/components/app/scorecard/GuidePanel'
import { ManagerSkillList } from '@/components/app/manager/ManagerSkillList'

interface ManagerScorecardShellProps {
  roundId: string
  allManagerScores: Record<string, Level>
  directReportScores: Record<string, Level> | null
  allGuideContent: Record<string, SkillGuideContent | null>
  directReportName: string
  userId: string
}

export function ManagerScorecardShell({
  roundId,
  allManagerScores,
  directReportScores,
  allGuideContent,
}: ManagerScorecardShellProps) {
  const firstSelfSkill = getSkillsByPillar('self')[0]
  const [activePillar, setActivePillar] = useState<Pillar>('self')
  const [activeSkillKey, setActiveSkillKey] = useState<string | null>(
    firstSelfSkill?.key ?? null
  )
  const [lastActiveByPillar, setLastActiveByPillar] = useState<Partial<Record<Pillar, string>>>(
    firstSelfSkill ? { self: firstSelfSkill.key } : {}
  )
  const [scores, setScores] = useState<Record<string, Level>>(allManagerScores)

  const handlePillarChange = (pillar: Pillar) => {
    setActivePillar(pillar)
    const lastKey = lastActiveByPillar[pillar]
    if (lastKey) {
      setActiveSkillKey(lastKey)
    } else {
      const firstSkill = getSkillsByPillar(pillar)[0]
      const firstKey = firstSkill?.key ?? null
      setActiveSkillKey(firstKey)
      if (firstKey) setLastActiveByPillar(prev => ({ ...prev, [pillar]: firstKey }))
    }
  }

  const handleSkillActivate = (skillKey: string) => {
    setActiveSkillKey(skillKey)
    setLastActiveByPillar(prev => ({ ...prev, [activePillar]: skillKey }))
  }

  const handleScore = (skillKey: string, level: Level | undefined) => {
    setScores(prev => {
      if (level === undefined) {
        const next = { ...prev }
        delete next[skillKey]
        return next
      }
      return { ...prev, [skillKey]: level }
    })
  }

  const pillarProgress = Object.fromEntries(
    PILLARS.map(pillar => {
      const pillarSkills = getSkillsByPillar(pillar)
      const scored = pillarSkills.filter(s => scores[s.key]).length
      return [pillar, { scored, total: pillarSkills.length }]
    })
  ) as Record<Pillar, { scored: number; total: number }>

  const skills = getSkillsByPillar(activePillar)
  const pillarIndex = PILLARS.indexOf(activePillar)
  const prevPillar = pillarIndex > 0 ? PILLARS[pillarIndex - 1] : null
  const nextPillar = pillarIndex < PILLARS.length - 1 ? PILLARS[pillarIndex + 1] : null
  const isLastPillar = pillarIndex === PILLARS.length - 1

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
        <ManagerSkillList
          skills={skills}
          scores={scores}
          roundId={roundId}
          pillar={activePillar}
          activeSkillKey={activeSkillKey}
          onSkillActivate={handleSkillActivate}
          onScore={handleScore}
          drScores={directReportScores}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            paddingBottom: 8,
          }}
        >
          {prevPillar ? (
            <button
              onClick={() => handlePillarChange(prevPillar)}
              style={{
                background: '#f59e0b22',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← {PILLAR_LABELS[prevPillar]}
            </button>
          ) : (
            <span />
          )}

          {isLastPillar ? (
            <Link
              href="/dashboard"
              style={{
                background: '#f59e0b',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Done →
            </Link>
          ) : nextPillar ? (
            <button
              onClick={() => handlePillarChange(nextPillar)}
              style={{
                background: '#f59e0b22',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {PILLAR_LABELS[nextPillar]} →
            </button>
          ) : null}
        </div>
      </div>
      <GuidePanel activeSkillKey={activeSkillKey} allGuideContent={allGuideContent} />
    </div>
  )
}
```

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: 480 tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/app/manager/ManagerScorecardShell.tsx
git commit -m "feat: add ManagerScorecardShell with 3-column layout"
```

---

### Task 4: Update `manager/[userId]/page.tsx`

**Files:**
- Modify: `app/(app)/manager/[userId]/page.tsx`

Replace the entire file. Changes from the current version:
- Remove `pillar` from `searchParams` (only `roundId` remains)
- Remove `Link` import (no longer needed in this file)
- Add `SKILLS` import (for guide content loop)
- Add `getSkillGuideContent` / `SkillGuideContent` imports
- Add `ManagerScorecardShell` import; remove `ManagerScoringView` import
- Remove the pillar-selection branch (lines 92–136)
- Remove the `ManagerScoringView` render
- After fetching the round, convert all manager scores to `Record<string, Level>`
- Load guide content for every skill (same pattern as `scorecard/page.tsx`)
- Render `<ManagerScorecardShell />` with heading + avatar above it

- [ ] **Step 1: Replace the file**

Write `app/(app)/manager/[userId]/page.tsx` with this exact content:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLatestCompleteRound, getRoundById } from '@/lib/db/rounds'
import { getManagerScoresForRound } from '@/lib/db/manager-scores'
import { getSignedAvatarUrl, getProfile } from '@/lib/db/profiles'
import { SKILLS, type Level } from '@/lib/skills'
import { getSkillGuideContent } from '@/lib/guide-content'
import type { SkillGuideContent } from '@/lib/guide-content'
import { ManagerScorecardShell } from '@/components/app/manager/ManagerScorecardShell'

function shouldFetchDrScores(isBlindMode: boolean, roundStatus: string): boolean {
  return !isBlindMode && roundStatus === 'complete'
}

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ roundId?: string }>
}) {
  const { userId } = await params
  const { roundId: roundIdParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: connection } = await supabase
    .from('connections')
    .select('*')
    .eq('manager_id', user.id)
    .eq('direct_report_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!connection) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, avatar_path')
    .eq('id', userId)
    .single()

  const directReportAvatarUrl = profile?.avatar_path
    ? await getSignedAvatarUrl(profile.avatar_path)
    : null

  let round = roundIdParam ? await getRoundById(roundIdParam, userId) : null
  if (!round) {
    round = await getLatestCompleteRound(userId)
  }

  if (round?.status === 'scheduled') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-xl font-bold">{profile?.display_name ?? profile?.email}</h1>
        <p className="text-neutral-400">
          {profile?.display_name ?? profile?.email ?? 'This person'} has a round scheduled but
          hasn&apos;t started their self-assessment yet. Check back once they begin.
        </p>
      </main>
    )
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-400">
          {profile?.display_name ?? 'This person'} hasn&apos;t started a round yet.
        </p>
      </div>
    )
  }

  const managerProfile = await getProfile(user.id)
  const isBlindMode = managerProfile?.manager_scoring_blind ?? false

  let directReportScores: Record<string, Level> | null = null
  if (shouldFetchDrScores(isBlindMode, round.status)) {
    const { data: scoreRows } = await supabase
      .from('scores')
      .select('skill_key, level')
      .eq('round_id', round.id)
    if (scoreRows) {
      directReportScores = Object.fromEntries(
        scoreRows.map(s => [s.skill_key, s.level as Level])
      )
    }
  }

  const managerScoreRows = await getManagerScoresForRound(round.id, user.id)
  const allManagerScores: Record<string, Level> = Object.fromEntries(
    managerScoreRows.map(ms => [ms.skill_key, ms.level])
  )

  const guideEntries = await Promise.all(
    SKILLS.map(async s => {
      try {
        return [s.key, await getSkillGuideContent(s.key)] as const
      } catch {
        return [s.key, null] as const
      }
    })
  )
  const allGuideContent: Record<string, SkillGuideContent | null> = Object.fromEntries(guideEntries)

  const directReportName = profile?.display_name ?? profile?.email ?? 'your direct report'

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        {directReportAvatarUrl && (
          <img
            src={directReportAvatarUrl}
            alt={directReportName}
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">Scoring {directReportName}</h1>
          <p className="text-sm text-slate-400">Scores save automatically.</p>
        </div>
      </div>
      <ManagerScorecardShell
        roundId={round.id}
        allManagerScores={allManagerScores}
        directReportScores={directReportScores}
        allGuideContent={allGuideContent}
        directReportName={directReportName}
        userId={userId}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: 480 tests pass.

- [ ] **Step 3: Run a build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without TypeScript errors. There will be Next.js route output lines — that's fine. Any `Type error:` line is a failure.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/manager/[userId]/page.tsx
git commit -m "feat: update manager page to use ManagerScorecardShell"
```

---

### Task 5: Delete `ManagerScoringView` and `SkillCard`

**Files:**
- Delete: `components/app/ManagerScoringView.tsx`
- Delete: `components/app/SkillCard.tsx`

Both files are now unreferenced. `ManagerScoringView` is replaced by `ManagerScorecardShell`. `SkillCard` was only used by `ManagerScoringView`.

- [ ] **Step 1: Confirm the files are unreferenced**

```bash
grep -r "ManagerScoringView\|SkillCard" /Users/terry.brown/work/personal/brilliantmanagers.info \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir=node_modules \
  --exclude-dir=".next"
```

Expected: zero results. If any remain, do not delete — report back.

- [ ] **Step 2: Delete the files**

```bash
rm components/app/ManagerScoringView.tsx components/app/SkillCard.tsx
```

- [ ] **Step 3: Run the test suite**

```bash
npm test
```

Expected: 480 tests pass.

- [ ] **Step 4: Run a build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build, no `Type error:` lines.

- [ ] **Step 5: Commit**

```bash
git add -u components/app/ManagerScoringView.tsx components/app/SkillCard.tsx
git commit -m "chore: delete ManagerScoringView and SkillCard (replaced by new shell)"
```

---

### Task 6: Smoke test and raise PR

- [ ] **Step 1: git status**

```bash
git status
```

Expected: working tree clean. Only the five files from the file map should appear in `git log --oneline master..HEAD`.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/manager-scorecard-ux-parity
```

- [ ] **Step 3: Manual browser smoke test**

Start the dev server (`npm run dev`) and verify:

1. Navigate to `/manager/[anyDRUserId]?roundId=[aRoundId]` — should render the 3-column layout immediately with no pillar-selection step
2. The left sidebar shows all 5 pillars with scored/total counts
3. Click a different pillar in the sidebar — instant switch, no page reload
4. Click a skill name — guide panel on the right updates with the skill's content
5. Score a skill by clicking a level button — optimistic update, auto-advances to next skill
6. If the DR's round is complete and blind mode is off: each skill row shows a "DR: [level]" badge in the appropriate colour
7. Navigate to the last pillar (Domain Expertise) — "Done →" button appears, clicking it goes to `/dashboard`
8. Open `/scorecard` — self-scoring is visually identical to before (no regressions)

- [ ] **Step 4: Show diff to user and wait for approval before creating PR**

```bash
git diff --stat master..HEAD
git log --oneline master..HEAD
```

Show the output to the user. Do NOT run `gh pr create` until the user explicitly approves.
