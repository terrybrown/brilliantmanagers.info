'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan, markPlanComplete, updateLastCheckin } from '@/lib/db/development-plans'
import { bulkAddGoalResources, addGoalResource, removeGoalResource } from '@/lib/db/goal-resources'
import { addEvidence } from '@/lib/db/goal-evidence'
import { logAudit } from '@/lib/audit'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function saveGoalAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const checkin_raw = formData.get('checkin_frequency_weeks') as string
  const checkin_frequency_weeks = checkin_raw ? parseInt(checkin_raw, 10) : null
  const resource_ids_raw = formData.get('resource_ids') as string

  if (!skill_key || !pillar || !goal) return

  const plan = await upsertPlan(user.id, {
    skill_key,
    pillar,
    goal,
    target_date,
    status: 'planned',
    checkin_frequency_weeks,
  })

  if (resource_ids_raw) {
    const resource_ids: string[] = JSON.parse(resource_ids_raw)
    await bulkAddGoalResources(plan.id, resource_ids, user.id)
  }

  await logAudit({
    actorId: user.id,
    action: 'goal.create',
    entityType: 'goal',
    entityId: plan.id,
    metadata: { skill_key, pillar },
  })

  revalidatePath('/growth')
  redirect(`/growth/goal/${plan.id}`)
}

export async function markGoalCompleteAction(planId: string): Promise<void> {
  const user = await getAuthenticatedUser()
  await markPlanComplete(planId)
  await logAudit({
    actorId: user.id,
    action: 'goal.complete',
    entityType: 'goal',
    entityId: planId,
  })
  revalidatePath('/growth')
  revalidatePath(`/growth/goal/${planId}`)
}

export async function addEvidenceAction(formData: FormData): Promise<void> {
  const user = await getAuthenticatedUser()

  const plan_id = formData.get('plan_id') as string
  const what_you_did = formData.get('what_you_did') as string
  const impact = formData.get('impact') as string
  const url = (formData.get('url') as string) || null

  if (!plan_id || !what_you_did || !impact) return

  await addEvidence(plan_id, user.id, { what_you_did, impact, url })
  await updateLastCheckin(plan_id)
  await logAudit({
    actorId: user.id,
    action: 'goal.evidence.add',
    entityType: 'goal_evidence',
    entityId: plan_id,
  })

  revalidatePath(`/growth/goal/${plan_id}`)
}

export async function addGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  const user = await getAuthenticatedUser()
  await addGoalResource(planId, resourceId, user.id)
  revalidatePath(`/growth/goal/${planId}`)
}

export async function removeGoalResourceAction(planId: string, resourceId: string): Promise<void> {
  await getAuthenticatedUser()
  await removeGoalResource(planId, resourceId)
  revalidatePath(`/growth/goal/${planId}`)
}
