# Home Page & Nav Redesign

**Date:** 2026-05-26  
**Status:** Approved

## Goal

Refocus the marketing home page and public navigation around the tool as the primary CTA. Remove the blog from the home page feature grid, tighten the quote section spacing, and replace the static Brilliant Managers attribution with a rotating set of quotes from well-known management thinkers.

---

## 1. Navigation

### Label changes (`config/site.ts`)

| Current label | New label |
|---|---|
| The Tool | Try the Scorecard |
| The Guide | Read the Guide |
| Blog, Resources, FAQ | Unchanged |

### Item order

`Try the Scorecard` moves to position 1 (before `Read the Guide`).

New order: **Try the Scorecard · Read the Guide · Blog · Resources · FAQ**

### CTA styling (`components/layout/nav.tsx`)

`Try the Scorecard` receives an amber pill style inline with the other nav links:

```
background: rgba(245,158,11,0.12)
border: 1px solid rgba(245,158,11,0.25)
color: #f59e0b
border-radius: 5px
padding: 4px 10px
font-weight: 600
```

All other nav links remain unchanged (plain text, muted colour).

### Authenticated redirect

The existing behaviour that redirects `/the-tool` to `/dashboard` for authenticated users is preserved — no change to that logic.

### Icon mapping

`NAV_ICONS` in `nav.tsx` maps by `href`. The icon for `/the-tool` (currently `Gauge`) stays bound to the same href — only the display label changes.

---

## 2. Home Page Feature Grid (`app/page.tsx` + `components/sections/feature-grid.tsx`)

### Card set

Remove the Blog card. Render two cards only:

1. **The Tool** — `href: /the-tool`, `linkLabel: "Open the scorecard"` — styled as primary (amber tint)
2. **The Guide** — `href: /the-guide`, `linkLabel: "Start reading"` — standard card

### Primary card styling

`FeatureGrid` accepts an optional `primary?: boolean` field on each card. When true, the card receives:

```
border-color: rgba(245,158,11,0.30)
background: rgba(245,158,11,0.07)
```

This mirrors the amber nav pill and visually reinforces the Tool as the primary action.

### Grid layout

Two cards in a `sm:grid-cols-2` grid. The existing `gap-5` and rounded card styling are unchanged.

---

## 3. Quote Section

### Component

Replace the static `PullQuote` component with a new client component `RotatingQuote` at `components/sections/rotating-quote.tsx`.

`app/page.tsx` imports and renders `<RotatingQuote />` in place of `<PullQuote />`.

### Behaviour

- On mount, the quotes array is **shuffled** (Fisher-Yates) so each visitor sees a different sequence.
- Auto-advances every **10 seconds**.
- Transition: CSS opacity fade (fade out old, fade in new).
- No manual prev/next controls.

### Layout

- Text is **centre-aligned** (previously left-aligned).
- Section top padding reduced: `pt-8 pb-16` (was `py-16`), tightening the gap between the card grid and the quote.
- Font size unchanged: `clamp(1.1rem, 2.5vw, 1.4rem)` italic, `var(--font-display)`.
- Attribution line: small, uppercase, tracked, muted — same style as before but centred.

### Quote list (15 quotes)

| Quote | Attribution |
|---|---|
| "Management is doing things right; leadership is doing the right things." | Peter Drucker |
| "The most important thing in communication is hearing what isn't said." | Peter Drucker |
| "Your output is the output of your team." | Andy Grove |
| "The manager asks how and when; the leader asks what and why." | Warren Bennis |
| "Management is, above all, a practice where art, science, and craft meet." | Henry Mintzberg |
| "Leadership is not about being in charge. It is about taking care of those in your charge." | Simon Sinek |
| "Your title makes you a manager. Your people make you a leader." | Bill Campbell |
| "If you give a good idea to a mediocre team, they will screw it up. If you give a mediocre idea to a brilliant team, they will either fix it or throw it away and come up with something better." | Ed Catmull |
| "A great workplace is stunning colleagues." | Reed Hastings |
| "Radical Candor is about caring personally while challenging directly." | Kim Scott |
| "Teamwork begins by building trust. And the only way to do that is to overcome our need for invulnerability." | Patrick Lencioni |
| "The best leaders amplify the intelligence around them." | Liz Wiseman |
| "Psychological safety is not about being nice. It's about giving candid feedback, openly admitting mistakes, and learning from each other." | Amy Edmondson |
| "Great managers know and value the unique abilities and even the eccentricities of their employees." | Marcus Buckingham |
| "A leader is one who knows the way, goes the way, and shows the way." | John C. Maxwell |

---

## Files Changed

| File | Change |
|---|---|
| `config/site.ts` | Rename nav labels; reorder nav array |
| `components/layout/nav.tsx` | Amber pill styling for first nav item (Try the Scorecard) |
| `app/page.tsx` | Two-card grid (Tool primary, Guide); import RotatingQuote |
| `components/sections/feature-grid.tsx` | Add optional `primary` prop per card |
| `components/sections/rotating-quote.tsx` | New client component — shuffled, auto-rotating quotes |
| `components/sections/pull-quote.tsx` | No longer used from home page (keep file, other pages may use it) |

---

## Out of Scope

- Blog page itself — no changes
- The Tool or The Guide pages — no changes
- Authenticated app shell navigation — no changes
- Mobile hamburger menu layout — labels update automatically via `siteConfig.nav`
