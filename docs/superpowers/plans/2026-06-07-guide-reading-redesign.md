# Guide Reading View Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `app/the-guide/[...slug]/page.tsx` and `components/guide/*` to match the Sage design handoff — 2-column layout (244 px sticky nav + ≤740 px reading column), Newsreader serif prose, enriched sticky chapter nav with scroll-spy skill sub-items, Sage-card skill accordions, and a chapter header with eyebrow / title / meta strip.

**Architecture:** The page stays a Next.js server component; all client interactivity is isolated to three leaf components — `ReadingProgressBar` (scroll position), `ChapterNav` (scroll-spy), and `GuideDetails` (controlled accordion). The MDX pipeline (`getGuideChapter`, `guideComponents`, `compileMDX`) is kept **intact**. `GuideDetails` is rewritten from an HTML `<details>` wrapper to a div-based Sage card accordion. Score and goal data are **not wired** in this phase — all score/goal values are hardcoded with `// TODO` comments.

**Tech Stack:** Next.js 15 App Router, Tailwind v4, Lucide React, Vitest + Testing Library, `next/font/google` (Newsreader)

---

## File Map

**Create:**
- `components/guide/reading-progress.tsx` — fixed reading progress bar (client)
- `__tests__/components/guide/chapter-nav.test.tsx` — ChapterNav unit tests
- `__tests__/components/guide/details.test.tsx` — GuideDetails unit tests
- `__tests__/lib/mdx-guide.test.ts` — extractSkills + computeReadingTime tests

**Modify:**
- `app/fonts.ts` — add Newsreader export
- `app/layout.tsx` — add `newsreader.variable` to `<html>` className
- `app/globals.css` — add `--font-reading` token; add `.guide-prose` class; add `.guide-skill-body` section styles; remove old `.prose details/summary` CSS blocks
- `lib/mdx.ts` — add `SkillItem` type, `extractSkills()`, `computeReadingTime()`; update `getGuideChapter` return type
- `lib/guide.ts` — add `GUIDE_SECTION_ORDINALS` map
- `config/scoring.ts` — update `SCORING_LEVEL_COLORS` from Tailwind-class strings to Sage hex inline-style objects
- `components/guide/scoring-badge.tsx` — Sage inline-style colours + `you?: boolean` prop
- `components/guide/chapter-nav.tsx` — full rewrite: `'use client'`, numbered pillars, skill sub-items, scroll-spy
- `components/guide/details.tsx` — full rewrite: `'use client'`, Sage card accordion, action strip placeholder
- `app/the-guide/[...slug]/page.tsx` — 2-column grid, chapter header, meta strip, lede, no right TOC
- `__tests__/components/guide/scoring-badge.test.tsx` — update existing tests for new `you` prop

---

## Task 1 — Newsreader font + CSS token

**Files:**
- Modify: `app/fonts.ts`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1.1: Add Newsreader to `app/fonts.ts`**

  Open `app/fonts.ts`. Add after the existing exports:

  ```ts
  import { Bricolage_Grotesque, Hanken_Grotesk, Newsreader } from 'next/font/google'

  export const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    weight: ['400', '600', '700', '800'],
    variable: '--font-bricolage',
    display: 'swap',
  })

  export const hanken = Hanken_Grotesk({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-hanken',
    display: 'swap',
  })

  export const newsreader = Newsreader({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    style: ['normal', 'italic'],
    variable: '--font-newsreader',
    display: 'swap',
  })
  ```

- [ ] **Step 1.2: Add `newsreader.variable` to `app/layout.tsx`**

  In `app/layout.tsx`, add `newsreader` to the import from `'./fonts'`:

  ```tsx
  import { bricolage, hanken, newsreader } from './fonts'
  ```

  Update the `<html>` className to include the new variable (existing variables remain):

  ```tsx
  <html lang="en" className={`${jakartaSans.variable} ${inter.variable} ${bricolage.variable} ${hanken.variable} ${newsreader.variable}`}>
  ```

- [ ] **Step 1.3: Add `--font-reading` token to `app/globals.css`**

  In `app/globals.css`, inside the `@theme {}` block, add after `--font-body`:

  ```css
  --font-reading: var(--font-newsreader), Georgia, 'Times New Roman', serif;
  ```

