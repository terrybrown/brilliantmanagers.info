'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { LEVELS, LEVEL_COLORS, PILLAR_LABELS, type Skill, type Level, type Pillar } from '@/lib/skills'
import { GuideIcon } from '@/components/icons/guide-icons'
import { saveScore } from '@/app/(app)/scorecard/actions'
import { trackPillarScored, trackRoundCompleted, trackScorecardCompleted } from '@/lib/analytics'

interface SkillListProps {
  activePillar: Pillar
  skills: Skill[]
  scores: Record<string, Level>
  roundId: string
  activeSkillKey: string | null
  onSkillActivate: (skillKey: string) => void
  onScore: (skillKey: string, level: Level | undefined) => void
}

export function SkillList({
  activePillar,
  skills,
  scores,
  roundId,
  activeSkillKey,
  onSkillActivate,
  onScore,
}: SkillListProps) {
  const [, startTransition] = useTransition()

  const scored = skills.filter(s => scores[s.key] !== undefined).length

  const handleRate = (skill: Skill, level: Level) => {
    if (scores[skill.key] === level) return
    const previousLevel = scores[skill.key]
    onScore(skill.key, level)
    // Auto-advance: activate the next skill in the list after rating
    const currentIndex = skills.findIndex(s => s.key === skill.key)
    const nextSkill = skills[currentIndex + 1]
    onSkillActivate(nextSkill ? nextSkill.key : skill.key)
    startTransition(async () => {
      try {
        const result = await saveScore(roundId, skill.pillar, skill.key, level)
        if (!result.ok) {
          toast.error(result.error)
          onScore(skill.key, previousLevel)
          return
        }
        trackPillarScored(skill.pillar, level)
        if (result.data?.roundCompleted) {
          trackRoundCompleted(roundId)
          trackScorecardCompleted()
        }
      } catch {
        // Revert the optimistic update. previousLevel may be undefined (skill
        // was never scored); ScorecardShell.handleScore deletes the key in
        // that case, which correctly undoes the add from line 28.
        onScore(skill.key, previousLevel)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Pillar header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <GuideIcon section={activePillar} size={16} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {PILLAR_LABELS[activePillar]}
        </span>
        <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>
          · {scored} of {skills.length} scored
        </span>
      </div>

      {/* Skill cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {skills.map(skill => {
          const currentScore = scores[skill.key]
          const isActive = skill.key === activeSkillKey
          const dotColor = currentScore ? LEVEL_COLORS[currentScore] : 'var(--color-border)'

          return (
            <div
              key={skill.key}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {/* Dot indicator */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  flexShrink: 0,
                }}
              />

              <button
                onClick={() => onSkillActivate(skill.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                  fontSize: 13,
                  lineHeight: 1.4,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {skill.label}
              </button>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {LEVELS.map(level => {
                  const isSelected = currentScore === level
                  return (
                    <button
                      key={level}
                      title={level}
                      onClick={() => handleRate(skill, level)}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        whiteSpace: 'nowrap',
                        borderRadius: 6,
                        border: `1.5px solid ${isSelected ? LEVEL_COLORS[level] : 'var(--color-border)'}`,
                        background: isSelected ? LEVEL_COLORS[level] : 'transparent',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#ffffff' : 'var(--color-text-faint)',
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
    </div>
  )
}
