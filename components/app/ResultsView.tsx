'use client'
import { useState } from 'react'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { ResultsPillarList } from '@/components/app/ResultsPillarList'
import type { Pillar, Level } from '@/lib/skills'

interface SkillResult {
  skillKey: string
  label: string
  selfLevel: Level
  managerLevel?: Level
}

interface PillarScore {
  pillar: Pillar
  selfScore: number
  managerScore?: number
  skills: SkillResult[]
}

interface Props {
  pillarScores: PillarScore[]
  hasManagerScores: boolean
}

export function ResultsView({ pillarScores, hasManagerScores }: Props) {
  const [showManager, setShowManager] = useState(false)

  return (
    <>
      {hasManagerScores && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Show:
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: '#f59e0b', color: '#1a3a5c' }}
          >
            Self
          </span>
          <button
            onClick={() => setShowManager(m => !m)}
            className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              background: showManager ? '#1e3a5f' : 'transparent',
              borderColor: showManager ? '#3b82f6' : '#334155',
              color: showManager ? '#93c5fd' : '#475569',
            }}
          >
            Manager
          </button>
        </div>
      )}

      <div className="mb-6">
        <ScorecardRadarChart
          pillarScores={pillarScores}
          showManager={hasManagerScores && showManager}
        />
      </div>

      <ResultsPillarList
        pillars={pillarScores}
        showManager={hasManagerScores && showManager}
      />
    </>
  )
}
