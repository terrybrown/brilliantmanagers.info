// app/(app)/reflections/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createRound } from '@/lib/db/rounds'

export async function createRoundAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string) || 'Reflection'
  const notes = (formData.get('notes') as string) || null
  const remindAt = (formData.get('remind_at') as string) || null

  await createRound(user.id, title, notes, remindAt)
  redirect('/scorecard')
}
