'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import { deleteOrgAction } from './actions'

interface OrgRow {
  id: string
  name: string
  created_at: string
  org_members: {
    role: string
    profiles: { email: string | null; display_name: string | null } | null
  }[]
  org_nodes: { id: string }[]
}

interface Props {
  orgs: OrgRow[]
  lastActivityMap: Record<string, string | null>
}

function DeleteOrgButton({ orgId }: { orgId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Organisation deleted' })
  return (
    <Button
      variant="danger"
      size="sm"
      loading={isPending}
      onClick={() => {
        const fd = new FormData()
        fd.set('orgId', orgId)
        mutate(() => deleteOrgAction(fd))
      }}
    >
      Delete
    </Button>
  )
}

export function AdminOrgsTable({ orgs, lastActivityMap }: Props) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid #1f2937' }}>
      <table className="w-full text-sm">
        <thead style={{ background: '#111827' }}>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Admin(s)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Members</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Nodes</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Last Activity</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody style={{ background: '#0d1117' }}>
          {orgs.map(org => {
            const admins = org.org_members.filter(m => m.role === 'org_admin')
            const lastActivity = lastActivityMap[org.id]
            return (
              <tr key={org.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                <td className="px-4 py-3 text-slate-400">
                  {admins.length > 0
                    ? admins.map(a => a.profiles?.display_name ?? a.profiles?.email ?? '—').join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{org.org_members.length}</td>
                <td className="px-4 py-3 text-slate-400">{org.org_nodes.length}</td>
                <td className="px-4 py-3 text-slate-500">
                  {lastActivity
                    ? new Date(lastActivity).toLocaleDateString()
                    : <span className="text-slate-600">No activity</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteOrgButton orgId={org.id} />
                </td>
              </tr>
            )
          })}
          {orgs.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                No organisations yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
