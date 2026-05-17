import { createAdminClient } from '@/lib/supabase/admin'

interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface Profile {
  id: string
  email: string | null
}

export default async function AdminAuditLogPage() {
  const supabase = createAdminClient()

  const { data: entries } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const auditEntries = (entries ?? []) as AuditEntry[]
  const actorIds = [...new Set(auditEntries.filter(e => e.actor_id).map(e => e.actor_id!))]

  const { data: profileRows } = actorIds.length > 0
    ? await supabase.from('profiles').select('id, email').in('id', actorIds)
    : { data: [] as Profile[] }

  const emailById = Object.fromEntries(
    ((profileRows ?? []) as Profile[]).map(p => [p.id, p.email ?? p.id])
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Audit Log</h1>
      <p className="mb-4 text-xs text-slate-500">Showing last 50 entries, newest first</p>
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-xs">
          <thead style={{ background: '#111827' }}>
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Time</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Actor</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Action</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Entity</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">ID</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Metadata</th>
            </tr>
          </thead>
          <tbody style={{ background: '#0d1117' }}>
            {auditEntries.map(entry => (
              <tr key={entry.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {entry.actor_id ? (emailById[entry.actor_id] ?? entry.actor_id.slice(0, 8)) : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-amber-400">{entry.action}</td>
                <td className="px-3 py-2 text-slate-400">{entry.entity_type}</td>
                <td className="px-3 py-2 font-mono text-slate-500">
                  {entry.entity_id ? entry.entity_id.slice(0, 8) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-500">
                  {entry.metadata ? (
                    <span title={JSON.stringify(entry.metadata, null, 2)}>
                      {JSON.stringify(entry.metadata).slice(0, 60)}
                      {JSON.stringify(entry.metadata).length > 60 ? '…' : ''}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {auditEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
