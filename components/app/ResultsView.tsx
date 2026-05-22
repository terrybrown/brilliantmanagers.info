'use client'
import { ScorecardRadarChart } from '@/components/app/ScorecardRadarChart'
import { ResultsPillarList } from '@/components/app/ResultsPillarList'
import type { RadarPillarScore } from '@/lib/reflections'

interface Props {
  pillarScores: RadarPillarScore[]
}

export function ResultsView({ pillarScores }: Props) {
  const pillarsForList = pillarScores.map(ps => ({
    pillar: ps.pillar,
    skills: ps.selfSkills.map(sk => ({
      skillKey: sk.skillKey,
      label: sk.label,
      selfLevel: sk.level,
      managerLevel: ps.managerSkills?.find(ms => ms.skillKey === sk.skillKey)?.level,
    })),
  }))

  const hasManagerScores = pillarScores.some(ps => ps.managerScore !== undefined)

  return (
    <>
      <div className="mb-6">
        <ScorecardRadarChart pillarScores={pillarScores} />
      </div>
      <ResultsPillarList pillars={pillarsForList} showManager={hasManagerScores} />
    </>
  )
}
