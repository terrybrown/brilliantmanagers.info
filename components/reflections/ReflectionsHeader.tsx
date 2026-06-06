'use client'
import { useState } from 'react'
import { ActiveRoundCard } from './ActiveRoundCard'
import { CreateRoundModal } from './CreateRoundModal'
import type { Round } from '@/lib/db/rounds'

interface ReflectionsHeaderProps {
  inProgressRound: Round | null
  scoredPillarCount: number
  nextRoundTitle: string
}

export function ReflectionsHeader({
  inProgressRound,
  scoredPillarCount,
  nextRoundTitle,
}: ReflectionsHeaderProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px] items-start">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 750,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Reflections
            </h1>
            <button
              onClick={() => setOpen(true)}
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              + New round
            </button>
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--color-text-muted)',
              margin: 0,
              maxWidth: 520,
              lineHeight: 1.6,
            }}
          >
            Every round is a snapshot. Watch how your scores move over time — and where your manager sees you differently.
          </p>
        </div>
        <ActiveRoundCard
          inProgressRound={inProgressRound}
          scoredPillarCount={scoredPillarCount}
          nextRoundTitle={nextRoundTitle}
          onNewRound={() => setOpen(true)}
        />
      </div>
      <CreateRoundModal open={open} onClose={() => setOpen(false)} defaultTitle={nextRoundTitle} />
    </>
  )
}
