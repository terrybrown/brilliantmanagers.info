'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'

interface Props {
  trigger?: React.ReactNode
}

export function InviteManagerModal({ trigger }: Props) {
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
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            style={{
              background: '#111827', border: '1px solid #1f2937',
              borderRadius: 12, padding: 28, width: '100%', maxWidth: 460,
            }}
          >
            <h2 className="mb-1 text-lg font-bold text-white">Invite your manager</h2>
            <p className="mb-5 text-sm text-slate-400">
              We&apos;ll send them an email so they can connect and score your reflections.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                mutate(() => inviteConnection(formData))
              }}
              className="flex flex-col gap-4"
            >
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
              <div className="flex gap-3">
                <Button type="submit" loading={isPending} className="flex-1">
                  Send invite
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  className="shrink-0"
                >
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
