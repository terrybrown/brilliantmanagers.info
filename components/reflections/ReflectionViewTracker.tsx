'use client'
import { useEffect } from 'react'
import { trackReflectionViewed } from '@/lib/analytics'

interface ReflectionViewTrackerProps {
  roundId: string
  status: string
}

export function ReflectionViewTracker({ roundId, status }: ReflectionViewTrackerProps) {
  useEffect(() => {
    trackReflectionViewed(roundId, status)
  }, [roundId, status])

  return null
}