- [ ] **Step 1.4: Verify build compiles**

  ```bash
  cd /Users/terry.brown/work/personal/brilliantmanagers.info
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no type errors related to fonts.

- [ ] **Step 1.5: Commit**

  ```bash
  git add app/fonts.ts app/layout.tsx app/globals.css
  git commit -m "feat: add Newsreader font and --font-reading CSS token for guide prose"
  ```

---

## Task 2 — Sage scoring colours + ScoringBadge

**Files:**
- Modify: `config/scoring.ts`
- Modify: `components/guide/scoring-badge.tsx`
- Modify: `__tests__/components/guide/scoring-badge.test.tsx`

- [ ] **Step 2.1: Update tests first**

  Replace the full content of `__tests__/components/guide/scoring-badge.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { ScoringBadge } from '@/components/guide/scoring-badge'

  describe('ScoringBadge', () => {
    it('renders just the level name by default (you=false)', () => {
      render(<ScoringBadge level="Proficient" />)
      expect(screen.getByText('Proficient')).toBeInTheDocument()
    })

    it('renders "You · {level}" when you prop is true', () => {
      render(<ScoringBadge level="Advanced" you />)
      expect(screen.getByText('You · Advanced')).toBeInTheDocument()
    })

    it('renders all five levels without crashing', () => {
      const levels = ['Developing', 'Basic', 'Proficient', 'Advanced', 'Expert'] as const
      for (const level of levels) {
        const { unmount } = render(<ScoringBadge level={level} />)
        expect(screen.getByText(level)).toBeInTheDocument()
        unmount()
      }
    })

    it('renders a coloured dot span inside the badge', () => {
      const { container } = render(<ScoringBadge level="Advanced" />)
      // The dot is an inline span with a borderRadius style — confirm it exists
      const dot = container.querySelector('span > span')
      expect(dot).not.toBeNull()
    })
  })
  ```

- [ ] **Step 2.2: Run tests — verify they FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/scoring-badge.test.tsx 2>&1 | tail -20
  ```

  Expected: the "renders 'You · Advanced'" test fails because the `you` prop doesn't exist yet.

- [ ] **Step 2.3: Update `config/scoring.ts`**

  Replace `SCORING_LEVEL_COLORS` with Sage hex values (inline styles, not Tailwind classes). `ScoringBadge` is the only consumer.

  ```ts
  export const SCORING_LEVEL_COLORS: Record<
    ScoringLevel,
    { color: string; bg: string; border: string }
  > = {
    Developing: {
      color: '#C0552F',
      bg: 'rgba(192,85,47,0.12)',
      border: 'rgba(192,85,47,0.30)',
    },
    Basic: {
      color: '#CC8A1A',
      bg: 'rgba(204,138,26,0.12)',
      border: 'rgba(204,138,26,0.30)',
    },
    Proficient: {
      color: '#7A9A3C',
      bg: 'rgba(122,154,60,0.12)',
      border: 'rgba(122,154,60,0.30)',
    },
    Advanced: {
      color: '#0E7C6B',
      bg: 'rgba(14,124,107,0.12)',
      border: 'rgba(14,124,107,0.30)',
    },
    Expert: {
      color: '#0B5448',
      bg: 'rgba(11,84,72,0.12)',
      border: 'rgba(11,84,72,0.30)',
    },
  }
  ```

- [ ] **Step 2.4: Rewrite `components/guide/scoring-badge.tsx`**

  ```tsx
  import { SCORING_LEVEL_COLORS, SCORING_LEVEL_DESCRIPTIONS } from '@/config/scoring'
  import type { ScoringLevel } from '@/config/scoring'

  interface ScoringBadgeProps {
    level: ScoringLevel
    you?: boolean
  }

  export function ScoringBadge({ level, you = false }: ScoringBadgeProps) {
    const { color, bg, border } = SCORING_LEVEL_COLORS[level]
    const label = you ? `You · ${level}` : level
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color,
          background: bg,
          border: `1px solid ${border}`,
          padding: '4px 10px',
          borderRadius: 7,
          fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap',
        }}
        title={SCORING_LEVEL_DESCRIPTIONS[level]}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        {label}
      </span>
    )
  }
  ```

