import { createClient } from '@/lib/supabase/server'

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle()
  return data !== null
}

export async function getOrgRole(
  userId: string,
  orgId: string
): Promise<'org_admin' | 'member' | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()
  return (data?.role as 'org_admin' | 'member') ?? null
}
