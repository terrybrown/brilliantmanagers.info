'use client'

import { useState } from 'react'
import { inviteConnection } from '@/app/(app)/connections/actions'
import { useMutation } from '@/hooks/use-mutation'
import { Button } from '@/components/ui/button'
import { trackManagerInvited } from '@/lib/analytics'

export function AddConnectionForm() {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useMutation({
    onSuccess: () => {
      trackManagerInvited()
      setOpen(false)
    },
  })

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        + Add connection
      </Button>
    )
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        mutate(() => inviteConnection(formData))
      }}
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
        <div className="flex gap-2">
          <Button type="submit" loading={isPending}>
            Send invite
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
