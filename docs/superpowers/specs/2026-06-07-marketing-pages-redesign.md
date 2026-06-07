# Marketing Pages Redesign + Amber Audit

**Goal:** Redesign the FAQ, Resources, and Blog marketing pages to match the new design system; remove all amber-as-brand references from the codebase; ship as four independent PRs.

---

## Workstream 1 — Amber audit (amber-as-brand → Sage tokens)

The Sage design system permits amber ONLY as `--color-manager` in data visualisation (manager series in charts). All other amber uses are the old brand accent and must be replaced with `--color-accent` (teal) or the appropriate Sage token.

### Files to fix

| File | What changes |
|---|---|
| `app/auth/confirm/ConfirmButton.tsx` | Button: `bg-amber-500 hover:bg-amber-400` → `var(--btn-primary-bg)` / `var(--btn-primary-bg-hover)`. Loading dots: `bg-amber-50/300/600/900` → teal shades (`var(--color-accent-wash)`, `var(--color-accent-wash2)`, `var(--color-accent-border)`, `var(--color-accent)`) |
| `app/auth/confirm/page.tsx` | `text-amber-500 hover:text-amber-400` resend link → `color: var(--color-accent)` |
| `app/error.tsx` | `text-amber-500` reset button → `color: var(--color-accent)` |
| `app/global-error.tsx` | `color: '#f59e0b'` → `var(--color-accent)` |
| `app/not-found.tsx` | `.amber-rule` → replace with `style={{ display:'block', width:40, height:3, background:'var(--color-accent)', borderRadius:2, margin:'8px 0' }}` inline; remove class ref |
| `app/globals.css` | Remove `.amber-rule` class and its `color`/`background` rules. Remove any `#f59e0b` references. |
| `app/the-tool/JoinNowForm.tsx` | `background: '#f59e0b', color: '#1a3a5c'` → `background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)'` |
| `app/the-tool/page.tsx` | `.amber-rule` spans → inline accent bar (same as not-found fix). `color: '#f59e0b'` italic text → `color: 'var(--color-accent)'`. `borderTop: '3px solid #f59e0b'` → `var(--color-accent)`. Arrow spans with `#f59e0b` → `var(--color-accent)`. |
| `app/(app)/dr/[userId]/page.tsx` | `text-amber-400 hover:text-amber-300` back links → `color: 'var(--color-accent)'` |
| `app/(app)/admin/audit-log/page.tsx` | `text-amber-400` action column → `color: 'var(--color-text-primary)'` (neutral) |
| `app/(app)/admin/users/AdminUsersTable.tsx` | `bg-amber-500/20 text-amber-400` chip → `background: 'var(--color-accent-wash2)', color: 'var(--color-accent)'` |
| `app/(app)/growth/goal/[id]/page.tsx` | `bg-amber-500/20 text-amber-400` chip and `rgba(245,158,11,0.15)` inline → use `var(--color-accent-wash2)` / `var(--color-accent)`. `hover:text-amber-300` → `var(--color-accent)`. |
| `components/ui/button.tsx` | `focus-visible:ring-amber-400` → `focus-visible:ring-[var(--color-accent)]` |
| `components/app/GoalCompleteOverlay.tsx` | `text-amber-400`, `bg-amber-500 hover:bg-amber-400` button → `var(--color-accent)` / `var(--btn-primary-bg)` |

### Files to defer (dark mode remnants — separate PR)

`components/profile/ProfileForm.tsx`, `components/app/EvidenceLog.tsx`, `components/app/AvatarUpload.tsx` all use dark slate backgrounds (`bg-slate-700/800/900`) throughout — they need a full Sage reskin, not just an amber swap. Flag them with a `// TODO: Sage reskin` comment and leave for a dedicated follow-up.

### Files to leave (intentional amber as manager token)

`components/app/SkillBarChart.tsx`, `components/app/ScoreSparkline.tsx`, `components/app/ManagerScorecardShell.tsx`, `components/app/ManagerSkillList.tsx`, `components/app/ResourceRow.tsx`, `components/app/ProgressStrip.tsx`, `lib/utils/checkin.ts` — all use amber semantically (manager data series, overdue state). These are correct per Sage spec and must not be changed.

### Email templates

`lib/email/templates/connection-invite.ts` and `manager-invite.ts` use `border-left: 3px solid #f59e0b` in inline HTML email styles. Email clients don't support CSS variables. Leave as-is — these are intentionally hardcoded for email client compatibility.

---

