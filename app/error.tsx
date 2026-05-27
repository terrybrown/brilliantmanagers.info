'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-slate-400">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-amber-500 underline">
        Try again
      </button>
    </div>
  )
}
