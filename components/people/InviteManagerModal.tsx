'use client'
import { useActionState, useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import type { InviteState } from '@/app/(app)/connections/actions'

const initial: InviteState = { success: false }

interface Props {
  trigger?: React.ReactNode
}

export function InviteManagerModal({ trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(inviteConnection, initial)

  if (state.success) {
    return (
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: '#1e3a5f', border: '1px solid rgba(34,197,94,0.3)' }}
      >
        <p className="text-sm font-semibold text-green-400">Invite sent!</p>
        <p className="mt-1 text-xs text-slate-400">
          We've emailed your manager — they'll see a pending invite when they sign in.
        </p>
      </div>
    )
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            Connect →
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#111827', border: '1px solid #1f2937',
              borderRadius: 12, padding: 28, width: '100%', maxWidth: 460,
            }}
          >
            <h2 className="mb-1 text-lg font-bold text-white">Invite your manager</h2>
            <p className="mb-5 text-sm text-slate-400">
              We'll send them an email so they can connect and score your reflections.
            </p>
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="role" value="direct_report" />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Their email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="manager@company.com"
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Personal message <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Hi — I've been using Brilliant Managers to track my development. I'd love your perspective on my reflections."
                  style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                           padding: '8px 12px', color: '#f1f5f9', fontSize: 14, width: '100%',
                           resize: 'vertical' }}
                />
              </div>
              {state.error && (
                <p className="text-sm text-red-400">{state.error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  style={{
                    flex: 1, padding: '9px 0', background: '#4f46e5',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    border: 'none', borderRadius: 8, cursor: pending ? 'not-allowed' : 'pointer',
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? 'Sending…' : 'Send invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '9px 18px', background: 'transparent',
                    color: '#6b7280', fontWeight: 500, fontSize: 14,
                    border: '1px solid #1f2937', borderRadius: 8, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
