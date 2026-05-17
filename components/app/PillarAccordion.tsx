'use client'
import Link from 'next/link'
import { Lightbulb, Target, ChevronDown } from 'lucide-react'
import { SkillChip } from './SkillChip'
import type { Level } from '@/lib/skills'
import { LEVEL_COLORS } from '@/lib/skills'

export interface SkillData {
  key: string
  name: string
  description: string
  level: Level
  score: number
  chipType: 'opportunity' | 'goal' | null
  goalText?: string
}

export interface PillarData {
  pillar: string
  label: string
  score: number
  isLowest: boolean
  skills: SkillData[]
  prevScore?: number
}

interface PillarAccordionProps {
  pillars: PillarData[]
  openPillar: string | null
  onOpenChange: (pillar: string | null) => void
}

export function PillarAccordion({ pillars, openPillar, onOpenChange }: PillarAccordionProps) {
  return (
    <div className="flex flex-col gap-3">
      {pillars.map(pillar => {
        const isOpen = openPillar === pillar.pillar
        const chipped = pillar.skills.filter(s => s.chipType !== null)
        const opportunities = pillar.skills.filter(s => s.chipType === 'opportunity')
        const goals = pillar.skills.filter(s => s.chipType === 'goal')
        const scoreWidth = `${((pillar.score - 1) / 4) * 100}%`
        const delta =
          pillar.prevScore !== undefined ? pillar.score - pillar.prevScore : null

        return (
          <div
            key={pillar.pillar}
            className="rounded-xl px-4 py-3"
            style={
              pillar.isLowest
                ? { background: '#0f2040', border: '1px solid rgba(245,158,11,0.45)' }
                : { background: '#1e293b', border: '1px solid transparent' }
            }
          >
            {/* Header row */}
            <button
              onClick={() => onOpenChange(isOpen ? null : pillar.pillar)}
              aria-label={pillar.label}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="w-28 flex-shrink-0 text-sm font-medium text-white">
                {pillar.label}
              </span>
              {pillar.isLowest && (
                <span className="mr-1 text-xs font-semibold text-amber-400">↓ lowest</span>
              )}
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-amber-500 transition-all"
                    style={{ width: scoreWidth }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-xs font-semibold text-amber-400">
                {pillar.score.toFixed(1)}
              </span>
              {delta !== null && delta !== 0 && (
                <span
                  className="flex-shrink-0 rounded font-bold"
                  style={{
                    background: delta > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                    color: delta > 0 ? '#4ade80' : '#f87171',
                    fontSize: 9,
                    padding: '1px 5px',
                    borderRadius: 4,
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}{delta > 0 ? '↑' : '↓'}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Always-on chips row */}
            {chipped.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chipped.map(skill => (
                  <SkillChip key={skill.key} type={skill.chipType!} label={skill.name} />
                ))}
              </div>
            )}

            {/* Expanded detail */}
            {isOpen && (
              <div className="mt-4 space-y-4">
                {opportunities.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Lightbulb size={13} strokeWidth={1.75} style={{ color: '#a5b4fc' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a5b4fc' }}>
                        Opportunities
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {opportunities.map(skill => (
                        <div key={skill.key} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{skill.name}</p>
                            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                              {skill.description}
                            </p>
                          </div>
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              color: LEVEL_COLORS[skill.level],
                            }}
                          >
                            {skill.level}
                          </span>
                          <Link
                            href={`/growth?skill=${skill.key}`}
                            className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              color: '#a5b4fc',
                            }}
                          >
                            Make goal →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {goals.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Target size={13} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
                      <span className="text-xs font-semibold text-amber-400">Active Goals</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {goals.map(skill => (
                        <div key={skill.key} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{skill.name}</p>
                            {skill.goalText && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {skill.goalText}
                              </p>
                            )}
                          </div>
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              color: LEVEL_COLORS[skill.level],
                            }}
                          >
                            {skill.level}
                          </span>
                          <Link
                            href="/growth"
                            className="flex-shrink-0 text-xs font-semibold text-amber-400 hover:text-amber-300"
                          >
                            In Growth →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
