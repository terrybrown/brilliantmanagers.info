'use client'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not scored',
  in_progress: 'Scoring in progress',
  complete: 'Scored',
}

import { AddConnectionForm } from '@/components/people/AddConnectionForm'
import { acceptConnectionAction } from '@/app/(app)/connections/actions'
import { trackConnectionAccepted } from '@/lib/analytics'
import type { EnrichedConnection, DirectReportRoundSummary } from './types'
import type { PendingInvitation } from '@/lib/db/pending-invitations'

interface Props {
  connections: { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }
  roundSummaries: Record<string, DirectReportRoundSummary>
  userId: string
  pendingInvitations: PendingInvitation[]
}

function Avatar({ name, color = '#0891b2' }: { name: string; color?: string }) {
  const letters = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: '#fff', fontWeight: 600, flexShrink: 0,
      }}
    >
      {letters || '?'}
    </div>
  )
}

function DirectReportCard({
  connection,
  summary,
}: {
  connection: EnrichedConnection
  summary?: DirectReportRoundSummary
}) {
  const dr = connection.direct_report
  if (!dr) return null
  const statusLabel = !summary
    ? null
    : summary.roundStatus === 'in_progress'
    ? <span style={{ color: '#4ade80' }}>In progress</span>
    : summary.roundStatus === 'scheduled'
    ? <span style={{ color: '#60a5fa' }}>Scheduled</span>
    : <span style={{ color: '#6b7280' }}>None scheduled</span>

  const href = summary?.roundId
    ? `/manager/${connection.direct_report_id}?roundId=${summary.roundId}`
    : `/manager/${connection.direct_report_id}`

  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '12px 14px',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <Avatar name={dr.display_name || dr.email} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
          {dr.display_name || dr.email}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
          {summary && (
            <>
              <span>Round: {statusLabel}</span>
              <span>Last score: <strong style={{ color: '#e2e8f0' }}>{summary.lastScore ?? '—'}</strong></span>
              <span>Next: <strong style={{ color: '#e2e8f0' }}>{summary.nextScheduledDate ?? '—'}</strong></span>
            </>
          )}
        </div>
      </div>
      {summary && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', margin: 0 }}>
            Manager scored
          </p>
          <span className="text-xs text-neutral-400">
            {STATUS_LABEL[summary.managerScoringStatus] ?? 'Unknown'}
          </span>
        </div>
      )}
    </a>
  )
}

export function YourConnections({ connections, roundSummaries, userId, pendingInvitations }: Props) {
  const pendingIncoming = [
    ...connections.asManager.filter(c => c.status === 'pending' && c.initiated_by !== userId),
    ...connections.asDirectReport.filter(c => c.status === 'pending' && c.initiated_by !== userId),
  ]

  const activeManager = connections.asDirectReport.find(c => c.status === 'active')
  const pendingOutboundManager = connections.asDirectReport.find(
    c => c.status === 'pending' && c.initiated_by === userId
  )

  const activeDirectReports = connections.asManager.filter(c => c.status === 'active')

  const pendingInvitedManagers = pendingInvitations.filter(p => p.inviter_role === 'direct_report')
  const pendingInvitedDirectReports = pendingInvitations.filter(p => p.inviter_role === 'manager')

  return (
    <section>
      <div
        className="mb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}
      >
        <h2
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: 600, color: '#a78bfa',
          }}
        >
          Your Connections
        </h2>
        <AddConnectionForm />
      </div>

      {/* Pending incoming */}
      {pendingIncoming.length > 0 && (
        <div className="mb-6">
          <p
            style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, color: '#f59e0b', marginBottom: 8,
            }}
          >
            ▾ Pending ({pendingIncoming.length})
          </p>
          <div className="flex flex-col gap-3">
            {pendingIncoming.map(c => {
              const isAsManager = c.manager_id === userId
              const other = isAsManager ? c.direct_report : c.manager
              if (!other) return null
              const rel = isAsManager ? 'wants to connect as your direct report' : 'wants to connect as your manager'
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px dashed rgba(245,158,11,0.35)', borderRadius: 8, padding: '10px 14px',
                  }}
                >
                  <Avatar name={other.display_name || other.email} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                      {other.display_name || other.email}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      {other.email} · {rel}
                    </p>
                  </div>
                  <form action={acceptConnectionAction.bind(null, c.id)}>
                    <button
                      type="submit"
                      onClick={trackConnectionAccepted}
                      style={{
                        padding: '5px 12px', background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* You report to */}
      <div className="mb-6">
        <p
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6b7280', fontWeight: 500, marginBottom: 6,
          }}
        >
          You report to
        </p>
        {activeManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={activeManager.manager?.display_name || activeManager.manager?.email || ''} color="#4f46e5" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                {activeManager.manager?.display_name || activeManager.manager?.email}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                {activeManager.manager?.email}
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'rgba(34,197,94,0.15)',
                color: '#4ade80', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Connected
            </span>
          </div>
        ) : pendingOutboundManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={pendingOutboundManager.manager?.email || ''} color="#4f46e5" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                {pendingOutboundManager.manager?.email}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                Invite sent — waiting for them to accept
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'rgba(245,158,11,0.12)',
                color: '#f59e0b', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Pending
            </span>
          </div>
        ) : pendingInvitedManagers.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pendingInvitedManagers.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px dashed rgba(245,158,11,0.35)', borderRadius: 8, padding: '12px 14px',
                }}
              >
                <Avatar name={invite.invited_email} color="#4f46e5" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                    {invite.invited_email}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    Invite sent — awaiting registration
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11, background: 'rgba(245,158,11,0.12)',
                    color: '#f59e0b', padding: '3px 8px', borderRadius: 5,
                  }}
                >
                  Awaiting registration
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No manager connected yet</p>
            <InviteManagerModal
              trigger={
                <button
                  type="button"
                  style={{
                    padding: '5px 14px', background: 'rgba(99,102,241,0.15)',
                    color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Invite your manager
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Direct reports */}
      <div>
        <p
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#6b7280', fontWeight: 500, marginBottom: 6,
          }}
        >
          Your direct reports ({activeDirectReports.length})
        </p>
        {activeDirectReports.length === 0 && pendingInvitedDirectReports.length === 0 ? (
          <p style={{ fontSize: 13, color: '#4b5563' }}>No direct reports yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeDirectReports.map(c => {
              const summary = roundSummaries[c.direct_report_id]
              return <DirectReportCard key={c.id} connection={c} summary={summary} />
            })}
            {pendingInvitedDirectReports.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px dashed rgba(245,158,11,0.35)', borderRadius: 8, padding: '12px 14px',
                }}
              >
                <Avatar name={p.invited_email} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9', margin: 0 }}>
                    {p.invited_email}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    Invite sent — awaiting registration
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11, background: 'rgba(245,158,11,0.12)',
                    color: '#f59e0b', padding: '3px 8px', borderRadius: 5,
                  }}
                >
                  Awaiting registration
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
