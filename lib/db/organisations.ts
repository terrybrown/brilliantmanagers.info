import { createClient } from '@/lib/supabase/server'

export interface Org {
  id: string
  name: string
  created_by: string
  created_at: string
  userRole: 'org_admin' | 'member'
}

export async function createOrg(userId: string, name: string): Promise<{ id: string; name: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organisations')
    .insert({ name, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; name: string }
}

export async function getOrgsForUser(userId: string): Promise<Org[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organisations')
    .select('id, name, created_by, created_at, org_members(role)')
    .eq('org_members.user_id', userId)
  return ((data ?? []) as { id: string; name: string; created_by: string; created_at: string; org_members: { role: string }[] }[]).map(row => ({
    id: row.id,
    name: row.name,
    created_by: row.created_by,
    created_at: row.created_at,
    userRole: row.org_members[0]?.role as 'org_admin' | 'member',
  }))
}

export async function updateOrgName(orgId: string, name: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organisations')
    .update({ name })
    .eq('id', orgId)
  if (error) throw error
}
