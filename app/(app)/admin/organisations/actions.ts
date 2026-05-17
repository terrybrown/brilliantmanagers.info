'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

export async function deleteOrgAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')

  const orgId = formData.get('orgId') as string
  if (!orgId) return

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('organisations').delete().eq('id', orgId)
  if (error) throw error

  await logAudit({
    actorId: user.id,
    action: 'org.delete',
    entityType: 'organisation',
    entityId: orgId,
  })
  revalidatePath('/admin/organisations')
}
