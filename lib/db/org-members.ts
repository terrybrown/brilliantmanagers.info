import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
// Profiles are fetched via the admin client because org_members.user_id has no
// direct FK to profiles (it points to auth.users), so PostgREST can't resolve
// the join, and the profiles SELECT policy only covers own profile.
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, role')
    .eq('org_id', orgId)
  if (error) throw error
  if (!data || data.length === 0) return []

  const adminSupabase = createAdminClient()
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', data.map(r => r.user_id))

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  return data.map(row => ({
    user_id: row.user_id,
    role: row.role === 'org_admin' ? 'org_admin' : 'member',
    email: profileMap.get(row.user_id)?.email ?? null,
    display_name: profileMap.get(row.user_id)?.display_name ?? null,
  }))
}
