'use client'
import { InviteManagerModal } from '@/components/people/InviteManagerModal'
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
        width: 38, height: 38, borderRadius: '50%', background: color,
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

// ── Badge helpers ──────────────────────────────────────────────────────────────

function StatusBadge({ children, variant }: { children: React.ReactNode; variant: 'alert' | 'positive' | 'muted' }) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    alert: { background: 'var(--color-alert-bg)', color: 'var(--color-alert-fg)', border: '1px solid var(--color-alert-border)' },
    positive: { background: 'var(--color-positive-bg)', color: 'var(--color-positive)', border: '1px solid var(--color-positive-border)' },
    muted: { background: 'var(--color-chip-bg)', color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' },
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap', ...styles[variant] }}>
      {children}
    </span>
  )
}

// ── Direct reports section ─────────────────────────────────────────────────────

function DirectReportRow({
  connection,
  summary,
}: {
  connection: EnrichedConnection
  summary?: DirectReportRoundSummary
}) {
  const dr = connection.direct_report
  if (!dr) return null
  const drId = connection.direct_report_id
  const displayName = dr.display_name || dr.email

  let badge: React.ReactNode = null
  let actionHref: string = `/manager/${drId}`
  let actionLabel: string = 'View'
  let actionVariant: 'solid' | 'ghost' = 'ghost'

  if (!summary || summary.roundId === null) {
    badge = <StatusBadge variant="muted">Awaiting reflection</StatusBadge>
    actionHref = `/manager/${drId}`
    actionLabel = 'View'
    actionVariant = 'ghost'
  } else if (summary.managerScoringStatus === 'not_started') {
    badge = <StatusBadge variant="alert">Needs your scores</StatusBadge>
    actionHref = `/manager/${drId}?roundId=${summary.roundId}`
    actionLabel = 'Score now'
    actionVariant = 'solid'
  } else if (summary.managerScoringStatus === 'in_progress') {
    badge = <StatusBadge variant="positive">Scoring in progress</StatusBadge>
    actionHref = `/manager/${drId}?roundId=${summary.roundId}`
    actionLabel = 'Continue'
    actionVariant = 'ghost'
  } else {
    badge = <StatusBadge variant="positive">Scored by you</StatusBadge>
    actionHref = `/reflections`
    actionLabel = 'View'
    actionVariant = 'ghost'
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}
    >
      <Avatar name={displayName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 650, fontSize: 13.5, color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayName}
        </p>
        {summary && (
          <p style={{ fontSize: 11.5, color: 'var(--color-text-faint)', margin: '2px 0 0' }}>
            {summary.roundStatus === 'in_progress' ? 'Round in progress' : summary.roundStatus === 'scheduled' ? 'Round scheduled' : 'No active round'}
          </p>
        )}
      </div>
      {summary?.lastScore != null && (
        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 750, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {summary.lastScore}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Self</div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {badge}
        <a
          href={actionHref}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
            textDecoration: 'none', whiteSpace: 'nowrap',
            ...(actionVariant === 'solid'
              ? { background: 'var(--color-accent)', color: 'var(--color-accent-fg)', border: 'none' }
              : { background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }),
          }}
        >
          {actionLabel}
        </a>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

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

  const needsScoringCount = activeDirectReports.filter(c => {
    const s = roundSummaries[c.direct_report_id]
    return s && s.managerScoringStatus === 'not_started' && s.roundId !== null
  }).length

  return (
    <section>
      {/* Pending incoming connection requests */}
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

      {/* Direct reports */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Direct reports
          </h2>
          {activeDirectReports.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
              background: 'var(--color-accent-wash2)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }}>
              {activeDirectReports.length}
            </span>
          )}
          {needsScoringCount > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-alert-fg)', fontWeight: 600 }}>
              ⚑ {needsScoringCount} needs your scores
            </span>
          )}
        </div>

        {activeDirectReports.length === 0 && pendingInvitedDirectReports.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>No direct reports yet.</p>
        ) : (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)', borderRadius: 12, overflow: 'hidden',
          }}>
            {activeDirectReports.map((c, i) => {
              const summary = roundSummaries[c.direct_report_id]
              return (
                <div key={c.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                  <DirectReportRow connection={c} summary={summary} />
                </div>
              )
            })}
            {pendingInvitedDirectReports.map((p, i) => (
              <div
                key={p.id}
                style={{
                  borderTop: activeDirectReports.length > 0 || i > 0 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
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
                <StatusBadge variant="muted">Awaiting registration</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your manager + Invite in 2-col grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Your manager */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10, marginTop: 0 }}>
            Your manager
          </h2>
          {activeManager ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 10, padding: '12px 14px',
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
              <StatusBadge variant="positive">Connected</StatusBadge>
            </div>
          ) : pendingOutboundManager ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '12px 14px',
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
              <StatusBadge variant="alert">Pending</StatusBadge>
            </div>
          ) : pendingInvitedManagers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingInvitedManagers.map(invite => (
                <div
                  key={invite.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--color-alert-bg)',
                    border: '1px dashed var(--color-alert-border)', borderRadius: 10, padding: '12px 14px',
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
                  <StatusBadge variant="alert">Awaiting registration</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 10, padding: '12px 14px',
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

        {/* Pending invitations placeholder column */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10, marginTop: 0 }}>
            Pending invitations
          </h2>
          {pendingInvitations.length === 0 ? (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-faint)', margin: 0 }}>No pending invitations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInvitations.map(invite => (
                <div
                  key={invite.id}
                  style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <Avatar name={invite.invited_email} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
                      {invite.invited_email}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                      {invite.inviter_role === 'manager' ? 'Invited as direct report' : 'Invited as manager'} · awaiting registration
                    </p>
                  </div>
                  <StatusBadge variant="muted">Pending</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
