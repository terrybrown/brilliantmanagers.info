'use server'
import { createClient } from '@/lib/supabase/server'
import { createConnection, acceptConnection } from '@/lib/db/connections'
import { logAudit } from '@/lib/audit'

export async function inviteConnection(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const email = formData.get('email') as string
  const role = formData.get('role') as 'manager' | 'direct_report'

  await createConnection({
    initiatorId: user.id,
    otherEmail: email,
    initiatorRole: role,
  })

  await logAudit({
    actorId: user.id,
    action: 'connection.create',
    entityType: 'connection',
    metadata: { otherEmail: email, initiatorRole: role },
  })
}

export async function acceptConnectionAction(connectionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await acceptConnection(connectionId)

  if (user) {
    await logAudit({
      actorId: user.id,
      action: 'connection.accept',
      entityType: 'connection',
      entityId: connectionId,
    })
  }
}
