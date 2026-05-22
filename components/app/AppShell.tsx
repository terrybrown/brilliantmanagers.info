'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const LS_KEY = 'bm_sidebar_expanded'
const SLEEKPLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID

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
  unreadCount,
  children,
}: {
  user: UserInfo
  showBeta: boolean
  isSuperAdmin?: boolean
  unreadCount?: number
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

  return (
    <>
      {SLEEKPLAN_PRODUCT_ID && (
        <Script id="sleekplan-widget" strategy="afterInteractive">
          {`window.$sleek=[];window.SLEEK_PRODUCT_ID=${SLEEKPLAN_PRODUCT_ID};(function(){var d=document,s=d.createElement("script");s.src="https://client.sleekplan.com/sdk/e.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
        </Script>
      )}
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: '#0a0f1e',
        }}
      >
        <Sidebar isExpanded={isExpanded} onToggle={handleToggle} isSuperAdmin={isSuperAdmin} unreadCount={unreadCount} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar user={user} showBeta={showBeta} />
          <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
