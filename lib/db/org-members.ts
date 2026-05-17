import { createClient } from '@/lib/supabase/server'

export interface OrgMember {
  user_id: string
  role: 'org_admin' | 'member'
  email: string | null
  display_name: string | null
}

export async function addOrgMember(
  orgId: string,
  userId: string,
  role: 'org_admin' | 'member'
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('org_members')
    .upsert(
      { org_id: orgId, user_id: userId, role },
      { onConflict: 'org_id,user_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

export async function setOrgRole(
  orgId: string,
  userId: string,
  role: 'org_admin' | 'member'
): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .select('user_id')
    .single()
  if (error) throw error
  if (!data) throw new Error(`No org_member found for org ${orgId}, user ${userId}`)
}

// Caller must verify org_admin role — RLS enforces this for user-scoped clients.
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, role, profiles(email, display_name)')
    .eq('org_id', orgId)
  if (error) throw error
  return ((data ?? []) as { user_id: string; role: string; profiles: { email: string | null; display_name: string | null } | null }[]).map(row => ({
    user_id: row.user_id,
    role: row.role === 'org_admin' ? 'org_admin' : 'member',
    email: row.profiles?.email ?? null,
    display_name: row.profiles?.display_name ?? null,
  }))
}
