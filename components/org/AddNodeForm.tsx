'use client'
import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

interface AddNodeFormProps {
  orgId: string
  parentId: string | null
  formAction: (formData: FormData) => Promise<void>
  onCancel: () => void
}

// Separate component required: useFormStatus only works inside a component that is
// a descendant of the form, not the component that renders the form itself.
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: '5px 10px',
        background: 'rgba(99,102,241,0.2)',
        color: '#a78bfa',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 600,
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {pending ? '…' : 'Add'}
    </button>
  )
}

export function AddNodeForm({ orgId, parentId, formAction, onCancel }: AddNodeFormProps) {
  const ref = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function action(formData: FormData) {
    setError(null)
    try {
      await formAction(formData)
      ref.current?.reset()
    } catch {
      setError('Failed to add group. Please try again.')
    }
  }

  return (
    <div
      style={{
        background: 'rgba(99,102,241,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: '2px solid rgba(99,102,241,0.3)',
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        padding: '8px 14px',
      }}
    >
      <form ref={ref} action={action} style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
        <input type="hidden" name="orgId" value={orgId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <input
          name="name"
          placeholder="Child group name…"
          autoFocus
          required
          style={{
            flex: 1,
            background: '#0d1117',
            border: '1px solid #374151',
            borderRadius: 4,
            padding: '5px 8px',
            color: '#f1f5f9',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <SubmitButton />
      </form>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: '#4b5563',
          fontSize: 11,
          cursor: 'pointer',
          padding: '5px 6px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
      {error && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
