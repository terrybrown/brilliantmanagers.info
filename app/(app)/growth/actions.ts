'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan, markPlanComplete, updateLastCheckin } from '@/lib/db/development-plans'
import { bulkAddGoalResources, addGoalResource, removeGoalResource } from '@/lib/db/goal-resources'
import { addEvidence } from '@/lib/db/goal-evidence'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function saveGoalAction(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return err('Not authenticated')

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const checkin_raw = formData.get('checkin_frequency_weeks') as string
  const checkin_frequency_weeks = checkin_raw ? parseInt(checkin_raw, 10) : null
  const resource_ids_raw = formData.get('resource_ids') as string

  if (!skill_key || !pillar || !goal) return err('Missing required fields.')

  let plan: { id: string }
  try {
    plan = await upsertPlan(user.id, {
      skill_key,
      pillar,
      goal,
      target_date,
      status: 'planned',
      checkin_frequency_weeks,
    })
    if (resource_ids_raw) {
      let resource_ids: string[]
      try {
        resource_ids = JSON.parse(resource_ids_raw)
      } catch {
        return err('Invalid resource data.')
      }
      await bulkAddGoalResources(plan.id, resource_ids, user.id)
    }
  } catch {
    return err('Failed to save goal. Please try again.')
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

export async function markGoalCompleteAction(planId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return err('Not authenticated')
  try {
    await markPlanComplete(planId)
  } catch {
    return err('Failed to mark goal complete.')
  }
  await logAudit({
    actorId: user.id,
    action: 'goal.complete',
    entityType: 'goal',
    entityId: planId,
  })
  revalidatePath('/growth')
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}

export async function addEvidenceAction(formData: FormData): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return err('Not authenticated')

  const plan_id = formData.get('plan_id') as string
  const what_you_did = formData.get('what_you_did') as string
  const impact = formData.get('impact') as string
  const url = (formData.get('url') as string) || null

  if (!plan_id || !what_you_did || !impact) return err('Missing required fields.')

  try {
    await addEvidence(plan_id, user.id, { what_you_did, impact, url })
    await updateLastCheckin(plan_id)
  } catch {
    return err('Failed to add evidence. Please try again.')
  }

  await logAudit({
    actorId: user.id,
    action: 'goal.evidence.add',
    entityType: 'goal_evidence',
    entityId: plan_id,
  })

  revalidatePath(`/growth/goal/${plan_id}`)
  return ok()
}

export async function addGoalResourceAction(planId: string, resourceId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return err('Not authenticated')
  try {
    await addGoalResource(planId, resourceId, user.id)
  } catch {
    return err('Failed to update resources.')
  }
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}

export async function removeGoalResourceAction(planId: string, resourceId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return err('Not authenticated')
  try {
    await removeGoalResource(planId, resourceId)
  } catch {
    return err('Failed to update resources.')
  }
  revalidatePath(`/growth/goal/${planId}`)
  return ok()
}
