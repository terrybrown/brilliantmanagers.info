'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function JoinNowForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!captchaToken) return
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

  if (sent) {
    return (
      <div>
        <p style={{ color: '#fefcf7', fontWeight: 600, marginBottom: 4 }}>
          Check your email
        </p>
        <p style={{ color: 'rgba(254,252,247,0.55)', fontSize: '0.875rem' }}>
          We sent a magic link to <strong>{email}</strong>. Click it to get started.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); if (error) setError('') }}
        className="w-full rounded-md px-3.5 py-2.5 text-sm"
        style={{
          background: 'rgba(254,252,247,0.07)',
          border: '1px solid rgba(254,252,247,0.14)',
          color: '#fefcf7',
        }}
      />
      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={token => setCaptchaToken(token)}
        options={{ size: 'invisible' }}
      />
      {loading ? (
        <div
          className="flex items-end justify-center gap-1"
          style={{ height: 42 }}
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
          className="w-full rounded-md py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#f59e0b', color: '#1a3a5c' }}
        >
          Join now →
        </button>
      )}
      <p
        className="mt-1 text-center text-xs"
        style={{
          paddingTop: 12,
          borderTop: '1px solid rgba(254,252,247,0.08)',
          color: 'rgba(254,252,247,0.35)',
        }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'rgba(254,252,247,0.6)', textDecoration: 'underline' }}
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
