import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { PILLAR_LABELS, type Level, type Pillar } from '@/lib/skills'
import { scoreColor, scoreBg } from '@/lib/utils/score-tokens'

interface Opportunity {
  key: string
  label: string
  pillar: Pillar
  level: Level
  score: number
}

interface OpportunitiesPanelProps {
  opportunities: Opportunity[]
}


export function OpportunitiesPanel({ opportunities }: OpportunitiesPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Top opportunities
        </h2>
        <p style={{ fontSize: 11.5, color: 'var(--color-text-faint)', margin: '2px 0 0' }}>
          Lowest-scoring skills with no active goal
        </p>
      </div>

      {opportunities.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>All low-scoring skills have active goals.</p>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}>
          {opportunities.map((opp, i) => (
            <div
              key={opp.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 12px',
                borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
              }}
            >
              <div style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: 6,
                background: scoreBg(opp.score),
                color: scoreColor(opp.score),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {opp.score}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opp.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: '1px 0 0' }}>
                  {PILLAR_LABELS[opp.pillar]} · {opp.level}
                </p>
              </div>
              <Link
                href={`/growth/goal/new?skill=${opp.key}`}
                style={{
                  flexShrink: 0,
                  background: 'var(--color-accent-wash2)',
                  border: '1px solid var(--color-accent-border)',
                  color: 'var(--color-accent)',
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                }}
              >
                Set goal →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Nudge card */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        background: 'var(--color-nav-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 16,
      }}>
        <Sparkles size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Focus on one skill at a time.</strong> Setting a goal on your lowest-scoring skill has the biggest impact on your overall score.
        </p>
      </div>
    </div>
  )
}
