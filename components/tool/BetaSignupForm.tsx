'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BetaSignupForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) {
        setError(err.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
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
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{
            flex: 1,
            background: 'rgba(254,252,247,0.08)',
            border: '1px solid rgba(254,252,247,0.20)',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#fefcf7',
            fontSize: '0.875rem',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#f59e0b',
            color: '#1a3a5c',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '12px 22px',
            borderRadius: 8,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: loading ? 0.7 : 1,
          }}
        >
          Get early access →
        </button>
      </div>
      {error && (
        <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: 8, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </form>
  )
}
