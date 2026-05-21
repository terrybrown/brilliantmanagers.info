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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
          }}
        >
          Reflections
        </h1>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: '#f59e0b',
            color: '#1a2a3a',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          + New round
        </button>
      </div>
      <ActiveRoundCard
        inProgressRound={inProgressRound}
        scoredPillarCount={scoredPillarCount}
        nextRoundTitle={nextRoundTitle}
        onNewRound={() => setOpen(true)}
      />
      <CreateRoundModal
        open={open}
        onClose={() => setOpen(false)}
        defaultTitle={nextRoundTitle}
      />
    </>
  )
}
