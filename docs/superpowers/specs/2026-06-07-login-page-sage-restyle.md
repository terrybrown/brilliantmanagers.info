# Login Page — Sage Restyle

**Goal:** Bring the login page into the Sage design system. Replace all hardcoded Tailwind amber classes and `slate-*` colours with Sage CSS token inline styles. Wrap the form in a card.

---

## File

`app/login/page.tsx` — single file, client component. No logic changes.

---

## Layout

Existing `flex min-h-screen items-center justify-center` wrapper is kept. Inside it, a card div:

- `background: var(--color-surface)`
- `border: 1px solid var(--color-border)`
- `box-shadow: 0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)`
- `border-radius: var(--radius-lg)` (or 12px if token unavailable)
- `padding: 32px`
- `width: 100%; max-width: 400px`

---

## Elements

| Element | Current | New |
|---|---|---|
| Heading | `text-2xl font-bold` | `font-family: var(--font-display)`, 22px, 700, `color: var(--color-text-primary)` |
| Subtitle | none | Add: "Enter your email and we'll send you a magic link." — 13.5px, `var(--color-text-muted)`, margin-bottom 20px |
| Input | `border-slate-200`, `focus:ring-amber-400` | `border: 1px solid var(--color-border)`, `background: var(--color-bg-base)`, `color: var(--color-text-primary)`, focus outline `var(--color-accent)` |
| Submit button | `bg-amber-500 hover:bg-amber-400` | `background: var(--btn-primary-bg)`, `color: var(--btn-primary-fg)`, hover `var(--btn-primary-bg-hover)` |
| Button loading label | "Send magic link" (static) | "Sending…" while `loading === true` |
| Error text | `text-red-500` | `color: var(--color-negative)` |
| "New here?" text | `text-slate-400` | `color: var(--color-text-faint)` |
| "Sign up for the beta →" link | hardcoded `#f59e0b` | `color: var(--color-accent)` |

---

## "Check your email" state

Same card wrapper. Heading uses `var(--font-display)`. Body text uses `var(--color-text-muted)`. No new layout elements.

---

## Constraints

- No logic changes — auth flow, Turnstile, state management all unchanged
- No Tailwind classes on restyled elements — inline styles only, Sage tokens only
- No raw hex or rgba values except the standard card shadow exemption
- The marketing nav and page chrome are not part of this change
