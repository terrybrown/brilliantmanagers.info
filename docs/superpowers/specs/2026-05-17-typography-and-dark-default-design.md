# Typography & Dark Default Design

**Date:** 2026-05-17  
**Status:** Approved

## Overview

Two connected improvements to the site's visual foundation:

1. **Bricolage Grotesque as the display font** — replaces Fraunces across the whole site (public + app shell)
2. **Dark mode as the site default** — the public site starts dark; users can toggle to light via the existing ThemeToggle

---

## 1. Typography — Bricolage Grotesque

### Font loading

In `app/layout.tsx`:

- Remove the `Fraunces` import and its `fraunces` font object
- Add `Bricolage_Grotesque` from `next/font/google` with:
  - `subsets: ['latin']`
  - `axes: ['opsz']` (optical size variable axis, 12–96)
  - `variable: '--font-bricolage'`
  - `display: 'swap'`
- Replace `fraunces.variable` with `bricolage.variable` in the `<body>` className

### CSS token

In `app/globals.css`, inside the `@theme` block:

```css
--font-display: var(--font-bricolage);
```

(was `var(--font-fraunces)`)

### What updates automatically

These already reference `var(--font-display)` or `font-family: var(--font-display)` — no changes needed:

- **Nav logo** (`components/layout/nav.tsx` line 50): `style={{ fontFamily: 'var(--font-display)' }}`
- **All `.prose` headings** (`app/globals.css`): `.prose h1`, `.prose h2`, `.prose h3` already use `font-family: var(--font-display)`

### Explicit updates needed

Two components have inline-styled heading text that currently omit a `fontFamily` declaration, so they fall back to Inter. Both need `fontFamily: 'var(--font-display)'` added:

**`components/app/Topbar.tsx`** — the page title span:
```tsx
<span style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', flex: 1, fontFamily: 'var(--font-display)' }}>
  {title}
</span>
```

**`app/(app)/dashboard/page.tsx`** — the empty-state `<h1>`:
```tsx
<h1
  style={{
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'var(--font-display)',
  }}
>
```

---

## 2. Dark mode as default

### ThemeProvider change

In `app/layout.tsx`, update the `ThemeProvider`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
```

- `defaultTheme="dark"` — all new visitors and users with no stored preference see dark
- `enableSystem={false}` — OS preference is ignored; the ThemeToggle is the sole override

### Existing toggle — no changes needed

`components/layout/theme-toggle.tsx` already exists and works. It is already rendered in `components/layout/nav.tsx` via `{showToggle && <ThemeToggle />}`. No new UI needed.

### App shell — no changes needed

The app shell (Topbar, Sidebar, dashboard, scorecard, etc.) uses hardcoded dark inline styles (`#0f172a`, `#0d1b2e`, etc.) and is unaffected by the theme CSS variables. It remains dark regardless of the toggle.

### ALWAYS_DARK_ROUTES — no changes needed

`nav.tsx` has `ALWAYS_DARK_ROUTES = ['/', '/the-tool']` which hides the toggle on those routes. With dark as the default this remains correct behaviour — those pages were designed for dark and the toggle would be misleading.

---

## Files changed

| File | Change |
|------|--------|
| `app/layout.tsx` | Swap Fraunces → Bricolage_Grotesque; update ThemeProvider |
| `app/globals.css` | Update `--font-display` token |
| `components/app/Topbar.tsx` | Add `fontFamily: 'var(--font-display)'` to title span |
| `app/(app)/dashboard/page.tsx` | Add `fontFamily: 'var(--font-display)'` to empty-state h1 |

No new files. No new routes. No database changes.

---

## Testing

- Public site headings (h1, h2, h3 in `.prose`) render in Bricolage Grotesque
- Nav logo renders in Bricolage Grotesque
- Topbar page title renders in Bricolage Grotesque
- Dashboard empty-state h1 renders in Bricolage Grotesque
- Visiting the site for the first time (no localStorage) shows dark mode
- ThemeToggle switches between dark and light; preference persists on reload
- Fraunces is not loaded (check Network tab — no Fraunces request)
