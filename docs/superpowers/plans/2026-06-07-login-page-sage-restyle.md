# Login Page Sage Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `app/login/page.tsx` to match the Sage design system — teal accent, display font, card wrapper, Sage tokens throughout. Zero logic changes.

**Architecture:** Single-file replacement. All Tailwind amber/slate classes swapped for Sage CSS token inline styles. Form wrapped in a card div. Both the sign-in form and the "Check your email" confirmation share the same card treatment.

**Tech Stack:** Next.js App Router, React, Sage CSS tokens (`--color-*`, `--font-display`, `--btn-primary-*`).

---

## File map

| File | Action |
|---|---|
| `app/login/page.tsx` | Modify — replace all Tailwind colour classes with Sage inline styles, add card, add subtitle, update both render paths |

---

### Task 1: Restyle the login page

**Files:**
- Modify: `app/login/page.tsx`

No unit tests needed — this is a pure visual change with no new logic. The test gate is a clean build.

- [ ] **Read the current file**

```bash
cat app/login/page.tsx
```

Understand the two render paths: the `sent` early-return (check your email), and the main form.

- [ ] **Replace the file with the restyled version**

Replace `app/login/page.tsx` with the following. All logic (state, auth, Turnstile) is unchanged — only JSX and styles change:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken || loading) return
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          captchaToken,
        },
      })
      if (err) {
        setError(err.message)
        setCaptchaToken(null)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 1px 2px rgba(40,60,45,.04), 0 2px 5px rgba(40,60,45,.03)',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Check your email
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0 }}>
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
          Sign in
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
          Enter your email and we&apos;ll send you a magic link.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
          />
          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-negative)', margin: 0 }}>{error}</p>
          )}
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={token => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            options={{ size: 'invisible' }}
          />
          <button
            type="submit"
            disabled={loading || !captchaToken}
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-fg)',
              border: 'none',
              borderRadius: 8,
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !captchaToken ? 'not-allowed' : 'pointer',
              opacity: loading || !captchaToken ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13.5, color: 'var(--color-text-faint)' }}>
          New here?{' '}
          <Link
            href="/the-tool#beta-signup"
            style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'underline' }}
          >
            Sign up for the beta →
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Run the test suite — confirm no regressions**

```bash
npm test 2>&1 | tail -6
```

Expected: all tests pass (no login page tests exist — checking the suite doesn't break).

- [ ] **Run a production build to confirm no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error TS|Type error|✓ Compiled|Failed" | head -10
```

Expected: `✓ Compiled successfully`.

- [ ] **Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: restyle login page to Sage design system — card, teal accent, display font"
```

---

### Final: push and open PR

```bash
git push -u origin design/login-sage-restyle
gh pr create \
  --title "feat: restyle login page to Sage design system" \
  --body "Brings the login page into the Sage design system. Replaces all hardcoded amber Tailwind classes and slate-* colours with Sage CSS token inline styles. Adds a card wrapper, display font heading, subtitle, and Sending… loading label. Zero logic changes." \
  --base master --assignee "@me"
```
