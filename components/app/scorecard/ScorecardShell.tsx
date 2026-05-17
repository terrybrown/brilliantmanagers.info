'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PILLARS, PILLAR_LABELS, getSkillsByPillar, type Pillar, type Level } from '@/lib/skills'
import type { SkillGuideContent } from '@/lib/guide-content'
import { PillarNav } from './PillarNav'
import { SkillList } from './SkillList'
import { GuidePanel } from './GuidePanel'

interface ScorecardShellProps {
  roundId: string
  allScores: Record<string, Level>
  allGuideContent: Record<string, SkillGuideContent | null>
}

export function ScorecardShell({ roundId, allScores, allGuideContent }: ScorecardShellProps) {
  const firstSelfSkill = getSkillsByPillar('self')[0]
  const [activePillar, setActivePillar] = useState<Pillar>('self')
  const [activeSkillKey, setActiveSkillKey] = useState<string | null>(
    firstSelfSkill?.key ?? null
  )
  const [lastActiveByPillar, setLastActiveByPillar] = useState<Partial<Record<Pillar, string>>>(
    firstSelfSkill ? { self: firstSelfSkill.key } : {}
  )
  const [scores, setScores] = useState<Record<string, Level>>(allScores)

  const handlePillarChange = (pillar: Pillar) => {
    setActivePillar(pillar)
    const lastKey = lastActiveByPillar[pillar]
    if (lastKey) {
      setActiveSkillKey(lastKey)
    } else {
      const firstSkill = getSkillsByPillar(pillar)[0]
      const firstKey = firstSkill?.key ?? null
      setActiveSkillKey(firstKey)
      if (firstKey) setLastActiveByPillar(prev => ({ ...prev, [pillar]: firstKey }))
    }
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

  const pillarIndex = PILLARS.indexOf(activePillar)
  const prevPillar = pillarIndex > 0 ? PILLARS[pillarIndex - 1] : null
  const nextPillar = pillarIndex < PILLARS.length - 1 ? PILLARS[pillarIndex + 1] : null
  const isLastPillar = pillarIndex === PILLARS.length - 1

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

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 24,
            paddingBottom: 8,
          }}
        >
          {prevPillar ? (
            <button
              onClick={() => handlePillarChange(prevPillar)}
              style={{
                background: '#f59e0b22',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← {PILLAR_LABELS[prevPillar]}
            </button>
          ) : (
            <span />
          )}

          {isLastPillar ? (
            <Link
              href="/dashboard"
              style={{
                background: '#f59e0b',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f172a',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Show analysis →
            </Link>
          ) : nextPillar ? (
            <button
              onClick={() => handlePillarChange(nextPillar)}
              style={{
                background: '#f59e0b22',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {PILLAR_LABELS[nextPillar]} →
            </button>
          ) : null}
        </div>
      </div>
      <GuidePanel activeSkillKey={activeSkillKey} allGuideContent={allGuideContent} />
    </div>
  )
}
