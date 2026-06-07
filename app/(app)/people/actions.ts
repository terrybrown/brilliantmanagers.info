'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, err, type ActionResult } from '@/lib/action-result'

export async function createDirectConnection(
  targetUserId: string,
  role: 'manager' | 'direct_report',
  orgId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('Not authenticated')

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(targetUserId)) return err('Invalid user.')
  if (!UUID_RE.test(orgId)) return err('Invalid organisation.')

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (membership?.role !== 'org_admin') {
    return err('Only org admins can link people directly.')
  }

  const { data: targetMembership } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('user_id', targetUserId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!targetMembership) return err('Target user is not a member of this organisation.')

  const managerId = role === 'manager' ? targetUserId : user.id
  const directReportId = role === 'direct_report' ? targetUserId : user.id

  const adminSupabase = createAdminClient()

  const { data: existing } = await adminSupabase
    .from('connections')
    .select('id')
    .or(`and(manager_id.eq.${managerId},direct_report_id.eq.${directReportId}),and(manager_id.eq.${directReportId},direct_report_id.eq.${managerId})`)
    .maybeSingle()

  if (existing) return err('Already connected.')

  const { error } = await adminSupabase
    .from('connections')
    .upsert(
      { manager_id: managerId, direct_report_id: directReportId, status: 'active', initiated_by: user.id },
      { onConflict: 'manager_id,direct_report_id', ignoreDuplicates: true }
    )

  if (error) return err('Failed to create connection. Please try again.')

  revalidatePath('/people')
  return ok()
}
