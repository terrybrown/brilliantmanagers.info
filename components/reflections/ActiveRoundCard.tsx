'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CreateRoundModal } from './CreateRoundModal'
import type { Round } from '@/lib/db/rounds'

interface ActiveRoundCardProps {
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
}

export function ActiveRoundCard({
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
}: ActiveRoundCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const title = inProgressRound?.title ?? nextRoundTitle

  if (!inProgressRound) {
    return (
      <>
        <div
          style={{
            border: '2px dashed #334155',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <p style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 4 }}>
            Ready to reflect?
          </p>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Start a new round to track your progress this quarter.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            aria-label={`Start ${nextRoundTitle}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f59e0b',
              color: '#1a2a3a',
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
        <CreateRoundModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultTitle={nextRoundTitle}
        />
      </>
    )
  }

  const pct = (scoredPillarCount / 5) * 100

  return (
    <>
      <div
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>{title}</p>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.15)',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            In progress
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          {scoredPillarCount} of 5 pillars scored
        </p>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 2,
              background: '#f59e0b',
            }}
          />
        </div>
        <Link
          href="/scorecard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: '#f59e0b',
            textDecoration: 'none',
          }}
        >
          Continue →
        </Link>
      </div>
      <CreateRoundModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTitle={nextRoundTitle}
      />
    </>
  )
}
