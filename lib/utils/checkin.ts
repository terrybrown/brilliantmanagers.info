import type { DevelopmentPlan } from '@/lib/db/development-plans'

export interface CheckinChip {
  color: 'green' | 'amber'
  label: string
}

export function getCheckinChip(plan: DevelopmentPlan): CheckinChip | null {
  if (!plan.checkin_frequency_weeks) return null
  const base = plan.last_checkin_at
    ? new Date(plan.last_checkin_at)
    : new Date(plan.created_at)
  const nextDue = new Date(base.getTime() + plan.checkin_frequency_weeks * 7 * 24 * 60 * 60 * 1000)
  const now = new Date()
  if (nextDue < now) return { color: 'amber', label: 'Check-in overdue' }
  const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { color: 'green', label: `Check-in due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}` }
}
