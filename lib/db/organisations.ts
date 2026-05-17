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
  if (!data) throw new Error('No data returned from insert')
  return data as { id: string; name: string }
}

export async function getOrgsForUser(userId: string): Promise<Org[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_members')
    .select('role, organisations(id, name, created_by, created_at)')
    .eq('user_id', userId)
  if (error) throw error
  return ((data ?? []) as { role: string; organisations: { id: string; name: string; created_by: string; created_at: string } }[]).map(row => ({
    ...row.organisations,
    userRole: row.role as 'org_admin' | 'member',
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