- [ ] **Step 2.5: Run tests — verify they PASS**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/scoring-badge.test.tsx 2>&1 | tail -20
  ```

  Expected: all 4 tests pass.

- [ ] **Step 2.6: Commit**

  ```bash
  git add config/scoring.ts components/guide/scoring-badge.tsx __tests__/components/guide/scoring-badge.test.tsx
  git commit -m "feat: update ScoringBadge to Sage level ramp colours, add you prop"
  ```

---

## Task 3 — lib/mdx.ts guide metadata helpers

**Files:**
- Modify: `lib/mdx.ts`
- Create: `__tests__/lib/mdx-guide.test.ts`

- [ ] **Step 3.1: Write tests first**

  Create `__tests__/lib/mdx-guide.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest'
  import { extractSkills, computeReadingTime } from '@/lib/mdx'

  describe('extractSkills', () => {
    it('returns empty array when no summary tags present', () => {
      expect(extractSkills('## Hello\n\nSome text.\n')).toEqual([])
    })

    it('extracts a single skill from a summary tag', () => {
      const source = '<details>\n  <summary>Time and Task Management</summary>\n</details>'
      const skills = extractSkills(source)
      expect(skills).toHaveLength(1)
      expect(skills[0].text).toBe('Time and Task Management')
      expect(skills[0].id).toBe('time-and-task-management')
    })

    it('extracts multiple skills in document order', () => {
      const source = '  <summary>First Skill</summary>\n  <summary>Second Skill</summary>'
      const skills = extractSkills(source)
      expect(skills).toHaveLength(2)
      expect(skills[0].text).toBe('First Skill')
      expect(skills[1].text).toBe('Second Skill')
    })

    it('ignores summary-like text that is not inside a tag', () => {
      const source = 'Some text with summary mention but no tags\n<summary>Real Skill</summary>'
      const skills = extractSkills(source)
      expect(skills).toHaveLength(1)
      expect(skills[0].text).toBe('Real Skill')
    })
  })

  describe('computeReadingTime', () => {
    it('returns at least 1 minute for very short content', () => {
      expect(computeReadingTime('Hello world')).toBe(1)
    })

    it('returns ~2 minutes for 400 words', () => {
      const source = Array(400).fill('word').join(' ')
      expect(computeReadingTime(source)).toBe(2)
    })

    it('rounds to nearest minute', () => {
      // 300 words → 1.5 min → rounds to 2
      const source = Array(300).fill('word').join(' ')
      expect(computeReadingTime(source)).toBe(2)
    })
  })
  ```

- [ ] **Step 3.2: Run tests — verify they FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/mdx-guide.test.ts 2>&1 | tail -20
  ```

  Expected: FAIL — `extractSkills` and `computeReadingTime` are not exported yet.

- [ ] **Step 3.3: Add `SkillItem`, `extractSkills`, `computeReadingTime` to `lib/mdx.ts`**

  Add the following **after** the existing `TocItem` interface and **before** `toSlug`:

  ```ts
  export interface SkillItem {
    id: string
    text: string
  }

  export function extractSkills(source: string): SkillItem[] {
    const skills: SkillItem[] = []
    for (const line of source.split('\n')) {
      const m = line.match(/^\s*<summary>(.+?)<\/summary>\s*$/)
      if (m) {
        const text = m[1].trim()
        skills.push({ id: toSlug(text), text })
      }
    }
    return skills
  }

  export function computeReadingTime(source: string): number {
    const words = source.trim().split(/\s+/).length
    return Math.max(1, Math.round(words / 200))
  }
  ```

  **Note:** `extractSkills` calls `toSlug`, which is defined just below it in the file. Move the `toSlug` function above `extractSkills`, or reorder so `toSlug` comes first.

- [ ] **Step 3.4: Update `getGuideChapter` return type and body**

  Change the function signature and return statement:

  ```ts
  export async function getGuideChapter(
    slug: string[],
    components: MdxComponents = {}
  ): Promise<{
    content: React.ReactElement
    frontmatter: GuideFrontmatter
    headings: TocItem[]
    skills: SkillItem[]
    readingTimeMinutes: number
  }> {
    const filePath = path.join(contentDir, 'guide', `${slug.join('/')}.mdx`)
    const source = await readMdx(filePath)

    const headings = extractHeadings(source)
    const skills = extractSkills(source)
    const readingTimeMinutes = computeReadingTime(source)

    const { content, frontmatter } = await compileMDX<GuideFrontmatter>({
      source,
      components,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, rehypeDetailsIds],
        },
      },
    })

    return { content, frontmatter, headings, skills, readingTimeMinutes }
  }
  ```

- [ ] **Step 3.5: Run tests — verify they PASS**

  ```bash
  npm test -- --reporter=verbose __tests__/lib/mdx-guide.test.ts 2>&1 | tail -20
  ```

  Expected: all tests pass.

- [ ] **Step 3.6: Run full suite to catch regressions**

  ```bash
  npm test 2>&1 | tail -20
  ```

  Expected: all tests pass (existing tests unaffected).

- [ ] **Step 3.7: Commit**

  ```bash
  git add lib/mdx.ts __tests__/lib/mdx-guide.test.ts
  git commit -m "feat: add extractSkills and computeReadingTime to lib/mdx"
  ```

---

## Task 4 — lib/guide.ts: add GUIDE_SECTION_ORDINALS

**Files:**
- Modify: `lib/guide.ts`

- [ ] **Step 4.1: Add `GUIDE_SECTION_ORDINALS` to `lib/guide.ts`**

  Add after `GUIDE_SECTION_LABELS`:

  ```ts
  export const GUIDE_SECTION_ORDINALS: Record<GuideSection, number> = {
    self: 1,
    team: 2,
    strategy: 3,
    communications: 4,
    'domain-expertise': 5,
  }
  ```

- [ ] **Step 4.2: Verify type check**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 4.3: Commit**

  ```bash
  git add lib/guide.ts
  git commit -m "feat: add GUIDE_SECTION_ORDINALS to lib/guide"
  ```

