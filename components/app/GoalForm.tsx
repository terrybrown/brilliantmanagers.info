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

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  padding: '8px 12px',
  boxSizing: 'border-box',
  outline: 'none',
  // focus-visible ring added via className on each element
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
}

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
              <label htmlFor="goal-skill" style={labelStyle}>Skill</label>
              <select
                id="goal-skill"
                value={selectedSkillKey}
                onChange={e => setSelectedSkillKey(e.target.value)}
                required
                style={inputStyle}
                className="focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  {selectedSkill.label}
                </h2>
                <span style={{
                  borderRadius: 9999,
                  background: 'var(--color-accent-wash2)',
                  color: 'var(--color-accent)',
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}>
                  {PILLAR_LABELS[selectedSkill.pillar as Pillar]}
                </span>
              </div>
              <p style={{ marginTop: 4, fontSize: 14, color: 'var(--color-text-muted)' }}>
                {selectedSkill.description}
              </p>
            </div>
          )}

          {/* Goal textarea */}
          <div>
            <label htmlFor="goal-text" style={labelStyle}>
              What do you want to achieve?
            </label>
            <textarea
              id="goal-text"
              name="goal"
              required
              rows={3}
              placeholder="Describe the specific outcome you're aiming for…"
              style={{ ...inputStyle, resize: 'none' }}
              className="focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
            />
          </div>

          {/* Target date */}
          <div>
            <label htmlFor="goal-date" style={labelStyle}>
              Target date (optional)
            </label>
            <input
              id="goal-date"
              type="date"
              name="target_date"
              style={inputStyle}
              className="focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
            />
          </div>

          {/* Check-in frequency */}
          <div>
            <label htmlFor="goal-checkin" style={labelStyle}>
              Check-in every
            </label>
            <select
              id="goal-checkin"
              value={checkin}
              onChange={e => setCheckin(e.target.value)}
              style={inputStyle}
              className="focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
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
                style={{ ...inputStyle, marginTop: 8 }}
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
