# Email Sign-in Template Design

**Date:** 2026-05-17  
**Status:** Implemented

## Goal

Produce two on-brand HTML email templates for the Supabase magic-link (OTP) sign-in flow, matching the Brilliant Managers visual identity.

## Brand Tokens Used

| Token | Value | Role |
|---|---|---|
| Navy dark | `#1a3a5c` | Dark card background |
| Navy darker | `#0f2133` | Dark outer background |
| Amber | `#f59e0b` | Accent, CTA button, logo, rule |
| Cream | `#fefcf7` | Text on dark |
| Warm off-white | `#ece9e0` | Light outer background |
| Stone | `#1c1917` | Text on light |
| Muted stone | `#44403c` | Body text on light |

## Variants

### Dark (`supabase/templates/email-signin-dark.html`)
- Outer background `#0f2133`, card `#1a3a5c`
- Cream text; muted text at 58% opacity
- Thin 1px dividers at `rgba(254,252,247,0.10)`
- Amber CTA button with navy text

### Light (`supabase/templates/email-signin-light.html`)
- Outer background `#ece9e0`, card `#ffffff`
- 4px amber top-border accent on the card
- Stone/dark-stone text
- Same amber CTA button

## Shared Structure (both variants)

1. **Header** — SVG logo mark (amber square, white trend line + dot) + "Brilliant Managers" wordmark
2. **Body** — 40×2px amber rule, H1 "Sign in to Brilliant Managers", body copy, amber CTA button
3. **Fallback** — plain-text link below the button for clients that block images/buttons
4. **Footer** — "If you didn't request this…" disclaimer
5. **Below-card** — copyright line

## Template Variables

| Variable | Purpose |
|---|---|
| `{{ .SiteURL }}` | Base URL for the confirm endpoint |
| `{{ .TokenHash }}` | OTP token hash |
| `{{ .Email }}` | Recipient email address |

## Technical Decisions

- Table-based layout throughout for broad email client compatibility
- All styles inline; no `<style>` blocks (stripped by some clients)
- `role="presentation"` on layout tables
- HTML entities for `→`, `—`, `©`, `·` — not Unicode literals
- `word-break:break-all` on fallback URL to prevent overflow on narrow clients
- `max-width:560px` card (tighter than 600px default for better whitespace)
- SVG logo uses basic `polyline` + `circle` (renders in most modern clients; degrades gracefully where SVG is unsupported — wordmark text remains)

## Files

```
supabase/templates/
  email-signin-dark.html
  email-signin-light.html
```

## Usage

Paste the contents of the chosen file into the Supabase dashboard under  
**Authentication → Email Templates → Magic Link**.
