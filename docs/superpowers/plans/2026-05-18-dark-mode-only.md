# Dark-Mode-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the light/dark mode toggle and all theming machinery so the site always renders in dark mode.

**Architecture:** Promote the dark colour token values to be the site's only CSS variables, delete the ThemeToggle component and ThemeProvider wrapper, and strip all toggle-related logic from the nav. No runtime theme class is applied — dark is simply the site's colours.

**Tech Stack:** Next.js 16, Tailwind CSS v4 (CSS-first config via `@theme`), `next-themes` (being removed)

---

## File Map

| Action | File |
|--------|------|
| Modify | `app/globals.css` |
| Modify | `app/layout.tsx` |
| Delete | `components/layout/theme-toggle.tsx` |
| Modify | `components/layout/nav.tsx` |
| Modify | `package.json` + `package-lock.json` (via npm) |

---

### Task 1: Update colour tokens in `globals.css`

**Files:**
- Modify: `app/globals.css`

The file currently defines light-mode defaults in `@theme` and overrides them in `.dark {}`. We promote the dark values to be the sole values and remove the override machinery.

- [ ] **Step 1: Replace light-mode token values with dark values inside `@theme`**

In `app/globals.css`, find the `@theme` block. It currently reads:

```css
@theme {
  /* ── Colour tokens (light mode defaults) ── */
  --color-bg-base: #fefcf7;
  --color-bg-reading: #f9f8f4;
  --color-text-primary: #1c1917;
  --color-text-muted: #44403c;
  --color-accent: #d97706;
  --color-border: #e7e5e4;
  --color-nav-bg: #e5e3de;
  ...
}
```

Replace those seven token lines with the dark values:

```css
@theme {
  /* ── Colour tokens ── */
  --color-bg-base: #1a3a5c;
  --color-bg-reading: #16202d;
  --color-text-primary: #fefcf7;
  --color-text-muted: rgba(254, 252, 247, 0.60);
  --color-accent: #f59e0b;
  --color-border: rgba(254, 252, 247, 0.12);
  --color-nav-bg: #16304a;
  ...
}
```

- [ ] **Step 2: Delete the `@variant dark` declaration**

Find and delete this line (it's near the top of the file, before `@theme`):

```css
@variant dark (&:is(.dark *));
```

Remove it entirely — including its comment if there is one on the line above.

- [ ] **Step 3: Delete the `.dark {}` override block**

Find and delete this entire block (including its comment):

```css
/* Dark mode overrides — applied when .dark class is on an ancestor */
.dark {
  --color-bg-base: #1a3a5c;
  --color-bg-reading: #16202d;
  --color-text-primary: #fefcf7;
  --color-text-muted: rgba(254, 252, 247, 0.60);
  --color-accent: #f59e0b;
  --color-border: rgba(254, 252, 247, 0.12);
  --color-nav-bg: #16304a;
}
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style: promote dark colour tokens as sole theme, remove light/dark variant"
```

---

### Task 2: Remove ThemeProvider from `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Remove the `next-themes` import**

Find and delete this line:

```ts
import { ThemeProvider } from 'next-themes'
```

- [ ] **Step 2: Unwrap the ThemeProvider in JSX**

The current JSX inside `<body>` is:

```tsx
<body>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <div className="flex min-h-screen flex-col">
      <Nav isAuthenticated={!!user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  </ThemeProvider>
  ...
</body>
```

Remove the `<ThemeProvider>` opening and closing tags, leaving the inner `<div>` as the direct child of `<body>`:

```tsx
<body>
  <div className="flex min-h-screen flex-col">
    <Nav isAuthenticated={!!user} />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
  ...
</body>
```

- [ ] **Step 3: Remove `suppressHydrationWarning` from `<html>`**

The current `<html>` tag is:

```tsx
<html lang="en" className={`${jakartaSans.variable} ${inter.variable}`} suppressHydrationWarning>
```

Remove `suppressHydrationWarning` (it was needed for next-themes' class injection flash):

```tsx
<html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "chore: remove ThemeProvider, dark mode is now static"
```

---

### Task 3: Delete `components/layout/theme-toggle.tsx`

**Files:**
- Delete: `components/layout/theme-toggle.tsx`

- [ ] **Step 1: Delete the file**

```bash
git rm components/layout/theme-toggle.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: delete ThemeToggle component"
```

---

### Task 4: Clean up `components/layout/nav.tsx`

**Files:**
- Modify: `components/layout/nav.tsx`

- [ ] **Step 1: Remove the ThemeToggle import**

Find and delete:

```ts
import { ThemeToggle } from './theme-toggle'
```

- [ ] **Step 2: Remove `ALWAYS_DARK_ROUTES` and `showToggle`**

Find and delete the constant:

```ts
const ALWAYS_DARK_ROUTES = ['/', '/the-tool']
```

Inside the `Nav` function body, find and delete:

```ts
const showToggle = !ALWAYS_DARK_ROUTES.includes(pathname)
```

- [ ] **Step 3: Remove the toggle from the desktop right zone**

Find this in the desktop right zone (`<div className="hidden flex-1 items-center justify-end gap-3 lg:flex">`):

```tsx
{showToggle && <ThemeToggle />}
```

Delete that line entirely.

- [ ] **Step 4: Remove the toggle from the mobile dropdown**

In the mobile dropdown, the footer row currently looks like:

```tsx
<div className="flex items-center justify-between px-6 py-4">
  {!isAuthenticated && !isAppRoute && (
    <Link
      href="/login"
      onClick={() => setIsOpen(false)}
      className="rounded-md border px-4 py-2 text-sm font-semibold"
      style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 50%, transparent)', color: 'var(--color-accent)' }}
    >
      Sign in
    </Link>
  )}
  <div className="ml-auto">
    {showToggle && <ThemeToggle />}
  </div>
</div>
```

Remove the inner `<div className="ml-auto">` wrapper and its contents entirely. The footer row becomes:

```tsx
<div className="flex items-center justify-between px-6 py-4">
  {!isAuthenticated && !isAppRoute && (
    <Link
      href="/login"
      onClick={() => setIsOpen(false)}
      className="rounded-md border px-4 py-2 text-sm font-semibold"
      style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 50%, transparent)', color: 'var(--color-accent)' }}
    >
      Sign in
    </Link>
  )}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add components/layout/nav.tsx
git commit -m "chore: remove theme toggle from nav"
```

---

### Task 5: Uninstall `next-themes`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Uninstall the package**

```bash
npm uninstall next-themes
```

Expected: `package.json` no longer lists `next-themes`; `node_modules/next-themes` is gone.

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "next-themes" . --include="*.ts" --include="*.tsx" --include="*.js"
```

Expected: no output (zero matches).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: uninstall next-themes"
```

---

### Task 6: Verify the build

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected: exits 0 with no TypeScript errors and no import-not-found errors.

- [ ] **Step 2: Confirm no `dark:` Tailwind utilities remain**

```bash
grep -r "dark:" components app --include="*.tsx" --include="*.ts"
```

Expected: no output.

- [ ] **Step 3: Smoke-test locally**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Home page (`/`) renders in dark colours (deep blue background `#1a3a5c`).
- A guide page (e.g. `/the-guide`) renders in dark colours.
- The nav has no ☀️/🌙 toggle on any route.
- The tool dashboard (`/the-tool` or `/dashboard`) renders in dark colours.
