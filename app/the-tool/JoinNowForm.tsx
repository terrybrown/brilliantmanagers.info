'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface Props {
  showSignIn?: boolean
}

export function JoinNowForm({ showSignIn = false }: Props) {
  const turnstileRef = useRef<TurnstileInstance>(null)
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
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken,
        },
      })
      if (err) {
        setError(err.message)
        turnstileRef.current?.reset()
        setCaptchaToken(null)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div>
        <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 4 }}>
          Check your email
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          We sent a magic link to <strong>{email}</strong>. Click it to get started.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="join-email" className="sr-only">Email address</label>
      <div style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
        <input
          id="join-email"
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); if (error) setError('') }}
          style={{
            flex: 1,
            height: 46,
            padding: '0 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 11,
            color: 'var(--color-text-primary)',
            fontSize: 14.5,
            fontFamily: 'var(--font-body)',
            outline: 'none',
          }}
        />
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={token => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
          options={{ size: 'invisible' }}
        />
        {loading ? (
          <div
            className="flex items-end justify-center gap-1"
            style={{ width: 120, height: 46 }}
            aria-label="Sending…"
          >
            <span className="loading-dot" />
            <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
            <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
          </div>
        ) : (
          <button
            type="submit"
            disabled={!captchaToken}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 46,
              padding: '0 22px',
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-fg)',
              border: 'none',
              borderRadius: 11,
              fontSize: 14.5,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: captchaToken ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              opacity: captchaToken ? 1 : 0.5,
            }}
          >
            Join now →
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--color-negative)' }}>
          {error}
        </p>
      )}
      {showSignIn && (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--color-text-faint)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      )}
    </form>
  )
}
