'use client'

import { useCallback, useEffect, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import type { ActionResult } from '@/lib/action-result'

interface MutationOptions<T> {
  onSuccess?: string | ((data?: T) => void)
  onError?: (error: string) => void
}

export function useMutation<T = void>(options?: MutationOptions<T>) {
  const [isPending, startTransition] = useTransition()
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  const mutate = useCallback(
    (action: () => Promise<ActionResult<T>>) => {
      startTransition(async () => {
        try {
          const result = await action()
          if (!result.ok) {
            toast.error(result.error)
            optionsRef.current?.onError?.(result.error)
            return
          }
          const { onSuccess } = optionsRef.current ?? {}
          if (typeof onSuccess === 'string') {
            toast.success(onSuccess)
          } else if (typeof onSuccess === 'function') {
            onSuccess(result.data)
          }
        } catch (e) {
          if (isRedirectError(e)) throw e
          const message = e instanceof Error ? e.message : 'Something went wrong'
          toast.error(message)
          optionsRef.current?.onError?.(message)
        }
      })
    },
    [],
  )

  return { mutate, isPending }
}