## Workstream 2 — FAQ page (`/faq`)

### New files

| File | Purpose |
|---|---|
| `app/faq/page.tsx` | Server component — renders layout + passes data to accordion |
| `lib/faq.ts` | Typed FAQ data — sections + Q&A pairs |
| `components/faq/FaqAccordion.tsx` | Client component — accordion UI |

### Route

New route at `/faq`. Update `config/site.ts` FAQ nav entry from `/the-guide/faq` → `/faq`. The MDX at `content/guide/faq.mdx` is left in place (it's still part of the guide).

### Data (`lib/faq.ts`)

```ts
export interface FaqItem {
  q: string
  a: string  // plain text or minimal HTML — no MDX
}

export interface FaqSection {
  id: string        // used for anchor links
  label: string     // displayed as section heading
  items: FaqItem[]
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    items: [
      { q: 'How do I start?', a: '...' },
      { q: 'How long does it take?', a: '...' },
      { q: 'What is the outcome?', a: '...' },
      { q: 'I need to improve a specific skill — where do I start?', a: '...' },
      { q: 'I have a question that isn\'t answered here', a: '...' },
    ]
  },
  {
    id: 'using-the-guide',
    label: 'Using the guide',
    items: [
      { q: 'What is management?', a: '...' },
      { q: 'What does a real career ladder look like?', a: '...' },
      { q: 'How can I use the guide?', a: '...' },
    ]
  },
  {
    id: 'about-contributing',
    label: 'About & contributing',
    items: [
      { q: 'Who created the guide?', a: '...' },
      { q: 'How can I get in touch?', a: '...' },
      { q: 'Can I contribute?', a: '...' },
    ]
  },
]
```

Content migrated verbatim from `content/guide/faq.mdx`. Each `<details>`/`<summary>` block maps to one `FaqItem`. Markdown formatting stripped to plain text; hyperlinks converted to `<a href="...">` inline HTML in the `a` string (rendered via `dangerouslySetInnerHTML` or a simple `<p>` with link parsing). The implementer reads `content/guide/faq.mdx` and hard-codes the answers in `lib/faq.ts` — no runtime MDX parsing.

### Page layout (`app/faq/page.tsx`)

Two-column layout: main accordion column (flex-1) + sticky right sidebar (256px, hidden on mobile).

**Heading:** Large display font "FAQs" with a decorative accent bar — a `<span>` block element, `width: 48px, height: 4px, background: var(--color-accent), borderRadius: 2, display: block, marginTop: 6`.

**Subtitle:** "The questions managers ask most, before and after they start. Can't find yours? Send it our way." — `--color-text-muted`, 14px.

**Section labels:** Uppercase, letter-spaced, `--color-accent`, 11px/700 — matches the screenshot `GETTING STARTED` style.

**Right sidebar:**
- "ON THIS PAGE" label (uppercase, 10px, `--color-text-faint`)
- Anchor links to each section (`#getting-started`, `#using-the-guide`, `#about-contributing`) — active section highlighted with a `3px solid var(--color-accent)` left border
- "Still stuck?" card: `--color-surface`, border, shadow, 16px padding. "We answer every question that comes in." text + "Ask a question →" link to `https://www.linkedin.com/in/terrybrownuk`

### Accordion component (`components/faq/FaqAccordion.tsx`)

Client component. Props: `sections: FaqSection[]`.

State: `openId: string | null` — one item open at a time. `null` = all closed. Default: first item in first section open.

Each item is a white card (`--color-surface`, `1px solid --color-border`, shadow, 12px radius, 16px padding). Header row: question text + icon button. Icon: `+` (Lucide `Plus`) when closed, teal checkmark (`Check`, `--color-accent`) when open. Answer text shown below with a top border when open, `--color-text-muted`, 14px, leading relaxed.

---

## Workstream 3 — Resources redesign

### Database migration

Add two nullable columns to the `resources` table:

```sql
ALTER TABLE resources ADD COLUMN subtitle TEXT;
ALTER TABLE resources ADD COLUMN topic TEXT;
```

`subtitle` — the resource's subtitle (e.g. "Why Most People Never Learn from Their Mistakes").
`topic` — one of: `Self`, `Team`, `Strategy`, `Comms`, `Culture`, `Leadership`, `Career` (free text, nullable). Displayed as the `· Topic` tag on the card.

Migration file: `supabase/migrations/YYYYMMDDNNNNNN_resources_subtitle_topic.sql`

Update `lib/db/resources.ts` `Resource` interface to include `subtitle: string | null` and `topic: string | null`.

### Layout restructure (`app/resources/layout.tsx`)

Remove left sidebar nav. Replace with:
- Horizontal pill strip across the top: "All" + one pill per `TYPE_CONFIG` entry. Extract the pill strip into a new `components/resources/ResourceTypePills.tsx` client component (needs `usePathname()` for active detection). Active pill: `background: var(--color-accent), color: #fff, border: none`. Inactive: `1px solid --color-border`, `--color-text-muted`. "All" pill links to `/resources`; type pills link to `/resources/[type.slug]`.
- Search bar lives in `ResourceSearch` (see below) — rendered from each page, not the layout.
- On mobile: pills scroll horizontally (existing behaviour, keep).

### All-resources page (`app/resources/page.tsx`)

Remove `permanentRedirect`. New server component: fetch all resources via `getAllResources()`, render two-column card grid. Pass resources to a client wrapper for search filtering.

### Per-type page (`app/resources/[type]/page.tsx`)

Keep route structure. Replace list rendering with two-column card grid. Same card component as all-resources page.

### Resource card component (`components/resources/ResourceCard.tsx`)

New shared component. Props: `resource: Resource`.

Layout:
- Top row: type badge chip (e.g. `BOOK` — uppercase, `--color-chip-bg` background, `--color-text-muted` text, 10px/700, 4px radius, inline-flex with a small Lucide icon matching type) + `· Topic` tag in `--color-text-faint` + copy-link icon (`Link2`, 14px, `--color-text-faint`) floated right via `justify-between`.
- Title: 15px/700, `--color-text-primary`, `--font-display`.
- Subtitle (if set): 13px, `--color-text-muted`, italic-style (font-style normal, just muted).
- Author (if set): 12px, `--color-accent`, margin-top 2px.
- Description: 13.5px, `--color-text-muted`, leading relaxed, margin-top 8px.

Card: `--color-surface`, `1px solid --color-border`, shadow, `--radius-lg` border-radius, 20px padding.

Copy-link button: client component — `navigator.clipboard.writeText(resource.url)` on click, shows a brief "Copied" toast.

### Search (`components/resources/ResourceSearch.tsx`)

Client component. Wraps the resource grid. Props: `resources: Resource[]`, `children` not used — it owns rendering. Filters by `title + subtitle + author + description` matching the search string. Renders filtered count + the two-column grid. No debounce needed (client-side, instant).

The search bar: `--color-bg-base` background, `1px solid --color-border`, `--color-accent` focus border, magnifier icon prefix, 200px wide on desktop.

### Type badge icons (Lucide)

| Type | Icon |
|---|---|
| book | `BookOpen` |
| article | `FileText` |
| course | `GraduationCap` |
| video | `Play` |
| person | `User` |
| podcast | `Mic` |
| tool | `Wrench` |

---

## Workstream 4 — Blog redesign

### Changes to `app/blog/page.tsx`

- Remove `Separator` import and usage.
- Heading: "The Blog" — `--font-display`, `clamp(2rem, 5vw, 3rem)`, 700 (match FAQ/Resources heading scale).
- Card redesign: white card (`--color-surface`, border, shadow, `--radius-lg`) with 20px padding. Date chip at top: `--color-text-faint`, 11px, uppercase, letter-spaced. Title: `--font-display`, 16px/700. Excerpt in `--color-text-muted`, 13.5px. "Read →" in `--color-accent` at bottom.
- Two-column grid (existing `sm:grid-cols-2` kept).

### Changes to `app/blog/[slug]/page.tsx`

Audit for any amber references. Apply consistent header: display font title, `--color-text-muted` metadata. No layout restructure needed.

---

## PR order

1. **Amber audit** — fixes auth/confirm, error pages, the-tool, not-found, admin, growth, button focus ring
2. **Blog redesign** — smallest, self-contained
3. **FAQ page** — new route, new components, new data file
4. **Resources redesign** — DB migration + layout + cards + search

---

## Constraints

- No Tailwind colour classes on restyled elements — Sage tokens only
- No raw hex except email templates (email client compatibility)
- DB migration for `subtitle` and `topic` columns runs before Resources PR deploys
- The MDX at `content/guide/faq.mdx` is not deleted — it remains part of the guide
- RLS: the `resources` table already has policies; the two new columns inherit them automatically (no new RLS needed)
- Defer dark-mode component refactors (ProfileForm, EvidenceLog, AvatarUpload) — add `// TODO: Sage reskin` comment
