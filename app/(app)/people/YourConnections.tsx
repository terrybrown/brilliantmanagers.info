'use client'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not scored',
  in_progress: 'Scoring in progress',
  complete: 'Scored',
}

import { AddConnectionForm } from '@/components/people/AddConnectionForm'
import { acceptConnectionActionResult } from '@/app/(app)/connections/actions'
import { trackConnectionAccepted } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/use-mutation'
import type { EnrichedConnection, DirectReportRoundSummary } from './types'
import type { PendingInvitation } from '@/lib/db/pending-invitations'

interface Props {
  connections: { asManager: EnrichedConnection[]; asDirectReport: EnrichedConnection[] }
  roundSummaries: Record<string, DirectReportRoundSummary>
  userId: string
  pendingInvitations: PendingInvitation[]
}

function Avatar({ name, color = 'var(--color-manager)' }: { name: string; color?: string }) {
  const letters = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: 'var(--color-accent-fg)', fontWeight: 600, flexShrink: 0,
      }}
    >
      {letters || '?'}
    </div>
  )
}

function AcceptButton({ connectionId }: { connectionId: string }) {
  const { mutate, isPending } = useMutation({ onSuccess: 'Connection accepted' })
  return (
    <Button
      size="sm"
      onClick={() => {
        trackConnectionAccepted()
        mutate(() => acceptConnectionActionResult(connectionId))
      }}
      loading={isPending}
    >
      Accept
    </Button>
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
    ? <span style={{ color: 'var(--color-positive)' }}>In progress</span>
    : summary.roundStatus === 'scheduled'
    ? <span style={{ color: 'var(--color-accent)' }}>Scheduled</span>
    : <span style={{ color: 'var(--color-text-faint)' }}>None scheduled</span>

  const href = summary?.roundId
    ? `/manager/${connection.direct_report_id}?roundId=${summary.roundId}`
    : `/manager/${connection.direct_report_id}`

  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: 10, padding: '12px 14px',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <Avatar name={dr.display_name || dr.email} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
          {dr.display_name || dr.email}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 11, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          {summary && (
            <>
              <span>Round: {statusLabel}</span>
              <span>Last score: <strong style={{ color: 'var(--color-text-primary)' }}>{summary.lastScore ?? '—'}</strong></span>
              <span>Next: <strong style={{ color: 'var(--color-text-primary)' }}>{summary.nextScheduledDate ?? '—'}</strong></span>
            </>
          )}
        </div>
      </div>
      {summary && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-faint)', margin: 0 }}>
            Manager scored
          </p>
          <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}
      >
        <h2
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
            fontWeight: 600, color: 'var(--color-text-muted)',
          }}
        >
          Your Connections
        </h2>
        <AddConnectionForm />
      </div>

      {/* Pending incoming */}
      {pendingIncoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, color: 'var(--color-alert-fg)', marginBottom: 8,
            }}
          >
            ▾ Pending ({pendingIncoming.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    background: 'var(--color-alert-bg)',
                    border: '1px dashed var(--color-alert-border)', borderRadius: 8, padding: '10px 14px',
                  }}
                >
                  <Avatar name={other.display_name || other.email} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                      {other.display_name || other.email}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                      {other.email} · {rel}
                    </p>
                  </div>
                  <AcceptButton connectionId={c.id} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* You report to */}
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--color-text-faint)', fontWeight: 500, marginBottom: 6,
          }}
        >
          You report to
        </p>
        {activeManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={activeManager.manager?.display_name || activeManager.manager?.email || ''} color="var(--color-accent)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                {activeManager.manager?.display_name || activeManager.manager?.email}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                {activeManager.manager?.email}
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'var(--color-positive-bg)',
                color: 'var(--color-positive)', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Connected
            </span>
          </div>
        ) : pendingOutboundManager ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '12px 14px',
            }}
          >
            <Avatar name={pendingOutboundManager.manager?.email || ''} color="var(--color-accent)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                {pendingOutboundManager.manager?.email}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Invite sent — waiting for them to accept
              </p>
            </div>
            <span
              style={{
                fontSize: 11, background: 'var(--color-alert-bg)',
                color: 'var(--color-alert-fg)', padding: '3px 8px', borderRadius: 5,
              }}
            >
              Pending
            </span>
          </div>
        ) : pendingInvitedManagers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingInvitedManagers.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--color-alert-bg)',
                  border: '1px dashed var(--color-alert-border)', borderRadius: 8, padding: '12px 14px',
                }}
              >
                <Avatar name={invite.invited_email} color="var(--color-accent)" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                    {invite.invited_email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    Invite sent — awaiting registration
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11, background: 'var(--color-alert-bg)',
                    color: 'var(--color-alert-fg)', padding: '3px 8px', borderRadius: 5,
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
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No manager connected yet</p>
            <InviteManagerModal
              trigger={
                <button
                  type="button"
                  style={{
                    padding: '5px 14px', background: 'var(--color-accent-wash2)',
                    color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)',
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
            color: 'var(--color-text-faint)', fontWeight: 500, marginBottom: 6,
          }}
        >
          Your direct reports ({activeDirectReports.length})
        </p>
        {activeDirectReports.length === 0 && pendingInvitedDirectReports.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>No direct reports yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeDirectReports.map(c => {
              const summary = roundSummaries[c.direct_report_id]
              return <DirectReportCard key={c.id} connection={c} summary={summary} />
            })}
            {pendingInvitedDirectReports.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--color-alert-bg)',
                  border: '1px dashed var(--color-alert-border)', borderRadius: 8, padding: '12px 14px',
                }}
              >
                <Avatar name={p.invited_email} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                    {p.invited_email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                    Invite sent — awaiting registration
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11, background: 'var(--color-alert-bg)',
                    color: 'var(--color-alert-fg)', padding: '3px 8px', borderRadius: 5,
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
