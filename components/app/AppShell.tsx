'use client'
import { useState, useEffect } from 'react'
import Script from 'next/script'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomTabBar } from './BottomTabBar'

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
    } catch { /* localStorage unavailable */ }
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
      <div className="flex overflow-hidden" style={{ height: '100dvh', background: 'var(--color-bg-base)' }}>
        <div className="hidden lg:block flex-shrink-0">
          <Sidebar
            isExpanded={isExpanded}
            onToggle={handleToggle}
            isSuperAdmin={isSuperAdmin}
            unreadCount={unreadCount}
            user={user}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Topbar user={user} showBeta={showBeta} />
          <main className="flex-1 overflow-y-auto" style={{ padding: '24px', background: 'var(--color-bg-base)' }}>
            {children}
          </main>
          <div className="lg:hidden">
            <BottomTabBar unreadCount={unreadCount} />
          </div>
        </div>
      </div>
    </>
  )
}
