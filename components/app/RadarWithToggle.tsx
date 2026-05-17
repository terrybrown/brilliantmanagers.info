'use client'
import { useState } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import type { Pillar } from '@/lib/skills'

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
}

interface RadarWithToggleProps {
  pillarScores: PillarScore[]
  hasManagerScores: boolean
  onPillarClick?: (pillar: Pillar) => void
}

export function RadarWithToggle({ pillarScores, hasManagerScores, onPillarClick }: RadarWithToggleProps) {
  const [showManager, setShowManager] = useState(false)

  return (
    <div>
      {hasManagerScores && (
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setShowManager(false)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              !showManager ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Self
          </button>
          <button
            onClick={() => setShowManager(true)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              showManager ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Manager
          </button>
        </div>
      )}
      <ScorecardRadarChart
        pillarScores={pillarScores}
        showManager={showManager}
        onPillarClick={onPillarClick}
      />
    </div>
  )
}
