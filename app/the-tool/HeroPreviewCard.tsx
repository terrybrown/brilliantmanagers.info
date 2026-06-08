import { Target } from 'lucide-react'

const HERO_DATA = [
  { label: 'Self',     self: 4.2, mgr: 3.3 },
  { label: 'Team',     self: 3.0, mgr: 3.1 },
  { label: 'Strategy', self: 3.4, mgr: 3.0 },
  { label: 'Comms',    self: 3.0, mgr: 1.7 },
  { label: 'Domain',   self: 3.2, mgr: 2.5 },
]

const SIZE = 220
const CX = SIZE / 2
const CY = SIZE / 2
const MAX_R = 82

function polarToXY(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function toPolygonPoints(values: number[]): string {
  return values
    .map((v, i) => {
      const { x, y } = polarToXY(i * 72, (v / 5) * MAX_R)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

const LABEL_OFFSETS: { dx: number; dy: number; anchor: 'middle' | 'start' | 'end' }[] = [
  { dx: 0,   dy: -12, anchor: 'middle' }, // Self     (top)
  { dx: 12,  dy: -4,  anchor: 'start'  }, // Team     (upper-right)
  { dx: 10,  dy: 11,  anchor: 'start'  }, // Strategy (lower-right)
  { dx: -10, dy: 11,  anchor: 'end'    }, // Comms    (lower-left)
  { dx: -12, dy: -4,  anchor: 'end'    }, // Domain   (upper-left)
]

export function HeroPreviewCard() {
  const selfPoints = toPolygonPoints(HERO_DATA.map(d => d.self))
  const mgrPoints  = toPolygonPoints(HERO_DATA.map(d => d.mgr))
  const axisEnds   = HERO_DATA.map((_, i) => polarToXY(i * 72, MAX_R))
  const gridPolygons = [1, 2, 3, 4, 5].map(level =>
    HERO_DATA.map((_, i) => {
      const { x, y } = polarToXY(i * 72, (level / 5) * MAX_R)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  )

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 30px 64px rgba(40,60,45,0.14), 0 3px 8px rgba(40,60,45,0.05)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span
          style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
          }}
        >
          Your scorecard
        </span>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700,
            color: 'var(--color-positive)',
            background: 'var(--color-positive-bg)',
            padding: '2px 8px', borderRadius: 6,
            fontFamily: 'var(--font-body)',
          }}
        >
          ↑ +0.8
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}>
          May 2026
        </span>
      </div>

      {/* SVG radar */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ display: 'block', margin: '6px auto', overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* Grid */}
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="var(--color-border)" strokeWidth={1} />
        ))}
        {/* Axes */}
        {axisEnds.map((end, i) => (
          <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="var(--color-border)" strokeWidth={1} />
        ))}
        {/* Manager polygon (behind self) */}
        <polygon
          points={mgrPoints}
          fill="rgba(204,122,26,0.10)"
          stroke="var(--color-manager)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        {/* Self polygon */}
        <polygon
          points={selfPoints}
          fill="rgba(14,124,107,0.18)"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
        {/* Labels */}
        {HERO_DATA.map((d, i) => {
          const { x, y } = axisEnds[i]
          const off = LABEL_OFFSETS[i]
          return (
            <text
              key={d.label}
              x={x + off.dx}
              y={y + off.dy}
              textAnchor={off.anchor}
              fontSize={10}
              fontFamily="var(--font-body)"
              fill="var(--color-text-faint)"
            >
              {d.label}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
        {[
          { label: 'Self',    color: 'var(--color-accent)'   },
          { label: 'Manager', color: 'var(--color-manager)'  },
        ].map(({ label, color }) => (
          <span
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, background: 'var(--color-bg-base)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>3.3</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)', marginTop: 4 }}>Overall · Self</div>
        </div>
        <div style={{ flex: 1, background: 'var(--color-bg-base)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 26, fontWeight: 750, color: 'var(--color-manager)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>2.9</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)', marginTop: 4 }}>Manager view</div>
        </div>
      </div>

      {/* Focus strip */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          marginTop: 12, padding: '9px 13px',
          background: 'var(--color-accent-wash)',
          border: '1px solid var(--color-accent-border)',
          borderRadius: 10,
        }}
      >
        <Target size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
          Focus: Communications
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
          lowest pillar
        </span>
      </div>
    </div>
  )
}
