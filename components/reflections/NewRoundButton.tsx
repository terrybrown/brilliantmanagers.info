'use client'
import { useState } from 'react'
import { CreateRoundModal } from './CreateRoundModal'

interface NewRoundButtonProps {
  nextRoundTitle: string
}

export function NewRoundButton({ nextRoundTitle }: NewRoundButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
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
      <CreateRoundModal
        open={open}
        onClose={() => setOpen(false)}
        defaultTitle={nextRoundTitle}
      />
    </>
  )
}