---

## Task 5 — ReadingProgressBar component

**Files:**
- Create: `components/guide/reading-progress.tsx`

- [ ] **Step 5.1: Create `components/guide/reading-progress.tsx`**

  ```tsx
  'use client'

  import { useEffect, useState } from 'react'

  export function ReadingProgressBar() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
      function update() {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        setProgress(docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0)
      }
      window.addEventListener('scroll', update, { passive: true })
      update()
      return () => window.removeEventListener('scroll', update)
    }, [])

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--color-border)',
          zIndex: 60,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--color-accent)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    )
  }
  ```

  **Note on positioning:** `z-index: 60` places this above the marketing Nav (`z-50`). At 3 px tall it sits flush at the very top of the viewport — a thin accent bar above the nav. This is a standard reading-progress pattern. The bar does not need testing (DOM scroll events do not work in jsdom).

- [ ] **Step 5.2: Verify TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no errors.

- [ ] **Step 5.3: Commit**

  ```bash
  git add components/guide/reading-progress.tsx
  git commit -m "feat: add ReadingProgressBar client component for guide"
  ```

---

## Task 6 — ChapterNav redesign

**Files:**
- Modify: `components/guide/chapter-nav.tsx`
- Create: `__tests__/components/guide/chapter-nav.test.tsx`

- [ ] **Step 6.1: Write tests first**

  Create `__tests__/components/guide/chapter-nav.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import { ChapterNav } from '@/components/guide/chapter-nav'

  vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  }))

  describe('ChapterNav', () => {
    it('renders all 5 pillar labels', () => {
      render(<ChapterNav activeSlug="self" skills={[]} />)
      expect(screen.getByText('Self')).toBeInTheDocument()
      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('Strategy')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
      expect(screen.getByText('Domain Expertise')).toBeInTheDocument()
    })

    it('renders two-digit ordinal numbers for pillars', () => {
      render(<ChapterNav activeSlug="self" skills={[]} />)
      expect(screen.getByText('01')).toBeInTheDocument()
      expect(screen.getByText('05')).toBeInTheDocument()
    })

    it('renders skill sub-items under the active pillar', () => {
      const skills = [
        { id: 'time-and-task-management', text: 'Time and Task Management' },
        { id: 'empathy-and-compassion', text: 'Empathy and Compassion' },
      ]
      render(<ChapterNav activeSlug="self" skills={skills} />)
      expect(screen.getByText('Time and Task Management')).toBeInTheDocument()
      expect(screen.getByText('Empathy and Compassion')).toBeInTheDocument()
    })

    it('does not render skill sub-items when skills array is empty', () => {
      render(<ChapterNav activeSlug="self" skills={[]} />)
      // No skill sub-items; only the 5 pillar labels
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('links each pillar to its guide page', () => {
      render(<ChapterNav activeSlug="self" skills={[]} />)
      const teamLink = screen.getByRole('link', { name: /Team/i })
      expect(teamLink).toHaveAttribute('href', '/the-guide/team')
    })
  })
  ```

