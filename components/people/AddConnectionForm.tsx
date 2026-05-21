'use client'
import { useActionState, useState, useEffect } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import type { InviteState } from '@/app/(app)/connections/actions'
import { trackManagerInvited } from '@/lib/analytics'

const initial: InviteState = { success: false }

export function AddConnectionForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(inviteConnection, initial)

  useEffect(() => {
    if (state.success) trackManagerInvited()
  }, [state.success])

  if (state.success) {
    return (
      <p className="text-sm text-green-400">Invite sent successfully.</p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '7px 16px', background: 'rgba(99,102,241,0.12)',
          color: '#a78bfa', fontWeight: 600, fontSize: 13,
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, cursor: 'pointer',
        }}
      >
        + Add connection
      </button>
    )
  }

  return (
    <form
      action={formAction}
      style={{
        background: '#111827', border: '1px solid #1f2937',
        borderRadius: 10, padding: 20,
      }}
    >
      <p className="mb-3 text-sm font-semibold text-white">Add a connection</p>
      <div className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@company.com"
          style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 6,
                   padding: '8px 12px', color: '#f1f5f9', fontSize: 14 }}
        />
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="direct_report" defaultChecked />
            They are my manager
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="radio" name="role" value="manager" />
            They report to me
          </label>
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: '7px 18px', background: '#4f46e5', color: '#fff',
              fontWeight: 600, fontSize: 13, border: 'none', borderRadius: 6,
              cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? 'Sending…' : 'Send invite'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              padding: '7px 14px', background: 'transparent', color: '#6b7280',
              fontSize: 13, border: '1px solid #1f2937', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
