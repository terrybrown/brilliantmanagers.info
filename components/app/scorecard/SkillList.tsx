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
    // Auto-advance: activate the next skill in the list after rating
    const currentIndex = skills.findIndex(s => s.key === skill.key)
    const nextSkill = skills[currentIndex + 1]
    onSkillActivate(nextSkill ? nextSkill.key : skill.key)
    startTransition(async () => {
      try {
        await saveScore(roundId, skill.pillar, skill.key, level)
      } catch {
        if (previousLevel !== undefined) onScore(skill.key, previousLevel)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {skills.map(skill => {
        const currentScore = scores[skill.key]
        const isActive = skill.key === activeSkillKey

        return (
          <div
            key={skill.key}
            style={{
              background: '#1e293b',
              borderRadius: 10,
              padding: '10px 12px',
              border: `1px solid ${isActive ? '#f59e0b' : 'transparent'}`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
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
                fontSize: 13,
                lineHeight: 1.4,
                flex: 1,
                minWidth: 0,
              }}
            >
              {skill.label}
            </button>

            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {LEVELS.map(level => {
                const isSelected = currentScore === level
                return (
                  <button
                    key={level}
                    title={level}
                    onClick={() => handleRate(skill, level)}
                    style={{
                      height: 28,
                      padding: '0 8px',
                      whiteSpace: 'nowrap',
                      borderRadius: 4,
                      border: `2px solid ${isSelected ? LEVEL_COLORS[level] : '#334155'}`,
                      background: isSelected ? `${LEVEL_COLORS[level]}22` : 'transparent',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? LEVEL_COLORS[level] : '#64748b',
                    }}
                  >
                    {level}
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
