'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertScheduledRound, deleteScheduledRound } from '@/lib/db/scheduled-rounds'
import { logAudit } from '@/lib/audit'

export async function setScheduledRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const date = formData.get('scheduled_date') as string
  if (!date) return

  await upsertScheduledRound(user.id, date)
  await logAudit({
    actorId: user.id,
    action: 'round.schedule',
    entityType: 'scheduled_round',
    metadata: { scheduled_date: date },
  })
  revalidatePath('/dashboard')
}

export async function cancelScheduledRoundAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await deleteScheduledRound(user.id)
  await logAudit({
    actorId: user.id,
    action: 'round.cancel',
    entityType: 'scheduled_round',
  })
  revalidatePath('/dashboard')
}
