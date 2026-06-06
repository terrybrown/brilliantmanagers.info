'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'

interface Props {
  trigger?: React.ReactNode
}

export function InviteModal({ trigger }: Props) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useMutation({
    onSuccess: () => setOpen(false),
  })

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-fg)',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Invite +
          </button>
        )}
      </div>

      {open && (
        <div
          data-testid="modal-backdrop"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-modal)',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 460,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: 4,
              }}
            >
              Invite someone
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              We&apos;ll send them an email. They&apos;ll need to sign up if they&apos;re not already on Brilliant Managers.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                mutate(() => inviteConnection(fd))
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}
                >
                  Their email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}
                >
                  They are…
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 7, cursor: 'pointer', fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <input type="radio" name="role" value="direct_report" defaultChecked />
                    My direct report
                  </label>
                  <label
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 7, cursor: 'pointer', fontSize: 13,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <input type="radio" name="role" value="manager" />
                    My manager
                  </label>
                </div>
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}
                >
                  Personal note{' '}
                  <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Add a personal note to your invite…"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    width: '100%',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" loading={isPending} className="flex-1">
                  Send invite
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
