'use client'

import { createContext, useContext } from 'react'
import type { GuideUserData } from '@/lib/db/guide-data'

const GuideDataContext = createContext<GuideUserData | null>(null)

export function GuideDataProvider({
  children,
  data,
}: {
  children: React.ReactNode
  data: GuideUserData | null
}) {
  return (
    <GuideDataContext.Provider value={data}>
      {children}
    </GuideDataContext.Provider>
  )
}

export function useGuideData(): GuideUserData | null {
  return useContext(GuideDataContext)
}
