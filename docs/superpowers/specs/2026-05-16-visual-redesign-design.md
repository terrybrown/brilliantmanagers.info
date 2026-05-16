# Brilliant Managers — Visual Redesign Design Spec

**Date:** 2026-05-16
**Status:** Approved, ready for implementation planning

---

## Overview

A full visual and technical redesign of brilliantmanagers.info. The goal is a site that feels like a polished product — editorial-bold aesthetic, app-like layout, marketing-grade homepage — while the guide and blog remain excellent long-form reading. The tool section becomes a well-designed placeholder that teases the eventual native app.

---

## 1. Audience

Split treatment by page:

- **Homepage / Tool landing**: marketing-oriented. Speaks to anyone considering or reflecting on management. Creates the desire to go deeper.
- **Guide chapters / Blog**: practitioner-oriented. Assumes the reader is already engaged and wants substance.
- **Resources**: curation-oriented. No marketing. Just good recommendations with annotations.

---

## 2. Technology Stack

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Long-term home for The Tool as a native app; Tailwind + shadcn native fit |
| Language | TypeScript | Required by shadcn; cheap insurance on typed components |
| Styling | Tailwind CSS v4 | Replaces SASS entirely; tokens as CSS custom properties |
| Component library | shadcn/ui | Copied into `components/ui/`, fully owned and customisable |
| Content (guide) | MDX via `@next/mdx` | Enables rich components inside prose (callouts, badges, TOC) |
| Content (blog) | MDX via `@next/mdx` | Consistent with guide pipeline; MDX is a superset of markdown so plain posts work unchanged |
| Fonts | Fraunces (variable serif) + Inter | `next/font` — zero CLS; Fraunces for all headlines, Inter for body/UI |
| Theme | `next-themes` + `ThemeProvider` | Persists to localStorage, respects `prefers-color-scheme` on first visit |
| Analytics | Google Analytics `G-1BSMVXG0PJ` | Existing tracking ID; wired via `next/script` in root layout |
| Hosting | Netlify | Unchanged; `netlify.toml` updated for Next.js build |

**`netlify.toml` change:**
```toml
[build]
command = "next build"
publish = ".next"
```
(with `@netlify/plugin-nextjs` adapter installed)

**What is removed:**
- Gatsby 2.22.17 and all gatsby plugins
- Both custom plugins under `plugins/` (gatsby-source-data, gatsby-remark-page-creator)
- node-sass 4 / SASS entirely
- The 4-palette runtime system in `site-metadata.json`
- Stackbit (`stackbit.yaml`, visual editor, `@stackbit/gatsby-plugin-menus`)
- `site-metadata.json` → replaced by `config/site.ts` + per-page MDX frontmatter

**Repository shape (end state):**
```
app/
  layout.tsx              Root layout — ThemeProvider, fonts, analytics
  page.tsx                Homepage (hardcoded dark wrapper)
  the-guide/
    page.tsx              Guide index
    [...slug]/page.tsx    Guide chapters (catch-all; handles nested paths)
  the-tool/page.tsx       Tool landing (hardcoded dark wrapper)
  blog/
    page.tsx              Blog index
    [slug]/page.tsx       Individual posts
  content/
    guide/                *.mdx — guide chapters
    blog/                 *.mdx — blog posts
  resources/page.tsx
  not-found.tsx
components/
  ui/                     shadcn primitives (Button, Card, NavigationMenu…)
  sections/               Editorial blocks (Hero, FeatureGrid, PullQuote…)
  guide/                  Guide-specific (ChapterNav, Toc, ScoringBadge, Callout…)
  marketing/              Homepage-only pieces
config/
  site.ts                 Title, description, nav links, social links
public/                   Static assets (replaces static/)
```

---

## 3. Design System

### 3.1 Visual direction

**Editorial-bold** — big serif statement headlines, amber accent rules, deliberate whitespace, magazine-cover energy. References: Anthropic.com, Stripe.com, Every.to.

### 3.2 Typography

| Token | Spec | Usage |
|---|---|---|
| `display` | Fraunces 700, 64px, -0.03em | Homepage hero only |
| `h1` | Fraunces 600, 40px, -0.02em | Page titles |
| `h2` | Fraunces 600, 28px, -0.015em | Section headings |
| `h3` | Fraunces 400 italic, 20px | Sub-section headings |
| `body-lg` | Inter 400, 17px, 1.7 leading | Guide/blog prose |
| `body` | Inter 400, 15px, 1.6 leading | General body |
| `eyebrow` | Inter 600, 11px, 0.15em, uppercase | Chapter labels, section markers |

### 3.3 Colour tokens

