'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { grantSuperAdmin, revokeSuperAdmin } from '@/lib/db/user-roles'
import { logAudit } from '@/lib/audit'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')
  return user
}

export async function grantSuperAdminAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId) return
  await grantSuperAdmin(userId, actor.id)
  await logAudit({
    actorId: actor.id,
    action: 'role.grant',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
}

export async function revokeSuperAdminAction(formData: FormData): Promise<void> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId || userId === actor.id) return
  await revokeSuperAdmin(userId)
  await logAudit({
    actorId: actor.id,
    action: 'role.revoke',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
}
