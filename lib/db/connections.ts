import { createClient } from '@/lib/supabase/server'

export const NO_ACCOUNT_ERROR = 'No account found for that email. Ask them to sign up first.'

export interface Connection {
  id: string
  manager_id: string
  direct_report_id: string
  status: 'pending' | 'active'
  initiated_by: string
  created_at: string
}

export async function getConnectionsForUser(userId: string): Promise<{
  asManager: Connection[]
  asDirectReport: Connection[]
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('connections')
    .select('*, manager:profiles!connections_manager_id_fkey(id,email,display_name), direct_report:profiles!connections_direct_report_id_fkey(id,email,display_name)')
    .or(`manager_id.eq.${userId},direct_report_id.eq.${userId}`)

  const rows = (data ?? []) as (Connection & {
    manager: { id: string; email: string; display_name: string }
    direct_report: { id: string; email: string; display_name: string }
  })[]

  return {
    asManager: rows.filter(r => r.manager_id === userId),
    asDirectReport: rows.filter(r => r.direct_report_id === userId),
  }
}

export async function createConnection(params: {
  initiatorId: string
  otherEmail: string
  initiatorRole: 'manager' | 'direct_report'
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', params.otherEmail)
    .maybeSingle()

  if (!otherProfile) {
    return { error: NO_ACCOUNT_ERROR }
  }

  const managerId =
    params.initiatorRole === 'manager' ? params.initiatorId : otherProfile.id
  const directReportId =
    params.initiatorRole === 'direct_report' ? params.initiatorId : otherProfile.id

  const { error } = await supabase.from('connections').insert({
    manager_id: managerId,
    direct_report_id: directReportId,
    status: 'pending',
    initiated_by: params.initiatorId,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Connection already exists.' }
    return { error: error.message }
  }

  return {}
}

export async function acceptConnection(connectionId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('connections')
    .update({ status: 'active' })
    .eq('id', connectionId)
}
