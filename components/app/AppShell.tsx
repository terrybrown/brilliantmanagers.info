'use client'
import { useEffect, useState } from 'react'
import { FeaturebaseProvider } from 'featurebase-js/react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { FeedbackWidget } from './FeedbackWidget'

const LS_KEY = 'bm_sidebar_expanded'
const FEATUREBASE_APP_ID = process.env.NEXT_PUBLIC_FEATUREBASE_APP_ID

interface UserInfo {
  displayName: string
  email: string
  initials: string
  avatarUrl?: string
}

export function AppShell({
  user,
  showBeta,
  isSuperAdmin = false,
  children,
}: {
  user: UserInfo
  showBeta: boolean
  isSuperAdmin?: boolean
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    try {
      setIsExpanded(localStorage.getItem(LS_KEY) === 'true')
    } catch {
      // localStorage unavailable — keep default false
    }
  }, [])

  function handleToggle() {
    setIsExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem(LS_KEY, String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  const shell = (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0f1e',
      }}
    >
      <Sidebar isExpanded={isExpanded} onToggle={handleToggle} isSuperAdmin={isSuperAdmin} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar user={user} showBeta={showBeta} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>

      {FEATUREBASE_APP_ID && <FeedbackWidget />}
    </div>
  )

  if (!FEATUREBASE_APP_ID) return shell

  return (
    <FeaturebaseProvider appId={FEATUREBASE_APP_ID}>
      {shell}
    </FeaturebaseProvider>
  )
}
