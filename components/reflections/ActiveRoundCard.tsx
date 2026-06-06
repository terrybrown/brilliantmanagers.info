'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CreateRoundModal } from './CreateRoundModal'
import type { Round } from '@/lib/db/rounds'

interface ActiveRoundCardProps {
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
  onNewRound?: () => void
}

export function ActiveRoundCard({
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
  onNewRound,
}: ActiveRoundCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const handleNewRound = onNewRound ?? (() => setModalOpen(true))

  if (!inProgressRound) {
    return (
      <>
        <div
          style={{
            border: '2px dashed var(--color-border)',
            background: 'var(--color-surface)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14, marginBottom: 4 }}>
            Ready to reflect?
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Start a new round to track your progress this quarter.
          </p>
          <button
            onClick={handleNewRound}
            aria-label={`Start ${nextRoundTitle}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              fontWeight: 700,
              fontSize: 12,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Start {nextRoundTitle} →
          </button>
        </div>
        {!onNewRound && (
          <CreateRoundModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            defaultTitle={nextRoundTitle}
          />
        )}
      </>
    )
  }

  const title = inProgressRound.title ?? nextRoundTitle
  const pct = Math.min(100, Math.max(0, (scoredPillarCount / 5) * 100))

  return (
    <div
      style={{
        background: 'var(--color-accent-wash)',
        border: '1px solid var(--color-accent-border)',
        borderRadius: 12,
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)' }}>{title}</p>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--color-accent)',
            background: 'var(--color-accent-wash2)',
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          In progress
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {scoredPillarCount} of 5 pillars scored
      </p>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: 'var(--color-track)',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 2,
            background: 'var(--color-accent)',
          }}
        />
      </div>
      <Link
        href="/scorecard"
        aria-label="Continue to scorecard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--color-accent)',
          textDecoration: 'none',
        }}
      >
        Continue →
      </Link>
    </div>
  )
}
