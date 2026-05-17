'use client'
import { useTransition } from 'react'
import { LEVELS, LEVEL_COLORS, type Skill, type Level } from '@/lib/skills'
import { saveScore } from '@/app/(app)/scorecard/actions'

interface SkillListProps {
  skills: Skill[]
  scores: Record<string, Level>
  roundId: string
  activeSkillKey: string | null
  onSkillActivate: (skillKey: string) => void
  onScore: (skillKey: string, level: Level) => void
}

export function SkillList({
  skills,
  scores,
  roundId,
  activeSkillKey,
  onSkillActivate,
  onScore,
}: SkillListProps) {
  const [, startTransition] = useTransition()

  const handleRate = (skill: Skill, level: Level) => {
    const previousLevel = scores[skill.key]
    onScore(skill.key, level)
    onSkillActivate(skill.key)
    startTransition(async () => {
      try {
        await saveScore(roundId, skill.pillar, skill.key, level)
      } catch {
        // Revert optimistic update on failure (only if there was a previous score to restore)
        if (previousLevel !== undefined) onScore(skill.key, previousLevel)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {skills.map(skill => {
        const currentScore = scores[skill.key]
        const isActive = skill.key === activeSkillKey

        return (
          <div
            key={skill.key}
            style={{
              background: '#1e293b',
              borderRadius: 10,
              padding: '12px 14px',
              border: `1px solid ${isActive ? '#f59e0b' : 'transparent'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <button
              onClick={() => onSkillActivate(skill.key)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                color: '#f1f5f9',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              {skill.label}
            </button>

            <div style={{ display: 'flex', gap: 4 }}>
              {LEVELS.map((level, i) => {
                const isSelected = currentScore === level
                return (
                  <button
                    key={level}
                    title={level}
                    onClick={() => handleRate(skill, level)}
                    style={{
                      flex: 1,
                      height: 26,
                      borderRadius: 4,
                      border: `2px solid ${isSelected ? LEVEL_COLORS[level] : '#334155'}`,
                      background: isSelected ? `${LEVEL_COLORS[level]}22` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? LEVEL_COLORS[level] : '#64748b',
                    }}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
