'use client'
import { useFormStatus } from 'react-dom'

export function ConfirmButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <span className="flex items-end gap-1.5">
          <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-50"  style={{ animationDelay: '0ms' }} />
          <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-300" style={{ animationDelay: '150ms' }} />
          <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-600" style={{ animationDelay: '300ms' }} />
          <span className="block h-2 w-2 animate-bounce rounded-full bg-amber-900" style={{ animationDelay: '450ms' }} />
        </span>
      ) : (
        'Sign in →'
      )}
    </button>
  )
}
