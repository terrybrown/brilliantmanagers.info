'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { upsertPlan } from '@/lib/db/development-plans'

export async function savePlanAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const skill_key = formData.get('skill_key') as string
  const pillar = formData.get('pillar') as string
  const goal = formData.get('goal') as string
  const target_date = (formData.get('target_date') as string) || null
  const status = (formData.get('status') as string) || 'planned'

  if (!skill_key || !pillar || !goal) return

  await upsertPlan(user.id, {
    skill_key,
    pillar,
    goal,
    target_date,
    status: status as 'planned' | 'in_progress' | 'completed',
  })
}
