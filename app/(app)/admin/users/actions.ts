'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/roles'
import { grantSuperAdmin, revokeSuperAdmin } from '@/lib/db/user-roles'
import { logAudit } from '@/lib/audit'
import { ok, err, type ActionResult } from '@/lib/action-result'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isSuperAdmin(user.id)
  if (!admin) redirect('/dashboard')
  return user
}

async function grantSuperAdminActionImpl(formData: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId) return err('Missing user ID.')
  try {
    await grantSuperAdmin(userId, actor.id)
  } catch {
    return err('Failed to grant admin role.')
  }
  await logAudit({
    actorId: actor.id,
    action: 'role.grant',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
  return ok()
}

async function revokeSuperAdminActionImpl(formData: FormData): Promise<ActionResult> {
  const actor = await requireSuperAdmin()
  const userId = formData.get('userId') as string
  if (!userId || userId === actor.id) return err('Cannot revoke your own admin role.')
  try {
    await revokeSuperAdmin(userId)
  } catch {
    return err('Failed to revoke admin role.')
  }
  await logAudit({
    actorId: actor.id,
    action: 'role.revoke',
    entityType: 'user_role',
    entityId: userId,
    metadata: { role: 'super_admin' },
  })
  revalidatePath('/admin/users')
  return ok()
}

export async function grantSuperAdminAction(formData: FormData): Promise<ActionResult> {
  return grantSuperAdminActionImpl(formData)
}

export async function revokeSuperAdminAction(formData: FormData): Promise<ActionResult> {
  return revokeSuperAdminActionImpl(formData)
}
