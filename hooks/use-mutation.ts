'use client'

import { useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import type { ActionResult } from '@/lib/action-result'

interface MutationOptions<T> {
  onSuccess?: string | ((data?: T) => void)
  onError?: (error: string) => void
}

export function useMutation<T = void>(options?: MutationOptions<T>) {
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    (action: () => Promise<ActionResult<T>>) => {
      startTransition(async () => {
        try {
          const result = await action()
          if (!result.ok) {
            toast.error(result.error)
            options?.onError?.(result.error)
            return
          }
          if (typeof options?.onSuccess === 'string') {
            toast.success(options.onSuccess)
          } else if (typeof options?.onSuccess === 'function') {
            options.onSuccess(result.data)
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Something went wrong'
          toast.error(message)
          options?.onError?.(message)
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options?.onSuccess, options?.onError],
  )

  return { mutate, isPending }
}
