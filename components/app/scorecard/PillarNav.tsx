'use client'
import { PILLARS, PILLAR_LABELS, type Pillar } from '@/lib/skills'

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
              background: isActive ? '#1e293b' : 'transparent',
              border: `1px solid ${isActive ? '#334155' : 'transparent'}`,
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
                  color: isActive ? '#f1f5f9' : '#94a3b8',
                }}
              >
                {PILLAR_LABELS[pillar]}
              </span>
              {isComplete ? (
                <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
              ) : (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {scored}/{total}
                </span>
              )}
            </div>
            <div
              style={{
                height: 3,
                background: '#0f172a',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${total > 0 ? (scored / total) * 100 : 0}%`,
                  background: isComplete ? '#4ade80' : '#f59e0b',
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
