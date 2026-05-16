'use client'
import { useState } from 'react'
import { SkillBarChart } from '@/components/app/SkillBarChart'
import type { Pillar, Level } from '@/lib/skills'
import { PILLAR_LABELS, LEVEL_VALUES } from '@/lib/skills'

interface SkillResult {
  skillKey: string
  label: string
  selfLevel: Level
  managerLevel?: Level
}

interface PillarResult {
  pillar: Pillar
  skills: SkillResult[]
}

interface Props {
  pillars: PillarResult[]
  showManager: boolean
}

function scoreColor(avg: number): string {
  if (avg >= 4) return '#4ade80'
  if (avg >= 3) return '#a3e635'
  if (avg >= 2) return '#f59e0b'
  return '#f87171'
}

export function ResultsPillarList({ pillars, showManager }: Props) {
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {pillars.map(({ pillar, skills }) => {
        const avg =
          skills.reduce((sum, s) => sum + LEVEL_VALUES[s.selfLevel], 0) / skills.length
        const isExpanded = expandedPillar === pillar

        return (
          <div key={pillar} className="overflow-hidden rounded-xl" style={{ background: '#1e293b' }}>
            <button
              onClick={() => setExpandedPillar(isExpanded ? null : pillar)}
              className="flex w-full items-center gap-4 px-4 py-3"
            >
              <span className="flex-1 text-left font-medium text-white">
                {PILLAR_LABELS[pillar]}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(avg / 5) * 100}%`, background: scoreColor(avg) }}
                />
              </div>
              <span
                className="w-8 text-right text-xs font-semibold"
                style={{ color: scoreColor(avg) }}
              >
                {avg.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-700/50 px-4 pb-4 pt-3">
                <SkillBarChart
                  skills={skills.map(s => ({
                    label: s.label,
                    selfLevel: s.selfLevel,
                    managerLevel: showManager ? s.managerLevel : undefined,
                  }))}
                  showManager={showManager && skills.some(s => s.managerLevel !== undefined)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
