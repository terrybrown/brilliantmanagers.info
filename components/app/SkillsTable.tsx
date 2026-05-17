'use client'

import { useState } from 'react'
import { LEVEL_COLORS, type Level, type Pillar } from '@/lib/skills'

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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">All Skills</h2>
        <div className="flex gap-1">
          {SORT_BUTTONS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setSort(btn.key)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                sort === btn.key
                  ? { background: '#f59e0b', color: '#0f172a' }
                  : { border: '1px solid #334155', color: '#94a3b8' }
              }
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800">
            <tr>
              {['Pillar', 'Skill', 'Level', 'Score', 'Status'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sorted.map(row => (
              <tr key={row.key} className="bg-slate-800/50 hover:bg-slate-800">
                <td className="px-4 py-3 text-xs text-slate-400">{row.pillarLabel}</td>
                <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.level}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      color: LEVEL_COLORS[row.level],
                      background: `${LEVEL_COLORS[row.level]}20`,
                    }}
                  >
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.status === 'opportunity' && (
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">
                      💡 Opportunity
                    </span>
                  )}
                  {row.status === 'goal' && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      🎯 Active goal
                    </span>
                  )}
                  {!row.status && <span className="text-slate-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
