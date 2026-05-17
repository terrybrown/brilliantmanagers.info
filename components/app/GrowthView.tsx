'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { DevelopmentPlan } from '@/lib/db/development-plans'
import type { Pillar } from '@/lib/skills'
import { savePlanAction } from '@/app/(app)/growth/actions'

interface SkillOption {
  key: string
  label: string
  pillar: Pillar
  pillarLabel: string
  selfLevel?: string
  hasPlan: boolean
}

interface GrowthViewProps {
  skills: SkillOption[]
  plans: DevelopmentPlan[]
  hasRound: boolean
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#64748b',
  in_progress: '#f59e0b',
  completed: '#4ade80',
}

export function GrowthView({ skills, plans, hasRound }: GrowthViewProps) {
  const [adding, setAdding] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const plansByKey = Object.fromEntries(plans.map(p => [p.skill_key, p]))

  const activePlans = plans.filter(p => p.status !== 'completed')
  const completedPlans = plans.filter(p => p.status === 'completed')

  return (
    <div className="flex flex-col gap-8">
      {activePlans.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Active goals
          </h2>
          <div className="flex flex-col gap-3">
            {activePlans.map(plan => {
              const skill = skills.find(s => s.key === plan.skill_key)
              return (
                <PlanCard
                  key={plan.skill_key}
                  plan={plan}
                  skillLabel={skill?.label ?? plan.skill_key}
                  pillarLabel={skill?.pillarLabel ?? ''}
                  expanded={expanded === plan.skill_key}
                  onToggle={() =>
                    setExpanded(prev => (prev === plan.skill_key ? null : plan.skill_key))
                  }
                />
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {hasRound ? 'Add a growth goal' : 'Growth goals'}
        </h2>

        {!hasRound && (
          <div
            className="mb-4 rounded-xl px-5 py-4"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          >
            <p className="text-sm text-slate-400">
              Complete your{' '}
              <a href="/scorecard" className="text-amber-400 hover:text-amber-300">
                self-assessment
              </a>{' '}
              first to unlock personalised growth goals.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {skills
            .filter(s => !s.hasPlan)
            .map(skill => (
              <div key={skill.key}>
                <button
                  onClick={() => setAdding(prev => (prev === skill.key ? null : skill.key))}
                  className="flex w-full items-center gap-3 rounded-xl bg-slate-800 px-5 py-3 text-left"
                >
                  <span className="flex-1 text-sm font-medium text-white">{skill.label}</span>
                  <span className="text-xs text-slate-500">{skill.pillarLabel}</span>
                  {skill.selfLevel && (
                    <span className="text-xs text-amber-400">{skill.selfLevel}</span>
                  )}
                  <Plus size={14} className="text-slate-500" strokeWidth={1.75} />
                </button>

                {adding === skill.key && (
                  <form
                    action={async (formData: FormData) => {
                      await savePlanAction(formData)
                      setAdding(null)
                    }}
                    className="mt-1 rounded-xl bg-slate-800 px-5 py-4"
                  >
                    <input type="hidden" name="skill_key" value={skill.key} />
                    <input type="hidden" name="pillar" value={skill.pillar} />
                    <input type="hidden" name="status" value="planned" />

                    <label className="mb-1 block text-xs text-slate-400">Goal</label>
                    <textarea
                      name="goal"
                      required
                      rows={2}
                      placeholder="What do you want to achieve with this skill?"
                      className="mb-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />

                    <label className="mb-1 block text-xs text-slate-400">
                      Target date (optional)
                    </label>
                    <input
                      type="date"
                      name="target_date"
                      className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400"
                      >
                        Save goal
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdding(null)}
                        className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
        </div>
      </section>

      {completedPlans.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Completed
          </h2>
          <div className="flex flex-col gap-3 opacity-60">
            {completedPlans.map(plan => {
              const skill = skills.find(s => s.key === plan.skill_key)
              return (
                <PlanCard
                  key={plan.skill_key}
                  plan={plan}
                  skillLabel={skill?.label ?? plan.skill_key}
                  pillarLabel={skill?.pillarLabel ?? ''}
                  expanded={false}
                  onToggle={() => {}}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  skillLabel,
  pillarLabel,
  expanded,
  onToggle,
}: {
  plan: DevelopmentPlan
  skillLabel: string
  pillarLabel: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl bg-slate-800 px-5 py-4">
      <button onClick={onToggle} className="flex w-full items-center gap-3 text-left">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{skillLabel}</p>
          <p className="text-xs text-slate-500">{pillarLabel}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            color: STATUS_COLORS[plan.status],
            background: `${STATUS_COLORS[plan.status]}20`,
          }}
        >
          {STATUS_LABELS[plan.status]}
        </span>
        {expanded ? (
          <ChevronUp size={14} className="text-slate-500" strokeWidth={1.75} />
        ) : (
          <ChevronDown size={14} className="text-slate-500" strokeWidth={1.75} />
        )}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-slate-700 pt-3">
          <p className="text-sm text-slate-300">{plan.goal}</p>
          {plan.target_date && (
            <p className="mt-2 text-xs text-slate-500">
              Target: {new Date(plan.target_date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
