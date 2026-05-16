'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — don't render until client
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-16 h-7" />

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border px-1 py-1"
      style={{
        background: 'rgba(0,0,0,0.04)',
        borderColor: 'var(--color-border)',
      }}
    >
      {[
        { value: 'light', label: '☀️' },
        { value: 'dark', label: '🌙' },
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className="rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
          style={{
            background: theme === value ? 'var(--color-text-primary)' : 'transparent',
            color: theme === value ? 'var(--color-bg-base)' : 'var(--color-text-muted)',
          }}
          aria-label={`Switch to ${value} mode`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
