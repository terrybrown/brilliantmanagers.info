'use server'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'

export async function inviteConnection(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'

  return createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })
}

export async function acceptConnectionAction(connectionId: string) {
  await acceptConnection(connectionId)
}
