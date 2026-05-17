'use client'
import { useState } from 'react'
import { PILLARS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import { PillarNav } from './PillarNav'
import { SkillList } from './SkillList'
import { GuidePanel } from './GuidePanel'

interface ScorecardShellProps {
  roundId: string
  allScores: Record<string, Level>
}

export function ScorecardShell({ roundId, allScores }: ScorecardShellProps) {
  const [activePillar, setActivePillar] = useState<Pillar>('self')
  const [activeSkillKey, setActiveSkillKey] = useState<string | null>(null)
  const [lastActiveByPillar, setLastActiveByPillar] = useState<Partial<Record<Pillar, string>>>({})
  const [scores, setScores] = useState<Record<string, Level>>(allScores)

  const handlePillarChange = (pillar: Pillar) => {
    setActivePillar(pillar)
    setActiveSkillKey(lastActiveByPillar[pillar] ?? null)
  }

  const handleSkillActivate = (skillKey: string) => {
    setActiveSkillKey(skillKey)
    setLastActiveByPillar(prev => ({ ...prev, [activePillar]: skillKey }))
  }

  const handleScore = (skillKey: string, level: Level | undefined) => {
    setScores(prev => {
      if (level === undefined) {
        const next = { ...prev }
        delete next[skillKey]
        return next
      }
      return { ...prev, [skillKey]: level }
    })
  }

  const pillarProgress = Object.fromEntries(
    PILLARS.map(pillar => {
      const pillarSkills = getSkillsByPillar(pillar)
      const scored = pillarSkills.filter(s => scores[s.key]).length
      return [pillar, { scored, total: pillarSkills.length }]
    })
  ) as Record<Pillar, { scored: number; total: number }>

  const skills = getSkillsByPillar(activePillar)

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        height: 'calc(100vh - 160px)',
        minHeight: 0,
      }}
    >
      <PillarNav
        activePillar={activePillar}
        pillarProgress={pillarProgress}
        onPillarChange={handlePillarChange}
      />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 20px',
          minWidth: 0,
        }}
      >
        <SkillList
          skills={skills}
          scores={scores}
          roundId={roundId}
          activeSkillKey={activeSkillKey}
          onSkillActivate={handleSkillActivate}
          onScore={handleScore}
        />
      </div>
      <GuidePanel activeSkillKey={activeSkillKey} />
    </div>
  )
}
