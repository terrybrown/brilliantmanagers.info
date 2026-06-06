'use client'
import { PILLARS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import { GuideIcon } from '@/components/icons/guide-icons'

interface PillarProgress {
  scored: number
  total: number
}

interface PillarNavProps {
  activePillar: Pillar
  pillarProgress: Record<Pillar, PillarProgress>
  onPillarChange: (pillar: Pillar) => void
}

export function PillarNav({ activePillar, pillarProgress, onPillarChange }: PillarNavProps) {
  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        paddingTop: 4,
      }}
    >
      {PILLARS.map(pillar => {
        const { scored, total } = pillarProgress[pillar]
        const isActive = pillar === activePillar
        const isComplete = total > 0 && scored === total

        return (
          <button
            key={pillar}
            onClick={() => onPillarChange(pillar)}
            style={{
              background: isActive ? 'var(--color-accent-wash2)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--color-accent-border)' : 'transparent'}`,
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <GuideIcon section={pillar} size={14} />
                {PILLAR_LABELS[pillar]}
              </span>
              {isComplete ? (
                <span style={{ color: 'var(--color-positive)', fontSize: 13 }}>✓</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 600 }}>
                  {scored}/{total}
                </span>
              )}
            </div>
            <div
              style={{
                height: 3,
                background: 'var(--color-track)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${total > 0 ? (scored / total) * 100 : 0}%`,
                  background: isComplete ? 'var(--color-positive)' : 'var(--color-accent)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
