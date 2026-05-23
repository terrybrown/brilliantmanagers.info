'use client'

import { useState } from 'react'
import { ResourcePanel } from './ResourcePanel'
import { saveGoalAction } from '@/app/(app)/growth/actions'
import { SKILLS, PILLAR_LABELS, type Pillar } from '@/lib/skills'
import type { Resource } from '@/lib/db/resources'
import { trackGoalCreated } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'

interface GoalFormProps {
  initialSkillKey?: string
  resources: Resource[]
  allSkillsForSelector: { key: string; label: string; pillar: Pillar }[]
}

const CHECKIN_OPTIONS = [
  { label: 'Every 2 weeks', value: '2' },
  { label: 'Every 4 weeks', value: '4' },
  { label: 'Every 6 weeks', value: '6' },
  { label: 'Every 8 weeks', value: '8' },
  { label: 'Custom', value: 'custom' },
]

export function GoalForm({ initialSkillKey, resources, allSkillsForSelector }: GoalFormProps) {
  const [selectedSkillKey, setSelectedSkillKey] = useState(initialSkillKey ?? '')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [checkin, setCheckin] = useState('')
  const [customWeeks, setCustomWeeks] = useState('')

  const selectedSkill = SKILLS.find(s => s.key === selectedSkillKey)
  const checkinValue = checkin === 'custom' ? customWeeks : checkin
  const { mutate, isPending } = useMutation()

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      fd.set('resource_ids', JSON.stringify(pinnedIds))
      if (checkinValue) fd.set('checkin_frequency_weeks', checkinValue)
      trackGoalCreated()
      mutate(() => saveGoalAction(fd))
    }}>
      <input type="hidden" name="skill_key" value={selectedSkillKey} />
      <input type="hidden" name="pillar" value={selectedSkill?.pillar ?? ''} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — form */}
        <div className="flex flex-col gap-5">
          {/* Skill selector (shown only when no initial skill) */}
          {!initialSkillKey && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Skill</label>
              <select
                value={selectedSkillKey}
                onChange={e => setSelectedSkillKey(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="">Select a skill…</option>
                {allSkillsForSelector.map(s => (
                  <option key={s.key} value={s.key}>
                    {PILLAR_LABELS[s.pillar]} — {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Skill header (shown when skill is selected) */}
          {selectedSkill && (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{selectedSkill.label}</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  {PILLAR_LABELS[selectedSkill.pillar as Pillar]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{selectedSkill.description}</p>
            </div>
          )}

          {/* Goal textarea */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              What do you want to achieve?
            </label>
            <textarea
              name="goal"
              required
              rows={3}
              placeholder="Describe the specific outcome you're aiming for…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Target date */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Target date (optional)
            </label>
            <input
              type="date"
              name="target_date"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Check-in frequency */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              Check-in every
            </label>
            <select
              value={checkin}
              onChange={e => setCheckin(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">No check-in reminder</option>
              {CHECKIN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {checkin === 'custom' && (
              <input
                type="number"
                min="1"
                placeholder="Weeks"
                value={customWeeks}
                onChange={e => setCustomWeeks(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" loading={isPending}>Save goal</Button>
            <Button variant="ghost" asChild><a href="/growth">Cancel</a></Button>
          </div>
        </div>

        {/* Right — resource panel */}
        {selectedSkill && (
          <ResourcePanel
            skillLabel={selectedSkill.label}
            resources={resources}
            onPinnedChange={setPinnedIds}
          />
        )}
      </div>
    </form>
  )
}
