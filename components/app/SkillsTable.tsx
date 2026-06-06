'use client'

import { useState } from 'react'
import { Target } from 'lucide-react'
import type { Level, Pillar } from '@/lib/skills'
import { scoreColor, scoreBg } from '@/lib/utils/score-tokens'

export interface SkillRow {
  key: string
  label: string
  pillar: Pillar
  pillarLabel: string
  level: Level
  score: number
  status: 'opportunity' | 'goal' | null
}

type SortKey = 'rating' | 'pillar' | 'skill'

interface SkillsTableProps {
  rows: SkillRow[]
}

const GRID_COLUMNS = '1.4fr 1.6fr 1fr 70px 120px'

export function SkillsTable({ rows }: SkillsTableProps) {
  const [sort, setSort] = useState<SortKey>('rating')

  const sorted = [...rows].sort((a, b) => {
    if (sort === 'rating') return a.score - b.score
    if (sort === 'pillar') return a.pillarLabel.localeCompare(b.pillarLabel) || a.label.localeCompare(b.label)
    return a.label.localeCompare(b.label)
  })

  const SORT_BUTTONS: { key: SortKey; label: string }[] = [
    { key: 'rating', label: 'Rating ↑' },
    { key: 'pillar', label: 'Pillar' },
    { key: 'skill', label: 'Skill' },
  ]

  return (
    <div>
      {/* Header row */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          All skills
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_BUTTONS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setSort(btn.key)}
              style={
                sort === btn.key
                  ? {
                      background: 'var(--color-accent-wash2)',
                      border: '1px solid var(--color-accent-border)',
                      color: 'var(--color-accent)',
                      borderRadius: 8,
                      padding: '5px 12px',
                      fontSize: 11.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-faint)',
                      borderRadius: 8,
                      padding: '5px 12px',
                      fontSize: 11.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }
              }
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflowX: 'auto',
        boxShadow: 'var(--shadow-card)',
      }}>
        {/* Column header */}
        <div role="row" style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          background: 'var(--color-bg-base)',
          borderBottom: '1px solid var(--color-border)',
          padding: '11px 18px',
        }}>
          {['Pillar', 'Skill', 'Level', 'Score', 'Status'].map((h, i) => (
            <div
              key={h}
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-faint)',
                textAlign: i === 3 ? 'center' : 'left',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {sorted.map((row, i) => (
          <SkillRow key={row.key} row={row} isFirst={i === 0} />
        ))}
      </div>
    </div>
  )
}

function SkillRow({ row, isFirst }: { row: SkillRow; isFirst: boolean }) {
  return (
    <div
      role="row"
      className="hover:bg-[var(--color-chip-bg)]"
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        padding: '12px 18px',
        borderTop: isFirst ? undefined : '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        transition: 'background 0.1s',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{row.pillarLabel}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.label}</div>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{row.level}</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: scoreBg(row.score),
          color: scoreColor(row.score),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {row.score}
        </div>
      </div>
      <div>
        {row.status === 'goal' && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--color-accent-wash2)',
            border: '1px solid var(--color-accent-border)',
            color: 'var(--color-accent)',
            borderRadius: 9999,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
          }}>
            <Target size={10} />
            Goal set
          </span>
        )}
        {row.status === 'opportunity' && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--color-alert-bg)',
            border: '1px solid var(--color-alert-border)',
            color: 'var(--color-alert-fg)',
            borderRadius: 9999,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
          }}>
            Opportunity
          </span>
        )}
        {!row.status && (
          <span style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>—</span>
        )}
      </div>
    </div>
  )
}
