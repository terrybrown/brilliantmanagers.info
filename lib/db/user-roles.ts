import { createAdminClient } from '@/lib/supabase/admin'

export interface UserWithRole {
  id: string
  email: string | null
  display_name: string | null
  created_at: string
  is_super_admin: boolean
}

export async function grantSuperAdmin(userId: string, grantedBy: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'super_admin',
    granted_by: grantedBy,
  })
  if (error) throw error
}

export async function revokeSuperAdmin(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'super_admin')
  if (error) throw error
}

export async function listAllUsersWithRoles(): Promise<UserWithRole[]> {
  const supabase = createAdminClient()
  const [{ data: profiles }, { data: superAdmins }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin'),
  ])
  const superAdminIds = new Set(
    (superAdmins ?? []).map((r: { user_id: string }) => r.user_id)
  )
  return (profiles ?? []).map(
    (p: { id: string; email: string | null; display_name: string | null; created_at: string }) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      created_at: p.created_at,
      is_super_admin: superAdminIds.has(p.id),
    })
  )
}
