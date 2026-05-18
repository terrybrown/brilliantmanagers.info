# Dark-Mode-Only: Remove Light/Dark Toggle

**Date:** 2026-05-18  
**Status:** Approved

## Goal

Remove the light/dark mode toggle and all theming machinery. The site will always render in dark mode. No runtime theme-switching, no `next-themes` dependency.

## Approach

Promote the dark colour tokens to be the site's only colour set. Delete the toggle UI, ThemeProvider wrapper, and light-mode CSS values. The `dark` class on `html` is no longer needed.

## Changes

### 1. `app/globals.css`

- Replace the light-mode values in `@theme` with the dark-mode values currently in `.dark {}`.
- Delete the `.dark {}` block.
- Delete the `@variant dark` declaration (no longer needed).

Dark values to promote into `@theme`:
```
--color-bg-base:      #1a3a5c
--color-bg-reading:   #16202d
--color-text-primary: #fefcf7
--color-text-muted:   rgba(254, 252, 247, 0.60)
--color-accent:       #f59e0b
--color-border:       rgba(254, 252, 247, 0.12)
--color-nav-bg:       #16304a
```

### 2. `app/layout.tsx`

- Remove `ThemeProvider` import from `next-themes`.
- Remove the `<ThemeProvider>` wrapper element (keep its children in place).
- Remove `suppressHydrationWarning` from `<html>` (no longer needed — next-themes adds it to suppress the flash of class injection).

### 3. `components/layout/theme-toggle.tsx`

- Delete the file entirely.

### 4. `components/layout/nav.tsx`

- Remove `import { ThemeToggle } from './theme-toggle'`.
- Remove the `ALWAYS_DARK_ROUTES` constant.
- Remove the `showToggle` derived variable.
- Remove both `{showToggle && <ThemeToggle />}` render sites (desktop right zone and mobile footer row).
- If the mobile footer row (`<div className="flex items-center justify-between px-6 py-4">`) becomes empty after removing the toggle, remove the whole div (or keep only the Sign In link if present).

### 5. `package.json` / `package-lock.json`

- Run `npm uninstall next-themes` to remove the dependency.

## What Does Not Change

- All CSS custom properties (`--color-*`) remain in use throughout components — only their values change.
- The `dark:` Tailwind variant prefix, if used anywhere, will stop working. A grep for `dark:` across `.tsx`/`.ts` files should confirm no such classes are in use before shipping. If any exist they must be either removed or converted to plain styles.
- The tour popover styles (`.bm-tour-popover`) in `globals.css` are already hardcoded dark — no change needed.

## Verification

1. `npm run build` succeeds with no type errors.
2. No `dark:` Tailwind utilities remain in component files.
3. The nav renders without a toggle on all routes.
4. All colour tokens resolve to dark values — visually verify the home page, a guide page, and the tool dashboard.
