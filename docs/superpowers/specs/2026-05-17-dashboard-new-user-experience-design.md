# Dashboard New User Experience Design

**Date:** 2026-05-17  
**Status:** Approved

## Overview

Two connected improvements to the dashboard empty state (shown when a user has no completed scorecard round):

1. **Redesigned empty state** — replace the plain heading + link with a compelling CTA section and four benefit strips spanning the full panel width.
2. **Spotlight tour** — a 5-step guided walkthrough (driver.js) that a new user can launch from a prominent teal trigger button, highlighting each major section of the tool in turn.

---

## 1. Redesigned Empty State

The empty state lives in `app/(app)/dashboard/page.tsx` inside the `if (!round)` branch (currently lines 34–48).

### Tour trigger button

A large, teal-accented card-style button sits at the top of the content area. It uses teal (`#2dd4bf`) as a complementary accent to the site's primary amber — intentionally distinct so it reads as a secondary action separate from the main CTA.

- **Icon:** play triangle (SVG inline)
- **Primary label:** "Take a 30-second tour of Brilliant Managers"
- **Secondary label:** "Let us show you around the tool"
- **Background:** `rgba(45,212,191,0.08)`, border `rgba(45,212,191,0.35)`, border-radius `12px`
- **Text colour:** `#2dd4bf`
- **On click:** starts the spotlight tour (see section 2)

### CTA area

Below the tour trigger:

- **Eyebrow:** "Your manager scorecard" (small caps, muted)
- **Headline:** "You're one short reflection away from *real clarity.*" (amber em)
- **Body:** "Most managers guess at where they're strong and where they're not. Ten minutes of honest self-assessment across six pillars gives you a structured picture — and something concrete to bring to your next 1:1."
- **Button:** "Start your scorecard →" (amber, links to `/scorecard`)
- **Meta:** "~10 minutes · no right answers" (muted, beside button)

### Benefit strips

Four equal-width cards in a `grid-template-columns: repeat(4, 1fr)` grid, spanning the full width of the main panel (no max-width constraint). Each card has an amber icon badge, bold title, and muted description.

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | Lightbulb | See exactly where you stand | A radar across all six pillars shows your strengths and gaps at a glance. |
| 2 | Magnifying glass | Know where to focus first | Your lowest pillar is flagged automatically so you're never guessing what to work on. |
| 3 | Trend line | Track growth round to round | Rescore yourself every few months and watch your progress trend over time. |
| 4 | Speech bubble | A ready-made discussion starter with your manager | Share your scorecard snapshot — a structured starting point for a real conversation. |

All icons are inline SVG using `stroke="currentColor"` at `#f59e0b`.

---

## 2. Spotlight Tour

### Library

**driver.js** (`driver.js` npm package). Handles overlay rendering, element spotlight, and popover positioning. We configure it declaratively with a steps array and apply custom theme tokens to match the dark UI.

### Tour component

A new client component: `components/dashboard/DashboardTour.tsx`

- Accepts no props
- Initialises driver.js on mount, configured with the 5 steps below
- Exposes a `startTour()` function called by the tour trigger button
- On tour completion or skip: sets `localStorage.setItem('bm_tour_seen', '1')`
- On mount: if `localStorage.getItem('bm_tour_seen')` is already set, the trigger button is still shown but the tour will not auto-start

### Tour steps (5)

| Step | Target element | Title | Description |
|------|---------------|-------|-------------|
| 1 | Dashboard nav item (sidebar) | Your command centre | This is your dashboard — a live picture of where you stand as a manager. Once you've completed a scorecard, your radar, pillar scores, and growth goals all live here. |
| 2 | Growth nav item (sidebar) | Track what you're working on | The Growth section shows your active development goals and how your scores have shifted between rounds. Set a goal on any skill and revisit it at your next 1:1. |
| 3 | Connections nav item (sidebar) | Your management relationships | Connections tracks the people in your world — direct reports, peers, and stakeholders. Use it to log what matters about your working relationships. |
| 4 | Avatar / profile button (topbar) | Your profile | Your account settings and scorecard history live here. You can also download or share your scorecard from this menu. |
| 5 | "Start your scorecard →" button | Ready to get started? | Your first scorecard takes about ten minutes. Answer honestly — there are no right answers, only useful ones. |

### driver.js configuration

```ts
{
  animate: true,
  overlayColor: 'rgba(0,0,0,0.72)',
  overlayOpacity: 1,           // driver uses overlayColor directly
  smoothScroll: true,
  allowClose: true,
  stagePadding: 6,
  stageRadius: 8,
  popoverClass: 'bm-tour-popover',   // custom CSS class for dark theme
  onDestroyStarted: () => { driver.destroy(); markSeen(); },
}
```

The `bm-tour-popover` class overrides driver.js default popover styles to match the dark UI:
- Background: `#1e293b`
- Border: `1px solid rgba(255,255,255,0.12)`
- Border-radius: `12px`
- Text: white / `rgba(255,255,255,0.55)`
- Progress dots: amber active (`#f59e0b`), muted inactive
- Next button: amber fill, dark text
- Previous/Skip: ghost style

### Persistence

- Key: `bm_tour_seen` in `localStorage`
- Value: `'1'` when seen
- Checked on component mount — no auto-start, user always initiates via the trigger button
- Clearing localStorage resets the tour (intentional — no server-side persistence needed)

---

## Component structure

```
app/(app)/dashboard/page.tsx          — empty state branch updated
components/dashboard/DashboardTour.tsx — new client component
```

No new routes, no new API calls, no database changes.

---

## Testing

- Unit tests for `DashboardTour`:
  - renders tour trigger button
  - clicking trigger calls `driver().drive()`
  - completing tour sets `bm_tour_seen` in localStorage
  - skipping tour sets `bm_tour_seen` in localStorage
- Unit tests for the updated empty state in `dashboard/page.tsx`:
  - renders tour trigger, headline, CTA button, and all four benefit strip titles when `round` is null
  - CTA button links to `/scorecard`

driver.js is mocked in tests (jest/vitest manual mock).

---

## Out of scope

- Auto-starting the tour on first login (user always initiates)
- Server-side tour-seen tracking
- Tour on mobile / responsive adaptation (existing dashboard has no mobile layout yet)
- Any change to the populated dashboard state (radar, pillars, growth cards)
