import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConnectionsForUser } from '@/lib/db/connections'
import { inviteConnection, acceptConnectionAction } from './actions'

export default async function ConnectionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { asManager, asDirectReport } = await getConnectionsForUser(user.id)
  const pendingIncoming = asDirectReport.filter(
    c => c.status === 'pending' && c.initiated_by !== user.id
  )

  return (
    <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-2xl font-bold text-white">Connections</h1>

        {pendingIncoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Pending invites
            </h2>
            {pendingIncoming.map(c => (
              <div
                key={c.id}
                className="mb-2 flex items-center gap-4 rounded-lg bg-slate-800 px-4 py-3"
              >
                <span className="flex-1 text-sm text-white">
                  {(c as any).manager?.email ?? 'someone'} wants to connect as your manager
                </span>
                <form action={acceptConnectionAction.bind(null, c.id)}>
                  <button className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    Accept
                  </button>
                </form>
              </div>
            ))}
          </section>
        )}

        {asManager.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Your direct reports
            </h2>
            {asManager.map(c => (
              <div
                key={c.id}
                className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3"
              >
                <span className="flex-1 text-sm text-white">
                  {(c as any).direct_report?.email}
                </span>
                <span
                  className="text-xs"
                  style={{ color: c.status === 'active' ? '#4ade80' : '#f59e0b' }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </section>
        )}

        {asDirectReport.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Your manager
            </h2>
            {asDirectReport.map(c => (
              <div
                key={c.id}
                className="mb-2 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3"
              >
                <span className="flex-1 text-sm text-white">
                  {(c as any).manager?.email}
                </span>
                <span
                  className="text-xs"
                  style={{ color: c.status === 'active' ? '#4ade80' : '#f59e0b' }}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Add a connection
          </h2>
          <form action={inviteConnection} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="their@email.com"
              required
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-white has-[:checked]:border-amber-400">
                <input type="radio" name="role" value="manager" required className="accent-amber-400" />
                They are my manager
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm text-white has-[:checked]:border-amber-400">
                <input type="radio" name="role" value="direct_report" required className="accent-amber-400" />
                They report to me
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400"
            >
              Send invite
            </button>
          </form>
        </section>
    </div>
  )
}