- [ ] **Step 6.2: Run tests — verify they FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/chapter-nav.test.tsx 2>&1 | tail -30
  ```

  Expected: FAIL (component doesn't have the new props/structure yet).

- [ ] **Step 6.3: Rewrite `components/guide/chapter-nav.tsx`**

  ```tsx
  'use client'

  import { useEffect, useState } from 'react'
  import Link from 'next/link'
  import { ChevronRight } from 'lucide-react'
  import { GUIDE_SECTIONS, GUIDE_SECTION_LABELS, GUIDE_SECTION_ORDINALS } from '@/lib/guide'
  import type { SkillItem } from '@/lib/mdx'

  interface ChapterNavProps {
    activeSlug: string
    skills: SkillItem[]
  }

  export function ChapterNav({ activeSlug, skills }: ChapterNavProps) {
    const [activeSkillId, setActiveSkillId] = useState<string>('')

    useEffect(() => {
      if (!skills.length) return
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActiveSkillId(entry.target.id)
          }
        },
        { rootMargin: '-80px 0% -60% 0%', threshold: 0 }
      )
      for (const { id } of skills) {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      }
      return () => observer.disconnect()
    }, [skills])

    return (
      <nav
        className="sticky self-start"
        style={{ top: 80, width: 244 }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            fontFamily: 'var(--font-body)',
            marginBottom: 12,
          }}
        >
          The Guide
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {GUIDE_SECTIONS.map((section, idx) => {
            const isActive = activeSlug === section
            const ordinal = String(GUIDE_SECTION_ORDINALS[section]).padStart(2, '0')
            return (
              <div key={section}>
                <Link
                  href={`/the-guide/${section}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 11px',
                    borderRadius: 9,
                    textDecoration: 'none',
                    background: isActive ? 'var(--color-accent-wash2)' : 'transparent',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 7,
                        bottom: 7,
                        width: 3,
                        borderRadius: 3,
                        background: 'var(--color-accent)',
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-faint)',
                      fontFamily: 'var(--font-body)',
                      width: 18,
                      flexShrink: 0,
                    }}
                  >
                    {ordinal}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {GUIDE_SECTION_LABELS[section]}
                  </span>
                  {isActive && skills.length > 0 && (
                    <ChevronRight size={14} color="var(--color-accent)" />
                  )}
                </Link>

                {isActive && skills.length > 0 && (
                  <div
                    style={{
                      margin: '3px 0 6px 27px',
                      paddingLeft: 12,
                      borderLeft: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    {skills.map((skill) => {
                      const isSkillActive = activeSkillId === skill.id
                      return (
                        <button
                          key={skill.id}
                          onClick={() => {
                            const el = document.getElementById(skill.id)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '5px 6px',
                            borderRadius: 7,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          {/* TODO: replace background with SCORING_LEVEL_COLORS[skill.level].color once score data is wired */}
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isSkillActive
                                ? 'var(--color-accent)'
                                : 'var(--color-track)',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: isSkillActive ? 650 : 500,
                              color: isSkillActive
                                ? 'var(--color-text-primary)'
                                : 'var(--color-text-muted)',
                              fontFamily: 'var(--font-body)',
                              lineHeight: 1.3,
                            }}
                          >
                            {skill.text}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>
    )
  }
  ```

  **Note:** The unused `idx` variable from the `.map((section, idx) =>` call should be removed since `GUIDE_SECTION_ORDINALS` provides the number. Use `.map((section) =>` instead.

- [ ] **Step 6.4: Run tests — verify they PASS**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/chapter-nav.test.tsx 2>&1 | tail -30
  ```

  Expected: all tests pass.

- [ ] **Step 6.5: Commit**

  ```bash
  git add components/guide/chapter-nav.tsx __tests__/components/guide/chapter-nav.test.tsx
  git commit -m "feat: redesign ChapterNav as Sage sticky nav with numbered pillars and scroll-spy"
  ```

---

## Task 7 — GuideDetails Sage card redesign

**Files:**
- Modify: `components/guide/details.tsx`
- Create: `__tests__/components/guide/details.test.tsx`

- [ ] **Step 7.1: Write tests first**

  Create `__tests__/components/guide/details.test.tsx`:

  ```tsx
  import React from 'react'
  import { render, screen, fireEvent } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { GuideDetails } from '@/components/guide/details'

  function renderSkill(summaryText = 'Test Skill', bodyText = 'Skill body content.') {
    return render(
      <GuideDetails>
        <summary>{summaryText}</summary>
        <p>{bodyText}</p>
      </GuideDetails>
    )
  }

  describe('GuideDetails', () => {
    it('renders the skill name in the accordion header', () => {
      renderSkill('Time Management')
      expect(screen.getByText('Time Management')).toBeInTheDocument()
    })

    it('hides body content when accordion is closed', () => {
      renderSkill('Test Skill', 'Hidden content')
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('shows body content after clicking the header button', () => {
      renderSkill('Test Skill', 'Revealed content')
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('Revealed content')).toBeInTheDocument()
    })

    it('collapses body content when header is clicked a second time', () => {
      renderSkill('Test Skill', 'Toggle content')
      const btn = screen.getByRole('button')
      fireEvent.click(btn)
      expect(screen.getByText('Toggle content')).toBeInTheDocument()
      fireEvent.click(btn)
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
    })

    it('sets aria-expanded to false when closed', () => {
      renderSkill()
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
    })

    it('sets aria-expanded to true when open', () => {
      renderSkill()
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    })

    it('uses the summary text as the element id slug', () => {
      const { container } = renderSkill('Time and Task Management')
      expect(container.firstChild).toHaveAttribute('id', 'time-and-task-management')
    })
  })
  ```

- [ ] **Step 7.2: Run tests — verify they FAIL**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/details.test.tsx 2>&1 | tail -30
  ```

  Expected: FAIL — current `GuideDetails` is an HTML `<details>` wrapper, not a controlled accordion.

- [ ] **Step 7.3: Rewrite `components/guide/details.tsx`**

  ```tsx
  'use client'

  import React, { useState } from 'react'
  import { ChevronRight, ChevronDown, Sparkles } from 'lucide-react'

  function toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
  }

  function extractText(node: React.ReactNode): string {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(extractText).join('')
    if (React.isValidElement(node)) {
      return extractText(
        (node.props as { children?: React.ReactNode }).children
      )
    }
    return ''
  }

  interface GuideDetailsProps {
    children: React.ReactNode
    id?: string
    [key: string]: unknown
  }

  export function GuideDetails({ children, id: propsId }: GuideDetailsProps) {
    const [isOpen, setIsOpen] = useState(false)

    const childArray = React.Children.toArray(children)
    const summaryChild = childArray.find(
      (child) => React.isValidElement(child) && child.type === 'summary'
    )
    const summaryText = summaryChild
      ? extractText(
          (summaryChild as React.ReactElement<{ children?: React.ReactNode }>).props
            .children
        )
      : ''
    const id = propsId ?? toSlug(summaryText)
    const bodyChildren = childArray.filter(
      (child) => !(React.isValidElement(child) && child.type === 'summary')
    )

    return (
      <div
        id={id}
        style={{
          background: 'var(--color-surface)',
          border: `1px solid ${isOpen ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          scrollMarginTop: '5rem',
        }}
      >
        {/* Accordion header */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: isOpen ? '18px 22px 6px' : '16px 22px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {isOpen ? (
            <ChevronDown size={17} color="var(--color-text-faint)" strokeWidth={2.2} />
          ) : (
            <ChevronRight size={17} color="var(--color-text-faint)" strokeWidth={2.2} />
          )}
          <span
            style={{
              flex: 1,
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            {summaryText}
          </span>
          {/* TODO: replace with <ScoringBadge level={userSkillLevel} you /> once score data is wired */}
        </button>

        {/* Accordion body */}
        {isOpen && (
          <div className="guide-skill-body" style={{ padding: '0 22px 22px' }}>
            {bodyChildren}

            {/* Product tie-in action strip — TODO: wire to real user score/goal data */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 22,
                padding: '14px 16px',
                background: 'var(--color-accent-wash)',
                border: '1px solid var(--color-accent-border)',
                borderRadius: 12,
              }}
            >
              <Sparkles size={18} color="var(--color-accent)" />
              <span
                style={{
                  flex: 1,
                  fontSize: 13.5,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {/* TODO: replace with "You scored this {level}" using real user data */}
                Explore this skill in the scorecard
              </span>
              <a
                href="/scorecard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 34,
                  padding: '0 14px',
                  background: 'transparent',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-accent-border)',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
              >
                Re-score
              </a>
              <a
                href="/growth"
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
                {/* TODO: show "View goal" if user has active goal for this skill */}
                Set a goal
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 7.4: Run tests — verify they PASS**

  ```bash
  npm test -- --reporter=verbose __tests__/components/guide/details.test.tsx 2>&1 | tail -30
  ```

  Expected: all 7 tests pass.

- [ ] **Step 7.5: Commit**

  ```bash
  git add components/guide/details.tsx __tests__/components/guide/details.test.tsx
  git commit -m "feat: rewrite GuideDetails as Sage card accordion with action strip placeholder"
  ```

---

## Task 8 — globals.css: guide prose + skill body styles

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 8.1: Remove old `.prose details/summary` CSS block**

  In `app/globals.css`, remove the entire block that begins with the comment `/* ── Prose: details / summary (collapsible sections) ── */` and ends before `/* ── Prose: tables */`. This covers these selectors:

  ```
  .prose details { ... }
  .prose summary { ... }
  .prose summary::-webkit-details-marker { ... }
  .prose summary::before { ... }
  .prose details[open] > summary::before { ... }
  .prose details[open] > summary { ... }
  .prose details > *:not(summary) { ... }
  ```

  `GuideDetails` no longer renders HTML `<details>/<summary>` elements so this CSS is dead code.

- [ ] **Step 8.2: Add `.guide-prose` and `.guide-skill-body` styles**

  Append the following at the end of `app/globals.css`:

  ```css
  /* ── Guide reading view: Newsreader serif prose ── */
  .guide-prose {
    font-family: var(--font-reading), Georgia, serif;
    font-size: 18px;
    line-height: 1.7;
  }

  .guide-prose > p:first-of-type {
    font-size: 21px;
    line-height: 1.55;
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .guide-prose blockquote p {
    font-family: var(--font-reading), Georgia, serif;
    font-size: 24px;
    font-style: italic;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
  }

  /* ── Guide skill accordion body sections ── */
  .guide-skill-body h4 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-faint);
    font-family: var(--font-body);
    margin: 22px 0 10px;
  }

  .guide-skill-body h4:first-child {
    margin-top: 16px;
  }

  .guide-skill-body > p {
    font-size: 16.5px;
    color: var(--color-text-muted);
    font-family: var(--font-reading), Georgia, serif;
    line-height: 1.65;
    margin: 0 0 8px;
  }

  .guide-skill-body ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .guide-skill-body ul li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 16px;
    color: var(--color-text-muted);
    font-family: var(--font-reading), Georgia, serif;
    line-height: 1.5;
    margin-bottom: 0;
  }

  .guide-skill-body ul li::before {
    content: '→';
    color: var(--color-accent);
    flex-shrink: 0;
    margin-top: 2px;
    font-family: var(--font-body);
    font-weight: 600;
  }

  /* Skill accordion spacing between accordion cards */
  .guide-prose .guide-skill-body + * {
    margin-top: 12px;
  }
  ```

- [ ] **Step 8.3: Add spacing between GuideDetails cards in the prose context**

  The guide skill cards need `margin-bottom: 12px` between them. This is controlled by the MDX prose wrapper. Add:

  ```css
  /* Gap between consecutive guide skill cards */
  .guide-prose > div + div {
    margin-top: 12px;
  }
  ```

  **Note:** Since `GuideDetails` renders a `<div>`, consecutive `<div>` siblings in the prose get 12 px gap.

- [ ] **Step 8.4: Run full test suite**

  ```bash
  npm test 2>&1 | tail -10
  ```

  Expected: all tests pass (CSS changes don't affect JS tests).

- [ ] **Step 8.5: Commit**

  ```bash
  git add app/globals.css
  git commit -m "feat: add guide-prose (Newsreader) and guide-skill-body section styles"
  ```

---

## Task 9 — Page layout redesign

**Files:**
- Modify: `app/the-guide/[...slug]/page.tsx`

- [ ] **Step 9.1: Rewrite `app/the-guide/[...slug]/page.tsx`**

  Replace the entire file with:

  ```tsx
  import { notFound } from 'next/navigation'
  import { Clock, BookOpen } from 'lucide-react'
  import Link from 'next/link'
  import { getGuideChapter } from '@/lib/mdx'
  import {
    getPrevNextChapters,
    GUIDE_SECTION_LABELS,
    GUIDE_SECTION_ORDINALS,
    GUIDE_SECTIONS,
  } from '@/lib/guide'
  import { guideComponents } from '@/components/guide/mdx-components'
  import { ChapterNav } from '@/components/guide/chapter-nav'
  import { ReadingProgressBar } from '@/components/guide/reading-progress'

  interface Props {
    params: Promise<{ slug: string[] }>
  }

  export async function generateStaticParams() {
    return GUIDE_SECTIONS.map((section) => ({ slug: [section] }))
  }

  export async function generateMetadata({ params }: Props) {
    const { slug } = await params
    const section = slug[0] as keyof typeof GUIDE_SECTION_LABELS
    return { title: GUIDE_SECTION_LABELS[section] ?? 'The Guide' }
  }

  export default async function GuideChapterPage({ params }: Props) {
    const { slug } = await params

    let chapter
    try {
      chapter = await getGuideChapter(slug, guideComponents)
    } catch {
      notFound()
    }

    const { prev, next } = getPrevNextChapters(slug)
    const activeSlug = slug[0] as keyof typeof GUIDE_SECTION_LABELS

    const pillarLabel = GUIDE_SECTION_LABELS[activeSlug]
    const pillarOrdinal = GUIDE_SECTION_ORDINALS[activeSlug]

    return (
      <div style={{ background: 'var(--color-bg-base)', minHeight: '100vh' }}>
        <ReadingProgressBar />

        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '40px 40px 80px',
            display: 'grid',
            gridTemplateColumns: '244px minmax(0, 1fr)',
            gap: 56,
          }}
        >
          {/* Left: sticky chapter nav */}
          <aside>
            <ChapterNav activeSlug={activeSlug} skills={chapter.skills} />
          </aside>

          {/* Right: reading column */}
          <article style={{ minWidth: 0, maxWidth: 740 }}>
            {/* Eyebrow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {pillarLabel}
              </span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--color-text-faint)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-faint)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}
              >
                Pillar {pillarOrdinal} of {GUIDE_SECTIONS.length}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 46,
                fontWeight: 750,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.025em',
                margin: '0 0 16px',
                lineHeight: 1.05,
              }}
            >
              {chapter.frontmatter.title}
            </h1>

            {/* Meta strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                flexWrap: 'wrap',
                paddingBottom: 22,
                marginBottom: 26,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Clock size={15} color="var(--color-text-faint)" />
                {chapter.readingTimeMinutes} min read
              </span>
              {chapter.skills.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <BookOpen size={15} color="var(--color-text-faint)" />
                  {chapter.skills.length} skill{chapter.skills.length !== 1 ? 's' : ''}
                </span>
              )}
              <div style={{ flex: 1 }} />
              {/* TODO: replace '—' with real pillar score once user data is wired */}
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
                    fontWeight: 750,
                    color: 'var(--color-accent)',
                  }}
                >
                  —
                </strong>
              </span>
            </div>

            {/* Lede from frontmatter excerpt */}
            {chapter.frontmatter.excerpt && (
              <p
                style={{
                  fontSize: 21,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-reading), Georgia, serif',
                  lineHeight: 1.55,
                  margin: '0 0 28px',
                  fontWeight: 500,
                }}
              >
                {chapter.frontmatter.excerpt}
              </p>
            )}

            {/* MDX content */}
            <div className="prose guide-prose">{chapter.content}</div>

            {/* Prev / Next pillar cards */}
            <div style={{ display: 'flex', gap: 14, marginTop: 48 }}>
              {prev ? (
                <Link
                  href={`/the-guide/${prev.slug[0]}`}
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    textDecoration: 'none',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-faint)',
                      fontFamily: 'var(--font-body)',
                      marginBottom: 4,
                    }}
                  >
                    ← Previous pillar
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {prev.label}
                  </div>
                </Link>
              ) : (
                <div
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    opacity: 0.45,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-faint)',
                      fontFamily: 'var(--font-body)',
                      marginBottom: 4,
                    }}
                  >
                    Previous
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    —
                  </div>
                </div>
              )}

              {next ? (
                <Link
                  href={`/the-guide/${next.slug[0]}`}
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--color-accent-border)',
                    background: 'var(--color-accent-wash)',
                    textDecoration: 'none',
                    textAlign: 'right',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-accent)',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Next pillar →
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {next.label}
                  </div>
                </Link>
              ) : (
                <div
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    opacity: 0.45,
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-faint)',
                      fontFamily: 'var(--font-body)',
                      marginBottom: 4,
                    }}
                  >
                    Next →
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    —
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    )
  }
  ```

  **Note:** `ChapterToc` import is removed (right-hand TOC is replaced by the enriched left nav). Keep `components/guide/chapter-toc.tsx` in place — it's not deleted, just unused.

- [ ] **Step 9.2: Run type check**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors. If `fontWeight: 750` triggers a CSS type error (TS expects `number | string`), change to `fontWeight: 700` — `750` is valid CSS but some TS DOM types reject it.

- [ ] **Step 9.3: Run full test suite**

  ```bash
  npm test 2>&1 | tail -15
  ```

  Expected: all tests pass.

- [ ] **Step 9.4: Commit**

  ```bash
  git add app/the-guide/[...slug]/page.tsx
  git commit -m "feat: redesign guide page — 2-column layout, chapter header, meta strip, Sage nav"
  ```

---

## Task 10 — Final verification

- [ ] **Step 10.1: Run full test suite**

  ```bash
  npm test 2>&1 | tail -20
  ```

  Expected: all tests pass with no failures.

- [ ] **Step 10.2: Run ESLint**

  ```bash
  npm run lint 2>&1 | grep -E "error|warning" | head -30
  ```

  Fix any errors. Warnings are acceptable if pre-existing.

- [ ] **Step 10.3: Run type check**

  ```bash
  npx tsc --noEmit 2>&1
  ```

  Expected: no errors.

- [ ] **Step 10.4: Verify build**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds. If `fontWeight: 750` causes a CSS type warning in Next.js build, change all `750` font-weight values to `700`.

- [ ] **Step 10.5: Commit if any lint/type fixes were needed**

  ```bash
  git add -p
  git commit -m "fix: resolve lint/type errors in guide redesign"
  ```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 2-column layout (244px nav + ≤740px reading)
- ✅ Newsreader reading serif (guide-prose class)
- ✅ Chapter header: eyebrow, 46px title, meta strip, lede excerpt
- ✅ Expandable left nav with numbered pillars + skill sub-items + scroll-spy
- ✅ Skill accordions as Sage cards (GuideDetails rewrite)
- ✅ ScoringBadge Sage level ramp (Developing→Expert hex colours)
- ✅ `you?: boolean` prop on ScoringBadge (renders "You · Advanced")
- ✅ Action strip placeholder in each open skill (Re-score + Set a goal)
- ✅ Score chip in meta strip (placeholder "—" with TODO)
- ✅ Reading progress bar (fixed, 3px, accent colour)
- ✅ Prev/next pillar cards (ghost prev, accent-wash next)
- ✅ Right-hand ChapterToc removed from page (file kept)
- ✅ MDX pipeline untouched (guideComponents, compileMDX, rehype plugins)
- ✅ Tests: scoring badge, mdx helpers, chapter nav, guide details

**Placeholder scan:** No TBDs. All TODO comments are inline in component code (not in this plan).

**Type consistency:**
- `SkillItem` defined in Task 3, consumed in Task 6 (ChapterNav) and Task 9 (page) — consistent.
- `GUIDE_SECTION_ORDINALS` defined in Task 4, consumed in Task 6 (ChapterNav) and Task 9 (page) — consistent.
- `chapter.skills` (Task 3 return type) used in Task 9 page — consistent.
- `chapter.readingTimeMinutes` (Task 3 return type) used in Task 9 page — consistent.
- `ScoringBadgeProps.you` (Task 2) — optional boolean, default false. Tests and component consistent.