#### Dark mode
| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#1a3a5c` | Marketing page background |
| `bg-reading` | `#16202d` | Guide/blog background |
| `text-primary` | `#fefcf7` | Headlines, body |
| `text-muted` | `rgba(254,252,247,0.60)` | Secondary text |
| `accent` | `#f59e0b` | Amber rules, italic em, CTAs |
| `border` | `rgba(254,252,247,0.12)` | Card borders, dividers |

#### Light mode
| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#fefcf7` | Marketing page background |
| `bg-reading` | `#f9f8f4` | Guide/blog background |
| `text-primary` | `#1c1917` | Headlines, body |
| `text-muted` | `#44403c` | Secondary text |
| `accent` | `#d97706` | Amber (slightly deeper for contrast on light) |
| `border` | `#e7e5e4` | Card borders, dividers |

### 3.4 Spacing & layout tokens

| Token | Value |
|---|---|
| `--radius` | 8px |
| `--radius-lg` | 16px |
| `--container` | 1080px max-width |
| `--prose-width` | 680px max-width |
| `--amber-rule` | 2px solid accent |
| `--section-gap` | 96px |

### 3.5 Theme toggle

- Default: **light** (respects `prefers-color-scheme` on first visit)
- Implemented via `next-themes` `ThemeProvider` in root layout
- Toggle component: `ThemeToggle` — pill with 🌙 / ☀️ options, lives in nav bar
- **Homepage and Tool landing are hardcoded dark** — `<div className="dark">` wrapper on `page.tsx`. The `ThemeToggle` is conditionally hidden on these routes (via `usePathname()` check in the nav component). No toggle visible = dark is intentional, not a bug.

### 3.6 shadcn/ui components to install

Button, Card, NavigationMenu, Sheet (mobile nav), Accordion (FAQ), Tooltip (scoring level key), Separator, Badge

---

## 4. Page-by-page treatment

### 4.1 Homepage (`/`)
- **Theme**: always dark, no toggle
- **Layout**: full-width hero → 3-column feature grid → pull-quote section → dark footer
- **Hero**: eyebrow label + 2px amber rule + Fraunces display headline + body copy + dual CTAs (primary: "Read The Guide →", secondary: "Try The Tool")
- **Feature grid**: three cards — The Guide, The Tool, The Blog — each with icon, Fraunces title, short description, amber link
- **Pull-quote section**: a single editorial statement quote, Fraunces italic, attributed
- **No toggle in nav**

### 4.2 The Guide — index (`/the-guide`)
- **Theme**: light default, toggle visible
- **Layout**: page-width header with Fraunces h1 + body intro, then a grid of section cards (one per pillar: Self, Team, Strategy, Communications, Domain Expertise, + Measurement and FAQ)
- Each card shows pillar name, short description, amber "Start reading →" link

### 4.3 The Guide — chapter (`/the-guide/[slug]`)
- **Theme**: light default, toggle visible (dark mode uses `bg-reading: #16202d`)
- **Layout**: three columns — sidebar (220px) + prose content (680px max) + TOC (160px)
- **Sidebar**: chapter list with active state, sticky on scroll
- **Content**: eyebrow + 2px amber rule + Fraunces h1 + MDX prose with Callout components, PullQuote components, ScoringBadge components
- **TOC**: sticky right column, "Jump to section" with active highlight
- **Footer**: prev/next chapter navigation

### 4.4 The Tool (`/the-tool`)
- **Theme**: always dark, no toggle
- **Layout**: two-column hero — copy left, scorecard preview card right — + "Coming in v2" strip at bottom
- **Copy**: bold statement headline ("Score yourself. Know where to grow.") + body + two CTAs:
  - Primary: "📊 Open current version (Google Sheets)"
  - Secondary: "Get notified when the app launches"
- **Scorecard preview card**: shows sample dimensions with named-level dropdowns (Developing / Practising / Proficient / Leading) — illustrates the eventual app's interface
- **v2 strip**: amber badge "Coming in v2" + description of the native app
- **No toggle in nav**

### 4.5 Blog index (`/blog`)
- **Theme**: light default, toggle visible
- **Layout**: magazine-style header (eyebrow + amber rule + Fraunces h1 + subtitle) → divider → 2-column card grid
- **Post cards**: date (uppercase small), Fraunces title, excerpt, "Read →" link

### 4.6 Blog post (`/blog/[slug]`)
- **Theme**: light default, toggle visible
- **Layout**: full-width header with title + date, then single-column prose (680px max)
- **Typography**: Fraunces h1 in header, Inter body at 17px/1.7 leading

