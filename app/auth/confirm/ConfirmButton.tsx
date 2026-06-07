'use client'
import { useFormStatus } from 'react-dom'

export function ConfirmButton() {
  const { pending } = useFormStatus()

  if (pending) {
    return (
      <div className="flex w-full items-end justify-center gap-1.5 px-4 py-3">
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-wash)', animationDelay: '0ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-wash2)', animationDelay: '150ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent-border)', animationDelay: '300ms' }} />
        <span className="block h-3 w-3 animate-tall-bounce rounded-full" style={{ background: 'var(--color-accent)', animationDelay: '450ms' }} />
      </div>
    )
  }

  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold"
      style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)' }}
    >
      Sign in →
    </button>
  )
}
