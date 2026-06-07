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
  const [inputFocused, setInputFocused] = useState(false)

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
    borderRadius: 'var(--radius-lg)',
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
              border: `1px solid ${inputFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              outline: inputFocused ? '2px solid var(--color-accent-wash2)' : 'none',
              outlineOffset: 2,
              width: '100%',
              boxSizing: 'border-box',
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
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
              borderRadius: 'var(--radius)',
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