### 4.7 Resources (`/resources`)
- **Theme**: light default, toggle visible
- **Layout**: editorial header + curated groupings (Books, Articles, People) each with short annotation per item
- No marketing treatment — pure curation with editorial voice

### 4.8 404
- **Theme**: always dark (hardcoded, `bg-base` `#1a3a5c` — marketing dark, not reading dark)
- A personality moment: Fraunces italic headline ("You've gone off-piste."), short wry copy, single CTA back to The Guide

---

## 5. Scoring system

The tool scorecard uses **four named competency levels**, replacing the previous 1–10 numeric scale:

| Level | Description |
|---|---|
| **Developing** | You know this matters and you're actively working on it. The gap between knowing and doing is closing. |
| **Practising** | You apply this with reasonable consistency. Not automatic yet, but deliberate. |
| **Proficient** | This shows up reliably. The people around you notice and benefit from it. |
| **Leading** | You're role-modelling this and actively helping others develop it too. |

**Rationale**: numeric ratings require people to invent their own scale. Named levels carry their own meaning — no translation required. The guide provides context so "Developing" is a sensible floor; there is no "Unaware" level.

**Implementation across surfaces:**
- **Google Sheet (next session)**: dropdown validation per scoring cell changes from `1–10` to `Developing, Practising, Proficient, Leading`. Summary/radar chart maps names → 1–4 internally. A "Level Guide" reference tab is added.
- **Tool landing mockup**: scorecard preview card shows named-level dropdowns.
- **Guide chapters (MDX)**: `ScoringBadge` component used inline to reference levels within chapter prose.
- **Eventual app**: native selector component with level name + one-line description visible on selection.

---

## 6. Content & copy approach

**Full rewrite licence** confirmed for all surfaces.

**Voice — two registers, one personality:**

- **Marketing surfaces** (homepage, tool landing): statement-mode. Short, punchy, confident. "Most of us became managers by accident." No hedging, no listicles.
- **Guide chapters**: reflective and substantive. Long-form prose, second-person address. Room for nuance, callouts, and honest difficulty.
- **Blog**: personal and opinionated. First-person, specific. Doesn't hedge.

**Guide → MDX migration:**

Plain `.md` files under `src/pages/the-guide/` become `.mdx` under `content/guide/`. MDX enables:
- `<Callout>` — highlighted tip or warning block (amber left-border)
- `<PullQuote>` — Fraunces italic extract, full-width
- `<ScoringBadge level="Proficient" />` — inline level reference
- `<ChapterProgress />` — progress indicator within long chapters

The guide and the scorecard become a loop: each chapter references which scorecard dimensions it maps to and what each level looks like in practice.

---

## 7. Build & rollout plan (Approach 1 — design system first)

### Phase 1 — Foundation
1. New Next.js 15 project (TypeScript, App Router)
2. Tailwind v4 with all design tokens configured
3. `next-themes` + `ThemeProvider` in root layout
4. Fraunces + Inter via `next/font`
5. shadcn/ui initialised; base primitives copied in (Button, Card, NavigationMenu, Sheet, Accordion, Tooltip, Separator, Badge)
6. Root layout, conditional-toggle nav component, dark footer
7. Homepage dark wrapper pattern established

### Phase 2 — Pages (in order)
1. Homepage — proves design system end-to-end
2. Tool landing — reuses homepage patterns; adds scorecard preview card
3. Guide index + chapters — MDX pipeline, sidebar, TOC, Callout, ScoringBadge components
4. Blog index + posts — card and prose components from above
5. Resources — list and annotation components
6. 404 — personality moment, quick

### Phase 3 — Content
- Rewrite homepage, tool landing, guide chapter intros (new copy in Direction D voice)
- Convert guide `.md` → `.mdx`; add Callout and ScoringBadge components
- Update Google Sheet: 1–10 → named levels, add Level Guide tab (separate session)

### Phase 4 — Cutover
1. `git fetch origin main && git merge origin/main`, resolve any conflicts
2. `next build` clean locally
3. Install `@netlify/plugin-nextjs`, update `netlify.toml`
4. Verify preview deploy on Netlify
5. Cut production

---

## 8. Open questions / deferred decisions

- **Google Sheet structure**: exact criterion list per pillar (Self, Team, Strategy, Communications, Domain Expertise) TBD — update scoring in a separate session once the redesign is underway.
- **"Get notified when the app launches" CTA**: needs an email capture mechanism (simple form → Netlify Forms or a mailing list). Not in scope for this redesign but the UI placeholder is built.
- **Blog content**: existing `hello-world.md` post survives as-is. New posts written in the Direction D editorial voice going forward.
- **OG / social images**: static OG image for each page TBD. A single branded OG template (dark surface, Fraunces headline) covers most cases.
